import SwiftUI

/// Settings screen with account management
struct SettingsScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var authViewModel: AuthViewModel
    @EnvironmentObject private var lang: LanguageManager
    @Environment(\.theme) var theme
    @State private var showSignOutAlert = false
    @State private var showDeleteAccountAlert = false
    @State private var showEditUsername = false
    @State private var editedUsername = ""
    @State private var showLanguagePicker = false

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                ScreenHeader(
                    lang.settings,
                    subtitle: lang.manageAccount
                )

                VStack(spacing: theme.spacing.xxl) {
                    // Account Section
                    accountCard

                    // Purchases Section
                    purchasesCard

                    // Support Section
                    supportCard

                    // App Section
                    appCard

                    // Account Actions
                    actionsCard
                }
                .padding(.horizontal, 24)
                .padding(.top, theme.spacing.xxl)
            }
        }
        .background(Color.white.ignoresSafeArea())
        .alert(lang.signOut, isPresented: $showSignOutAlert) {
            Button(lang.cancel, role: .cancel) { }
            Button(lang.signOut, role: .destructive) {
                Task {
                    if await authViewModel.signOut() {
                        appState.isAuthenticated = false
                        appState.currentUser = nil
                        appState.popToRoot()
                    }
                }
            }
        } message: {
            Text(lang.signOutConfirm)
        }
        .alert(lang.deleteAccount, isPresented: $showDeleteAccountAlert) {
            Button(lang.cancel, role: .cancel) { }
            Button(lang.deleteAccount, role: .destructive) {
                Task {
                    if await authViewModel.deleteAccount() {
                        appState.isAuthenticated = false
                        appState.currentUser = nil
                        appState.resetSession()
                        appState.popToRoot()
                    }
                }
            }
        } message: {
            Text(lang.deleteAccountConfirm)
        }
        .alert(lang.error, isPresented: $authViewModel.showError) {
            Button(lang.ok, role: .cancel) {
                authViewModel.showError = false
            }
        } message: {
            if let errorMessage = authViewModel.errorMessage {
                Text(errorMessage)
            }
        }
        .alert(lang.editUsername, isPresented: $showEditUsername) {
            TextField(lang.username, text: $editedUsername)
            Button(lang.cancel, role: .cancel) { }
            Button(lang.save) {
                guard let user = appState.currentUser else { return }
                appState.currentUser = User(
                    id: user.id,
                    email: user.email,
                    displayName: editedUsername,
                    credits: user.credits,
                    referralCode: user.referralCode,
                    referralCount: user.referralCount,
                    createdAt: user.createdAt
                )
            }
        } message: {
            Text(lang.enterNewUsername)
        }
        .confirmationDialog(lang.language, isPresented: $showLanguagePicker, titleVisibility: .visible) {
            ForEach(AppLanguage.allCases) { language in
                Button(language.displayName) {
                    lang.current = language
                }
            }
            Button(lang.cancel, role: .cancel) { }
        }
    }

    private var avatarInitials: String {
        let name = appState.currentUser?.displayName ?? "U"
        let components = name.split(separator: " ")
        if components.count >= 2 {
            return String(components[0].prefix(1) + components[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }

    // MARK: - Account Card

    private var accountCard: some View {
        VStack(alignment: .leading, spacing: theme.spacing.lg) {
            Text(lang.account)
                .font(Typography.display(20, weight: .bold))
                .trackingTight()
                .foregroundColor(theme.text)

            VStack(spacing: theme.spacing.md) {
                HStack(spacing: 16) {
                    // Avatar
                    ZStack {
                        Circle()
                            .fill(Color.black)
                            .frame(width: 60, height: 60)

                        Text(avatarInitials)
                            .font(.title2.bold())
                            .foregroundColor(.white)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text(appState.currentUser?.displayName ?? "User")
                            .font(Typography.bodyLG.bold())
                            .foregroundColor(theme.text)
                        Text(appState.currentUser?.email ?? "email@example.com")
                            .font(Typography.bodySM)
                            .foregroundColor(theme.textSecondary)
                    }

                    Spacer()
                }

                Divider()
                    .background(theme.textSecondary.opacity(0.2))

                Button {
                    editedUsername = appState.currentUser?.displayName ?? ""
                    showEditUsername = true
                } label: {
                    HStack {
                        Image(systemName: "person.fill")
                            .foregroundColor(.black)
                        Text(lang.username)
                            .font(Typography.bodyMD)
                            .foregroundColor(theme.text)
                        Spacer()
                        Text(appState.currentUser?.displayName ?? "User")
                            .font(Typography.bodyMD)
                            .foregroundColor(theme.textSecondary)
                        Image(systemName: "chevron.right")
                            .font(Typography.bodyXS)
                            .foregroundColor(theme.textSecondary)
                    }
                }
            }
        }
        .photoboothCard()
    }

    // MARK: - Purchases Card

    private var purchasesCard: some View {
        VStack(alignment: .leading, spacing: theme.spacing.lg) {
            Text(lang.purchases)
                .font(Typography.display(20, weight: .bold))
                .trackingTight()
                .foregroundColor(theme.text)

            VStack(spacing: theme.spacing.md) {
                NavigationLink(destination: CreditsPurchaseScreen()) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(.black)
                        Text(lang.buyCredits)
                            .font(Typography.bodyMD)
                            .foregroundColor(theme.text)
                        Spacer()
                        Text(lang.creditsCount(appState.currentUser?.credits ?? 0))
                            .font(Typography.bodySM)
                            .foregroundColor(theme.textSecondary)
                        Image(systemName: "chevron.right")
                            .font(Typography.bodyXS)
                            .foregroundColor(theme.textSecondary)
                    }
                }

                Divider()
                    .background(theme.textSecondary.opacity(0.2))

                NavigationLink(destination: PurchaseHistoryScreen()) {
                    HStack {
                        Image(systemName: "clock.arrow.circlepath")
                            .foregroundColor(.black)
                        Text(lang.purchaseHistory)
                            .font(Typography.bodyMD)
                            .foregroundColor(theme.text)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(Typography.bodyXS)
                            .foregroundColor(theme.textSecondary)
                    }
                }
            }
        }
        .photoboothCard()
    }

    // MARK: - Support Card

    private var supportCard: some View {
        VStack(alignment: .leading, spacing: theme.spacing.lg) {
            Text(lang.support)
                .font(Typography.display(20, weight: .bold))
                .trackingTight()
                .foregroundColor(theme.text)

            VStack(spacing: theme.spacing.md) {
                NavigationLink(destination: ContactUsScreen()) {
                    HStack {
                        Image(systemName: "envelope.fill")
                            .foregroundColor(.black)
                        Text(lang.contactUs)
                            .font(Typography.bodyMD)
                            .foregroundColor(theme.text)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(Typography.bodyXS)
                            .foregroundColor(theme.textSecondary)
                    }
                }

                Divider()
                    .background(theme.textSecondary.opacity(0.2))

                NavigationLink(destination: SendFeedbackScreen()) {
                    HStack {
                        Image(systemName: "text.bubble.fill")
                            .foregroundColor(.black)
                        Text(lang.sendFeedback)
                            .font(Typography.bodyMD)
                            .foregroundColor(theme.text)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(Typography.bodyXS)
                            .foregroundColor(theme.textSecondary)
                    }
                }
            }
        }
        .photoboothCard()
    }

    // MARK: - App Card

    private var appCard: some View {
        VStack(alignment: .leading, spacing: theme.spacing.lg) {
            Text(lang.app)
                .font(Typography.display(20, weight: .bold))
                .trackingTight()
                .foregroundColor(theme.text)

            VStack(spacing: theme.spacing.md) {
                // Language Picker
                Button {
                    showLanguagePicker = true
                } label: {
                    HStack {
                        Image(systemName: "globe")
                            .foregroundColor(.black)
                        Text(lang.language)
                            .font(Typography.bodyMD)
                            .foregroundColor(theme.text)
                        Spacer()
                        Text(lang.current.displayName)
                            .font(Typography.bodyMD)
                            .foregroundColor(theme.textSecondary)
                        Image(systemName: "chevron.right")
                            .font(Typography.bodyXS)
                            .foregroundColor(theme.textSecondary)
                    }
                }

                Divider()
                    .background(theme.textSecondary.opacity(0.2))

                NavigationLink(destination: Text(lang.privacyPolicy)) {
                    HStack {
                        Image(systemName: "hand.raised.fill")
                            .foregroundColor(.black)
                        Text(lang.privacyPolicy)
                            .font(Typography.bodyMD)
                            .foregroundColor(theme.text)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(Typography.bodyXS)
                            .foregroundColor(theme.textSecondary)
                    }
                }

                Divider()
                    .background(theme.textSecondary.opacity(0.2))

                NavigationLink(destination: Text(lang.termsOfService)) {
                    HStack {
                        Image(systemName: "doc.text.fill")
                            .foregroundColor(.black)
                        Text(lang.termsOfService)
                            .font(Typography.bodyMD)
                            .foregroundColor(theme.text)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(Typography.bodyXS)
                            .foregroundColor(theme.textSecondary)
                    }
                }

                Divider()
                    .background(theme.textSecondary.opacity(0.2))

                HStack {
                    Image(systemName: "info.circle.fill")
                        .foregroundColor(.black)
                    Text(lang.version)
                        .font(Typography.bodyMD)
                        .foregroundColor(theme.text)
                    Spacer()
                    Text("1.0.0")
                        .font(Typography.bodyMD)
                        .foregroundColor(theme.textSecondary)
                }
            }
        }
        .photoboothCard()
    }

    // MARK: - Actions Card

    private var actionsCard: some View {
        VStack(alignment: .leading, spacing: theme.spacing.lg) {
            Button {
                showSignOutAlert = true
            } label: {
                HStack {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                    Text(lang.signOut)
                        .font(Typography.bodyMD)
                    Spacer()
                }
                .foregroundColor(.red)
            }

            Divider()
                .background(theme.textSecondary.opacity(0.2))

            Button {
                showDeleteAccountAlert = true
            } label: {
                HStack {
                    Image(systemName: "trash")
                    Text(lang.deleteAccount)
                        .font(Typography.bodyMD)
                    Spacer()
                }
                .foregroundColor(.red)
            }
        }
        .photoboothCard()
    }
}

#Preview {
    NavigationStack {
        SettingsScreen()
            .environmentObject(AppState())
            .environmentObject(AuthViewModel())
            .environmentObject(LanguageManager.shared)
    }
}
