import SwiftUI

/// Contact Us screen with email form
struct ContactUsScreen: View {
    @Environment(\.theme) var theme
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var lang: LanguageManager

    @State private var subject = ""
    @State private var message = ""
    @State private var isSubmitting = false
    @State private var showSuccessAlert = false
    @State private var showErrorAlert = false
    @State private var errorMessage = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                ScreenHeader(
                    lang.contactUs,
                    subtitle: lang.contactUsSubtitle
                )

                VStack(spacing: theme.spacing.xxl) {
                    // Contact Form Card
                    formCard
                }
                .padding(.horizontal, 24)
                .padding(.top, theme.spacing.xxl)
            }
        }
        .background(Color.white.ignoresSafeArea())
        .alert(lang.messageSent, isPresented: $showSuccessAlert) {
            Button(lang.ok, role: .cancel) { }
        } message: {
            Text(lang.thankYouContact)
        }
        .alert(lang.error, isPresented: $showErrorAlert) {
            Button(lang.ok, role: .cancel) { }
        } message: {
            Text(errorMessage)
        }
    }

    // MARK: - Form Card

    private var formCard: some View {
        VStack(alignment: .leading, spacing: theme.spacing.lg) {
            Text(lang.sendMessage)
                .font(Typography.display(20, weight: .bold))
                .trackingTight()
                .foregroundColor(theme.text)

            VStack(spacing: theme.spacing.lg) {
                // Subject Field
                VStack(alignment: .leading, spacing: theme.spacing.sm) {
                    Text(lang.subject)
                        .font(Typography.bodySM)
                        .foregroundColor(theme.textSecondary)

                    TextField(lang.whatsThisAbout, text: $subject)
                        .textFieldStyle(AuthTextFieldStyle())
                }

                // Message Field
                VStack(alignment: .leading, spacing: theme.spacing.sm) {
                    Text(lang.message)
                        .font(Typography.bodySM)
                        .foregroundColor(theme.textSecondary)

                    TextEditor(text: $message)
                        .frame(minHeight: 150)
                        .padding(theme.spacing.md)
                        .background(theme.accent)
                        .cornerRadius(theme.corners.medium)
                        .font(Typography.bodyLG)
                        .foregroundColor(theme.text)
                        .scrollContentBackground(.hidden)
                }

                // Send Button
                Button {
                    sendMessage()
                } label: {
                    HStack(spacing: theme.spacing.sm) {
                        if isSubmitting {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Image(systemName: "paperplane.fill")
                        }
                        Text(isSubmitting ? lang.sending : lang.sendMessage)
                    }
                    .font(Typography.displaySM)
                }
                .photoboothPrimaryButton(isDisabled: message.isEmpty || isSubmitting)
                .disabled(message.isEmpty || isSubmitting)
            }
        }
        .photoboothCard()
    }

    // MARK: - Helper Methods

    private func sendMessage() {
        guard let userId = appState.currentUser?.id else {
            errorMessage = lang.pleaseSignInToSend
            showErrorAlert = true
            return
        }

        isSubmitting = true

        Task {
            do {
                try await FirebaseService.shared.saveContactMessage(
                    userId: userId,
                    userName: appState.currentUser?.displayName,
                    userEmail: appState.currentUser?.email,
                    subject: subject,
                    message: message
                )

                await MainActor.run {
                    isSubmitting = false
                    showSuccessAlert = true
                    clearForm()
                }
            } catch {
                await MainActor.run {
                    isSubmitting = false
                    errorMessage = lang.failedToSendMessage
                    showErrorAlert = true
                }
            }
        }
    }

    private func clearForm() {
        subject = ""
        message = ""
    }
}

#Preview {
    NavigationStack {
        ContactUsScreen()
            .environmentObject(AppState())
    }
}
