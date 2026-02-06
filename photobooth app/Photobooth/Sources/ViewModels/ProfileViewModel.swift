import Foundation

/// Protocol for Firebase session fetching to enable dependency injection for testing
protocol SessionFetching {
    func fetchSessions(userId: String) async throws -> [PhotoSession]
}

/// Make FirebaseService conform to SessionFetching
extension FirebaseService: SessionFetching {}

/// ViewModel for Profile screen - orchestrates loading user stats from Firebase
@MainActor
final class ProfileViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var stats: ProfileStats?
    @Published var isLoading = false
    @Published var errorMessage: String?

    // MARK: - Dependencies
    private let statsService: ProfileStatsService
    private let sessionFetcher: SessionFetching
    private var currentUserId: String?

    // MARK: - Initialization

    init(
        statsService: ProfileStatsService = ProfileStatsService(),
        sessionFetcher: SessionFetching? = nil
    ) {
        self.statsService = statsService
        self.sessionFetcher = sessionFetcher ?? FirebaseService.shared
    }

    // MARK: - Public Methods

    /// Load profile stats for the given user
    /// - Parameter user: The user to load stats for
    func loadStats(for user: User) async {
        currentUserId = user.id
        isLoading = true
        errorMessage = nil

        do {
            let sessions = try await sessionFetcher.fetchSessions(userId: user.id)
            let calculatedStats = statsService.buildStats(user: user, sessions: sessions)
            stats = calculatedStats
            isLoading = false
        } catch {
            errorMessage = "Failed to load profile stats: \(error.localizedDescription)"
            isLoading = false

            // Track error
            AnalyticsService.shared.logError(
                error: error.localizedDescription,
                location: "ProfileViewModel.loadStats"
            )
        }
    }

    /// Refresh stats for the current user
    /// - Parameter user: The user to refresh stats for
    func refresh(for user: User) async {
        await loadStats(for: user)
    }

    /// Reset the view model state
    func reset() {
        stats = nil
        isLoading = false
        errorMessage = nil
        currentUserId = nil
    }
}
