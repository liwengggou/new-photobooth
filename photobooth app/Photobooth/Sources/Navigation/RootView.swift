import SwiftUI

/// Root view that handles app-level navigation
struct RootView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var authViewModel: AuthViewModel

    var body: some View {
        Group {
            if appState.isShowingSplash {
                SplashScreen()
            } else if !appState.isAuthenticated {
                AuthNavigationView()
            } else {
                MainNavigationView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: appState.isShowingSplash)
        .animation(.easeInOut(duration: 0.3), value: appState.isAuthenticated)
    }
}

/// Navigation container for authentication flow
struct AuthNavigationView: View {
    var body: some View {
        NavigationStack {
            LoginScreen()
        }
    }
}

/// Navigation container for main app flow
struct MainNavigationView: View {
    var body: some View {
        MainTabView()
    }
}

#Preview {
    RootView()
        .environmentObject(AppState())
        .environmentObject(AuthViewModel())
}
