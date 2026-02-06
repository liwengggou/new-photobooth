import SwiftUI

/// Start screen with theme selection as the main focus
struct StartScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var lang: LanguageManager
    @Environment(\.theme) var theme
    @State private var showInsufficientCredits = false

    // Mock data - will be replaced with real user data
    @State private var credits = 3

    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 0) {
                // Header Section - stays at top
                ScreenHeader(
                    lang.chooseYourStyle,
                    subtitle: lang.selectThemeSubtitle
                )

                // Flexible space to center buttons (slightly higher due to tab bar)
                Spacer()

                // Style Selection Cards - centered but slightly higher
                VStack(spacing: theme.spacing.lg) {
                    ForEach(PhotoStyle.allCases, id: \.self) { style in
                        ThemeCardButton(
                            style: style,
                            isSelected: false
                        ) {
                            if credits > 0 {
                                appState.startNewSession()
                                appState.selectStyle(style)
                                appState.navigate(to: .intervalSelection)
                            } else {
                                showInsufficientCredits = true
                            }
                        }
                    }
                }
                .padding(.horizontal, theme.spacing.xl)

                // Larger bottom spacer to push buttons up (accounts for tab bar)
                Spacer()
                Spacer()
            }
        }
        .background(Color.white.ignoresSafeArea())
        .alert(lang.insufficientCredits, isPresented: $showInsufficientCredits) {
            Button(lang.getCredits) {
                appState.navigate(to: .referral)
            }
            Button(lang.cancel, role: .cancel) { }
        } message: {
            Text(lang.insufficientCreditsMessage)
        }
    }
}

#Preview {
    NavigationStack {
        StartScreen()
            .environmentObject(AppState())
            .environmentObject(LanguageManager.shared)
    }
}
