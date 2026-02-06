import Foundation

/// All navigable destinations in the app
enum AppDestination: Hashable {
    // Auth Flow
    case login
    case signup

    // Main Flow
    case home
    case settings
    case referral

    // Photo Session Flow
    case intervalSelection
    case camera
    case photoReview
    case styleSelection
    case processing
    case customization
    case preview
    case success
}
