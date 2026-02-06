import SwiftUI

// MARK: - Primary Button Style
/// Primary button style with theme colors and proper press handling
/// Usage: Button("Title") { }.buttonStyle(PhotoboothPrimaryButtonStyle())
struct PhotoboothPrimaryButtonStyle: ButtonStyle {
    let isDisabled: Bool

    init(isDisabled: Bool = false) {
        self.isDisabled = isDisabled
    }

    func makeBody(configuration: Configuration) -> some View {
        PrimaryButtonLabel(
            configuration: configuration,
            isDisabled: isDisabled
        )
    }
}

// Internal view that can read Environment
private struct PrimaryButtonLabel: View {
    @Environment(\.theme) var theme
    let configuration: ButtonStyleConfiguration
    let isDisabled: Bool

    var body: some View {
        configuration.label
            .font(Typography.body(16, weight: .heavy))
            .frame(maxWidth: .infinity)
            .padding(.vertical, theme.spacing.md)   // 12pt vertical
            .padding(.horizontal, theme.spacing.lg)  // 16pt horizontal
            .background(isDisabled ? theme.secondary.opacity(0.3) : theme.primary)
            .foregroundColor(isDisabled ? theme.textSecondary : theme.background)
            .cornerRadius(theme.corners.medium)
            .shadow(color: isDisabled ? .clear : .black.opacity(0.2), radius: 12, x: 0, y: 4)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.2), value: configuration.isPressed)
    }
}

// MARK: - Secondary Button Style
/// Secondary button style with accent background and proper press handling
/// Usage: Button("Title") { }.buttonStyle(PhotoboothSecondaryButtonStyle())
struct PhotoboothSecondaryButtonStyle: ButtonStyle {
    let isDisabled: Bool

    init(isDisabled: Bool = false) {
        self.isDisabled = isDisabled
    }

    func makeBody(configuration: Configuration) -> some View {
        SecondaryButtonLabel(
            configuration: configuration,
            isDisabled: isDisabled
        )
    }
}

// Internal view that can read Environment
private struct SecondaryButtonLabel: View {
    @Environment(\.theme) var theme
    let configuration: ButtonStyleConfiguration
    let isDisabled: Bool

    var body: some View {
        configuration.label
            .font(Typography.body(16, weight: .semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, theme.spacing.md)   // 12pt vertical
            .padding(.horizontal, theme.spacing.lg)  // 16pt horizontal
            .background(isDisabled ? theme.accent.opacity(0.3) : theme.accent)
            .foregroundColor(isDisabled ? theme.textSecondary : theme.text)
            .cornerRadius(theme.corners.medium)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.2), value: configuration.isPressed)
    }
}

// MARK: - Overlay Secondary Button Style
/// Secondary button style for dark overlays - always uses white colors
/// Usage: Button("Title") { }.buttonStyle(OverlaySecondaryButtonStyle())
struct OverlaySecondaryButtonStyle: ButtonStyle {
    let isDisabled: Bool

    init(isDisabled: Bool = false) {
        self.isDisabled = isDisabled
    }

    func makeBody(configuration: Configuration) -> some View {
        OverlaySecondaryButtonLabel(
            configuration: configuration,
            isDisabled: isDisabled
        )
    }
}

// Internal view that can read Environment
private struct OverlaySecondaryButtonLabel: View {
    @Environment(\.theme) var theme
    let configuration: ButtonStyleConfiguration
    let isDisabled: Bool

    var body: some View {
        configuration.label
            .font(Typography.body(16, weight: .semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, theme.spacing.md)   // 12pt vertical
            .padding(.horizontal, theme.spacing.lg)  // 16pt horizontal
            .background(isDisabled ? theme.overlaySecondaryButtonBackground.opacity(0.3) : theme.overlaySecondaryButtonBackground)
            .foregroundColor(isDisabled ? theme.overlayButtonText.opacity(0.6) : theme.overlayButtonText)
            .cornerRadius(theme.corners.medium)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.2), value: configuration.isPressed)
    }
}

// MARK: - Legacy ViewModifiers (kept for backward compatibility with non-Button views)

/// Primary button modifier for styling non-Button views
struct PhotoboothPrimaryButtonModifier: ViewModifier {
    @Environment(\.theme) var theme
    let isDisabled: Bool

    init(isDisabled: Bool = false) {
        self.isDisabled = isDisabled
    }

    func body(content: Content) -> some View {
        content
            .font(Typography.body(16, weight: .heavy))
            .frame(maxWidth: .infinity)
            .padding(.vertical, theme.spacing.md)
            .padding(.horizontal, theme.spacing.lg)
            .background(isDisabled ? theme.secondary.opacity(0.3) : theme.primary)
            .foregroundColor(isDisabled ? theme.textSecondary : theme.background)
            .cornerRadius(theme.corners.medium)
            .shadow(color: isDisabled ? .clear : .black.opacity(0.2), radius: 12, x: 0, y: 4)
    }
}

/// Secondary button modifier for styling non-Button views
struct PhotoboothSecondaryButtonModifier: ViewModifier {
    @Environment(\.theme) var theme
    let isDisabled: Bool

    init(isDisabled: Bool = false) {
        self.isDisabled = isDisabled
    }

    func body(content: Content) -> some View {
        content
            .font(Typography.body(16, weight: .semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, theme.spacing.md)
            .padding(.horizontal, theme.spacing.lg)
            .background(isDisabled ? theme.accent.opacity(0.3) : theme.accent)
            .foregroundColor(isDisabled ? theme.textSecondary : theme.text)
            .cornerRadius(theme.corners.medium)
    }
}

// MARK: - Tertiary Button Modifier
/// Tertiary button style - text only
/// Usage: .photoboothTertiaryButton()
struct PhotoboothTertiaryButtonModifier: ViewModifier {
    @Environment(\.theme) var theme

    func body(content: Content) -> some View {
        content
            .font(Typography.body(14, weight: .medium))
            .foregroundColor(theme.text)
            .padding(.vertical, theme.spacing.md)
    }
}

// MARK: - Icon Button Modifier
/// Small icon-only button
/// Usage: .photoboothIconButton()
struct PhotoboothIconButtonModifier: ViewModifier {
    @Environment(\.theme) var theme

    func body(content: Content) -> some View {
        content
            .font(.system(size: 20))
            .foregroundColor(theme.text)
            .frame(width: 44, height: 44)
            .background(theme.accent)
            .cornerRadius(theme.corners.medium)
    }
}

// MARK: - View Extensions
extension View {
    /// Apply primary button styling (uses ViewModifier for non-Button views)
    func photoboothPrimaryButton(isDisabled: Bool = false) -> some View {
        modifier(PhotoboothPrimaryButtonModifier(isDisabled: isDisabled))
    }

    /// Apply secondary button styling (uses ViewModifier for non-Button views)
    func photoboothSecondaryButton(isDisabled: Bool = false) -> some View {
        modifier(PhotoboothSecondaryButtonModifier(isDisabled: isDisabled))
    }

    /// Apply tertiary button styling
    func photoboothTertiaryButton() -> some View {
        modifier(PhotoboothTertiaryButtonModifier())
    }

    /// Apply icon button styling
    func photoboothIconButton() -> some View {
        modifier(PhotoboothIconButtonModifier())
    }

    /// Add press animation (scale effect)
    func pressAnimation() -> some View {
        self.scaleEffect(1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: UUID())
    }
}
