import SwiftUI
@preconcurrency import AVFoundation

/// Manages camera capture and video recording
@MainActor
final class CameraViewModel: NSObject, ObservableObject {
    // MARK: - AppState Reference
    weak var appState: AppState?

    // MARK: - Published Properties
    @Published var isRecording = false
    @Published var currentPhotoIndex = 0
    @Published var countdownValue = 0
    @Published var showFlash = false
    @Published var capturedPhotos: [CapturedPhoto] = []
    @Published var isSessionComplete = false
    @Published var errorMessage: String?

    // Photo preview state - shown after each capture for user to review/redo
    @Published var isShowingPreview = false
    @Published var lastCapturedPhoto: CapturedPhoto?

    // MARK: - Configuration
    var photoInterval: Int = 5 // Seconds between shots (5-10)
    let totalPhotos = 4

    // MARK: - Camera Session
    @Published var captureSession: AVCaptureSession?
    private var photoOutput: AVCapturePhotoOutput?
    private var videoOutput: AVCaptureMovieFileOutput?
    private var previewLayer: AVCaptureVideoPreviewLayer?

    // MARK: - Timer
    private var countdownTimer: Timer?

    // MARK: - Video Recording
    private var videoRecordingDelegate: VideoRecordingDelegate?

    // MARK: - Setup

    func setupCamera() async {
        print("📷 Setting up camera...")
        // Request camera permission
        let cameraStatus = AVCaptureDevice.authorizationStatus(for: .video)
        print("📷 Camera authorization status: \(cameraStatus.rawValue)")

        var cameraGranted = false
        switch cameraStatus {
        case .notDetermined:
            print("📷 Requesting camera access...")
            cameraGranted = await AVCaptureDevice.requestAccess(for: .video)
            if !cameraGranted {
                print("❌ Camera access denied by user")
                errorMessage = "Camera access is required to use this app"
                return
            }
            print("📷 Camera access granted")
        case .authorized:
            print("📷 Camera already authorized")
            cameraGranted = true
        case .denied, .restricted:
            print("❌ Camera access denied or restricted")
            errorMessage = "Please enable camera access in Settings"
            return
        @unknown default:
            print("❌ Unknown camera authorization status")
            errorMessage = "Unknown camera authorization status"
            return
        }

        // Request microphone permission for video recording with audio
        let micStatus = AVCaptureDevice.authorizationStatus(for: .audio)
        print("🎤 Microphone authorization status: \(micStatus.rawValue)")

        switch micStatus {
        case .notDetermined:
            print("🎤 Requesting microphone access...")
            let micGranted = await AVCaptureDevice.requestAccess(for: .audio)
            if micGranted {
                print("🎤 Microphone access granted")
            } else {
                print("⚠️ Microphone access denied - videos will have no audio")
            }
        case .authorized:
            print("🎤 Microphone already authorized")
        case .denied, .restricted:
            print("⚠️ Microphone access denied - videos will have no audio")
        @unknown default:
            print("⚠️ Unknown microphone authorization status")
        }

        // Configure session (camera is required, microphone is optional)
        await configureSession()
    }

    private func configureSession() async {
        print("📷 Configuring capture session...")
        let session = AVCaptureSession()

        // Use .photo preset for native 4:3 aspect ratio capture
        // This matches our target 3:4 portrait output and avoids aspect ratio distortion
        session.sessionPreset = .photo
        print("📷 Using photo preset (4:3 aspect ratio)")

        // Setup front camera
        guard let frontCamera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front) else {
            print("❌ Front camera not available")
            errorMessage = "Front camera not available"
            return
        }
        print("📷 Found front camera: \(frontCamera.localizedName)")

        do {
            let input = try AVCaptureDeviceInput(device: frontCamera)
            if session.canAddInput(input) {
                session.addInput(input)
                print("📷 Added camera input")
            }

            // Audio input for video recording (optional - videos will be silent if mic not authorized)
            if let audioDevice = AVCaptureDevice.default(for: .audio) {
                do {
                    let audioInput = try AVCaptureDeviceInput(device: audioDevice)
                    if session.canAddInput(audioInput) {
                        session.addInput(audioInput)
                        print("🎤 Added audio input")
                    }
                } catch {
                    print("⚠️ Could not add audio input: \(error.localizedDescription)")
                }
            } else {
                print("⚠️ No audio device available - video will be silent")
            }

            // Photo output
            let photoOutput = AVCapturePhotoOutput()
            if session.canAddOutput(photoOutput) {
                session.addOutput(photoOutput)
                // Enable high resolution capture on the output
                if #available(iOS 16.0, *) {
                    photoOutput.maxPhotoDimensions = CMVideoDimensions(width: 4032, height: 3024)
                } else {
                    photoOutput.isHighResolutionCaptureEnabled = true
                }
                self.photoOutput = photoOutput
                print("📷 Added photo output (high-res enabled)")
            }

            // Video output for behind-the-scenes recording
            let videoOutput = AVCaptureMovieFileOutput()
            if session.canAddOutput(videoOutput) {
                session.addOutput(videoOutput)
                self.videoOutput = videoOutput
                print("📷 Added video output")
            }

            self.captureSession = session
            print("✅ Camera session configured successfully")
        } catch {
            print("❌ Failed to configure camera: \(error.localizedDescription)")
            errorMessage = "Failed to configure camera: \(error.localizedDescription)"
        }
    }

    func startSession() {
        print("📷 Starting capture session...")
        guard let session = captureSession else {
            print("❌ No capture session to start")
            return
        }
        DispatchQueue.global(qos: .userInitiated).async {
            session.startRunning()
            DispatchQueue.main.async {
                print("✅ Capture session is running: \(session.isRunning)")
            }
        }
    }

    func stopSession() {
        print("📷 Stopping capture session...")
        captureSession?.stopRunning()
    }

    // MARK: - Photo Capture Flow

    func startPhotoSession() {
        isRecording = true
        currentPhotoIndex = 0
        capturedPhotos = []
        isSessionComplete = false

        // Track session started
        AnalyticsService.shared.logSessionStarted(style: "default", interval: photoInterval)

        startVideoRecording()
        startCountdown()
    }

    private func startCountdown() {
        // Invalidate any existing timer first
        countdownTimer?.invalidate()
        countdownTimer = nil

        countdownValue = photoInterval
        print("📸 Starting countdown from \(photoInterval) seconds for photo \(currentPhotoIndex + 1)")

        // Use Timer with target-action pattern which works better with @MainActor
        let timer = Timer(timeInterval: 1.0, repeats: true) { [weak self] timer in
            guard let self = self else {
                timer.invalidate()
                return
            }

            // Use assumeIsolated since Timer on main RunLoop guarantees main thread
            MainActor.assumeIsolated {
                if self.countdownValue > 1 {
                    self.countdownValue -= 1
                    print("📸 Countdown: \(self.countdownValue)")
                } else {
                    print("📸 Countdown complete, capturing photo...")
                    timer.invalidate()
                    self.countdownTimer = nil
                    self.capturePhoto()
                }
            }
        }
        // Add to main run loop in common mode to fire during UI interactions
        RunLoop.main.add(timer, forMode: .common)
        self.countdownTimer = timer
    }

    private func capturePhoto() {
        print("📸 capturePhoto() called")
        guard let photoOutput = photoOutput else {
            print("❌ Photo output not available!")
            errorMessage = "Photo output not available"
            return
        }

        // Flash effect
        triggerFlash()

        // Configure photo settings
        let settings = AVCapturePhotoSettings()

        // Enable high resolution photo capture
        if #available(iOS 16.0, *) {
            settings.maxPhotoDimensions = photoOutput.maxPhotoDimensions
        } else {
            settings.isHighResolutionPhotoEnabled = true
        }

        print("📸 Capturing photo with settings...")
        // Capture the photo
        photoOutput.capturePhoto(with: settings, delegate: self)
    }

    private func triggerFlash() {
        showFlash = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
            self?.showFlash = false
        }
    }

    // MARK: - Video Recording

    private func startVideoRecording() {
        guard let videoOutput = videoOutput else {
            print("⚠️ Video output not available - video recording disabled")
            return
        }

        // Clean up old video files before starting new recording
        cleanupOldVideos()

        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let videoPath = documentsPath.appendingPathComponent("session_\(UUID().uuidString).mp4")

        let delegate = VideoRecordingDelegate()
        delegate.onRecordingComplete = { [weak self] url in
            Task { @MainActor in
                self?.appState?.recordedVideoURL = url
                print("✅ Video URL passed to appState: \(url)")
            }
        }
        delegate.onRecordingError = { errorMsg in
            Task { @MainActor in
                print("❌ Video recording error: \(errorMsg)")
                // Don't show error to user - video is optional feature
            }
        }
        self.videoRecordingDelegate = delegate

        videoOutput.startRecording(to: videoPath, recordingDelegate: delegate)
        print("🎬 Video recording started: \(videoPath.lastPathComponent)")
    }

    private func stopVideoRecording() {
        if videoOutput?.isRecording == true {
            videoOutput?.stopRecording()
            print("🎬 Video recording stopped")
        }
    }

    /// Clean up old session video files from Documents directory
    private func cleanupOldVideos() {
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let fileManager = FileManager.default

        do {
            let files = try fileManager.contentsOfDirectory(at: documentsPath, includingPropertiesForKeys: nil)
            for file in files where file.lastPathComponent.hasPrefix("session_") && file.pathExtension == "mp4" {
                try? fileManager.removeItem(at: file)
                print("🗑️ Cleaned up old video: \(file.lastPathComponent)")
            }
        } catch {
            print("⚠️ Failed to cleanup old videos: \(error.localizedDescription)")
        }
    }

    // MARK: - Photo Management

    /// Called when user accepts the captured photo and wants to continue
    func continueToNextPhoto() {
        print("📸 User accepted photo \(currentPhotoIndex + 1), continuing...")
        print("📸 Current state: capturedPhotos=\(capturedPhotos.count), currentPhotoIndex=\(currentPhotoIndex)")

        // First, dismiss the preview
        isShowingPreview = false
        lastCapturedPhoto = nil

        // Increment to next photo
        let nextIndex = currentPhotoIndex + 1
        currentPhotoIndex = nextIndex

        print("📸 After increment: currentPhotoIndex=\(currentPhotoIndex), capturedPhotos=\(capturedPhotos.count)")

        // Check if we have all 4 photos (handles both normal and redo cases)
        if capturedPhotos.count >= totalPhotos {
            // Session complete
            print("✅ Photo session complete! Total photos: \(capturedPhotos.count)")
            stopVideoRecording()
            isSessionComplete = true
            isRecording = false

            // Track session completed
            AnalyticsService.shared.logSessionCompleted(photoCount: totalPhotos, style: "default")
        } else if currentPhotoIndex < totalPhotos {
            // Continue to next photo - start countdown after a brief delay
            // to ensure UI updates first
            print("📸 Will start countdown for photo \(currentPhotoIndex + 1)/\(totalPhotos)")
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
                guard let self = self else { return }
                print("📸 Starting countdown now...")
                self.startCountdown()
            }
        } else {
            // Edge case: we're past totalPhotos but don't have enough photos
            // This shouldn't happen in normal flow
            print("⚠️ Unexpected state: currentPhotoIndex=\(currentPhotoIndex), capturedPhotos=\(capturedPhotos.count)")
            isSessionComplete = true
            isRecording = false
        }
    }

    /// Called when user wants to redo the current photo
    func redoCurrentPhoto() {
        print("📸 User wants to redo photo \(currentPhotoIndex + 1)")
        print("📸 Before redo: capturedPhotos=\(capturedPhotos.count), currentPhotoIndex=\(currentPhotoIndex)")

        // First dismiss the preview
        isShowingPreview = false
        lastCapturedPhoto = nil

        // Remove the photo at current index (the one just captured)
        if currentPhotoIndex < capturedPhotos.count {
            capturedPhotos.remove(at: currentPhotoIndex)
            print("📸 Removed photo at index \(currentPhotoIndex), now have \(capturedPhotos.count) photos")
        }

        // Restart countdown for same photo index after brief delay for UI update
        print("📸 Will restart countdown for photo \(currentPhotoIndex + 1)")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            guard let self = self else { return }
            print("📸 Starting redo countdown now...")
            self.startCountdown()
        }
    }

    /// Called from PhotoReviewScreen to redo a specific photo
    func redoPhoto(at index: Int) {
        guard index < capturedPhotos.count else { return }
        capturedPhotos.remove(at: index)
        currentPhotoIndex = index
        isRecording = true
        isSessionComplete = false

        // Recapture this photo after brief delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.startCountdown()
        }
    }

    /// Called when returning from PhotoReviewScreen to redo a photo
    func startCountdownForRedo() {
        print("📸 Starting countdown for redo at index \(currentPhotoIndex)")
        isRecording = true
        isSessionComplete = false
        isShowingPreview = false

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.startCountdown()
        }
    }

    func cancelSession() {
        // Track session cancelled
        AnalyticsService.shared.logSessionCancelled(photoCount: currentPhotoIndex)

        countdownTimer?.invalidate()
        countdownTimer = nil
        stopVideoRecording()
        capturedPhotos = []
        currentPhotoIndex = 0
        isRecording = false
        isSessionComplete = false
        isShowingPreview = false
        lastCapturedPhoto = nil
    }
}

// MARK: - Video Recording Delegate

class VideoRecordingDelegate: NSObject, AVCaptureFileOutputRecordingDelegate {
    var onRecordingComplete: ((URL) -> Void)?
    var onRecordingError: ((String) -> Void)?

    func fileOutput(
        _ output: AVCaptureFileOutput,
        didFinishRecordingTo outputFileURL: URL,
        from connections: [AVCaptureConnection],
        error: Error?
    ) {
        if let error = error {
            let errorMsg = error.localizedDescription
            print("❌ Video recording error: \(errorMsg)")
            self.onRecordingError?(errorMsg)
        } else {
            print("✅ Video saved to: \(outputFileURL)")
            self.onRecordingComplete?(outputFileURL)
        }
    }
}

// MARK: - AVCapturePhotoCaptureDelegate

extension CameraViewModel: AVCapturePhotoCaptureDelegate {
    nonisolated func photoOutput(
        _ output: AVCapturePhotoOutput,
        didFinishProcessingPhoto photo: AVCapturePhoto,
        error: Error?
    ) {
        Task { @MainActor in
            if let error = error {
                errorMessage = "Photo capture failed: \(error.localizedDescription)"
                print("❌ Photo capture error: \(error)")
                return
            }

            guard let imageData = photo.fileDataRepresentation(),
                  let originalImage = UIImage(data: imageData) else {
                errorMessage = "Failed to process photo data"
                print("❌ Failed to process photo data")
                return
            }

            // Mirror the image horizontally for front camera (selfie mode)
            // This makes the photo look like what the user saw in the preview
            let mirroredImage = mirrorImage(originalImage)

            // Crop to 3:4 aspect ratio (center crop, no distortion)
            let image = cropTo3x4(image: mirroredImage)

            // Create captured photo
            let capturedPhoto = CapturedPhoto(
                image: image,
                index: currentPhotoIndex
            )

            // Insert at correct position (handles redo case)
            if currentPhotoIndex < capturedPhotos.count {
                // Redo case: insert at the correct position
                capturedPhotos.insert(capturedPhoto, at: currentPhotoIndex)
            } else {
                // Normal case: append
                capturedPhotos.append(capturedPhoto)
            }
            lastCapturedPhoto = capturedPhoto

            print("✅ Captured photo \(currentPhotoIndex + 1)/\(totalPhotos)")

            // Auto-continue to next photo (no preview/redo after each shot)
            self.continueToNextPhoto()
        }
    }

    /// Mirror image horizontally for front camera selfies
    private func mirrorImage(_ image: UIImage) -> UIImage {
        guard let cgImage = image.cgImage else { return image }
        let flippedImage = UIImage(
            cgImage: cgImage,
            scale: image.scale,
            orientation: .leftMirrored
        )
        // Re-render to normalize the orientation
        UIGraphicsBeginImageContextWithOptions(image.size, false, image.scale)
        flippedImage.draw(in: CGRect(origin: .zero, size: image.size))
        let normalizedImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        return normalizedImage ?? image
    }

    /// Crop image to 3:4 portrait aspect ratio using center crop (crop-to-fill)
    /// This ensures no distortion - edges are cropped if aspect ratio doesn't match
    private func cropTo3x4(image: UIImage) -> UIImage {
        let targetAspect: CGFloat = 3.0 / 4.0  // width / height for portrait
        let sourceAspect = image.size.width / image.size.height

        // If already 3:4 (within tolerance), return as-is
        guard abs(sourceAspect - targetAspect) > 0.001 else { return image }

        var cropRect: CGRect
        if sourceAspect > targetAspect {
            // Image is wider than 3:4 - crop left/right
            let newWidth = image.size.height * targetAspect
            cropRect = CGRect(
                x: (image.size.width - newWidth) / 2,
                y: 0,
                width: newWidth,
                height: image.size.height
            )
        } else {
            // Image is taller than 3:4 - crop top/bottom
            let newHeight = image.size.width / targetAspect
            cropRect = CGRect(
                x: 0,
                y: (image.size.height - newHeight) / 2,
                width: image.size.width,
                height: newHeight
            )
        }

        // Scale crop rect for retina displays
        let scaledRect = CGRect(
            x: cropRect.origin.x * image.scale,
            y: cropRect.origin.y * image.scale,
            width: cropRect.width * image.scale,
            height: cropRect.height * image.scale
        )

        guard let cropped = image.cgImage?.cropping(to: scaledRect) else { return image }

        let croppedImage = UIImage(
            cgImage: cropped,
            scale: image.scale,
            orientation: image.imageOrientation
        )

        print("📷 Cropped image from \(Int(image.size.width))x\(Int(image.size.height)) to \(Int(croppedImage.size.width))x\(Int(croppedImage.size.height))")
        return croppedImage
    }
}
