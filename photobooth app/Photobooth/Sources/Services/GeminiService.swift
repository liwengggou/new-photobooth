import Foundation
import UIKit
@preconcurrency import FirebaseFunctions

// MARK: - Debug Configuration
#if DEBUG
private let debugLoggingEnabled = true
#else
private let debugLoggingEnabled = false
#endif

// MARK: - Debug Timing Helper
private struct PhotoDebugTimer {
    private var phaseStartTimes: [String: Date] = [:]
    private var sessionStartTime: Date = Date()

    mutating func startSession() {
        sessionStartTime = Date()
        phaseStartTimes.removeAll()
        log("SESSION", "START", "Photo processing session started")
    }

    mutating func startPhase(_ phase: String) {
        phaseStartTimes[phase] = Date()
        log(phase, "START", "Phase started")
    }

    func progress(_ phase: String, _ message: String) {
        let elapsed = phaseStartTimes[phase].map { Date().timeIntervalSince($0) } ?? 0
        let cumulative = Date().timeIntervalSince(sessionStartTime)
        log(phase, "PROGRESS", message, elapsed: elapsed, cumulative: cumulative)
    }

    func endPhase(_ phase: String, _ message: String) {
        let elapsed = phaseStartTimes[phase].map { Date().timeIntervalSince($0) } ?? 0
        let cumulative = Date().timeIntervalSince(sessionStartTime)
        log(phase, "DONE", message, elapsed: elapsed, cumulative: cumulative)
    }

    func error(_ phase: String, _ message: String) {
        let elapsed = phaseStartTimes[phase].map { Date().timeIntervalSince($0) } ?? 0
        let cumulative = Date().timeIntervalSince(sessionStartTime)
        log(phase, "ERROR", message, elapsed: elapsed, cumulative: cumulative)
    }

    func summary(_ phases: [(name: String, duration: TimeInterval)]) {
        guard debugLoggingEnabled else { return }
        let total = Date().timeIntervalSince(sessionStartTime)
        print("\n[PHOTOBOOTH] ========== TIMING SUMMARY ==========")
        for (name, duration) in phases {
            let pct = total > 0 ? (duration / total) * 100 : 0
            print("[PHOTOBOOTH] \(name): \(String(format: "%.1f", duration))s (\(String(format: "%.0f", pct))%)")
        }
        print("[PHOTOBOOTH] TOTAL: \(String(format: "%.1f", total))s")
        print("[PHOTOBOOTH] ==========================================\n")
    }

    private func log(_ phase: String, _ status: String, _ message: String, elapsed: TimeInterval = 0, cumulative: TimeInterval = 0) {
        guard debugLoggingEnabled else { return }
        let ts = ISO8601DateFormatter().string(from: Date())
        print("[PHOTOBOOTH] [\(ts)] [\(phase)] [\(status)] \(message) | elapsed: \(String(format: "%.1f", elapsed))s | cumulative: \(String(format: "%.1f", cumulative))s")
    }
}

/// Gemini API service for photo styling via Firebase Cloud Functions
@MainActor
final class GeminiService: ObservableObject {
    static let shared = GeminiService()

    private let functions = Functions.functions()
    private let maxRetries = 3

    @Published var processingProgress: Double = 0
    @Published var currentPhotoIndex: Int = 0
    @Published private(set) var isProcessing = false
    
    private var currentTask: Task<[StyledPhoto], Error>?

    private init() {
        // Optionally use emulator for local testing
        // functions.useEmulator(withHost: "localhost", port: 5001)
    }

    // MARK: - Style Processing

    /// Process photos with selected style via Cloud Function
    /// - Parameters:
    ///   - photos: Array of 4 captured photos
    ///   - style: Selected photo style
    /// - Returns: Array of 4 styled photos
    func processPhotos(_ photos: [CapturedPhoto], style: PhotoStyle) async throws -> [StyledPhoto] {
        // Prevent concurrent processing - if already processing, wait for existing task
        if isProcessing, let existingTask = currentTask {
            print("GeminiService: Already processing, waiting for existing task")
            return try await existingTask.value
        }
        
        guard photos.count == 4 else {
            throw GeminiError.invalidPhotoCount
        }

        isProcessing = true
        processingProgress = 0
        currentPhotoIndex = 0
        
        // Create task wrapper so concurrent calls can wait on same result
        let task = Task<[StyledPhoto], Error> {
            defer {
                Task { @MainActor in
                    self.isProcessing = false
                    self.currentTask = nil
                }
            }
            return try await self.performProcessing(photos: photos, style: style)
        }
        currentTask = task
        
        return try await task.value
    }
    
    private func performProcessing(photos: [CapturedPhoto], style: PhotoStyle) async throws -> [StyledPhoto] {
        var debugTimer = PhotoDebugTimer()
        var phaseDurations: [(name: String, duration: TimeInterval)] = []

        debugTimer.startSession()
        debugTimer.progress("SESSION", "Style: \(style.rawValue), Photos: \(photos.count)")

        // ========== PHASE 1: ENCODING ==========
        debugTimer.startPhase("ENCODE")
        let encodeStartTime = Date()

        var totalBytes = 0
        let base64Photos = try photos.enumerated().map { (index, photo) -> String in
            let photoStartTime = Date()
            debugTimer.progress("ENCODE", "Photo \(index + 1)/\(photos.count): \(Int(photo.image.size.width))x\(Int(photo.image.size.height))")

            guard let imageData = photo.image.jpegData(compressionQuality: 0.95) else {
                debugTimer.error("ENCODE", "Failed to encode photo \(index + 1)")
                throw GeminiError.encodingFailed
            }

            totalBytes += imageData.count
            let photoElapsed = Date().timeIntervalSince(photoStartTime)
            debugTimer.progress("ENCODE", "Photo \(index + 1)/\(photos.count) encoded: \(imageData.count / 1024)KB in \(String(format: "%.2f", photoElapsed))s")

            return imageData.base64EncodedString()
        }

        let encodeDuration = Date().timeIntervalSince(encodeStartTime)
        phaseDurations.append(("ENCODE", encodeDuration))
        debugTimer.endPhase("ENCODE", "All \(photos.count) photos encoded: \(totalBytes / 1024)KB total")

        // ========== PHASE 2: API CALL ==========
        debugTimer.startPhase("API_CALL")
        let apiStartTime = Date()

        var lastError: Error?
        var photoUrls: [String] = []

        for attempt in 1...maxRetries {
            do {
                debugTimer.progress("API_CALL", "Attempt \(attempt)/\(maxRetries) - calling Cloud Function")
                photoUrls = try await callCloudFunction(photos: base64Photos, style: style)

                let apiDuration = Date().timeIntervalSince(apiStartTime)
                phaseDurations.append(("API_CALL", apiDuration))
                debugTimer.endPhase("API_CALL", "Received \(photoUrls.count) URLs")
                break

            } catch {
                lastError = error
                debugTimer.error("API_CALL", "Attempt \(attempt) failed: \(error.localizedDescription)")

                if attempt < maxRetries {
                    debugTimer.progress("API_CALL", "Waiting 2s before retry...")
                    try await Task.sleep(nanoseconds: 2_000_000_000)
                }
            }
        }

        if photoUrls.isEmpty {
            debugTimer.error("API_CALL", "All \(maxRetries) attempts failed")
            debugTimer.summary(phaseDurations)
            throw lastError ?? GeminiError.processingFailed
        }

        // ========== PHASE 3: DOWNLOAD ==========
        debugTimer.startPhase("DOWNLOAD")
        let downloadStartTime = Date()

        var styledPhotos: [StyledPhoto] = []
        for (index, urlString) in photoUrls.enumerated() {
            guard let url = URL(string: urlString) else {
                debugTimer.error("DOWNLOAD", "Invalid URL for photo \(index + 1)")
                styledPhotos.append(StyledPhoto(originalId: photos[index].id, image: photos[index].image, style: style, index: index))
                continue
            }

            let photoDownloadStart = Date()
            debugTimer.progress("DOWNLOAD", "Downloading photo \(index + 1)/\(photoUrls.count)...")

            do {
                let (data, response) = try await URLSession.shared.data(from: url)
                let httpResponse = response as? HTTPURLResponse
                let downloadTime = Date().timeIntervalSince(photoDownloadStart)

                debugTimer.progress("DOWNLOAD", "Photo \(index + 1): \(data.count / 1024)KB in \(String(format: "%.2f", downloadTime))s (HTTP \(httpResponse?.statusCode ?? 0))")

                guard let image = UIImage(data: data) else {
                    debugTimer.error("DOWNLOAD", "Failed to decode image \(index + 1)")
                    styledPhotos.append(StyledPhoto(originalId: photos[index].id, image: photos[index].image, style: style, index: index))
                    continue
                }

                styledPhotos.append(StyledPhoto(originalId: photos[index].id, image: image, style: style, index: index))

            } catch {
                debugTimer.error("DOWNLOAD", "Failed to download photo \(index + 1): \(error.localizedDescription)")
                styledPhotos.append(StyledPhoto(originalId: photos[index].id, image: photos[index].image, style: style, index: index))
            }

            currentPhotoIndex = index + 1
            processingProgress = Double(index + 1) / Double(photos.count)
        }

        let downloadDuration = Date().timeIntervalSince(downloadStartTime)
        phaseDurations.append(("DOWNLOAD", downloadDuration))
        debugTimer.endPhase("DOWNLOAD", "All \(styledPhotos.count) photos downloaded")

        // ========== SUMMARY ==========
        debugTimer.summary(phaseDurations)

        return styledPhotos
    }
    
    /// Cancel any ongoing processing
    func cancelProcessing() {
        currentTask?.cancel()
        currentTask = nil
        isProcessing = false
        resetProgress()
    }

    /// Call the stylePhotos Cloud Function
    private func callCloudFunction(photos: [String], style: PhotoStyle) async throws -> [String] {
        let data: [String: Any] = [
            "photos": photos,
            "style": style.rawValue
        ]

        let startTime = Date()

        // Create callable with extended timeout (10 minutes) for Gemini 3 Pro Image processing
        // Processing 4 photos with rate limit retries can take 4-5+ minutes
        let callable = functions.httpsCallable("stylePhotos")
        callable.timeoutInterval = 600

        // Start a heartbeat task to show we're still waiting (every 5 seconds)
        let heartbeatTask = Task {
            var seconds = 0
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 5_000_000_000) // 5 seconds
                seconds += 5
                if debugLoggingEnabled {
                    let ts = ISO8601DateFormatter().string(from: Date())
                    print("[PHOTOBOOTH] [\(ts)] [API_CALL] [WAITING] Server processing... \(seconds)s (check Firebase Console for server logs)")
                }
            }
        }

        // Ensure heartbeat is always cancelled
        defer { heartbeatTask.cancel() }

        do {
            // Add explicit timeout wrapper (5 minutes) to handle cases where Firebase SDK doesn't timeout properly
            let result = try await withThrowingTaskGroup(of: HTTPSCallableResult.self) { group in
                group.addTask {
                    try await callable.call(data)
                }

                group.addTask {
                    try await Task.sleep(nanoseconds: 300_000_000_000) // 5 minutes timeout
                    throw GeminiError.apiError("Request timed out after 5 minutes. Please try again.")
                }

                // Return whichever completes first
                let result = try await group.next()!
                group.cancelAll()
                return result
            }
            
            let elapsed = Date().timeIntervalSince(startTime)
            if debugLoggingEnabled {
                let ts = ISO8601DateFormatter().string(from: Date())
                print("[PHOTOBOOTH] [\(ts)] [API_CALL] [RESPONSE] Cloud Function returned in \(String(format: "%.1f", elapsed))s")
            }

            guard let response = result.data as? [String: Any] else {
                if debugLoggingEnabled {
                    let ts = ISO8601DateFormatter().string(from: Date())
                    print("[PHOTOBOOTH] [\(ts)] [API_CALL] [ERROR] Invalid response format - type: \(type(of: result.data))")
                }
                throw GeminiError.invalidResponse
            }

            // Check for error in response
            if let error = response["error"] as? String {
                if debugLoggingEnabled {
                    let ts = ISO8601DateFormatter().string(from: Date())
                    print("[PHOTOBOOTH] [\(ts)] [API_CALL] [ERROR] Server error: \(error)")
                }
                throw GeminiError.apiError(error)
            }

            guard let styledPhotoUrls = response["styledPhotoUrls"] as? [String] else {
                if debugLoggingEnabled {
                    let ts = ISO8601DateFormatter().string(from: Date())
                    print("[PHOTOBOOTH] [\(ts)] [API_CALL] [ERROR] No styledPhotoUrls in response. Keys: \(response.keys.joined(separator: ", "))")
                }
                throw GeminiError.invalidResponse
            }

            return styledPhotoUrls

        } catch let error as NSError {
            let elapsed = Date().timeIntervalSince(startTime)
            if debugLoggingEnabled {
                let ts = ISO8601DateFormatter().string(from: Date())
                print("[PHOTOBOOTH] [\(ts)] [API_CALL] [ERROR] Failed after \(String(format: "%.1f", elapsed))s")
                print("[PHOTOBOOTH] [\(ts)] [API_CALL] [ERROR] Domain: \(error.domain), Code: \(error.code)")
                print("[PHOTOBOOTH] [\(ts)] [API_CALL] [ERROR] Description: \(error.localizedDescription)")
                if let message = error.userInfo["message"] as? String {
                    print("[PHOTOBOOTH] [\(ts)] [API_CALL] [ERROR] Message: \(message)")
                }
                if let details = error.userInfo["details"] {
                    print("[PHOTOBOOTH] [\(ts)] [API_CALL] [ERROR] Details: \(details)")
                }
            }

            // Handle Firebase Functions specific errors
            if error.domain == FunctionsErrorDomain {
                let code = FunctionsErrorCode(rawValue: error.code)
                if debugLoggingEnabled {
                    let ts = ISO8601DateFormatter().string(from: Date())
                    print("[PHOTOBOOTH] [\(ts)] [API_CALL] [ERROR] Firebase code: \(String(describing: code))")
                }
                switch code {
                case .unavailable:
                    throw GeminiError.apiError("Service temporarily unavailable")
                case .deadlineExceeded:
                    throw GeminiError.apiError("Request timeout - please try again")
                case .resourceExhausted:
                    throw GeminiError.apiError("Too many requests - please wait")
                default:
                    let detailedMessage = error.userInfo["message"] as? String ?? error.localizedDescription
                    throw GeminiError.apiError("code:\(error.code), \(detailedMessage)")
                }
            }
            throw error
        }
    }

    /// Reset progress tracking
    func resetProgress() {
        processingProgress = 0
        currentPhotoIndex = 0
    }
}

// MARK: - Errors

enum GeminiError: LocalizedError {
    case invalidPhotoCount
    case processingFailed
    case apiError(String)
    case invalidResponse
    case encodingFailed

    var errorDescription: String? {
        switch self {
        case .invalidPhotoCount:
            return "Expected exactly 4 photos"
        case .processingFailed:
            return "Failed to process photos after multiple attempts"
        case .apiError(let message):
            return "API Error: \(message)"
        case .invalidResponse:
            return "Invalid response from styling service"
        case .encodingFailed:
            return "Failed to encode photo data"
        }
    }
}
