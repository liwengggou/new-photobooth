import SwiftUI

/// Referral screen for earning credits
struct ReferralScreen: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.theme) var theme
    @EnvironmentObject private var lang: LanguageManager
    @State private var showShareSheet = false
    @State private var copiedToClipboard = false

    // Mock referral data - will be replaced with real data
    private var referralCode: String {
        appState.currentUser?.referralCode ?? "PHOTO123"
    }

    private var referralCount: Int {
        appState.currentUser?.referralCount ?? 0
    }

    private var referralLink: String {
        "https://photobooth.app/ref/\(referralCode)"
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Header with smaller top margin
                VStack(alignment: .leading, spacing: 4) {
                    Text(lang.earnCreditsTitle)
                        .font(Typography.display(32, weight: .black))
                        .trackingTight()
                        .foregroundColor(.black)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 24)
                .padding(.top, 8)

                VStack(spacing: theme.spacing.xxl) {
                    // Header Card with How It Works steps
                    headerCard

                    // Referral Code Section
                    referralCodeSection

                    // Progress Section
                    progressSection
                }
                .padding(.horizontal, 24)
                .padding(.top, theme.spacing.xxl)
            }
        }
        .background(Color.white.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showShareSheet) {
            ShareSheet(items: [
                lang.referralShareMessage(referralCode, referralLink)
            ])
        }
    }

    // MARK: - Header Card

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: theme.spacing.lg) {
            Text(lang.referFriendsEarnCredits)
                .font(Typography.display(20, weight: .bold))
                .trackingTight()
                .foregroundColor(theme.text)

            VStack(spacing: theme.spacing.md) {
                HowItWorksStep(
                    number: 1,
                    title: lang.shareYourCode,
                    description: lang.shareCodeDescription
                )

                HowItWorksStep(
                    number: 2,
                    title: lang.friendsSignUp,
                    description: lang.friendsSignUpDescription
                )

                HowItWorksStep(
                    number: 3,
                    title: lang.earnCreditsStep,
                    description: lang.earnCreditsStepDescription
                )
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .photoboothCard()
    }

    // MARK: - Referral Code Section

    private var referralCodeSection: some View {
        VStack(alignment: .leading, spacing: theme.spacing.lg) {
            Text(lang.yourReferralCode)
                .font(Typography.display(20, weight: .bold))
                .trackingTight()
                .foregroundColor(theme.text)

            VStack(spacing: theme.spacing.lg) {
                // Code Display
                HStack {
                    Text(referralCode)
                        .font(.system(size: 28, weight: .bold, design: .monospaced))
                        .foregroundColor(theme.text)

                    Spacer()

                    Button {
                        UIPasteboard.general.string = referralCode
                        AnalyticsService.shared.logReferralShared(code: referralCode, method: "clipboard")
                        withAnimation {
                            copiedToClipboard = true
                        }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                            copiedToClipboard = false
                        }
                    } label: {
                        Image(systemName: copiedToClipboard ? "checkmark.circle.fill" : "doc.on.doc")
                            .font(.title3)
                            .foregroundColor(copiedToClipboard ? .green : .black)
                    }
                }
                .padding(theme.spacing.lg)
                .background(Color.black.opacity(0.05))
                .cornerRadius(theme.corners.medium)

                // Share Button
                Button {
                    AnalyticsService.shared.logReferralShared(code: referralCode, method: "share_sheet")
                    showShareSheet = true
                } label: {
                    HStack {
                        Image(systemName: "square.and.arrow.up")
                        Text(lang.shareReferralLink)
                    }
                    .font(Typography.bodyLG.bold())
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, theme.spacing.lg)
                    .background(Color.black)
                    .foregroundColor(.white)
                    .cornerRadius(theme.corners.medium)
                }
            }
        }
        .photoboothCard()
    }

    // MARK: - Progress Section

    private var progressSection: some View {
        VStack(alignment: .leading, spacing: theme.spacing.lg) {
            VStack(alignment: .leading, spacing: 4) {
                Text(lang.yourProgress)
                    .font(Typography.display(20, weight: .bold))
                    .trackingTight()
                    .foregroundColor(theme.text)

                Text(lang.creditEqualsSession)
                    .font(Typography.bodySM)
                    .foregroundColor(theme.textSecondary)
            }

            VStack(spacing: theme.spacing.md) {
                ReferralTierRow(
                    tier: 1,
                    referralsNeeded: 1,
                    credits: 3,
                    currentReferrals: referralCount,
                    isCompleted: referralCount >= 1
                )

                ReferralTierRow(
                    tier: 2,
                    referralsNeeded: 2,
                    credits: 8,
                    currentReferrals: referralCount,
                    isCompleted: referralCount >= 2
                )

                ReferralTierRow(
                    tier: 3,
                    referralsNeeded: 3,
                    credits: 15,
                    currentReferrals: referralCount,
                    isCompleted: referralCount >= 3
                )
            }

            Text(lang.creditsNote)
                .font(Typography.bodySM)
                .foregroundColor(theme.textSecondary)
        }
        .photoboothCard()
    }

}

// MARK: - Referral Tier Row

struct ReferralTierRow: View {
    @Environment(\.theme) var theme
    @EnvironmentObject private var lang: LanguageManager
    let tier: Int
    let referralsNeeded: Int
    let credits: Int
    let currentReferrals: Int
    let isCompleted: Bool

    var body: some View {
        HStack {
            // Status Icon
            ZStack {
                Circle()
                    .fill(isCompleted ? Color.black : Color.black.opacity(0.1))
                    .frame(width: 32, height: 32)

                if isCompleted {
                    Image(systemName: "checkmark")
                        .font(Typography.bodySM)
                        .foregroundColor(.white)
                } else {
                    Text("\(tier)")
                        .font(Typography.bodySM)
                        .foregroundColor(theme.textSecondary)
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(lang.referralCount(referralsNeeded))
                    .font(Typography.bodyMD.bold())
                    .foregroundColor(theme.text)

                Text(lang.referralCompleted(currentReferrals, referralsNeeded))
                    .font(Typography.bodyXS)
                    .foregroundColor(theme.textSecondary)
            }

            Spacer()

            HStack(spacing: 4) {
                Image(systemName: "star.fill")
                    .foregroundColor(.black)
                Text("\(credits)")
                    .font(Typography.bodyLG.bold())
                    .foregroundColor(theme.text)
            }
        }
        .padding(theme.spacing.md)
        .background(isCompleted ? Color.black.opacity(0.05) : Color.black.opacity(0.02))
        .cornerRadius(theme.corners.medium)
    }
}

// MARK: - How It Works Step

struct HowItWorksStep: View {
    @Environment(\.theme) var theme
    let number: Int
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .center, spacing: theme.spacing.lg) {
            ZStack {
                Circle()
                    .fill(Color.black.opacity(0.1))
                    .frame(width: 32, height: 32)

                Text("\(number)")
                    .font(Typography.bodySM.bold())
                    .foregroundColor(.black)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(Typography.bodyMD.bold())
                    .foregroundColor(theme.text)

                Text(description)
                    .font(Typography.bodySM)
                    .foregroundColor(theme.textSecondary)
            }

            Spacer()
        }
        .padding(theme.spacing.md)
        .background(Color.black.opacity(0.02))
        .cornerRadius(theme.corners.medium)
    }
}

#Preview {
    NavigationStack {
        ReferralScreen()
            .environmentObject(AppState())
    }
}
