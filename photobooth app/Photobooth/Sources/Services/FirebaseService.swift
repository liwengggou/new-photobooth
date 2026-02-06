import Foundation
import FirebaseFirestore
import FirebaseAuth
import FirebaseFunctions

/// Firebase service for authentication and data management
@MainActor
final class FirebaseService: ObservableObject {
    static let shared = FirebaseService()

    private let db = Firestore.firestore()
    private lazy var functions = Functions.functions()

    private init() {}

    // MARK: - User Management

    /// Fetch user data from Firestore
    func fetchUser(userId: String) async throws -> User? {
        let document = try await db.collection("users").document(userId).getDocument()

        if !document.exists {
            return nil
        }

        return try document.data(as: User.self)
    }

    /// Create new user in Firestore
    func createUser(_ user: User) async throws {
        // First check if referral code is unique
        let uniqueCode = try await ensureUniqueReferralCode(user.referralCode)

        // Create user with unique referral code
        var updatedUser = user
        updatedUser.referralCode = uniqueCode

        try db.collection("users").document(user.id).setData(from: updatedUser)
        print("✅ Created user in Firestore: \(user.id)")
    }

    /// Update user credits
    func updateCredits(userId: String, credits: Int) async throws {
        try await db.collection("users").document(userId).updateData([
            "credits": credits
        ])
        print("✅ Updated credits for user \(userId): \(credits)")
    }

    /// Update user data
    func updateUser(_ user: User) async throws {
        try db.collection("users").document(user.id).setData(from: user)
        print("✅ Updated user in Firestore: \(user.id)")
    }

    // MARK: - Session Management

    /// Save photo session to Firestore
    func saveSession(_ session: PhotoSession) async throws {
        try db.collection("sessions").document(session.id).setData(from: session)
        print("✅ Saved session to Firestore: \(session.id)")

        // FIX #1: Process pending referral on first completed session
        if session.status == .completed {
            let existingSessions = try await fetchSessions(userId: session.userId)
            let completedCount = existingSessions.filter { $0.status == .completed }.count

            // First completed session - process pending referral
            if completedCount == 1 {
                _ = try? await processPendingReferral(userId: session.userId)
            }
        }
    }

    /// Fetch user's past sessions
    func fetchSessions(userId: String) async throws -> [PhotoSession] {
        let snapshot = try await db.collection("sessions")
            .whereField("userId", isEqualTo: userId)
            .order(by: "createdAt", descending: true)
            .getDocuments()

        return snapshot.documents.compactMap { doc in
            try? doc.data(as: PhotoSession.self)
        }
    }

    // MARK: - Referral Management

    /// Process referral code via Cloud Function (secure server-side processing)
    /// Note: newUserId is used for analytics only; Cloud Function uses auth token for the actual user
    func processReferral(referralCode: String, newUserId: String) async throws -> Bool {
        do {
            let callable = functions.httpsCallable("processReferral")
            let result = try await callable.call(["referralCode": referralCode])

            guard let data = result.data as? [String: Any],
                  let success = data["success"] as? Bool else {
                print("❌ Invalid response from processReferral function")
                return false
            }

            if success {
                let creditsAwarded = data["creditsAwarded"] as? Int ?? 0

                // Track analytics
                if creditsAwarded > 0 {
                    AnalyticsService.shared.logCreditsAwarded(amount: creditsAwarded, source: "referral")
                }

                // Fetch referrer info for analytics (optional, won't fail if not found)
                if let user = try? await fetchUser(userId: newUserId),
                   let referrerId = user.referredBy {
                    AnalyticsService.shared.logReferralSuccess(
                        referrerUserId: referrerId,
                        newUserId: newUserId,
                        creditsAwarded: creditsAwarded
                    )
                }

                print("✅ Processed referral via Cloud Function, awarded \(creditsAwarded) credits")
                return true
            } else {
                let error = data["error"] as? String ?? "Unknown error"
                print("❌ Referral failed: \(error)")
                return false
            }
        } catch {
            print("❌ Cloud Function error: \(error.localizedDescription)")
            throw error
        }
    }

    /// Process pending referral code via Cloud Function after first session completion
    /// Note: userId parameter kept for API compatibility; Cloud Function uses auth token
    func processPendingReferral(userId: String) async throws -> Bool {
        _ = userId // Cloud Function uses auth.uid from the authenticated user
        do {
            let callable = functions.httpsCallable("processPendingReferral")
            let result = try await callable.call([:])

            guard let data = result.data as? [String: Any],
                  let success = data["success"] as? Bool else {
                print("❌ Invalid response from processPendingReferral function")
                return false
            }

            if success {
                let creditsAwarded = data["creditsAwarded"] as? Int ?? 0
                print("✅ Processed pending referral via Cloud Function, awarded \(creditsAwarded) credits")
                return true
            } else {
                let error = data["error"] as? String ?? "No pending referral"
                print("ℹ️ Pending referral: \(error)")
                return false
            }
        } catch {
            print("❌ Cloud Function error: \(error.localizedDescription)")
            throw error
        }
    }

    /// Generate unique referral code
    func generateUniqueReferralCode() async throws -> String {
        return try await ensureUniqueReferralCode(User.generateReferralCode())
    }

    // MARK: - Private Helper Methods

    /// Ensure referral code is unique, generate new one if needed
    private func ensureUniqueReferralCode(_ code: String) async throws -> String {
        var currentCode = code
        var attempts = 0
        let maxAttempts = 10

        while attempts < maxAttempts {
            let exists = try await codeExists(currentCode)
            if !exists {
                return currentCode
            }
            currentCode = User.generateReferralCode()
            attempts += 1
        }

        // Fallback: append timestamp to ensure uniqueness
        return currentCode + String(Date().timeIntervalSince1970.rounded())
    }

    /// Check if referral code exists in Firestore
    private func codeExists(_ code: String) async throws -> Bool {
        let snapshot = try await db.collection("users")
            .whereField("referralCode", isEqualTo: code)
            .limit(to: 1)
            .getDocuments()

        return !snapshot.documents.isEmpty
    }

    // MARK: - Account Deletion

    /// Delete all user data from Firestore
    func deleteUserData(userId: String) async throws {
        // 1. Delete user's sessions
        let sessions = try await fetchSessions(userId: userId)
        for session in sessions {
            try await db.collection("sessions").document(session.id).delete()
        }
        print("Deleted \(sessions.count) sessions for user \(userId)")

        // 2. Delete user document
        try await db.collection("users").document(userId).delete()
        print("Deleted user document for \(userId)")
    }

    // MARK: - Purchase Management

    /// Process a purchase atomically: save record and increment credits
    /// Uses a batch write to ensure both operations succeed or fail together
    func processPurchase(userId: String, credits: Int, purchaseRecord: PurchaseRecord) async throws {
        print("🔍 [DEBUG] processPurchase started")
        print("🔍 [DEBUG] - userId parameter: \(userId)")
        print("🔍 [DEBUG] - credits: \(credits)")
        print("🔍 [DEBUG] - purchaseRecord.id: \(purchaseRecord.id)")
        print("🔍 [DEBUG] - purchaseRecord.userId: \(purchaseRecord.userId)")

        // Verify Firebase Auth state
        guard let currentUser = Auth.auth().currentUser else {
            print("❌ [DEBUG] No authenticated user in Firebase Auth!")
            throw PurchaseError.notAuthenticated
        }

        print("🔍 [DEBUG] Firebase Auth currentUser.uid: \(currentUser.uid)")
        print("🔍 [DEBUG] Auth UID matches userId param: \(currentUser.uid == userId)")
        print("🔍 [DEBUG] Auth UID matches purchaseRecord.userId: \(currentUser.uid == purchaseRecord.userId)")

        // Verify UIDs match
        guard currentUser.uid == userId else {
            print("❌ [DEBUG] UID mismatch! Auth: \(currentUser.uid), Param: \(userId)")
            throw PurchaseError.userMismatch
        }

        guard purchaseRecord.userId == userId else {
            print("❌ [DEBUG] PurchaseRecord userId mismatch! Record: \(purchaseRecord.userId), Param: \(userId)")
            throw PurchaseError.userMismatch
        }

        // Check if user document exists
        let userDoc = try await db.collection("users").document(userId).getDocument()
        print("🔍 [DEBUG] User document exists: \(userDoc.exists)")
        if userDoc.exists {
            let userData = userDoc.data()
            print("🔍 [DEBUG] User document fields: \(userData?.keys.joined(separator: ", ") ?? "none")")
            if let currentCredits = userData?["credits"] as? Int {
                print("🔍 [DEBUG] Current credits: \(currentCredits)")
            }
        } else {
            print("⚠️ [DEBUG] User document does NOT exist - will be created with merge")
        }

        // Check for duplicate transaction first
        print("🔍 [DEBUG] Checking for duplicate transaction...")
        let exists = try await purchaseExists(transactionId: purchaseRecord.id)
        if exists {
            print("⚠️ Purchase already exists: \(purchaseRecord.id)")
            throw PurchaseError.duplicateTransaction
        }
        print("🔍 [DEBUG] No duplicate found, proceeding with batch write")

        // Atomic batch write: save purchase record + increment credits
        let batch = db.batch()

        // 1. Save purchase record
        let purchaseRef = db.collection("purchases").document(purchaseRecord.id)
        print("🔍 [DEBUG] Purchase document path: \(purchaseRef.path)")
        try batch.setData(from: purchaseRecord, forDocument: purchaseRef)

        // 2. Increment user credits (use setData with merge to handle missing field)
        let userRef = db.collection("users").document(userId)
        print("🔍 [DEBUG] User document path: \(userRef.path)")
        batch.setData([
            "credits": FieldValue.increment(Int64(credits))
        ], forDocument: userRef, merge: true)

        // Commit the batch
        print("🔍 [DEBUG] Committing batch write...")
        do {
            try await batch.commit()
            print("✅ Processed purchase: \(purchaseRecord.id) - \(credits) credits for user \(userId)")
        } catch let error as NSError {
            print("❌ [DEBUG] Batch commit FAILED!")
            print("❌ [DEBUG] Error domain: \(error.domain)")
            print("❌ [DEBUG] Error code: \(error.code)")
            print("❌ [DEBUG] Error description: \(error.localizedDescription)")
            print("❌ [DEBUG] Error userInfo: \(error.userInfo)")

            // Firestore error codes: https://firebase.google.com/docs/reference/swift/firebasefirestore/api/reference/Enums/FirestoreErrorCode
            if error.domain == "FIRFirestoreErrorDomain" {
                switch error.code {
                case 7: // PERMISSION_DENIED
                    print("❌ [DEBUG] PERMISSION_DENIED - Security rules rejected the operation")
                    print("❌ [DEBUG] Check: 1) Rules deployed? 2) User authenticated? 3) userId in document matches auth.uid?")
                case 3: // INVALID_ARGUMENT
                    print("❌ [DEBUG] INVALID_ARGUMENT - Bad data in the request")
                case 5: // NOT_FOUND
                    print("❌ [DEBUG] NOT_FOUND - Document or collection doesn't exist")
                case 6: // ALREADY_EXISTS
                    print("❌ [DEBUG] ALREADY_EXISTS - Document already exists")
                case 16: // UNAUTHENTICATED
                    print("❌ [DEBUG] UNAUTHENTICATED - No valid auth token")
                default:
                    print("❌ [DEBUG] Other Firestore error code: \(error.code)")
                }
            }
            throw error
        }
    }

    /// Check if a purchase with the given transaction ID already exists
    func purchaseExists(transactionId: String) async throws -> Bool {
        let document = try await db.collection("purchases").document(transactionId).getDocument()
        return document.exists
    }

    /// Fetch purchase history for a user
    func fetchPurchaseHistory(userId: String) async throws -> [PurchaseRecord] {
        let snapshot = try await db.collection("purchases")
            .whereField("userId", isEqualTo: userId)
            .order(by: "purchaseDate", descending: true)
            .getDocuments()

        return snapshot.documents.compactMap { doc in
            try? doc.data(as: PurchaseRecord.self)
        }
    }

    // MARK: - Feedback & Contact Messages

    /// Save feedback to Firestore (triggers email notification via Cloud Function)
    func saveFeedback(
        userId: String,
        userName: String?,
        userEmail: String?,
        rating: Int,
        feedbackType: String,
        message: String
    ) async throws {
        let feedbackData: [String: Any] = [
            "userId": userId,
            "userName": userName ?? "Unknown",
            "userEmail": userEmail ?? "Unknown",
            "rating": rating,
            "feedbackType": feedbackType,
            "message": message,
            "appVersion": "1.0.0",
            "createdAt": FieldValue.serverTimestamp()
        ]

        try await db.collection("feedback").addDocument(data: feedbackData)
        print("✅ Saved feedback to Firestore")
    }

    /// Save contact message to Firestore (triggers email notification via Cloud Function)
    func saveContactMessage(
        userId: String,
        userName: String?,
        userEmail: String?,
        subject: String,
        message: String
    ) async throws {
        let messageData: [String: Any] = [
            "userId": userId,
            "userName": userName ?? "Unknown",
            "userEmail": userEmail ?? "Unknown",
            "subject": subject,
            "message": message,
            "appVersion": "1.0.0",
            "createdAt": FieldValue.serverTimestamp()
        ]

        try await db.collection("contactMessages").addDocument(data: messageData)
        print("✅ Saved contact message to Firestore")
    }
}

// MARK: - Purchase Errors

enum PurchaseError: LocalizedError {
    case duplicateTransaction
    case verificationFailed
    case productNotFound
    case purchaseCancelled
    case notAuthenticated
    case userMismatch
    case unknown(Error)

    var errorDescription: String? {
        switch self {
        case .duplicateTransaction:
            return "This purchase has already been processed."
        case .verificationFailed:
            return "Purchase verification failed. Please contact support."
        case .productNotFound:
            return "Product not found. Please try again."
        case .purchaseCancelled:
            return "Purchase was cancelled."
        case .notAuthenticated:
            return "Not authenticated. Please sign in again."
        case .userMismatch:
            return "User ID mismatch. Please sign out and sign in again."
        case .unknown(let error):
            return "An error occurred: \(error.localizedDescription)"
        }
    }
}
