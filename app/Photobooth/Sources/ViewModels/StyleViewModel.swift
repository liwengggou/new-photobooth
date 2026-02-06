import SwiftUI
import Combine
import UIKit

/// Manages style selection and Gemini processing
@MainActor
final class StyleViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var selectedStyle: PhotoStyle?
    @Published var isProcessing = false
    @Published var processingProgress: Double = 0
    @Published var currentPhotoIndex: Int = 0
    @Published var styledPhotos: [StyledPhoto] = []
    @Published var errorMessage: String?

    // MARK: - Dependencies
    private let geminiService = GeminiService.shared
    private var cancellables = Set<AnyCancellable>()
    private var backgroundTaskID: UIBackgroundTaskIdentifier = .invalid

    // MARK: - Initialization

    init() {
        // Observe GeminiService progress updates
        geminiService.$processingProgress
            .receive(on: DispatchQueue.main)
            .assign(to: \.processingProgress, on: self)
            .store(in: &cancellables)

        geminiService.$currentPhotoIndex
            .receive(on: DispatchQueue.main)
            .assign(to: \.currentPhotoIndex, on: self)
            .store(in: &cancellables)
    }

    // MARK: - Gemini Processing

    /// Process photos with selected style via Gemini API
    func processPhotos(_ photos: [CapturedPhoto], style: PhotoStyle) async -> Bool {
        // Prevent duplicate processing
        guard !isProcessing else {
            return false
        }
        
        guard !photos.isEmpty else {
            errorMessage = "No photos to process"
            return false
        }

        guard photos.count == 4 else {
            errorMessage = "Expected 4 photos, got \(photos.count)"
            return false
        }

        selectedStyle = style
        isProcessing = true
        processingProgress = 0
        currentPhotoIndex = 0
        styledPhotos = []
        errorMessage = nil

        // Begin background task to allow processing to continue if app goes to background
        beginBackgroundTask()

        do {
            // Call the real GeminiService
            let styled = try await geminiService.processPhotos(photos, style: style)
            styledPhotos = styled
            isProcessing = false

            // End background task
            endBackgroundTask()

            // Track analytics
            AnalyticsService.shared.logStyleSelected(style: style.rawValue)

            return true
        } catch {
            errorMessage = error.localizedDescription
            isProcessing = false

            // End background task
            endBackgroundTask()

            // Track error
            AnalyticsService.shared.logError(
                error: error.localizedDescription,
                location: "StyleViewModel.processPhotos"
            )

            return false
        }
    }

    // MARK: - Background Task Management

    private func beginBackgroundTask() {
        backgroundTaskID = UIApplication.shared.beginBackgroundTask(withName: "PhotoStyleProcessing") { [weak self] in
            // Called when background time is about to expire
            self?.endBackgroundTask()
        }
    }

    private func endBackgroundTask() {
        if backgroundTaskID != .invalid {
            UIApplication.shared.endBackgroundTask(backgroundTaskID)
            backgroundTaskID = .invalid
        }
    }

    /// Reset the view model state
    func reset() {
        selectedStyle = nil
        isProcessing = false
        processingProgress = 0
        currentPhotoIndex = 0
        styledPhotos = []
        errorMessage = nil
        geminiService.resetProgress()
    }
}
