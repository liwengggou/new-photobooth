import SwiftUI
import FirebaseAuth

/// Final preview screen before saving
struct PreviewScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var lang: LanguageManager
    @Environment(\.theme) var theme
    @StateObject private var collageViewModel = CollageViewModel()

    @State private var showSaveConfirmation = false
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var isGenerating = true

    var body: some View {
        VStack(spacing: theme.spacing.xxl) {
            // Header
            VStack(spacing: theme.spacing.sm) {
                Text(lang.yourCollage)
                    .font(Typography.displaySM)
                    .foregroundColor(theme.text)

                Text(lang.reviewBeforeSaving)
                    .font(Typography.bodyMD)
                    .foregroundColor(theme.textSecondary)
            }
            .padding(.top)

            // Collage Preview
            if let image = collageViewModel.collageImage {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .shadow(color: .black.opacity(0.2), radius: 15)
                    .padding(.horizontal)
            } else if isGenerating {
                // Loading state
                RoundedRectangle(cornerRadius: theme.corners.large)
                    .fill(theme.accent)
                    .aspectRatio(0.6, contentMode: .fit)
                    .overlay(
                        VStack(spacing: theme.spacing.md) {
                            ProgressView()
                                .tint(theme.text)
                            Text(lang.generatingCollage)
                                .font(Typography.bodySM)
                                .foregroundColor(theme.textSecondary)
                        }
                    )
                    .padding(.horizontal)
            } else {
                // Error state
                RoundedRectangle(cornerRadius: theme.corners.large)
                    .fill(theme.accent)
                    .aspectRatio(0.6, contentMode: .fit)
                    .overlay(
                        VStack(spacing: theme.spacing.md) {
                            Image(systemName: "exclamationmark.triangle")
                                .font(.largeTitle)
                                .foregroundColor(.orange)
                            Text(lang.failedToGenerateCollage)
                                .font(Typography.bodySM)
                                .foregroundColor(theme.textSecondary)
                        }
                    )
                    .padding(.horizontal)
            }

            Spacer()

            // Session Info
            sessionInfoCard

            // Action Buttons
            VStack(spacing: theme.spacing.md) {
                Button {
                    Task {
                        await saveCollageAndContinue()
                    }
                } label: {
                    HStack(spacing: theme.spacing.sm) {
                        if isSaving {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: theme.background))
                        } else {
                            Image(systemName: "checkmark.circle.fill")
                            Text(lang.saveAndContinue)
                        }
                    }
                }
                .photoboothPrimaryButton(isDisabled: isSaving || collageViewModel.collageImage == nil)
                .disabled(isSaving || collageViewModel.collageImage == nil)

                Button {
                    appState.pop() // Go back to customization
                } label: {
                    Text(lang.editCustomization)
                }
                .photoboothTertiaryButton()
            }
            .padding()
        }
        .photoboothBackground()
        .navigationTitle(lang.preview)
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button {
                    appState.pop()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundColor(theme.text)
                }
            }
        }
        .onAppear {
            generateCollage()
        }
        .alert(lang.error, isPresented: $showError) {
            Button(lang.ok, role: .cancel) {}
        } message: {
            if let errorMessage = errorMessage {
                Text(errorMessage)
            }
        }
    }

    // MARK: - Generate Collage

    private func generateCollage() {
        isGenerating = true

        // Set up CollageViewModel with session settings
        if let layout = appState.currentSession?.layout {
            collageViewModel.selectedLayout = layout
        }

        if let colorHex = appState.currentSession?.stripColor {
            collageViewModel.stripColor = Color(hex: colorHex)
        }

        // Generate collage from styled photos
        Task {
            guard !appState.styledPhotos.isEmpty else {
                isGenerating = false
                errorMessage = lang.noStyledPhotos
                showError = true
                return
            }

            let _ = await collageViewModel.generateCollage(from: appState.styledPhotos)

            // Store in app state for later use
            if let collage = collageViewModel.collageImage {
                appState.generatedCollage = collage
            }

            isGenerating = false
        }
    }

    // MARK: - Save Collage

    private func saveCollageAndContinue() async {
        guard let userId = Auth.auth().currentUser?.uid else {
            errorMessage = lang.userNotAuthenticated
            showError = true
            return
        }

        guard let collage = collageViewModel.collageImage else {
            errorMessage = lang.noCollageToSave
            showError = true
            return
        }

        isSaving = true

        do {
            // 1. Fetch current user data
            guard let user = try await FirebaseService.shared.fetchUser(userId: userId) else {
                errorMessage = lang.failedToFetchUser
                showError = true
                isSaving = false
                return
            }

            // 2. Check if user has enough credits
            guard user.credits >= 1 else {
                errorMessage = lang.insufficientCreditsEarn
                showError = true
                isSaving = false
                return
            }

            // 3. Deduct 1 credit
            let newCredits = user.credits - 1
            try await FirebaseService.shared.updateCredits(userId: userId, credits: newCredits)

            // 4. Update local app state
            var updatedUser = user
            updatedUser.credits = newCredits
            appState.currentUser = updatedUser

            // 5. Save collage to local storage
            let sessionId = appState.currentSession?.id ?? UUID().uuidString
            let _ = try await StorageService.shared.saveCollage(collage, sessionId: sessionId)

            // 6. Save session to Firestore
            if var session = appState.currentSession {
                session.userId = userId
                session.status = .completed
                try await FirebaseService.shared.saveSession(session)
            }

            // 7. Store generated collage in app state for success screen
            appState.generatedCollage = collage

            // 8. Track analytics
            AnalyticsService.shared.logCreditsUsed(amount: 1, reason: "collage_saved")
            AnalyticsService.shared.logCollageSaved(
                style: appState.currentSession?.style?.rawValue ?? "unknown",
                layout: appState.currentSession?.layout?.rawValue ?? "unknown"
            )

            print("Successfully deducted 1 credit. New balance: \(newCredits)")

            // 9. Navigate to success screen
            isSaving = false
            appState.navigate(to: .success)

        } catch {
            errorMessage = "Failed to save collage: \(error.localizedDescription)"
            showError = true
            isSaving = false
            print("Error saving collage: \(error)")
        }
    }

    // MARK: - Session Info Card

    private var sessionInfoCard: some View {
        HStack(spacing: theme.spacing.xl) {
            // Style
            VStack(spacing: theme.spacing.xs) {
                Image(systemName: "paintbrush.fill")
                    .foregroundColor(theme.text)
                Text(appState.currentSession?.style?.displayName ?? "Korean")
                    .font(Typography.bodySM)
                    .foregroundColor(theme.textSecondary)
            }

            Divider()
                .frame(height: 30)

            // Layout
            VStack(spacing: theme.spacing.xs) {
                Image(systemName: "square.grid.2x2.fill")
                    .foregroundColor(theme.text)
                Text(appState.currentSession?.layout?.displayName ?? "Strip")
                    .font(Typography.bodySM)
                    .foregroundColor(theme.textSecondary)
            }

            Divider()
                .frame(height: 30)

            // Credit Cost
            VStack(spacing: theme.spacing.xs) {
                Image(systemName: "star.fill")
                    .foregroundColor(.yellow)
                Text(lang.oneCredit)
                    .font(Typography.bodySM)
                    .foregroundColor(theme.textSecondary)
            }
        }
        .padding(theme.spacing.lg)
        .background(theme.accent)
        .cornerRadius(theme.corners.medium)
        .padding(.horizontal)
    }
}

#Preview {
    NavigationStack {
        PreviewScreen()
            .environmentObject(AppState())
    }
}
