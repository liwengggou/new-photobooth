import SwiftUI

// MARK: - Photobooth Card Modifier
/// Applies consistent card styling matching the web design
/// Usage: .photoboothCard()
struct PhotoboothCardModifier: ViewModifier {
    @Environment(\.theme) var theme

    func body(content: Content) -> some View {
        content
            .padding(theme.spacing.lg)
            .background(theme.cardBackground)
            .cornerRadius(theme.corners.large)
            .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 2)
    }
}

// MARK: - Small Card Modifier
/// Smaller version of card with reduced padding
/// Usage: .photoboothCardSmall()
struct PhotoboothCardSmallModifier: ViewModifier {
    @Environment(\.theme) var theme

    func body(content: Content) -> some View {
        content
            .padding(theme.spacing.md)
            .background(theme.cardBackground)
            .cornerRadius(theme.corners.medium)
            .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 1)
    }
}

// MARK: - View Extension
extension View {
    /// Apply standard photobooth card styling
    func photoboothCard() -> some View {
        modifier(PhotoboothCardModifier())
    }

    /// Apply small photobooth card styling
    func photoboothCardSmall() -> some View {
        modifier(PhotoboothCardSmallModifier())
    }
}
