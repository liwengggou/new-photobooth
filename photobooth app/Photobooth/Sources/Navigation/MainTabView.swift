import SwiftUI

/// Main tab view for the app
struct MainTabView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var lang: LanguageManager
    @Environment(\.theme) var theme
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            // Tab 1: Start/Theme Selection
            NavigationStack(path: $appState.navigationPath) {
                StartScreen()
                    .navigationDestination(for: AppDestination.self) { destination in
                        destinationView(for: destination)
                    }
            }
            .tabItem {
                Label(lang.tabStart, systemImage: "camera.fill")
            }
            .tag(0)

            // Tab 2: Profile/Credits - Always use light theme
            NavigationStack {
                ProfileScreen()
            }
            .theme(.jpKawaii)
            .tabItem {
                Label(lang.tabProfile, systemImage: "person.fill")
            }
            .tag(1)

            // Tab 3: Settings - Always use light theme
            NavigationStack {
                SettingsScreen()
            }
            .theme(.jpKawaii)
            .tabItem {
                Label(lang.tabSettings, systemImage: "gearshape.fill")
            }
            .tag(2)
        }
        .tint(.black)
    }

    @ViewBuilder
    private func destinationView(for destination: AppDestination) -> some View {
        switch destination {
        case .home:
            StartScreen()
        case .settings:
            SettingsScreen()
        case .referral:
            ReferralScreen()
        case .intervalSelection:
            IntervalSelectionScreen()
                .toolbar(.hidden, for: .tabBar)
        case .camera:
            CameraScreen()
                .toolbar(.hidden, for: .tabBar)
        case .photoReview:
            PhotoReviewScreen()
                .toolbar(.hidden, for: .tabBar)
        case .styleSelection:
            StyleSelectionScreen()
                .toolbar(.hidden, for: .tabBar)
        case .processing:
            ProcessingScreen()
                .toolbar(.hidden, for: .tabBar)
        case .customization:
            CustomizationScreen()
                .toolbar(.hidden, for: .tabBar)
        case .preview:
            PreviewScreen()
                .toolbar(.hidden, for: .tabBar)
        case .success:
            SuccessScreen()
                .toolbar(.hidden, for: .tabBar)
        case .login, .signup:
            EmptyView()
        }
    }
}

#Preview {
    MainTabView()
        .environmentObject(AppState())
        .environmentObject(LanguageManager.shared)
}
