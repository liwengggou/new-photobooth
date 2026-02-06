import SwiftUI

/// Send Feedback screen with rating and feedback form
struct SendFeedbackScreen: View {
    @Environment(\.theme) var theme
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var lang: LanguageManager

    @State private var selectedRating: Int = 0
    @State private var feedbackType: FeedbackType = .general
    @State private var feedbackMessage = ""
    @State private var isSubmitting = false
    @State private var showSuccessAlert = false
    @State private var showErrorAlert = false
    @State private var errorMessage = ""

    enum FeedbackType: String, CaseIterable {
        case general = "General Feedback"
        case bug = "Bug Report"
        case feature = "Feature Request"
        case improvement = "Improvement"

        var icon: String {
            switch self {
            case .general: return "bubble.left.fill"
            case .bug: return "ladybug.fill"
            case .feature: return "lightbulb.fill"
            case .improvement: return "arrow.up.circle.fill"
            }
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                ScreenHeader(
                    lang.sendFeedback,
                    subtitle: lang.sendFeedbackSubtitle
                )

                VStack(spacing: theme.spacing.xxl) {
                    // Rating Card
                    ratingCard

                    // Feedback Type Card
                    feedbackTypeCard

                    // Feedback Form Card
                    feedbackFormCard
                }
                .padding(.horizontal, 24)
                .padding(.top, theme.spacing.xxl)
            }
        }
        .background(Color.white.ignoresSafeArea())
        .alert(lang.feedbackSent, isPresented: $showSuccessAlert) {
            Button(lang.ok, role: .cancel) { }
        } message: {
            Text(lang.thankYouFeedback)
        }
        .alert(lang.error, isPresented: $showErrorAlert) {
            Button(lang.ok, role: .cancel) { }
        } message: {
            Text(errorMessage)
        }
    }

    // MARK: - Rating Card

    private var ratingCard: some View {
        VStack(alignment: .leading, spacing: theme.spacing.lg) {
            Text(lang.howsYourExperience)
                .font(Typography.display(20, weight: .bold))
                .trackingTight()
                .foregroundColor(theme.text)

            HStack(spacing: theme.spacing.md) {
                ForEach(1...5, id: \.self) { index in
                    Button {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                            selectedRating = index
                        }
                    } label: {
                        Image(systemName: index <= selectedRating ? "star.fill" : "star")
                            .font(.system(size: 36))
                            .foregroundColor(index <= selectedRating ? .yellow : theme.textSecondary.opacity(0.3))
                    }
                }
            }
            .frame(maxWidth: .infinity)

            if selectedRating > 0 {
                Text(ratingText)
                    .font(Typography.bodyMD)
                    .foregroundColor(theme.textSecondary)
                    .frame(maxWidth: .infinity)
                    .transition(.opacity)
            }
        }
        .photoboothCard()
    }

    private var ratingText: String { lang.ratingText(selectedRating) }

    // MARK: - Feedback Type Card

    private var feedbackTypeCard: some View {
        VStack(alignment: .leading, spacing: theme.spacing.lg) {
            Text(lang.feedbackType)
                .font(Typography.display(20, weight: .bold))
                .trackingTight()
                .foregroundColor(theme.text)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: theme.spacing.md) {
                ForEach(FeedbackType.allCases, id: \.self) { type in
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            feedbackType = type
                        }
                    } label: {
                        VStack(spacing: theme.spacing.sm) {
                            Image(systemName: type.icon)
                                .font(.system(size: 24))
                            Text(lang.feedbackTypeName(type))
                                .font(Typography.bodySM)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, theme.spacing.lg)
                        .background(feedbackType == type ? theme.primary : theme.accent)
                        .foregroundColor(feedbackType == type ? .white : theme.text)
                        .cornerRadius(theme.corners.medium)
                    }
                }
            }
        }
        .photoboothCard()
    }

    // MARK: - Feedback Form Card

    private var feedbackFormCard: some View {
        VStack(alignment: .leading, spacing: theme.spacing.lg) {
            Text(lang.yourFeedback)
                .font(Typography.display(20, weight: .bold))
                .trackingTight()
                .foregroundColor(theme.text)

            VStack(spacing: theme.spacing.lg) {
                // Message Field
                VStack(alignment: .leading, spacing: theme.spacing.sm) {
                    Text(lang.tellUsMore)
                        .font(Typography.bodySM)
                        .foregroundColor(theme.textSecondary)

                    TextEditor(text: $feedbackMessage)
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
                    sendFeedback()
                } label: {
                    HStack(spacing: theme.spacing.sm) {
                        if isSubmitting {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Image(systemName: "paperplane.fill")
                        }
                        Text(isSubmitting ? lang.sending : lang.sendFeedbackButton)
                    }
                    .font(Typography.displaySM)
                }
                .photoboothPrimaryButton(isDisabled: feedbackMessage.isEmpty || isSubmitting)
                .disabled(feedbackMessage.isEmpty || isSubmitting)
            }
        }
        .photoboothCard()
    }

    // MARK: - Helper Methods

    private func sendFeedback() {
        guard let userId = appState.currentUser?.id else {
            errorMessage = lang.pleaseSignInForFeedback
            showErrorAlert = true
            return
        }

        isSubmitting = true

        Task {
            do {
                try await FirebaseService.shared.saveFeedback(
                    userId: userId,
                    userName: appState.currentUser?.displayName,
                    userEmail: appState.currentUser?.email,
                    rating: selectedRating,
                    feedbackType: feedbackType.rawValue,
                    message: feedbackMessage
                )

                await MainActor.run {
                    isSubmitting = false
                    showSuccessAlert = true
                    clearForm()
                }
            } catch {
                await MainActor.run {
                    isSubmitting = false
                    errorMessage = lang.failedToSendFeedback
                    showErrorAlert = true
                }
            }
        }
    }

    private func clearForm() {
        selectedRating = 0
        feedbackType = .general
        feedbackMessage = ""
    }
}

#Preview {
    NavigationStack {
        SendFeedbackScreen()
            .environmentObject(AppState())
    }
}
