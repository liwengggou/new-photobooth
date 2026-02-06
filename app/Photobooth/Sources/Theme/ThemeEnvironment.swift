import SwiftUI

// MARK: - Theme Environment Key
private struct ThemeEnvironmentKey: EnvironmentKey {
    static let defaultValue = AppTheme.jpKawaii
}

// MARK: - Environment Values Extension
extension EnvironmentValues {
    var theme: AppTheme {
        get { self[ThemeEnvironmentKey.self] }
        set { self[ThemeEnvironmentKey.self] = newValue }
    }
}

// MARK: - View Extension for Theme Injection
extension View {
    /// Inject a theme into the environment for this view and its descendants
    func theme(_ theme: AppTheme) -> some View {
        environment(\.theme, theme)
    }
}
