import SwiftUI

/// Login/Signup screen with multiple auth options
struct LoginScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var authViewModel: AuthViewModel
    @Environment(\.theme) var theme
    @EnvironmentObject private var lang: LanguageManager
    @State private var isSignUp = false
    @State private var showEmailAuth = false

    var body: some View {
        ZStack {
            // Background
            Color.clear
                .photoboothBackground()
                .ignoresSafeArea()

            VStack(spacing: theme.spacing.xxl) {
                Spacer()

                // Header
                headerSection

                // Auth Options
                VStack(spacing: theme.spacing.lg) {
                    // Google Sign In
                    AuthButton(
                        title: lang.continueWithGoogle,
                        icon: "g.circle.fill",
                        style: .secondary
                    ) {
                        Task {
                            if let user = await authViewModel.signInWithGoogle(referralCode: appState.pendingReferralCode) {
                                appState.currentUser = user
                                appState.isAuthenticated = true
                                appState.pendingReferralCode = nil
                            }
                        }
                    }

                    // Email Sign In
                    AuthButton(
                        title: isSignUp ? lang.signUpWithEmail : lang.signInWithEmail,
                        icon: "envelope.fill",
                        style: .outline
                    ) {
                        showEmailAuth = true
                    }
                }
                .padding(.horizontal)

                // Toggle Sign Up / Sign In
                Button {
                    withAnimation {
                        isSignUp.toggle()
                    }
                } label: {
                    Text(isSignUp ? lang.alreadyHaveAccount : lang.dontHaveAccount)
                        .font(Typography.bodySM)
                        .foregroundColor(theme.textSecondary)
                }

                Spacer()
            }
        }
        .sheet(isPresented: $showEmailAuth) {
            EmailAuthSheet(isSignUp: isSignUp)
        }
        .alert(lang.error, isPresented: $authViewModel.showError) {
            Button(lang.ok, role: .cancel) { }
        } message: {
            Text(authViewModel.errorMessage ?? lang.anErrorOccurred)
        }
        .overlay {
            if authViewModel.isLoading {
                LoadingOverlay()
            }
        }
    }

    private var headerSection: some View {
        VStack(spacing: 16) {
            // Logo (cropped bottom 1/16)
            Image("Logo")
                .resizable()
                .scaledToFit()
                .frame(width: 200, height: 200)
                .frame(height: 187, alignment: .top)
                .clipped()

            Text("TOROTORO")
                .font(Typography.displayMD)
                .foregroundColor(theme.text)
        }
    }
}

// MARK: - Auth Button

struct AuthButton: View {
    @Environment(\.theme) var theme

    let title: String
    let icon: String
    let style: AuthButtonStyle
    let action: () -> Void

    enum AuthButtonStyle {
        case primary, secondary, outline
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: theme.spacing.md) {
                Image(systemName: icon)
                    .font(.title3)
                Text(title)
                    .font(Typography.bodyLG)
                    .fontWeight(.semibold)
            }
            .frame(width: 280)
            .padding(.vertical, theme.spacing.md)
            .padding(.horizontal, theme.spacing.lg)
            .background(Color.black)
            .foregroundColor(.white)
            .cornerRadius(theme.corners.medium)
        }
    }
}

// MARK: - Email Auth Sheet

struct EmailAuthSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.theme) var theme
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var authViewModel: AuthViewModel
    @EnvironmentObject private var lang: LanguageManager
    let isSignUp: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: theme.spacing.xxl) {
                // Form Fields
                VStack(spacing: theme.spacing.lg) {
                    if isSignUp {
                        TextField(lang.name, text: $authViewModel.displayName)
                            .textFieldStyle(AuthTextFieldStyle())
                    }

                    TextField(lang.email, text: $authViewModel.email)
                        .textFieldStyle(AuthTextFieldStyle())
                        .keyboardType(.emailAddress)
                        .textContentType(.emailAddress)
                        .autocapitalization(.none)

                    SecureField(lang.password, text: $authViewModel.password)
                        .textFieldStyle(AuthTextFieldStyle())
                        .textContentType(isSignUp ? .newPassword : .password)
                }

                // Submit Button
                Button {
                    Task {
                        let user = isSignUp
                            ? await authViewModel.signUpWithEmail(referralCode: appState.pendingReferralCode)
                            : await authViewModel.signInWithEmail()

                        if let user = user {
                            appState.currentUser = user
                            appState.isAuthenticated = true
                            if isSignUp {
                                appState.pendingReferralCode = nil
                            }
                            dismiss()
                        }
                    }
                } label: {
                    Text(isSignUp ? lang.createAccount : lang.signIn)
                        .font(Typography.displaySM)
                }
                .photoboothPrimaryButton()

                Spacer()
            }
            .padding(theme.spacing.xl)
            .photoboothBackground()
            .navigationTitle(isSignUp ? lang.createAccount : lang.signIn)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(lang.cancel) {
                        authViewModel.clearFields()
                        dismiss()
                    }
                    .foregroundColor(theme.text)
                }
            }
        }
    }
}

// MARK: - Text Field Style

struct AuthTextFieldStyle: TextFieldStyle {
    @Environment(\.theme) var theme

    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(theme.spacing.lg)
            .background(theme.accent)
            .cornerRadius(theme.corners.medium)
            .font(Typography.bodyLG)
            .foregroundColor(theme.text)
    }
}

// MARK: - Loading Overlay

struct LoadingOverlay: View {
    @Environment(\.theme) var theme
    @EnvironmentObject private var lang: LanguageManager

    var body: some View {
        ZStack {
            theme.background.opacity(0.6)
                .ignoresSafeArea()

            VStack(spacing: theme.spacing.lg) {
                ProgressView()
                    .scaleEffect(1.5)
                    .tint(theme.text)
                Text(lang.loading)
                    .font(Typography.bodyMD)
                    .foregroundColor(theme.textSecondary)
            }
            .photoboothCard()
        }
    }
}

#Preview {
    LoginScreen()
        .environmentObject(AppState())
        .environmentObject(AuthViewModel())
}
