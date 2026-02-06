import SwiftUI
import FirebaseCore

@main
struct PhotoboothApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var authViewModel = AuthViewModel()
    @StateObject private var languageManager = LanguageManager.shared

    init() {
        FirebaseApp.configure()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .environmentObject(authViewModel)
                .environmentObject(languageManager)
                .theme(appState.currentTheme)
                .onOpenURL { url in
                    handleDeepLink(url)
                }
        }
    }

    // MARK: - Deep Linking

    private func handleDeepLink(_ url: URL) {
        print("📱 Received deep link: \(url)")

        // Handle custom URL scheme: photobooth://ref/ABCD1234
        if url.scheme == "photobooth" {
            if url.host == "ref" || url.host == "referral" {
                // Extract referral code from path
                let pathComponents = url.pathComponents.filter { $0 != "/" }
                if let referralCode = pathComponents.first, !referralCode.isEmpty {
                    print("✅ Extracted referral code: \(referralCode)")
                    appState.pendingReferralCode = referralCode
                }
            }
        }

        // Handle universal links: https://photobooth.app/ref/ABCD1234
        if url.scheme == "https" || url.scheme == "http" {
            let pathComponents = url.pathComponents.filter { $0 != "/" }
            if pathComponents.count >= 2 && pathComponents[0] == "ref" {
                let referralCode = pathComponents[1]
                print("✅ Extracted referral code from universal link: \(referralCode)")
                appState.pendingReferralCode = referralCode
            }
        }
    }
}
