import SwiftUI

// MARK: - Photobooth Header Modifier
/// Glassmorphism header with backdrop blur effect
/// Usage: .photoboothHeader()
struct PhotoboothHeaderModifier: ViewModifier {
    @Environment(\.theme) var theme

    func body(content: Content) -> some View {
        content
            .padding(.horizontal, theme.spacing.lg)
            .padding(.vertical, theme.spacing.md)
            .background(
                theme.background
                    .opacity(0.9)
                    .background(.ultraThinMaterial)
            )
            .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

// MARK: - Sticky Header Modifier
/// Sticky header that stays at top
/// Usage: .photoboothStickyHeader()
struct PhotoboothStickyHeaderModifier: ViewModifier {
    @Environment(\.theme) var theme

    func body(content: Content) -> some View {
        VStack(spacing: 0) {
            content
                .padding(.horizontal, theme.spacing.lg)
                .padding(.vertical, theme.spacing.md)
                .background(
                    theme.background
                        .opacity(0.9)
                        .background(.ultraThinMaterial)
                )
                .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)

            Spacer()
        }
    }
}

// MARK: - View Extensions
extension View {
    /// Apply glassmorphism header styling
    func photoboothHeader() -> some View {
        modifier(PhotoboothHeaderModifier())
    }

    /// Apply sticky header styling
    func photoboothStickyHeader() -> some View {
        modifier(PhotoboothStickyHeaderModifier())
    }
}
