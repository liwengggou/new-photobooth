import SwiftUI

// MARK: - Color Hex Extension
extension Color {
    init(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0
        Scanner(string: hexSanitized).scanHexInt64(&rgb)

        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0

        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Spacing Tokens
struct Spacing {
    let xs: CGFloat = 4    // gap-1
    let sm: CGFloat = 8    // gap-2
    let md: CGFloat = 12   // gap-3
    let lg: CGFloat = 16   // gap-4
    let xl: CGFloat = 20   // gap-5
    let xxl: CGFloat = 24  // gap-6
}

// MARK: - Corner Radius Tokens
struct CornerRadius {
    let small: CGFloat = 8     // rounded-lg
    let medium: CGFloat = 12   // rounded-xl
    let large: CGFloat = 16    // rounded-2xl
    let xlarge: CGFloat = 24   // rounded-3xl
}

// MARK: - App Theme
struct AppTheme {
    let background: Color
    let cardBackground: Color
    let primary: Color
    let secondary: Color
    let text: Color
    let textSecondary: Color
    let accent: Color
    let isDark: Bool

    let spacing: Spacing
    let corners: CornerRadius

    init(
        background: Color,
        cardBackground: Color,
        primary: Color,
        secondary: Color = .gray,
        text: Color,
        textSecondary: Color,
        accent: Color,
        isDark: Bool = false
    ) {
        self.background = background
        self.cardBackground = cardBackground
        self.primary = primary
        self.secondary = secondary
        self.text = text
        self.textSecondary = textSecondary
        self.accent = accent
        self.isDark = isDark
        self.spacing = Spacing()
        self.corners = CornerRadius()
    }

    // MARK: - Camera UI Colors
    /// Background color for camera header buttons (40x40 circular)
    var cameraButtonBackground: Color {
        isDark ? Color.white.opacity(0.1) : Color.black.opacity(0.05)
    }

    /// Icon color for camera header buttons
    var cameraButtonIcon: Color {
        isDark ? .white : .black
    }

    /// Color for shot indicator dots (filled and outlined)
    var cameraIndicatorColor: Color {
        isDark ? .white : .black
    }

    /// Color for countdown number display
    var cameraCountdownColor: Color {
        isDark ? .white : .black
    }

    /// Secondary color for camera UI (labels at 50% opacity)
    var cameraSecondaryColor: Color {
        isDark ? Color.white.opacity(0.5) : Color.black.opacity(0.5)
    }

    /// Background color for thumbnail number badges
    var cameraThumbnailBadgeBg: Color {
        isDark ? .white : .black
    }

    /// Text color for thumbnail number badges
    var cameraThumbnailBadgeText: Color {
        isDark ? .black : .white
    }

    // MARK: - Overlay Button Colors (for buttons on dark overlays)
    /// Background color for secondary buttons on dark overlays
    var overlaySecondaryButtonBackground: Color {
        Color.white.opacity(0.1)
    }

    /// Text color for buttons on dark overlays
    var overlayButtonText: Color {
        .white
    }
}

// MARK: - Theme Presets
extension AppTheme {
    /// NY Vintage - Dark theme with high contrast
    static let nyVintage = AppTheme(
        background: Color(hex: "#1a1a1a"),
        cardBackground: Color(hex: "#1a1a1a"),
        primary: .white,
        secondary: Color.white.opacity(0.7),
        text: .white,
        textSecondary: Color.white.opacity(0.6),
        accent: Color.white.opacity(0.1),
        isDark: true
    )

    /// Seoul Studio - Light gray theme with subtle contrast
    static let seoulStudio = AppTheme(
        background: Color(hex: "#E5E5E5"),
        cardBackground: Color(hex: "#E5E5E5"),
        primary: .black,
        secondary: Color.black.opacity(0.7),
        text: .black,
        textSecondary: Color.black.opacity(0.6),
        accent: Color.black.opacity(0.1)
    )

    /// JP Kawaii - Pure white theme with clean aesthetics
    static let jpKawaii = AppTheme(
        background: .white,
        cardBackground: .white,
        primary: .black,
        secondary: Color.black.opacity(0.7),
        text: .black,
        textSecondary: Color.black.opacity(0.6),
        accent: Color.black.opacity(0.1)
    )
}


// MARK: - Zinc Color Palette (for UI elements)
extension Color {
    static let zinc50 = Color(hex: "#fafafa")
    static let zinc100 = Color(hex: "#f4f4f5")
    static let zinc200 = Color(hex: "#e4e4e7")
    static let zinc300 = Color(hex: "#d4d4d8")
    static let zinc400 = Color(hex: "#a1a1aa")
    static let zinc500 = Color(hex: "#71717a")
    static let zinc600 = Color(hex: "#52525b")
    static let zinc700 = Color(hex: "#3f3f46")
    static let zinc800 = Color(hex: "#27272a")
    static let zinc900 = Color(hex: "#18181b")
}

// MARK: - Screen Header Component
struct ScreenHeader: View {
    let title: String
    let subtitle: String?

    init(_ title: String, subtitle: String? = nil) {
        self.title = title
        self.subtitle = subtitle
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(Typography.display(32, weight: .black))
                .trackingTight()
                .foregroundColor(.black)

            if let subtitle = subtitle {
                Text(subtitle)
                    .font(Typography.body(14))
                    .foregroundColor(.black.opacity(0.6))
                    .multilineTextAlignment(.leading)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 24)
        .padding(.top, 40)
    }
}
