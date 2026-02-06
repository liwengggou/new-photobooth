import SwiftUI

/// Main home screen with credits display and navigation
struct HomeScreen: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.theme) var theme

    @State private var showInsufficientCredits = false

    /// Current user's credits from AppState
    private var credits: Int {
        appState.currentUser?.credits ?? 0
    }

    var body: some View {
        ScrollView {
            VStack(spacing: theme.spacing.xxl) {
                // Credits Card
                creditsCard

                // Start Photobooth Button
                startButton

                // Quick Actions
                quickActionsSection
            }
            .padding(theme.spacing.xl)
        }
        .photoboothBackground()
        .navigationTitle("Photobooth")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    appState.navigate(to: .settings)
                } label: {
                    Image(systemName: "gearshape.fill")
                        .foregroundColor(theme.text)
                }
            }
        }
        .alert("Insufficient Credits", isPresented: $showInsufficientCredits) {
            Button("Get Credits") {
                appState.navigate(to: .referral)
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("You need at least 1 credit to start a photo session. Refer friends to earn more credits!")
        }
    }

    // MARK: - Credits Card

    private var creditsCard: some View {
        VStack(spacing: theme.spacing.lg) {
            HStack {
                VStack(alignment: .leading, spacing: theme.spacing.xs) {
                    Text("Your Credits")
                        .font(Typography.bodyMD)
                        .foregroundColor(theme.textSecondary)

                    HStack(alignment: .firstTextBaseline, spacing: theme.spacing.xs) {
                        Text("\(credits)")
                            .font(.system(size: 48, weight: .bold))
                            .foregroundColor(theme.text)
                        Text("credits")
                            .font(Typography.bodyLG)
                            .foregroundColor(theme.textSecondary)
                    }
                }

                Spacer()

                // Credit icon
                ZStack {
                    Circle()
                        .fill(theme.accent)
                        .frame(width: 60, height: 60)

                    Image(systemName: "star.fill")
                        .font(.title)
                        .foregroundColor(theme.text.opacity(0.3))
                }
            }

            Divider()
                .background(theme.textSecondary.opacity(0.2))

            // Get more credits link
            Button {
                appState.navigate(to: .referral)
            } label: {
                HStack {
                    Image(systemName: "gift.fill")
                        .foregroundColor(theme.text)
                    Text("Refer friends to earn more credits")
                        .font(Typography.bodyMD)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(Typography.bodyXS)
                        .foregroundColor(theme.textSecondary)
                }
            }
            .foregroundColor(theme.text)
        }
        .photoboothCard()
    }

    // MARK: - Start Button

    private var startButton: some View {
        Button {
            if credits > 0 {
                appState.startNewSession()
                appState.navigate(to: .styleSelection)
            } else {
                showInsufficientCredits = true
            }
        } label: {
            HStack(spacing: theme.spacing.md) {
                Image(systemName: "camera.fill")
                    .font(.title2)
                Text("Start Photobooth")
                    .font(Typography.displaySM)
            }
        }
        .photoboothPrimaryButton()
    }

    // MARK: - Quick Actions

    private var quickActionsSection: some View {
        HStack(spacing: theme.spacing.lg) {
            QuickActionCard(
                icon: "gift.fill",
                title: "Refer"
            ) {
                appState.navigate(to: .referral)
            }

            QuickActionCard(
                icon: "gearshape.fill",
                title: "Settings"
            ) {
                appState.navigate(to: .settings)
            }
        }
    }

}

// MARK: - Quick Action Card

struct QuickActionCard: View {
    @Environment(\.theme) var theme

    let icon: String
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: theme.spacing.md) {
                ZStack {
                    Circle()
                        .fill(theme.accent)
                        .frame(width: 50, height: 50)

                    Image(systemName: icon)
                        .font(.title3)
                        .foregroundColor(theme.text)
                }

                Text(title)
                    .font(Typography.bodySM)
                    .foregroundColor(theme.text)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, theme.spacing.lg)
            .photoboothCard()
        }
    }
}

#Preview {
    NavigationStack {
        HomeScreen()
            .environmentObject(AppState())
    }
}
