import Foundation
import StoreKit
import FirebaseAuth

/// Purchase state for tracking UI
enum PurchaseState: Equatable {
    case idle
    case loading
    case purchasing(String) // Product ID
    case success(Int) // Credits delivered
    case failed(String) // Error message

    static func == (lhs: PurchaseState, rhs: PurchaseState) -> Bool {
        switch (lhs, rhs) {
        case (.idle, .idle): return true
        case (.loading, .loading): return true
        case (.purchasing(let a), .purchasing(let b)): return a == b
        case (.success(let a), .success(let b)): return a == b
        case (.failed(let a), .failed(let b)): return a == b
        default: return false
        }
    }
}

/// Manager for StoreKit 2 in-app purchases
@MainActor
final class StoreKitManager: ObservableObject {
    static let shared = StoreKitManager()

    /// Available products from App Store
    @Published private(set) var products: [Product] = []

    /// Current purchase state
    @Published var purchaseState: PurchaseState = .idle

    /// Purchase history from Firestore
    @Published private(set) var purchaseHistory: [PurchaseRecord] = []

    /// Whether products are loading
    @Published private(set) var isLoadingProducts = false

    /// Task handle for transaction listener
    private var transactionListenerTask: Task<Void, Never>?

    private init() {
        // Start listening for transactions
        transactionListenerTask = listenForTransactions()
    }

    deinit {
        transactionListenerTask?.cancel()
    }

    // MARK: - Product Loading

    /// Load products from the App Store
    func loadProducts() async {
        guard !isLoadingProducts else { return }

        isLoadingProducts = true
        defer { isLoadingProducts = false }

        do {
            let storeProducts = try await Product.products(for: CreditProduct.allProductIds)

            // Sort products by credits (ascending)
            products = storeProducts.sorted { product1, product2 in
                let credits1 = CreditProduct.credits(for: product1.id) ?? 0
                let credits2 = CreditProduct.credits(for: product2.id) ?? 0
                return credits1 < credits2
            }

            print("✅ Loaded \(products.count) products from App Store")
        } catch {
            print("❌ Failed to load products: \(error)")
        }
    }

    // MARK: - Purchase Flow

    /// Purchase a product and deliver credits to the user
    @discardableResult
    func purchase(_ product: Product, userId: String) async -> Bool {
        guard case .idle = purchaseState else {
            print("⚠️ Purchase already in progress")
            return false
        }

        purchaseState = .purchasing(product.id)

        // Log analytics
        if let creditProduct = CreditProduct(rawValue: product.id) {
            AnalyticsService.shared.logPurchaseInitiated(
                productId: product.id,
                credits: creditProduct.credits
            )
        }

        do {
            // Start the purchase
            let result = try await product.purchase()

            switch result {
            case .success(let verification):
                // Verify the transaction
                let transaction = try checkVerified(verification)

                // Validate Firebase Auth state before delivering credits
                guard let authUser = Auth.auth().currentUser else {
                    print("❌ Firebase Auth: No authenticated user")
                    purchaseState = .failed("Not authenticated. Please sign in again.")
                    return false
                }

                // Ensure passed userId matches authenticated user
                guard authUser.uid == userId else {
                    print("❌ User ID mismatch: Auth=\(authUser.uid), Passed=\(userId)")
                    purchaseState = .failed("User ID mismatch. Please sign out and sign in again.")
                    return false
                }

                // Refresh token to ensure it's valid before Firestore write
                do {
                    _ = try await authUser.getIDToken(forcingRefresh: true)
                    print("🔐 Firebase Auth token refreshed successfully")
                } catch {
                    print("❌ Failed to refresh auth token: \(error.localizedDescription)")
                    purchaseState = .failed("Session expired. Please sign in again.")
                    return false
                }

                // Deliver credits
                let success = await deliverCredits(for: transaction, product: product, userId: userId)

                if success {
                    // Finish the transaction
                    await transaction.finish()

                    let credits = CreditProduct.credits(for: product.id) ?? 0
                    purchaseState = .success(credits)

                    // Log success analytics
                    AnalyticsService.shared.logPurchaseCompleted(
                        productId: product.id,
                        credits: credits,
                        price: product.price,
                        currency: product.priceFormatStyle.currencyCode
                    )

                    return true
                } else {
                    let errorDetail = lastError ?? "Unknown error"
                    purchaseState = .failed("Failed to deliver credits: \(errorDetail)")
                    return false
                }

            case .userCancelled:
                purchaseState = .idle
                AnalyticsService.shared.logPurchaseFailed(
                    productId: product.id,
                    error: "User cancelled"
                )
                return false

            case .pending:
                purchaseState = .idle
                print("⏳ Purchase pending approval")
                return false

            @unknown default:
                purchaseState = .failed("Unknown purchase result")
                return false
            }
        } catch let error as StoreKitError {
            let errorMessage = handleStoreKitError(error)
            purchaseState = .failed(errorMessage)
            AnalyticsService.shared.logPurchaseFailed(
                productId: product.id,
                error: errorMessage
            )
            return false
        } catch {
            purchaseState = .failed(error.localizedDescription)
            AnalyticsService.shared.logPurchaseFailed(
                productId: product.id,
                error: error.localizedDescription
            )
            return false
        }
    }

    /// Reset purchase state to idle
    func resetPurchaseState() {
        purchaseState = .idle
    }

    // MARK: - Restore Purchases

    /// Restore purchases (mainly for debugging - consumables don't restore)
    func restorePurchases() async {
        purchaseState = .loading

        do {
            try await AppStore.sync()
            purchaseState = .idle
            print("✅ Restored purchases")
        } catch {
            purchaseState = .failed("Failed to restore purchases: \(error.localizedDescription)")
            print("❌ Failed to restore purchases: \(error)")
        }
    }

    // MARK: - Purchase History

    /// Load purchase history from Firestore
    func loadPurchaseHistory(userId: String) async {
        do {
            purchaseHistory = try await FirebaseService.shared.fetchPurchaseHistory(userId: userId)
            print("✅ Loaded \(purchaseHistory.count) purchase records")
        } catch {
            print("❌ Failed to load purchase history: \(error)")
        }
    }

    // MARK: - Transaction Listener

    /// Listen for unfinished transactions (e.g., interrupted purchases)
    private func listenForTransactions() -> Task<Void, Never> {
        Task.detached { [weak self] in
            for await result in Transaction.updates {
                do {
                    let transaction = try await self?.checkVerified(result)

                    if let transaction = transaction {
                        print("📦 Transaction update: \(transaction.id)")

                        // Note: We can't deliver credits here without userId
                        // The user should trigger a manual sync or the app should
                        // check for unfinished transactions on launch

                        await transaction.finish()
                    }
                } catch {
                    print("❌ Transaction verification failed: \(error)")
                }
            }
        }
    }

    /// Check for unfinished transactions on app launch
    func checkUnfinishedTransactions(userId: String) async {
        for await result in Transaction.unfinished {
            do {
                let transaction = try checkVerified(result)

                // Check if we already processed this
                let exists = try await FirebaseService.shared.purchaseExists(transactionId: String(transaction.id))

                if !exists {
                    // Find the product to get price info
                    if let product = products.first(where: { $0.id == transaction.productID }) {
                        let success = await deliverCredits(for: transaction, product: product, userId: userId)
                        if success {
                            await transaction.finish()
                            print("✅ Recovered unfinished transaction: \(transaction.id)")
                        }
                    }
                } else {
                    // Already processed, just finish it
                    await transaction.finish()
                }
            } catch {
                print("❌ Failed to process unfinished transaction: \(error)")
            }
        }
    }

    // MARK: - Private Helpers

    /// Verify transaction using StoreKit 2's built-in verification
    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            print("❌ Transaction verification failed: \(error)")
            throw PurchaseError.verificationFailed
        case .verified(let safe):
            return safe
        }
    }

    /// Last error message for debugging
    @Published var lastError: String?

    /// Deliver credits to the user via Firestore
    private func deliverCredits(for transaction: Transaction, product: Product, userId: String) async -> Bool {
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print("🔄 [deliverCredits] START")
        print("🔄 Product: \(product.id)")
        print("🔄 Transaction ID: \(transaction.id)")
        print("🔄 User ID parameter: \(userId)")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

        // Debug: Log Firebase Auth state
        let authUser = Auth.auth().currentUser
        print("🔐 [AUTH CHECK]")
        print("🔐 Auth.auth().currentUser?.uid: \(authUser?.uid ?? "nil")")
        print("🔐 Auth.auth().currentUser?.email: \(authUser?.email ?? "nil")")
        print("🔐 Auth.auth().currentUser?.isAnonymous: \(authUser?.isAnonymous ?? false)")
        print("🔐 Passed userId: \(userId)")
        print("🔐 UIDs match: \(authUser?.uid == userId)")

        // Verify token is still valid and force refresh
        if let authUser = authUser {
            do {
                // Force refresh the token right before Firestore write
                let token = try await authUser.getIDToken(forcingRefresh: true)
                print("🔐 [TOKEN] Refreshed successfully, length: \(token.count)")

                // Decode and log token claims for debugging (first 50 chars)
                print("🔐 [TOKEN] Preview: \(String(token.prefix(50)))...")
            } catch {
                print("❌ [TOKEN ERROR] \(error.localizedDescription)")
                print("❌ [TOKEN ERROR] Full: \(error)")
                lastError = "Authentication token invalid: \(error.localizedDescription)"
                return false
            }
        } else {
            print("❌ [AUTH ERROR] No authenticated user!")
            lastError = "No authenticated user"
            return false
        }

        guard let credits = CreditProduct.credits(for: product.id) else {
            let error = "Unknown product ID: \(product.id)"
            print("❌ [PRODUCT ERROR] \(error)")
            lastError = error
            return false
        }

        // Determine environment
        let environment = transaction.environment == .sandbox ? "sandbox" : "production"
        print("🔄 [PURCHASE INFO]")
        print("🔄 Environment: \(environment)")
        print("🔄 Credits to deliver: \(credits)")
        print("🔄 Price: \(product.price) \(product.priceFormatStyle.currencyCode)")

        // Create purchase record
        let purchaseRecord = PurchaseRecord(
            id: String(transaction.id),
            userId: userId,
            productId: product.id,
            credits: credits,
            price: product.price,
            currency: product.priceFormatStyle.currencyCode,
            purchaseDate: transaction.purchaseDate,
            environment: environment,
            originalTransactionId: transaction.originalID != transaction.id ? String(transaction.originalID) : nil
        )

        print("🔄 [PURCHASE RECORD]")
        print("🔄 ID: \(purchaseRecord.id)")
        print("🔄 userId in record: \(purchaseRecord.userId)")
        print("🔄 productId: \(purchaseRecord.productId)")

        print("🔄 [FIRESTORE] Calling processPurchase...")

        do {
            try await FirebaseService.shared.processPurchase(
                userId: userId,
                credits: credits,
                purchaseRecord: purchaseRecord
            )
            print("✅ [SUCCESS] Credits delivered successfully!")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            return true
        } catch PurchaseError.duplicateTransaction {
            // Already processed - this is okay
            print("⚠️ [DUPLICATE] Transaction already processed: \(transaction.id)")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            return true
        } catch PurchaseError.notAuthenticated {
            print("❌ [AUTH FAILED] User not authenticated when writing to Firestore")
            lastError = "Not authenticated. Please sign in again."
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            return false
        } catch PurchaseError.userMismatch {
            print("❌ [UID MISMATCH] User IDs don't match")
            lastError = "User ID mismatch. Please sign out and sign in again."
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            return false
        } catch let nsError as NSError {
            print("❌ [FIRESTORE ERROR]")
            print("❌ Domain: \(nsError.domain)")
            print("❌ Code: \(nsError.code)")
            print("❌ Description: \(nsError.localizedDescription)")
            print("❌ UserInfo: \(nsError.userInfo)")

            // Provide specific guidance based on error code
            if nsError.domain == "FIRFirestoreErrorDomain" && nsError.code == 7 {
                print("❌ [DIAGNOSIS] PERMISSION_DENIED error")
                print("❌ Possible causes:")
                print("❌   1. Firestore rules not deployed (run: firebase deploy --only firestore:rules)")
                print("❌   2. Auth token expired or invalid")
                print("❌   3. userId in document doesn't match auth.uid")
                print("❌   4. User document doesn't exist and rules don't allow create")
            }

            lastError = nsError.localizedDescription
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            return false
        } catch {
            let errorMsg = "Failed to deliver credits: \(error.localizedDescription)"
            print("❌ [UNKNOWN ERROR] \(errorMsg)")
            print("❌ Full error: \(error)")
            print("❌ Error type: \(type(of: error))")
            lastError = errorMsg
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            return false
        }
    }

    /// Handle StoreKit errors with user-friendly messages
    private func handleStoreKitError(_ error: StoreKitError) -> String {
        switch error {
        case .networkError:
            return "Network error. Please check your connection and try again."
        case .systemError:
            return "System error. Please try again later."
        case .userCancelled:
            return "Purchase cancelled."
        case .notAvailableInStorefront:
            return "This product is not available in your region."
        case .notEntitled:
            return "You are not entitled to this product."
        case .unknown:
            return "An unknown error occurred. Please try again."
        default:
            return "An error occurred. Please try again."
        }
    }
}
