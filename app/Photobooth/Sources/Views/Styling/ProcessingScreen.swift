import SwiftUI

/// Loading screen while Gemini processes photos
struct ProcessingScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var lang: LanguageManager
    @Environment(\.theme) var theme
    @StateObject private var styleViewModel = StyleViewModel()

    @State private var isComplete = false
    @State private var showError = false
    @State private var hasStartedProcessing = false

    var body: some View {
        VStack(spacing: theme.spacing.lg) {
            Spacer()
            Spacer()

            // Status Text
            Text(lang.applyingStyle(styleName))
                .font(Typography.displaySM)
                .foregroundColor(theme.text)

            // Progress Section
            VStack(spacing: theme.spacing.md) {
                // Progress bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(theme.accent)
                            .frame(height: 8)

                        RoundedRectangle(cornerRadius: 4)
                            .fill(theme.primary)
                            .frame(width: geometry.size.width * styleViewModel.processingProgress, height: 8)
                            .animation(.easeInOut(duration: 0.3), value: styleViewModel.processingProgress)
                    }
                }
                .frame(height: 8)
                .padding(.horizontal, 40)

                // Percentage
                Text("\(Int(styleViewModel.processingProgress * 100))%")
                    .font(Typography.bodySM)
                    .foregroundColor(theme.textSecondary)
            }

            // Game section
            VStack(spacing: theme.spacing.sm) {
                Text(lang.killTimeWithGame)
                    .font(Typography.bodySM)
                    .foregroundColor(theme.textSecondary)

                FlappyBirdGameView()
                    .frame(height: 500)
                    .padding(.horizontal)
            }

            Spacer()

            #if DEBUG
            // Skip button for testing UI
            Button(action: skipProcessing) {
                HStack {
                    Image(systemName: "forward.fill")
                    Text(lang.skipOriginalPhotos)
                }
                .font(Typography.bodySM)
                .foregroundColor(theme.textSecondary)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(theme.accent.opacity(0.5))
                .cornerRadius(8)
            }
            .padding(.bottom, 10)
            #endif
        }
        .photoboothBackground()
        .navigationBarHidden(true)
        .onAppear {
            startProcessing()
        }
        .onChange(of: isComplete) { _, complete in
            if complete {
                // Store styled photos in app state
                appState.styledPhotos = styleViewModel.styledPhotos
                appState.navigate(to: .customization)
            }
        }
        .alert(lang.processingError, isPresented: $showError) {
            Button(lang.retry) {
                hasStartedProcessing = false
                startProcessing()
            }
            Button(lang.cancel, role: .cancel) {
                appState.resetSession()
                appState.popToRoot()
            }
        } message: {
            Text(styleViewModel.errorMessage ?? lang.processingErrorMessage)
        }
    }

    // MARK: - Computed Properties

    private var styleName: String {
        appState.currentSession?.style?.displayName ?? "JP Kawaii"
    }


    private var statusMessage: String {
        if styleViewModel.isProcessing {
            if styleViewModel.currentPhotoIndex < 4 {
                return "Processing photo \(styleViewModel.currentPhotoIndex + 1) of 4..."
            } else {
                return "Finishing up..."
            }
        } else if styleViewModel.errorMessage != nil {
            return "Processing failed"
        } else {
            return "Starting..."
        }
    }

    // MARK: - Processing

    #if DEBUG
    /// Skip AI processing and use original photos (for testing UI)
    private func skipProcessing() {
        let style = appState.currentSession?.style ?? .jpKawaii

        // Convert CapturedPhotos to StyledPhotos using original images
        let styledPhotos = appState.capturedPhotos.map { captured in
            StyledPhoto(
                originalId: captured.id,
                image: captured.image,
                style: style,
                index: captured.index
            )
        }

        // Cancel any ongoing processing
        GeminiService.shared.cancelProcessing()

        // Store and navigate
        appState.styledPhotos = styledPhotos
        appState.navigate(to: .customization)
    }
    #endif

    private func startProcessing() {
        // Prevent duplicate calls from onAppear firing multiple times
        guard !hasStartedProcessing else {
            return
        }
        hasStartedProcessing = true
        
        guard let style = appState.currentSession?.style else {
            styleViewModel.errorMessage = "No style selected"
            showError = true
            return
        }

        guard !appState.capturedPhotos.isEmpty else {
            styleViewModel.errorMessage = "No photos to process"
            showError = true
            return
        }

        Task {
            let success = await styleViewModel.processPhotos(
                appState.capturedPhotos,
                style: style
            )

            if success {
                isComplete = true
            } else {
                showError = true
            }
        }
    }
}

#Preview {
    ProcessingScreen()
        .environmentObject(AppState())
}
