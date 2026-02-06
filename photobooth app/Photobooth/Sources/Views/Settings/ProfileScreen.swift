import SwiftUI

/// Profile screen with credits and referral information
struct ProfileScreen: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.theme) var theme
    @EnvironmentObject private var lang: LanguageManager
    @StateObject private var viewModel = ProfileViewModel()

    var body: some View {
        VStack(spacing: 0) {
            ScreenHeader(
                lang.profile,
                subtitle: lang.profileSubtitle
            )

            VStack(spacing: theme.spacing.lg) {
                // Row 1: Credits cards
                HStack(spacing: theme.spacing.lg) {
                    creditsCard
                    referralCard
                }

                // Row 2: Streak, Sessions
                HStack(spacing: theme.spacing.lg) {
                    StatSquareBox(
                        icon: "flame.fill",
                        title: lang.streak,
                        value: "\(viewModel.stats?.streakDays ?? 0)",
                        subtitle: lang.days,
                        backgroundColor: .white
                    )

                    StatSquareBox(
                        icon: "photo.stack.fill",
                        title: lang.sessions,
                        value: "\(viewModel.stats?.sessionCount ?? 0)",
                        subtitle: lang.sessionsUnit,
                        backgroundColor: .white
                    )
                }

                // Row 3: Favorite, Referred
                HStack(spacing: theme.spacing.lg) {
                    StatSquareBox(
                        icon: "sparkles",
                        title: lang.favorite,
                        value: viewModel.stats?.favoriteStyle?.displayName ?? "None",
                        subtitle: lang.mostUsedStyle,
                        backgroundColor: .white
                    )

                    StatSquareBox(
                        icon: "bird.fill",
                        title: lang.bestScore,
                        value: "\(UserDefaults.standard.integer(forKey: FlappyBirdGameView.bestScoreKey))",
                        subtitle: lang.flappyBird,
                        backgroundColor: .white
                    )
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, theme.spacing.xl)

            Spacer()
        }
        .background(Color.white.ignoresSafeArea())
        .onAppear {
            if let user = appState.currentUser {
                Task {
                    await viewModel.loadStats(for: user)
                }
            }
        }
        .refreshable {
            if let user = appState.currentUser {
                await viewModel.refresh(for: user)
            }
        }
    }

    // MARK: - Credits Card (Square)

    private var creditsCard: some View {
        GeometryReader { geometry in
            VStack(spacing: theme.spacing.sm) {
                // Header: icon and title stacked vertically
                VStack(alignment: .leading, spacing: theme.spacing.xs) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.black)

                    Text(lang.yourCredits)
                        .font(Typography.body(12, weight: .regular))
                        .tracking(1.5)
                        .foregroundColor(.black)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Spacer()

                // Credits count - centered
                VStack(spacing: 2) {
                    Text("\(viewModel.stats?.credits ?? appState.currentUser?.credits ?? 0)")
                        .font(Typography.display(36, weight: .bold))
                        .foregroundColor(.black)
                    Text(lang.credits)
                        .font(Typography.bodySM)
                        .foregroundColor(.black.opacity(0.7))
                }
                .frame(maxWidth: .infinity, alignment: .center)

                Spacer()
            }
            .padding(.top, 20)
            .padding(.leading, 20)
            .padding(.trailing, theme.spacing.lg)
            .padding(.bottom, theme.spacing.lg)
            .frame(width: geometry.size.width, height: geometry.size.width)
            .background(Color.white)
            .cornerRadius(theme.corners.large)
            .shadow(
                color: .black.opacity(0.08),
                radius: 8,
                x: 0,
                y: 4
            )
        }
        .aspectRatio(1, contentMode: .fit)
    }

    // MARK: - Referral Card (Square)

    private var referralCard: some View {
        GeometryReader { geometry in
            VStack(spacing: theme.spacing.sm) {
                // Header: icon and title stacked vertically
                VStack(alignment: .leading, spacing: theme.spacing.xs) {
                    Image(systemName: "gift.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.black)

                    Text(lang.earnCredits)
                        .font(Typography.body(12, weight: .regular))
                        .tracking(1.5)
                        .foregroundColor(.black)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Spacer()

                // Content - centered
                VStack(spacing: theme.spacing.md) {
                    Text(lang.upTo15Free)
                        .font(Typography.bodySM)
                        .foregroundColor(.black.opacity(0.7))
                        .multilineTextAlignment(.center)

                    NavigationLink(destination: ReferralScreen()) {
                        Text(lang.details)
                            .font(Typography.body(12, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(Color.black)
                            .cornerRadius(8)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .center)

                Spacer()
            }
            .padding(.top, 20)
            .padding(.leading, 20)
            .padding(.trailing, theme.spacing.lg)
            .padding(.bottom, theme.spacing.lg)
            .frame(width: geometry.size.width, height: geometry.size.width)
            .background(Color.white)
            .cornerRadius(theme.corners.large)
            .shadow(
                color: .black.opacity(0.08),
                radius: 8,
                x: 0,
                y: 4
            )
        }
        .aspectRatio(1, contentMode: .fit)
    }

}

// MARK: - Stat Square Box

struct StatSquareBox: View {
    @Environment(\.theme) var theme

    let icon: String
    let title: String
    let value: String
    let subtitle: String
    let backgroundColor: Color
    var isDarkBackground: Bool = false

    private var foregroundColor: Color {
        isDarkBackground ? .white : theme.text
    }

    private var secondaryColor: Color {
        isDarkBackground ? .white.opacity(0.7) : theme.textSecondary
    }

    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: theme.spacing.xs) {
                // Header: icon and title stacked vertically
                VStack(alignment: .leading, spacing: theme.spacing.xs) {
                    Image(systemName: icon)
                        .font(.system(size: 18))
                        .foregroundColor(foregroundColor)

                    Text(title.uppercased())
                        .font(Typography.body(12, weight: .regular))
                        .tracking(1.5)
                        .foregroundColor(foregroundColor)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Spacer()

                // Value and subtitle - centered
                VStack(spacing: 2) {
                    Text(value)
                        .font(Typography.display(36, weight: .bold))
                        .foregroundColor(foregroundColor)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                    Text(subtitle)
                        .font(Typography.bodySM)
                        .foregroundColor(secondaryColor)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                .frame(maxWidth: .infinity, alignment: .center)

                Spacer()
            }
            .padding(.top, 20)
            .padding(.leading, 20)
            .padding(.trailing, theme.spacing.lg)
            .padding(.bottom, theme.spacing.lg)
            .frame(width: geometry.size.width, height: geometry.size.width)
            .background(backgroundColor)
            .cornerRadius(theme.corners.large)
            .shadow(
                color: .black.opacity(0.08),
                radius: 8,
                x: 0,
                y: 4
            )
        }
        .aspectRatio(1, contentMode: .fit)
    }
}

#Preview {
    NavigationStack {
        ProfileScreen()
            .environmentObject(AppState())
    }
}
