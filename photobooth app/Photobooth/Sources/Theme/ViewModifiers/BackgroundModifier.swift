import SwiftUI

// MARK: - Photobooth Background Modifier
/// Theme-aware background color
/// Usage: .photoboothBackground()
struct PhotoboothBackgroundModifier: ViewModifier {
    @Environment(\.theme) var theme

    func body(content: Content) -> some View {
        ZStack {
            theme.background
                .ignoresSafeArea()

            content
        }
    }
}

// MARK: - Card Background Modifier
/// Theme-aware card background
/// Usage: .photoboothCardBackground()
struct PhotoboothCardBackgroundModifier: ViewModifier {
    @Environment(\.theme) var theme

    func body(content: Content) -> some View {
        content
            .background(theme.cardBackground)
    }
}

// MARK: - Overlay Background Modifier
/// Semi-transparent overlay background (for modals, overlays)
/// Usage: .photoboothOverlay()
struct PhotoboothOverlayModifier: ViewModifier {
    @Environment(\.theme) var theme

    func body(content: Content) -> some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()

            content
        }
    }
}

// MARK: - View Extensions
extension View {
    /// Apply theme background
    func photoboothBackground() -> some View {
        modifier(PhotoboothBackgroundModifier())
    }

    /// Apply card background
    func photoboothCardBackground() -> some View {
        modifier(PhotoboothCardBackgroundModifier())
    }

    /// Apply overlay background
    func photoboothOverlay() -> some View {
        modifier(PhotoboothOverlayModifier())
    }
}
