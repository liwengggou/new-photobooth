import SwiftUI

/// Supported languages for in-app localization
enum AppLanguage: String, CaseIterable, Identifiable {
    case english = "en"
    case japanese = "ja"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .english: return "English"
        case .japanese: return "日本語"
        }
    }
}

/// Manages in-app language selection, persisted via UserDefaults
@MainActor
final class LanguageManager: ObservableObject {
    static let shared = LanguageManager()

    @Published var current: AppLanguage {
        didSet {
            UserDefaults.standard.set(current.rawValue, forKey: "appLanguage")
        }
    }

    private init() {
        let saved = UserDefaults.standard.string(forKey: "appLanguage") ?? "en"
        self.current = AppLanguage(rawValue: saved) ?? .english
    }

    /// Convenience: true when current language is Japanese
    var jp: Bool { current == .japanese }
}
