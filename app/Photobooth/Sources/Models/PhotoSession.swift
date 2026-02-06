import Foundation
import SwiftUI

/// Represents a photo session
struct PhotoSession: Identifiable, Codable, Hashable {
    let id: String
    var userId: String
    var style: PhotoStyle?
    var layout: CollageLayout?
    var stripColor: String // Hex color
    var interval: Int // Seconds between shots (5-10)
    var createdAt: Date
    var status: SessionStatus

    init(
        id: String = UUID().uuidString,
        userId: String = "",
        style: PhotoStyle? = nil,
        layout: CollageLayout? = nil,
        stripColor: String = "#FFFFFF",
        interval: Int = 5,
        createdAt: Date = Date(),
        status: SessionStatus = .inProgress
    ) {
        self.id = id
        self.userId = userId
        self.style = style
        self.layout = layout
        self.stripColor = stripColor
        self.interval = interval
        self.createdAt = createdAt
        self.status = status
    }
}

/// Status of a photo session
enum SessionStatus: String, Codable, Hashable {
    case inProgress
    case completed
    case failed
}

/// Available photo styles
enum PhotoStyle: String, Codable, Hashable, CaseIterable {
    case nyVintage = "newyork"
    case seoulStudio = "korean"
    case jpKawaii = "japanese"

    var displayName: String {
        switch self {
        case .nyVintage: return "NY Vintage"
        case .seoulStudio: return "Seoul Studio"
        case .jpKawaii: return "JP Kawaii"
        }
    }

    var description: String {
        switch self {
        case .nyVintage:
            return "Classic B&W"
        case .seoulStudio:
            return "Natural Glow"
        case .jpKawaii:
            return "Magical Beauty"
        }
    }

    var iconName: String {
        switch self {
        case .nyVintage: return "camera.aperture"
        case .seoulStudio: return "person.crop.circle"
        case .jpKawaii: return "sparkles"
        }
    }

    var theme: AppTheme {
        switch self {
        case .nyVintage: return .nyVintage
        case .seoulStudio: return .seoulStudio
        case .jpKawaii: return .jpKawaii
        }
    }
}

/// Available collage layouts
enum CollageLayout: String, Codable, Hashable, CaseIterable {
    case strip = "1x4" // Vertical strip
    case grid = "2x2" // 2x2 grid

    var displayName: String {
        switch self {
        case .strip: return "Strip (1×4)"
        case .grid: return "Grid (2×2)"
        }
    }

    var columns: Int {
        switch self {
        case .strip: return 1
        case .grid: return 2
        }
    }

    var rows: Int {
        switch self {
        case .strip: return 4
        case .grid: return 2
        }
    }
}
