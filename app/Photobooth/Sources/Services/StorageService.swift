import Foundation
import UIKit
import Photos

/// Local storage service for photos and videos
@MainActor
final class StorageService: ObservableObject {
    static let shared = StorageService()

    private let fileManager = FileManager.default
    private var documentsDirectory: URL {
        fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }

    private init() {
        createDirectoriesIfNeeded()
    }

    // MARK: - Directory Setup

    private func createDirectoriesIfNeeded() {
        let directories = ["collages", "videos", "temp"]
        for dir in directories {
            let path = documentsDirectory.appendingPathComponent(dir)
            if !fileManager.fileExists(atPath: path.path) {
                try? fileManager.createDirectory(at: path, withIntermediateDirectories: true)
            }
        }
    }

    // MARK: - Collage Storage

    /// Save collage to local storage
    func saveCollage(_ image: UIImage, sessionId: String) async throws -> URL {
        let collagesDir = documentsDirectory.appendingPathComponent("collages")
        let fileName = "collage_\(sessionId).jpg"
        let fileURL = collagesDir.appendingPathComponent(fileName)

        guard let data = image.jpegData(compressionQuality: 0.9) else {
            throw StorageError.encodingFailed
        }

        try data.write(to: fileURL)
        return fileURL
    }

    /// Load collage from local storage
    func loadCollage(sessionId: String) async throws -> UIImage? {
        let collagesDir = documentsDirectory.appendingPathComponent("collages")
        let fileName = "collage_\(sessionId).jpg"
        let fileURL = collagesDir.appendingPathComponent(fileName)

        guard fileManager.fileExists(atPath: fileURL.path) else {
            return nil
        }

        let data = try Data(contentsOf: fileURL)
        return UIImage(data: data)
    }

    /// Get all saved collages
    func getAllCollages() async throws -> [Collage] {
        let collagesDir = documentsDirectory.appendingPathComponent("collages")

        guard fileManager.fileExists(atPath: collagesDir.path) else {
            return []
        }

        let files = try fileManager.contentsOfDirectory(
            at: collagesDir,
            includingPropertiesForKeys: [.creationDateKey],
            options: .skipsHiddenFiles
        )

        var collages: [Collage] = []
        for file in files where file.pathExtension == "jpg" {
            let sessionId = file.deletingPathExtension().lastPathComponent.replacingOccurrences(of: "collage_", with: "")
            if let data = try? Data(contentsOf: file),
               let image = UIImage(data: data) {
                // Get file creation date
                let attributes = try? fileManager.attributesOfItem(atPath: file.path)
                let createdAt = attributes?[.creationDate] as? Date ?? Date()

                let collage = Collage(
                    id: UUID().uuidString,
                    sessionId: sessionId,
                    image: image,
                    layout: .strip, // Default - ideally load from metadata
                    stripColor: "#FFFFFF", // Default - ideally load from metadata
                    style: .jpKawaii, // Default - ideally load from metadata
                    createdAt: createdAt
                )
                collages.append(collage)
            }
        }

        // Sort by creation date, newest first
        return collages.sorted { $0.createdAt > $1.createdAt }
    }

    /// Delete all saved collages
    func deleteAllCollages() async throws {
        let collagesDir = documentsDirectory.appendingPathComponent("collages")
        let videosDir = documentsDirectory.appendingPathComponent("videos")

        // Delete all collage files
        if fileManager.fileExists(atPath: collagesDir.path) {
            let files = try fileManager.contentsOfDirectory(at: collagesDir, includingPropertiesForKeys: nil)
            for file in files {
                try fileManager.removeItem(at: file)
            }
        }

        // Delete all video files
        if fileManager.fileExists(atPath: videosDir.path) {
            let files = try fileManager.contentsOfDirectory(at: videosDir, includingPropertiesForKeys: nil)
            for file in files {
                try fileManager.removeItem(at: file)
            }
        }

        print("Deleted all local collages and videos")
    }

    // MARK: - Video Storage

    /// Get video URL for session
    func getVideoURL(sessionId: String) -> URL {
        documentsDirectory.appendingPathComponent("videos/video_\(sessionId).mp4")
    }

    // MARK: - Photo Library

    /// Save image to photo library
    func saveToPhotoLibrary(_ image: UIImage) async throws {
        return try await withCheckedThrowingContinuation { continuation in
            PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
                guard status == .authorized || status == .limited else {
                    continuation.resume(throwing: StorageError.notAuthorized)
                    return
                }

                PHPhotoLibrary.shared().performChanges {
                    PHAssetCreationRequest.forAsset().addResource(
                        with: .photo,
                        data: image.jpegData(compressionQuality: 0.9)!,
                        options: nil
                    )
                } completionHandler: { success, error in
                    if success {
                        continuation.resume()
                    } else {
                        continuation.resume(throwing: error ?? StorageError.saveFailed)
                    }
                }
            }
        }
    }

    /// Save video to photo library
    func saveVideoToPhotoLibrary(_ videoURL: URL) async throws {
        // Verify file exists before attempting to save
        guard fileManager.fileExists(atPath: videoURL.path) else {
            print("❌ Video file not found at: \(videoURL.path)")
            throw StorageError.fileNotFound
        }

        // Verify file is not empty
        do {
            let attributes = try fileManager.attributesOfItem(atPath: videoURL.path)
            guard let fileSize = attributes[.size] as? Int64, fileSize > 0 else {
                print("❌ Video file is empty at: \(videoURL.path)")
                throw StorageError.invalidVideo
            }
            print("✅ Video file validated: \(fileSize) bytes")
        } catch let error as StorageError {
            throw error
        } catch {
            print("❌ Failed to read video file attributes: \(error)")
            throw StorageError.fileNotFound
        }

        return try await withCheckedThrowingContinuation { continuation in
            PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
                guard status == .authorized || status == .limited else {
                    print("❌ Photo library not authorized: \(status.rawValue)")
                    continuation.resume(throwing: StorageError.notAuthorized)
                    return
                }

                PHPhotoLibrary.shared().performChanges {
                    PHAssetCreationRequest.forAsset().addResource(
                        with: .video,
                        fileURL: videoURL,
                        options: nil
                    )
                } completionHandler: { success, error in
                    if success {
                        print("✅ Video saved to Photos library")
                        continuation.resume()
                    } else {
                        print("❌ Failed to save video to Photos: \(error?.localizedDescription ?? "Unknown error")")
                        continuation.resume(throwing: error ?? StorageError.saveFailed)
                    }
                }
            }
        }
    }

    // MARK: - Cleanup

    /// Delete temporary files
    func cleanupTempFiles() {
        let tempDir = documentsDirectory.appendingPathComponent("temp")
        try? fileManager.removeItem(at: tempDir)
        createDirectoriesIfNeeded()
    }
}

// MARK: - Errors

enum StorageError: LocalizedError {
    case encodingFailed
    case saveFailed
    case notAuthorized
    case fileNotFound
    case invalidVideo

    var errorDescription: String? {
        switch self {
        case .encodingFailed:
            return "Failed to encode image"
        case .saveFailed:
            return "Failed to save file"
        case .notAuthorized:
            return "Photo library access not authorized. Please enable in Settings."
        case .fileNotFound:
            return "File not found"
        case .invalidVideo:
            return "Video file is corrupted or empty"
        }
    }
}
