import Foundation
import UIKit

/// Represents a captured photo before styling
struct CapturedPhoto: Identifiable, Hashable {
    let id: String
    let image: UIImage
    let capturedAt: Date
    var index: Int // 0-3 for the 4 photos

    init(
        id: String = UUID().uuidString,
        image: UIImage,
        capturedAt: Date = Date(),
        index: Int
    ) {
        self.id = id
        self.image = image
        self.capturedAt = capturedAt
        self.index = index
    }

    // Hashable conformance
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: CapturedPhoto, rhs: CapturedPhoto) -> Bool {
        lhs.id == rhs.id
    }
}

/// Represents a styled photo returned from Gemini
struct StyledPhoto: Identifiable, Hashable {
    let id: String
    let originalId: String // Reference to CapturedPhoto
    let image: UIImage
    let style: PhotoStyle
    let processedAt: Date
    var index: Int

    init(
        id: String = UUID().uuidString,
        originalId: String,
        image: UIImage,
        style: PhotoStyle,
        processedAt: Date = Date(),
        index: Int
    ) {
        self.id = id
        self.originalId = originalId
        self.image = image
        self.style = style
        self.processedAt = processedAt
        self.index = index
    }

    // Hashable conformance
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: StyledPhoto, rhs: StyledPhoto) -> Bool {
        lhs.id == rhs.id
    }
}

/// Represents the final collage
struct Collage: Identifiable {
    let id: String
    let sessionId: String
    let image: UIImage
    let layout: CollageLayout
    let stripColor: String
    let style: PhotoStyle
    let createdAt: Date

    init(
        id: String = UUID().uuidString,
        sessionId: String,
        image: UIImage,
        layout: CollageLayout,
        stripColor: String,
        style: PhotoStyle,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.sessionId = sessionId
        self.image = image
        self.layout = layout
        self.stripColor = stripColor
        self.style = style
        self.createdAt = createdAt
    }
}
