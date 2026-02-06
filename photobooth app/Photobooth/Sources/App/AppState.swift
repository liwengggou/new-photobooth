import SwiftUI
import UIKit

/// Global app state managing navigation, user session, and credits
@MainActor
final class AppState: ObservableObject {
    // MARK: - Navigation
    @Published var navigationPath = NavigationPath()
    @Published var isShowingSplash = true

    // MARK: - User Session
    @Published var currentUser: User?
    @Published var isAuthenticated = false
    @Published var pendingReferralCode: String?

    // MARK: - Photo Session
    @Published var currentSession: PhotoSession?
    @Published var capturedPhotos: [CapturedPhoto] = []
    @Published var styledPhotos: [StyledPhoto] = []

    // Camera ViewModel - shared across CameraScreen and PhotoReviewScreen
    @Published var cameraViewModel: CameraViewModel?

    // Track if returning from PhotoReviewScreen to redo a specific photo
    @Published var redoPhotoIndex: Int?

    // Track if we're in a retake flow (should skip review and go to processing)
    @Published var isRetakeFlow = false

    // MARK: - Generated Content
    @Published var generatedCollage: UIImage?
    @Published var recordedVideoURL: URL?

    // MARK: - Theme
    @Published var currentTheme: AppTheme = .jpKawaii

    // MARK: - Navigation Actions
    func navigate(to destination: AppDestination) {
        navigationPath.append(destination)
    }

    func popToRoot() {
        navigationPath = NavigationPath()
    }

    func pop() {
        if !navigationPath.isEmpty {
            navigationPath.removeLast()
        }
    }

    // MARK: - Session Actions
    func startNewSession() {
        currentSession = PhotoSession()
        capturedPhotos = []
        styledPhotos = []
        let viewModel = CameraViewModel()
        viewModel.appState = self
        cameraViewModel = viewModel
        redoPhotoIndex = nil
        isRetakeFlow = false
    }

    func resetSession() {
        currentSession = nil
        capturedPhotos = []
        styledPhotos = []
        generatedCollage = nil
        recordedVideoURL = nil
        cameraViewModel = nil
        redoPhotoIndex = nil
        isRetakeFlow = false
        currentTheme = .jpKawaii // Reset to default theme
    }

    /// Update current theme when style is selected
    func selectStyle(_ style: PhotoStyle) {
        currentSession?.style = style
        currentTheme = style.theme
    }

    /// Request redo of a specific photo from PhotoReviewScreen
    func requestRedoPhoto(at index: Int) {
        redoPhotoIndex = index
        isRetakeFlow = true  // Skip review and go to processing after retake
        // Remove the photo from captured photos
        if index < capturedPhotos.count {
            capturedPhotos.remove(at: index)
        }
        // Configure the camera view model for redo
        if let viewModel = cameraViewModel {
            viewModel.capturedPhotos = capturedPhotos
            viewModel.currentPhotoIndex = index
            viewModel.isRecording = true
            viewModel.isSessionComplete = false
            viewModel.isShowingPreview = false
        }
    }
}
