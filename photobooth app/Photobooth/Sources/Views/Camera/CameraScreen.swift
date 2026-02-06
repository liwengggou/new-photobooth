import SwiftUI
import AVFoundation

/// Main camera screen for photo capture
struct CameraScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var lang: LanguageManager
    @State private var showCancelAlert = false

    var body: some View {
        Group {
            if let cameraViewModel = appState.cameraViewModel {
                CameraContentView(
                    cameraViewModel: cameraViewModel,
                    showCancelAlert: $showCancelAlert
                )
            } else {
                // Loading state while viewModel is being created
                ZStack {
                    Color.black.ignoresSafeArea()
                    ProgressView()
                        .tint(.white)
                }
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            Task {
                // Ensure we have a CameraViewModel
                if appState.cameraViewModel == nil {
                    appState.cameraViewModel = CameraViewModel()
                }

                let viewModel = appState.cameraViewModel!

                // Setup camera if not already done
                if viewModel.captureSession == nil {
                    await viewModel.setupCamera()
                }

                viewModel.photoInterval = appState.currentSession?.interval ?? 5
                viewModel.startSession()

                // Check if we're returning for a redo
                if let redoIndex = appState.redoPhotoIndex {
                    print("📸 Returning to redo photo at index \(redoIndex)")
                    appState.redoPhotoIndex = nil
                    // Start countdown for the redo photo
                    viewModel.startCountdownForRedo()
                }
            }
        }
        .alert(lang.cancelSession, isPresented: $showCancelAlert) {
            Button(lang.continueSession, role: .cancel) { }
            Button(lang.cancel, role: .destructive) {
                appState.cameraViewModel?.cancelSession()
                appState.resetSession()
                appState.popToRoot()
            }
        } message: {
            Text(lang.photosWillBeLost)
        }
    }
}

// MARK: - Camera Content View

private struct CameraContentView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var lang: LanguageManager
    @Environment(\.theme) var theme
    @ObservedObject var cameraViewModel: CameraViewModel
    @Binding var showCancelAlert: Bool

    // Animation states
    @State private var countdownScale: CGFloat = 1.0
    @State private var pingAnimation = false

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Theme-specific background
                theme.background.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Top Bar with themed buttons
                    cameraHeader

                    // Camera Preview Container (black, rounded corners)
                    cameraPreviewContainer(geometry: geometry)

                    // Controls Area below preview
                    cameraControlsArea

                    Spacer(minLength: 40)

                    // Start/Capture Button (hide during preview)
                    if !cameraViewModel.isShowingPreview {
                        captureButton
                            .padding(.bottom, 40)
                    }
                }

                // Flash Effect
                if cameraViewModel.showFlash {
                    Color.white
                        .ignoresSafeArea()
                        .transition(.opacity)
                        .animation(.easeOut(duration: 0.3), value: cameraViewModel.showFlash)
                }

                // Photo Preview Overlay - shown after each capture
                if cameraViewModel.isShowingPreview, let photo = cameraViewModel.lastCapturedPhoto {
                    photoPreviewOverlay(photo: photo)
                        .transition(.opacity)
                }

                // Error Display
                if let error = cameraViewModel.errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)
                        Text(error)
                            .font(.headline)
                            .foregroundColor(.white)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                        Text(lang.useRealDevice)
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.black.opacity(0.8))
                }
            }
        }
        .onChange(of: cameraViewModel.isSessionComplete) { _, completed in
            if completed {
                // Move captured photos to app state and navigate
                appState.capturedPhotos = cameraViewModel.capturedPhotos

                // If this was a retake flow, go directly to processing
                if appState.isRetakeFlow {
                    appState.isRetakeFlow = false
                    appState.navigate(to: .processing)
                } else {
                    appState.navigate(to: .photoReview)
                }
            }
        }
        .onChange(of: cameraViewModel.countdownValue) { _, newValue in
            // Countdown pop animation
            if newValue > 0 {
                countdownScale = 0.5
                withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
                    countdownScale = 1.1
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                    withAnimation(.spring(response: 0.2, dampingFraction: 0.8)) {
                        countdownScale = 1.0
                    }
                }
            }
        }
    }

    // MARK: - Camera Header (40x40 themed buttons)

    private var cameraHeader: some View {
        HStack {
            // Close button - themed 40x40
            Button {
                if cameraViewModel.isRecording || !cameraViewModel.capturedPhotos.isEmpty {
                    showCancelAlert = true
                } else {
                    appState.pop()
                }
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(theme.cameraButtonIcon)
                    .frame(width: 40, height: 40)
                    .background(theme.cameraButtonBackground)
                    .clipShape(Circle())
            }

            Spacer()

            // Recording indicator
            if cameraViewModel.isRecording && !cameraViewModel.isShowingPreview {
                HStack(spacing: 6) {
                    Circle()
                        .fill(Color.red)
                        .frame(width: 8, height: 8)
                    Text("REC")
                        .font(.system(size: 10, weight: .bold))
                        .tracking(1)
                        .foregroundColor(theme.cameraButtonIcon)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(theme.cameraButtonBackground)
                .cornerRadius(20)
            }

            Spacer()

            // Placeholder for symmetry
            Color.clear
                .frame(width: 40, height: 40)
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
        .padding(.bottom, 8)
    }

    // MARK: - Camera Preview Container (black, 3:4 aspect, 16px radius)

    private func cameraPreviewContainer(geometry: GeometryProxy) -> some View {
        let previewWidth = max(0, geometry.size.width - 32) // 16px padding each side
        let previewHeight = max(0, previewWidth * (4.0 / 3.0)) // 3:4 aspect ratio

        return ZStack {
            // Black background for camera
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.black)
                .frame(width: previewWidth, height: previewHeight)

            // Camera Preview
            if let session = cameraViewModel.captureSession {
                CameraPreviewView(session: session)
                    .frame(width: previewWidth, height: previewHeight)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            }

            // Grid Overlay (3x3 rule of thirds)
            gridOverlay
                .frame(width: previewWidth, height: previewHeight)
                .clipShape(RoundedRectangle(cornerRadius: 16))

            // Countdown Overlay (inside preview)
            if cameraViewModel.isRecording && cameraViewModel.countdownValue > 0 && !cameraViewModel.isShowingPreview {
                Text("\(cameraViewModel.countdownValue)")
                    .font(.system(size: 120, weight: .black))
                    .foregroundColor(.white)
                    .shadow(color: .black, radius: 0, x: 0, y: 4)
                    .scaleEffect(countdownScale)
                    .transition(.scale.combined(with: .opacity))
                    .id(cameraViewModel.countdownValue)
            }

            // Style Badge (bottom-right of preview)
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    styleBadge
                        .padding(16)
                }
            }
            .frame(width: previewWidth, height: previewHeight)
        }
        .frame(width: previewWidth, height: previewHeight)
        .padding(.horizontal, 16)
    }

    // MARK: - Grid Overlay (3x3 rule of thirds)

    private var gridOverlay: some View {
        GeometryReader { geo in
            ZStack {
                // Vertical lines
                ForEach(1..<3, id: \.self) { i in
                    Rectangle()
                        .fill(Color.white.opacity(0.2))
                        .frame(width: 1)
                        .position(x: geo.size.width * CGFloat(i) / 3, y: geo.size.height / 2)
                }
                // Horizontal lines
                ForEach(1..<3, id: \.self) { i in
                    Rectangle()
                        .fill(Color.white.opacity(0.2))
                        .frame(height: 1)
                        .position(x: geo.size.width / 2, y: geo.size.height * CGFloat(i) / 3)
                }
            }
        }
    }

    // MARK: - Style Badge

    private var styleBadge: some View {
        HStack(spacing: 6) {
            Image(systemName: appState.currentSession?.style?.iconName ?? "sparkles")
                .font(.system(size: 14))
                .foregroundColor(.black)

            Text(appState.currentSession?.style?.displayName ?? "JP Kawaii")
                .font(.system(size: 10, weight: .bold))
                .tracking(0.5)
                .foregroundColor(.black)
                .textCase(.uppercase)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(
            Capsule()
                .fill(.ultraThinMaterial)
                .background(Capsule().fill(Color.white.opacity(0.9)))
        )
        .clipShape(Capsule())
        .shadow(color: .black.opacity(0.1), radius: 4, y: 2)
    }

    // MARK: - Camera Controls Area

    private var cameraControlsArea: some View {
        VStack(spacing: 16) {
            // Shot Indicators
            shotIndicators
                .padding(.top, 20)

            // Captured Photos Thumbnails
            if !cameraViewModel.capturedPhotos.isEmpty && !cameraViewModel.isShowingPreview {
                thumbnailsStrip
                    .padding(.top, 8)
            }
        }
    }

    // MARK: - Shot Indicators (12x12 circles, themed)

    private var shotIndicators: some View {
        VStack(spacing: 8) {
            HStack(spacing: 12) {
                ForEach(0..<4, id: \.self) { index in
                    shotIndicatorDot(for: index)
                }
            }

            // Shot label
            Text(lang.shotOf(min(cameraViewModel.currentPhotoIndex + 1, 4), 4))
                .font(.system(size: 10, weight: .bold))
                .tracking(1.5)
                .foregroundColor(theme.cameraSecondaryColor)
                .textCase(.uppercase)
        }
    }

    @ViewBuilder
    private func shotIndicatorDot(for index: Int) -> some View {
        let hasPhotoAtPosition = cameraViewModel.capturedPhotos.contains { $0.index == index }
        let isCurrentShot = index == cameraViewModel.currentPhotoIndex && cameraViewModel.isRecording

        ZStack {
            // Main dot
            if hasPhotoAtPosition || isCurrentShot {
                Circle()
                    .fill(theme.cameraIndicatorColor)
                    .frame(width: 12, height: 12)
            } else {
                Circle()
                    .stroke(theme.cameraIndicatorColor, lineWidth: 1.5)
                    .frame(width: 12, height: 12)
            }

            // Ping animation for current shot
            if isCurrentShot {
                Circle()
                    .stroke(theme.cameraIndicatorColor.opacity(0.5), lineWidth: 1)
                    .frame(width: 12, height: 12)
                    .scaleEffect(pingAnimation ? 2 : 1)
                    .opacity(pingAnimation ? 0 : 0.5)
                    .animation(.easeOut(duration: 1).repeatForever(autoreverses: false), value: pingAnimation)
                    .onAppear { pingAnimation = true }
                    .onDisappear { pingAnimation = false }
            }
        }
    }

    // MARK: - Thumbnails Strip (48x64, themed badges)

    private var thumbnailsStrip: some View {
        HStack(spacing: 12) {
            ForEach(0..<4, id: \.self) { index in
                thumbnailSlot(for: index)
            }
        }
        .padding(.horizontal, 16)
    }

    @ViewBuilder
    private func thumbnailSlot(for index: Int) -> some View {
        let photo = cameraViewModel.capturedPhotos.first { $0.index == index }

        ZStack(alignment: .topTrailing) {
            if let photo = photo {
                // Captured photo thumbnail
                Image(uiImage: photo.image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 48, height: 64)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                    .overlay(
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(theme.cameraThumbnailBadgeBg, lineWidth: 2)
                    )
            } else {
                // Empty placeholder
                RoundedRectangle(cornerRadius: 4)
                    .fill(theme.cameraButtonBackground)
                    .frame(width: 48, height: 64)
                    .overlay(
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(theme.cameraIndicatorColor.opacity(0.3), style: StrokeStyle(lineWidth: 1.5, dash: [4]))
                    )
                    .overlay(
                        Text("\(index + 1)")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(theme.cameraIndicatorColor.opacity(0.3))
                    )
            }

            // Badge with number (only for captured photos)
            if photo != nil {
                Text("\(index + 1)")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(theme.cameraThumbnailBadgeText)
                    .frame(width: 16, height: 16)
                    .background(theme.cameraThumbnailBadgeBg)
                    .clipShape(Circle())
                    .overlay(
                        Circle()
                            .stroke(theme.background, lineWidth: 2)
                    )
                    .offset(x: 6, y: -6)
            }
        }
        .frame(width: 48, height: 64)
    }

    // MARK: - Photo Preview Overlay

    private func photoPreviewOverlay(photo: CapturedPhoto) -> some View {
        ZStack {
            // Semi-transparent background
            Color.black.opacity(0.85)
                .ignoresSafeArea()

            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Text(lang.photoOf(cameraViewModel.currentPhotoIndex + 1, cameraViewModel.totalPhotos))
                        .font(.headline)
                        .foregroundColor(.white)

                    Text(lang.reviewYourPhoto)
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }

                // Photo Preview
                Image(uiImage: photo.image)
                    .resizable()
                    .aspectRatio(3/4, contentMode: .fit)
                    .frame(maxHeight: 400)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.white.opacity(0.3), lineWidth: 2)
                    )
                    .shadow(color: .black.opacity(0.5), radius: 20)

                // Action Buttons
                HStack(spacing: 20) {
                    // Retake Button
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            cameraViewModel.redoCurrentPhoto()
                        }
                    } label: {
                        HStack {
                            Image(systemName: "arrow.counterclockwise")
                            Text(lang.retake)
                        }
                    }
                    .buttonStyle(OverlaySecondaryButtonStyle())

                    // Continue Button
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            cameraViewModel.continueToNextPhoto()
                        }
                    } label: {
                        HStack {
                            Text(cameraViewModel.currentPhotoIndex + 1 < cameraViewModel.totalPhotos ? lang.continueText : lang.finish)
                            Image(systemName: "arrow.right")
                        }
                    }
                    .buttonStyle(PhotoboothPrimaryButtonStyle())
                }
                .padding(.horizontal)
            }
            .padding()
        }
    }

    // MARK: - Capture Button

    private var captureButton: some View {
        Button {
            if !cameraViewModel.isRecording {
                cameraViewModel.startPhotoSession()
            }
        } label: {
            ZStack {
                Circle()
                    .stroke(theme.cameraButtonIcon, lineWidth: 4)
                    .frame(width: 80, height: 80)

                Circle()
                    .fill(
                        cameraViewModel.isRecording
                            ? Color.red
                            : theme.cameraButtonIcon
                    )
                    .frame(width: 66, height: 66)

                if !cameraViewModel.isRecording {
                    Text("START")
                        .font(.system(size: 12, weight: .bold))
                        .tracking(1)
                        .foregroundColor(theme.background)
                }
            }
        }
        .disabled(cameraViewModel.isRecording)
    }
}

// MARK: - Camera Preview View

struct CameraPreviewView: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.backgroundColor = .black
        view.session = session
        return view
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {
        uiView.session = session
    }
}

/// Custom UIView that properly handles AVCaptureVideoPreviewLayer layout
class PreviewView: UIView {
    var session: AVCaptureSession? {
        didSet {
            if let session = session {
                previewLayer.session = session
            }
        }
    }

    override class var layerClass: AnyClass {
        return AVCaptureVideoPreviewLayer.self
    }

    var previewLayer: AVCaptureVideoPreviewLayer {
        return layer as! AVCaptureVideoPreviewLayer
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupPreviewLayer()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupPreviewLayer()
    }

    private func setupPreviewLayer() {
        previewLayer.videoGravity = .resizeAspectFill
    }
}

#Preview {
    CameraScreen()
        .environmentObject(AppState())
}
