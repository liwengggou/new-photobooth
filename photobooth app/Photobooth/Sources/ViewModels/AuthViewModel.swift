import SwiftUI
import Foundation
import FirebaseAuth
import GoogleSignIn
import AuthenticationServices
import CryptoKit

/// Handles authentication state and actions
@MainActor
final class AuthViewModel: NSObject, ObservableObject {
    // MARK: - Published Properties
    @Published var email = ""
    @Published var password = ""
    @Published var displayName = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showError = false

    // MARK: - Private Properties
    private var currentNonce: String?
    private var appleSignInContinuation: CheckedContinuation<User?, Never>?
    private var pendingAppleReferralCode: String?

    // MARK: - Authentication Methods

    /// Sign in with email and password
    func signInWithEmail() async -> User? {
        guard validateEmailPassword() else { return nil }

        isLoading = true
        errorMessage = nil

        do {
            let result = try await Auth.auth().signIn(withEmail: email, password: password)
            print("✅ Successfully signed in user: \(result.user.uid)")

            // Track login
            AnalyticsService.shared.logLogin(method: "email")
            AnalyticsService.shared.setUserId(result.user.uid)

            // Fetch user from Firestore
            let user = try await FirebaseService.shared.fetchUser(userId: result.user.uid)

            isLoading = false
            return user
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            isLoading = false
            return nil
        }
    }

    /// Sign up with email and password
    func signUpWithEmail(referralCode: String? = nil) async -> User? {
        guard validateEmailPassword() else { return nil }
        guard !displayName.isEmpty else {
            errorMessage = "Please enter your name"
            showError = true
            return nil
        }

        isLoading = true
        errorMessage = nil

        do {
            let result = try await Auth.auth().createUser(withEmail: email, password: password)

            // Update user profile with display name
            let changeRequest = result.user.createProfileChangeRequest()
            changeRequest.displayName = displayName
            try await changeRequest.commitChanges()

            // Create user in Firestore with pending referral code (processed on first session)
            let newUser = User(
                id: result.user.uid,
                email: email,
                displayName: displayName,
                credits: 3,
                referralCode: User.generateReferralCode(),
                referredBy: nil,
                referralCount: 0,
                createdAt: Date(),
                pendingReferralCode: referralCode?.isEmpty == false ? referralCode : nil
            )

            try await FirebaseService.shared.createUser(newUser)

            // Track sign up
            AnalyticsService.shared.logSignUp(method: "email")
            AnalyticsService.shared.setUserId(result.user.uid)

            print("✅ Successfully created user: \(result.user.uid)")

            isLoading = false
            return newUser
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            isLoading = false
            return nil
        }
    }

    /// Sign in with Google
    func signInWithGoogle(referralCode: String? = nil) async -> User? {
        isLoading = true
        errorMessage = nil

        do {
            // Get the client ID from Firebase
            guard let clientID = Auth.auth().app?.options.clientID else {
                errorMessage = "Failed to get Google client ID"
                showError = true
                isLoading = false
                return nil
            }

            // Configure Google Sign-In
            let config = GIDConfiguration(clientID: clientID)
            GIDSignIn.sharedInstance.configuration = config

            // Get the presenting view controller
            guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let rootViewController = windowScene.windows.first?.rootViewController else {
                errorMessage = "Unable to get root view controller"
                showError = true
                isLoading = false
                return nil
            }

            // Sign in with Google
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController)

            guard let idToken = result.user.idToken?.tokenString else {
                errorMessage = "Failed to get ID token"
                showError = true
                isLoading = false
                return nil
            }

            let accessToken = result.user.accessToken.tokenString

            // Create Firebase credential
            let credential = GoogleAuthProvider.credential(withIDToken: idToken, accessToken: accessToken)

            // Sign in to Firebase
            let authResult = try await Auth.auth().signIn(with: credential)

            // Create or update user in Firestore
            let userEmail = authResult.user.email ?? ""
            let userName = authResult.user.displayName ?? "User"

            // Check if user already exists
            var user = try? await FirebaseService.shared.fetchUser(userId: authResult.user.uid)

            if user == nil {
                // Create new user with pending referral code (processed on first session)
                let newUser = User(
                    id: authResult.user.uid,
                    email: userEmail,
                    displayName: userName,
                    credits: 3,
                    referralCode: User.generateReferralCode(),
                    referredBy: nil,
                    referralCount: 0,
                    createdAt: Date(),
                    pendingReferralCode: referralCode?.isEmpty == false ? referralCode : nil
                )
                try await FirebaseService.shared.createUser(newUser)
                user = newUser

                // Track sign up
                AnalyticsService.shared.logSignUp(method: "google")
                AnalyticsService.shared.setUserId(authResult.user.uid)
            } else {
                // Existing user - track login
                AnalyticsService.shared.logLogin(method: "google")
                AnalyticsService.shared.setUserId(authResult.user.uid)
            }

            print("✅ Successfully signed in with Google: \(authResult.user.uid)")
            isLoading = false
            return user
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            isLoading = false
            return nil
        }
    }

    /// Sign in with Apple
    func signInWithApple(referralCode: String? = nil) async -> User? {
        isLoading = true
        errorMessage = nil

        // Store referral code for the delegate
        pendingAppleReferralCode = referralCode

        // Generate nonce
        let nonce = randomNonceString()
        currentNonce = nonce

        // Create Apple Sign-In request
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = sha256(nonce)

        // Create and present authorization controller
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.performRequests()

        // Wait for the result
        return await withCheckedContinuation { continuation in
            appleSignInContinuation = continuation
        }
    }

    /// Sign out current user
    func signOut() async -> Bool {
        do {
            try Auth.auth().signOut()
            print("Successfully signed out")
            return true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            return false
        }
    }

    /// Delete user account and all associated data
    func deleteAccount() async -> Bool {
        guard let user = Auth.auth().currentUser else {
            errorMessage = "No user is currently signed in"
            showError = true
            return false
        }

        isLoading = true
        errorMessage = nil

        do {
            // 1. Delete user data from Firestore
            try await FirebaseService.shared.deleteUserData(userId: user.uid)

            // 2. Delete local stored collages
            try await StorageService.shared.deleteAllCollages()

            // 3. Delete Firebase Auth account
            try await user.delete()

            print("Successfully deleted account for user: \(user.uid)")
            isLoading = false
            return true

        } catch let error as NSError {
            // Handle re-authentication requirement
            if error.code == AuthErrorCode.requiresRecentLogin.rawValue {
                errorMessage = "Please sign out and sign in again before deleting your account"
            } else {
                errorMessage = "Failed to delete account: \(error.localizedDescription)"
            }
            showError = true
            isLoading = false
            return false
        }
    }

    // MARK: - Validation

    private func validateEmailPassword() -> Bool {
        guard !email.isEmpty else {
            errorMessage = "Please enter your email"
            showError = true
            return false
        }

        guard email.contains("@") && email.contains(".") else {
            errorMessage = "Please enter a valid email"
            showError = true
            return false
        }

        guard password.count >= 6 else {
            errorMessage = "Password must be at least 6 characters"
            showError = true
            return false
        }

        return true
    }

    /// Clear all input fields
    func clearFields() {
        email = ""
        password = ""
        displayName = ""
        errorMessage = nil
        showError = false
    }

    // MARK: - Apple Sign-In Helpers

    private func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        var randomBytes = [UInt8](repeating: 0, count: length)
        let errorCode = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        if errorCode != errSecSuccess {
            fatalError("Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(errorCode)")
        }

        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")

        let nonce = randomBytes.map { byte in
            charset[Int(byte) % charset.count]
        }

        return String(nonce)
    }

    private func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        let hashString = hashedData.compactMap {
            String(format: "%02x", $0)
        }.joined()

        return hashString
    }
}

// MARK: - ASAuthorizationControllerDelegate

extension AuthViewModel: ASAuthorizationControllerDelegate {
    nonisolated func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        Task { @MainActor in
            guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
                errorMessage = "Failed to get Apple ID credential"
                showError = true
                isLoading = false
                appleSignInContinuation?.resume(returning: nil)
                appleSignInContinuation = nil
                return
            }

            guard let nonce = currentNonce else {
                errorMessage = "Invalid state: A login callback was received, but no login request was sent."
                showError = true
                isLoading = false
                appleSignInContinuation?.resume(returning: nil)
                appleSignInContinuation = nil
                return
            }

            guard let appleIDToken = appleIDCredential.identityToken else {
                errorMessage = "Unable to fetch identity token"
                showError = true
                isLoading = false
                appleSignInContinuation?.resume(returning: nil)
                appleSignInContinuation = nil
                return
            }

            guard let idTokenString = String(data: appleIDToken, encoding: .utf8) else {
                errorMessage = "Unable to serialize token string from data"
                showError = true
                isLoading = false
                appleSignInContinuation?.resume(returning: nil)
                appleSignInContinuation = nil
                return
            }

            // Create OAuth credential
            let credential = OAuthProvider.appleCredential(
                withIDToken: idTokenString,
                rawNonce: nonce,
                fullName: appleIDCredential.fullName
            )

            do {
                // Sign in to Firebase
                let authResult = try await Auth.auth().signIn(with: credential)

                // Get user info
                let userEmail = authResult.user.email ?? ""
                let userName = appleIDCredential.fullName?.givenName ?? "User"

                // Check if user already exists
                var user = try? await FirebaseService.shared.fetchUser(userId: authResult.user.uid)

                if user == nil {
                    // Create new user with pending referral code (processed on first session)
                    let newUser = User(
                        id: authResult.user.uid,
                        email: userEmail,
                        displayName: userName,
                        credits: 3,
                        referralCode: User.generateReferralCode(),
                        referredBy: nil,
                        referralCount: 0,
                        createdAt: Date(),
                        pendingReferralCode: pendingAppleReferralCode?.isEmpty == false ? pendingAppleReferralCode : nil
                    )
                    try await FirebaseService.shared.createUser(newUser)
                    user = newUser

                    // Track sign up
                    AnalyticsService.shared.logSignUp(method: "apple")
                    AnalyticsService.shared.setUserId(authResult.user.uid)
                    pendingAppleReferralCode = nil
                } else {
                    // Existing user - track login
                    AnalyticsService.shared.logLogin(method: "apple")
                    AnalyticsService.shared.setUserId(authResult.user.uid)
                }

                print("✅ Successfully signed in with Apple: \(authResult.user.uid)")
                isLoading = false
                appleSignInContinuation?.resume(returning: user)
                appleSignInContinuation = nil
            } catch {
                errorMessage = error.localizedDescription
                showError = true
                isLoading = false
                appleSignInContinuation?.resume(returning: nil)
                appleSignInContinuation = nil
            }
        }
    }

    nonisolated func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        Task { @MainActor in
            errorMessage = error.localizedDescription
            showError = true
            isLoading = false
            appleSignInContinuation?.resume(returning: nil)
            appleSignInContinuation = nil
        }
    }
}
