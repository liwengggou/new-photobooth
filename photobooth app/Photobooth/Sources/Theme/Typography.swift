import SwiftUI
import UIKit

// MARK: - Typography System
struct Typography {
    // MARK: - Japanese check
    private static var isJapanese: Bool {
        UserDefaults.standard.string(forKey: "appLanguage") == "ja"
    }

    // MARK: - Display Font (Be Vietnam Pro)
    /// Use for headings, titles, and emphasis text
    /// In Japanese mode, adds Hiragino Sans as cascade for Japanese characters only
    static func display(_ size: CGFloat, weight: Font.Weight = .bold) -> Font {
        // Try custom font first
        if let beVietnam = UIFont(name: fontName(for: weight), size: size) {
            if isJapanese {
                return Font(withJapaneseCascade(beVietnam, weight: weight))
            }
            return Font.custom(fontName(for: weight), size: size)
        }
        // Fallback to system font
        let systemFont = UIFont.systemFont(ofSize: size, weight: uiFontWeight(for: weight))
        if isJapanese {
            return Font(withJapaneseCascade(systemFont, weight: weight))
        }
        return Font.system(size: size, weight: weight, design: .default)
    }

    // MARK: - Body Font (System SF Pro)
    /// Use for body text, descriptions, and UI labels
    /// In Japanese mode, adds Hiragino Sans as cascade for Japanese characters only
    static func body(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        let systemFont = UIFont.systemFont(ofSize: size, weight: uiFontWeight(for: weight))
        if isJapanese {
            return Font(withJapaneseCascade(systemFont, weight: weight))
        }
        return Font.system(size: size, weight: weight, design: .default)
    }

    // MARK: - Size Presets (matching web app design)

    // Display sizes — computed to react to language changes
    static var displayXL: Font { display(120, weight: .black) }      // Hero countdown
    static var displayLG: Font { display(64, weight: .black) }       // Main headings
    static var displayMD: Font { display(32, weight: .bold) }        // Section titles
    static var displaySM: Font { display(24, weight: .bold) }        // Card titles

    // Body sizes
    static var bodyLG: Font { body(16, weight: .regular) }           // Standard text
    static var bodyMD: Font { body(14, weight: .regular) }           // Secondary text
    static var bodySM: Font { body(12, weight: .semibold) }          // Captions
    static var bodyXS: Font { body(11, weight: .semibold) }          // Small labels

    // MARK: - Private Helpers
    private static func fontName(for weight: Font.Weight) -> String {
        switch weight {
        case .black:
            return "BeVietnamPro-Black"
        case .bold, .heavy:
            return "BeVietnamPro-Bold"
        case .semibold, .medium:
            return "BeVietnamPro-Medium"
        default:
            return "BeVietnamPro-Regular"
        }
    }

    private static func hiraginoFontName(for weight: Font.Weight) -> String {
        switch weight {
        case .black, .heavy, .bold:
            return "HiraginoSans-W7"
        case .semibold, .medium:
            return "HiraginoSans-W6"
        default:
            return "HiraginoSans-W3"
        }
    }

    /// Adds Hiragino Sans as a cascade fallback so Japanese characters use it
    /// while English/Latin characters keep the primary font
    private static func withJapaneseCascade(_ primaryFont: UIFont, weight: Font.Weight) -> UIFont {
        let hiraginoName = hiraginoFontName(for: weight)
        let hiraginoDescriptor = UIFontDescriptor(name: hiraginoName, size: primaryFont.pointSize)
        let cascadeDescriptor = primaryFont.fontDescriptor.addingAttributes([
            .cascadeList: [hiraginoDescriptor]
        ])
        return UIFont(descriptor: cascadeDescriptor, size: primaryFont.pointSize)
    }

    private static func uiFontWeight(for weight: Font.Weight) -> UIFont.Weight {
        switch weight {
        case .black: return .black
        case .heavy: return .heavy
        case .bold: return .bold
        case .semibold: return .semibold
        case .medium: return .medium
        case .light: return .light
        case .thin: return .thin
        case .ultraLight: return .ultraLight
        default: return .regular
        }
    }
}

// MARK: - Text Extension for Tracking (Letter Spacing)
extension View {
    /// Apply letter-spacing similar to Tailwind's tracking-tight
    func trackingTight() -> some View {
        self.tracking(-0.5)
    }

    /// Apply letter-spacing similar to Tailwind's tracking-wide
    func trackingWide() -> some View {
        self.tracking(1.0)
    }

    /// Apply letter-spacing similar to Tailwind's tracking-wider
    func trackingWider() -> some View {
        self.tracking(1.5)
    }
}
