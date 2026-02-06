import SwiftUI

/// Screen to review captured photos before styling
struct PhotoReviewScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var lang: LanguageManager
    @Environment(\.theme) var theme
    @State private var selectedPhotoIndex: Int?
    @State private var showRetakeAlert = false
    @State private var hasUsedRetake = false

    var body: some View {
        VStack(spacing: 0) {
            // Scrollable content
            ScrollView {
                VStack(spacing: 24) {
                    // Header - matching IntervalSelectionScreen style
                    VStack(spacing: 12) {
                        Text(lang.reviewPhotos)
                            .font(Typography.display(32, weight: .black))
                            .trackingTight()
                            .foregroundColor(theme.text)

                        Text(hasUsedRetake ? lang.usedYourRetake : lang.tapOneToRetake)
                            .font(Typography.body(14))
                            .foregroundColor(theme.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 24)

                    // Photos Grid
                    LazyVGrid(
                        columns: [GridItem(.flexible()), GridItem(.flexible())],
                        spacing: 12
                    ) {
                        ForEach(Array(appState.capturedPhotos.enumerated()), id: \.element.id) { index, photo in
                            PhotoReviewCard(
                                photo: photo,
                                index: index,
                                isSelected: selectedPhotoIndex == index,
                                isRetakeDisabled: hasUsedRetake
                            ) {
                                if !hasUsedRetake {
                                    selectedPhotoIndex = index
                                    showRetakeAlert = true
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 24)
                }
            }

            // Action Buttons - matching IntervalSelectionScreen style
            VStack(spacing: 12) {
                Button {
                    appState.navigate(to: .processing)
                } label: {
                    HStack {
                        Text(lang.continueText)
                            .font(.headline)
                        Image(systemName: "arrow.right")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(theme.text)
                    .foregroundColor(theme.background)
                    .cornerRadius(16)
                }

                Button {
                    // Reset camera view model and go back to camera
                    if let viewModel = appState.cameraViewModel {
                        viewModel.capturedPhotos = []
                        viewModel.currentPhotoIndex = 0
                        viewModel.isSessionComplete = false
                        viewModel.isRecording = false
                        viewModel.isShowingPreview = false
                    }
                    appState.capturedPhotos = []
                    appState.isRetakeFlow = true  // Skip review and go to processing after retake
                    appState.pop()
                } label: {
                    Text(lang.retakeAllPhotos)
                        .font(Typography.body(14, weight: .medium))
                        .foregroundColor(theme.text)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(theme.text.opacity(0.15))
                        .cornerRadius(12)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 16)
            .background(theme.background)
        }
        .background(theme.background.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button {
                    appState.resetSession()
                    appState.popToRoot()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .semibold))
                        Text(lang.back)
                    }
                    .foregroundColor(theme.text)
                }
            }
            ToolbarItem(placement: .principal) {
                Text(lang.review)
                    .font(.headline)
                    .foregroundColor(theme.text)
            }
        }
        .alert(lang.retakePhoto, isPresented: $showRetakeAlert) {
            Button(lang.cancel, role: .cancel) {
                selectedPhotoIndex = nil
            }
            Button(lang.retake) {
                if let index = selectedPhotoIndex {
                    // Mark retake as used
                    hasUsedRetake = true
                    // Request retake and go back to camera
                    appState.requestRedoPhoto(at: index)
                    appState.pop() // Go back to camera
                }
                selectedPhotoIndex = nil
            }
        } message: {
            if let index = selectedPhotoIndex {
                Text(lang.retakePhotoMessage(index + 1))
            }
        }
    }
}

// MARK: - Photo Review Card

struct PhotoReviewCard: View {
    @EnvironmentObject private var lang: LanguageManager
    @Environment(\.theme) var theme

    let photo: CapturedPhoto
    let index: Int
    let isSelected: Bool
    let isRetakeDisabled: Bool
    let onTap: () -> Void

    @State private var isPressed = false

    var body: some View {
        Button(action: onTap) {
            ZStack {
                Image(uiImage: photo.image)
                    .resizable()
                    .aspectRatio(3/4, contentMode: .fill)
                    .clipped()

                // Retake overlay hint (only show if retake is still available)
                if !isRetakeDisabled {
                    VStack {
                        Spacer()
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.counterclockwise")
                                .font(.system(size: 11, weight: .medium))
                            Text(lang.tapToRetake)
                                .font(.system(size: 11, weight: .medium))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(
                            Capsule()
                                .fill(Color.black.opacity(0.5))
                        )
                        .padding(.bottom, 8)
                    }
                }
            }
            .overlay(
                Rectangle()
                    .stroke(isSelected ? theme.text : Color.clear, lineWidth: 2)
            )
            .scaleEffect(isPressed ? 0.96 : 1.0)
            .animation(.easeInOut(duration: 0.2), value: isPressed)
        }
        .buttonStyle(PlainButtonStyle())
        .disabled(isRetakeDisabled)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in if !isRetakeDisabled { isPressed = true } }
                .onEnded { _ in isPressed = false }
        )
    }
}

#Preview {
    NavigationStack {
        PhotoReviewScreen()
            .environmentObject(AppState())
            .environment(\.theme, .jpKawaii)
    }
}
