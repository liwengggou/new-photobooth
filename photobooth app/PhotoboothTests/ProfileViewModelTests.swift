import XCTest
@testable import Photobooth

@MainActor
final class ProfileViewModelTests: XCTestCase {
    var sut: ProfileViewModel!
    var mockFetcher: MockSessionFetcher!
    var testUser: User!

    override func setUp() {
        super.setUp()
        mockFetcher = MockSessionFetcher()
        sut = ProfileViewModel(sessionFetcher: mockFetcher)
        testUser = User(
            id: "test-user-123",
            email: "test@example.com",
            displayName: "Test User",
            credits: 10,
            referralCount: 5
        )
    }

    override func tearDown() {
        sut = nil
        mockFetcher = nil
        testUser = nil
        super.tearDown()
    }

    // MARK: - Load Stats Tests

    func test_loadStats_populatesStats() async {
        // Given
        mockFetcher.sessionsToReturn = [
            makeSession(style: .jpKawaii, status: .completed),
            makeSession(style: .jpKawaii, status: .completed),
            makeSession(style: .nyVintage, status: .completed)
        ]

        // When
        await sut.loadStats(for: testUser)

        // Then
        XCTAssertNotNil(sut.stats)
        XCTAssertEqual(sut.stats?.sessionCount, 3)
        XCTAssertEqual(sut.stats?.favoriteStyle, .jpKawaii)
        XCTAssertEqual(sut.stats?.credits, 10)
        XCTAssertEqual(sut.stats?.referralCount, 5)
        XCTAssertFalse(sut.isLoading)
        XCTAssertNil(sut.errorMessage)
    }

    func test_loadStats_handlesFirebaseError() async {
        // Given
        mockFetcher.errorToThrow = MockFirebaseError.networkError

        // When
        await sut.loadStats(for: testUser)

        // Then
        XCTAssertNil(sut.stats)
        XCTAssertFalse(sut.isLoading)
        XCTAssertNotNil(sut.errorMessage)
        XCTAssertTrue(sut.errorMessage?.contains("Network connection failed") ?? false)
    }

    func test_loadStats_setsLoadingDuringFetch() async {
        // Given
        mockFetcher.sessionsToReturn = []

        // Check initial state
        XCTAssertFalse(sut.isLoading)

        // When
        await sut.loadStats(for: testUser)

        // Then - after completion, loading should be false
        XCTAssertFalse(sut.isLoading)
    }

    func test_loadStats_callsFirebaseWithCorrectUserId() async {
        // Given
        mockFetcher.sessionsToReturn = []

        // When
        await sut.loadStats(for: testUser)

        // Then
        XCTAssertEqual(mockFetcher.fetchSessionsCallCount, 1)
        XCTAssertEqual(mockFetcher.lastFetchedUserId, "test-user-123")
    }

    // MARK: - Refresh Tests

    func test_refresh_reloadsData() async {
        // Given - load initial data
        mockFetcher.sessionsToReturn = [
            makeSession(style: .jpKawaii, status: .completed)
        ]
        await sut.loadStats(for: testUser)
        XCTAssertEqual(sut.stats?.sessionCount, 1)

        // Update mock to return more sessions
        mockFetcher.sessionsToReturn = [
            makeSession(style: .jpKawaii, status: .completed),
            makeSession(style: .jpKawaii, status: .completed),
            makeSession(style: .jpKawaii, status: .completed)
        ]

        // When
        await sut.refresh(for: testUser)

        // Then
        XCTAssertEqual(sut.stats?.sessionCount, 3)
        XCTAssertEqual(mockFetcher.fetchSessionsCallCount, 2)
    }

    // MARK: - Reset Tests

    func test_reset_clearsAllState() async {
        // Given - load some data first
        mockFetcher.sessionsToReturn = [
            makeSession(style: .jpKawaii, status: .completed)
        ]
        await sut.loadStats(for: testUser)
        XCTAssertNotNil(sut.stats)

        // When
        sut.reset()

        // Then
        XCTAssertNil(sut.stats)
        XCTAssertFalse(sut.isLoading)
        XCTAssertNil(sut.errorMessage)
    }

    // MARK: - Edge Cases

    func test_loadStats_withEmptySessions_returnsZeroStats() async {
        // Given
        mockFetcher.sessionsToReturn = []

        // When
        await sut.loadStats(for: testUser)

        // Then
        XCTAssertNotNil(sut.stats)
        XCTAssertEqual(sut.stats?.sessionCount, 0)
        XCTAssertEqual(sut.stats?.streakDays, 0)
        XCTAssertNil(sut.stats?.favoriteStyle)
    }

    func test_loadStats_preservesUserData() async {
        // Given
        let userWithHighCredits = User(
            id: "high-credit-user",
            email: "rich@example.com",
            displayName: "Rich User",
            credits: 100,
            referralCount: 50
        )
        mockFetcher.sessionsToReturn = []

        // When
        await sut.loadStats(for: userWithHighCredits)

        // Then
        XCTAssertEqual(sut.stats?.credits, 100)
        XCTAssertEqual(sut.stats?.referralCount, 50)
    }

    // MARK: - Streak Integration Tests

    func test_loadStats_calculatesStreakFromSessions() async {
        // Given
        let calendar = Calendar.current
        let today = Date()
        let yesterday = calendar.date(byAdding: .day, value: -1, to: today)!
        let twoDaysAgo = calendar.date(byAdding: .day, value: -2, to: today)!

        mockFetcher.sessionsToReturn = [
            makeSession(createdAt: today, status: .completed),
            makeSession(createdAt: yesterday, status: .completed),
            makeSession(createdAt: twoDaysAgo, status: .completed)
        ]

        // When
        await sut.loadStats(for: testUser)

        // Then
        XCTAssertEqual(sut.stats?.streakDays, 3)
    }

    func test_loadStats_streakIgnoresIncompleteSessions() async {
        // Given
        let today = Date()
        mockFetcher.sessionsToReturn = [
            makeSession(createdAt: today, status: .inProgress),
            makeSession(createdAt: today, status: .failed)
        ]

        // When
        await sut.loadStats(for: testUser)

        // Then
        XCTAssertEqual(sut.stats?.streakDays, 0)
    }

    // MARK: - Favorite Style Integration Tests

    func test_loadStats_calculatesFavoriteStyle() async {
        // Given - more seoulStudio than others
        mockFetcher.sessionsToReturn = [
            makeSession(style: .seoulStudio, status: .completed),
            makeSession(style: .seoulStudio, status: .completed),
            makeSession(style: .seoulStudio, status: .completed),
            makeSession(style: .jpKawaii, status: .completed),
            makeSession(style: .nyVintage, status: .completed)
        ]

        // When
        await sut.loadStats(for: testUser)

        // Then
        XCTAssertEqual(sut.stats?.favoriteStyle, .seoulStudio)
    }

    func test_loadStats_noFavoriteStyleWhenAllFailed() async {
        // Given
        mockFetcher.sessionsToReturn = [
            makeSession(style: .jpKawaii, status: .failed),
            makeSession(style: .nyVintage, status: .inProgress)
        ]

        // When
        await sut.loadStats(for: testUser)

        // Then
        XCTAssertNil(sut.stats?.favoriteStyle)
    }

    // MARK: - Credits Display Tests

    func test_loadStats_newUserWithDefaultCredits() async {
        // Given
        let newUser = User(
            id: "new-user",
            email: "new@example.com",
            displayName: "New User"
            // Uses default credits: 3
        )
        mockFetcher.sessionsToReturn = []

        // When
        await sut.loadStats(for: newUser)

        // Then
        XCTAssertEqual(sut.stats?.credits, 3, "New user should show 3 credits")
    }

    func test_loadStats_userWithPurchasedCredits() async {
        // Given
        let paidUser = User(
            id: "paid-user",
            email: "paid@example.com",
            displayName: "Paid User",
            credits: 50
        )
        mockFetcher.sessionsToReturn = []

        // When
        await sut.loadStats(for: paidUser)

        // Then
        XCTAssertEqual(sut.stats?.credits, 50)
    }

    // MARK: - Referral Count Display Tests

    func test_loadStats_userWithReferrals() async {
        // Given
        let referrer = User(
            id: "referrer",
            email: "referrer@example.com",
            displayName: "Referrer",
            credits: 18, // 3 initial + 15 referral bonus
            referralCount: 5
        )
        mockFetcher.sessionsToReturn = []

        // When
        await sut.loadStats(for: referrer)

        // Then
        XCTAssertEqual(sut.stats?.referralCount, 5)
    }

    // MARK: - Error Handling Tests

    func test_loadStats_handlesAuthenticationError() async {
        // Given
        mockFetcher.errorToThrow = MockFirebaseError.authenticationError

        // When
        await sut.loadStats(for: testUser)

        // Then
        XCTAssertNil(sut.stats)
        XCTAssertNotNil(sut.errorMessage)
        XCTAssertTrue(sut.errorMessage?.contains("not authenticated") ?? false)
    }

    func test_loadStats_handlesPermissionError() async {
        // Given
        mockFetcher.errorToThrow = MockFirebaseError.permissionDenied

        // When
        await sut.loadStats(for: testUser)

        // Then
        XCTAssertNil(sut.stats)
        XCTAssertNotNil(sut.errorMessage)
        XCTAssertTrue(sut.errorMessage?.contains("Permission denied") ?? false)
    }

    // MARK: - Complete User Profile Scenario Tests

    func test_loadStats_fullProfileScenario_activePowerUser() async {
        // Given - power user with everything maxed
        let calendar = Calendar.current
        let today = Date()
        let powerUser = User(
            id: "power-user",
            email: "power@example.com",
            displayName: "Power User",
            credits: 100,
            referralCount: 10
        )

        // Sessions: 7-day streak, favorite style is jpKawaii
        var sessions: [PhotoSession] = []
        for dayOffset in 0..<7 {
            let date = calendar.date(byAdding: .day, value: -dayOffset, to: today)!
            // 2 jpKawaii + 1 other style per day
            sessions.append(makeSession(createdAt: date, style: .jpKawaii, status: .completed))
            sessions.append(makeSession(createdAt: date, style: .jpKawaii, status: .completed))
            sessions.append(makeSession(createdAt: date, style: .seoulStudio, status: .completed))
        }
        mockFetcher.sessionsToReturn = sessions

        // When
        await sut.loadStats(for: powerUser)

        // Then
        XCTAssertEqual(sut.stats?.sessionCount, 21, "7 days × 3 sessions")
        XCTAssertEqual(sut.stats?.streakDays, 7, "7 consecutive days")
        XCTAssertEqual(sut.stats?.favoriteStyle, .jpKawaii, "14 jpKawaii vs 7 seoulStudio")
        XCTAssertEqual(sut.stats?.referralCount, 10)
        XCTAssertEqual(sut.stats?.credits, 100)
    }

    func test_loadStats_fullProfileScenario_newUser() async {
        // Given - brand new user
        let newUser = User(
            id: "brand-new",
            email: "brand-new@example.com",
            displayName: "Brand New"
        )
        mockFetcher.sessionsToReturn = []

        // When
        await sut.loadStats(for: newUser)

        // Then
        XCTAssertEqual(sut.stats?.sessionCount, 0)
        XCTAssertEqual(sut.stats?.streakDays, 0)
        XCTAssertNil(sut.stats?.favoriteStyle)
        XCTAssertEqual(sut.stats?.referralCount, 0)
        XCTAssertEqual(sut.stats?.credits, 3, "Default credits for new user")
    }

    func test_loadStats_fullProfileScenario_returningUser() async {
        // Given - user who hasn't used app in a while (broken streak)
        let calendar = Calendar.current
        let fiveDaysAgo = calendar.date(byAdding: .day, value: -5, to: Date())!
        let sixDaysAgo = calendar.date(byAdding: .day, value: -6, to: Date())!

        let returningUser = User(
            id: "returning",
            email: "returning@example.com",
            displayName: "Returning User",
            credits: 8,
            referralCount: 2
        )

        mockFetcher.sessionsToReturn = [
            makeSession(createdAt: fiveDaysAgo, style: .nyVintage, status: .completed),
            makeSession(createdAt: sixDaysAgo, style: .nyVintage, status: .completed)
        ]

        // When
        await sut.loadStats(for: returningUser)

        // Then
        XCTAssertEqual(sut.stats?.sessionCount, 2)
        XCTAssertEqual(sut.stats?.streakDays, 0, "Streak broken - no recent sessions")
        XCTAssertEqual(sut.stats?.favoriteStyle, .nyVintage)
        XCTAssertEqual(sut.stats?.referralCount, 2)
        XCTAssertEqual(sut.stats?.credits, 8)
    }

    // MARK: - Multiple Calls Tests

    func test_loadStats_multipleCallsForDifferentUsers() async {
        // Given
        let user1 = User(id: "user1", email: "u1@test.com", displayName: "U1", credits: 5, referralCount: 1)
        let user2 = User(id: "user2", email: "u2@test.com", displayName: "U2", credits: 20, referralCount: 3)

        // When - load first user
        mockFetcher.sessionsToReturn = [makeSession(style: .jpKawaii, status: .completed)]
        await sut.loadStats(for: user1)

        // Then
        XCTAssertEqual(sut.stats?.credits, 5)
        XCTAssertEqual(mockFetcher.lastFetchedUserId, "user1")

        // When - load second user
        mockFetcher.sessionsToReturn = [
            makeSession(style: .seoulStudio, status: .completed),
            makeSession(style: .seoulStudio, status: .completed)
        ]
        await sut.loadStats(for: user2)

        // Then - should have user2's data
        XCTAssertEqual(sut.stats?.credits, 20)
        XCTAssertEqual(sut.stats?.referralCount, 3)
        XCTAssertEqual(sut.stats?.sessionCount, 2)
        XCTAssertEqual(sut.stats?.favoriteStyle, .seoulStudio)
        XCTAssertEqual(mockFetcher.lastFetchedUserId, "user2")
    }

    // MARK: - Helper Methods

    private func makeSession(
        createdAt: Date = Date(),
        style: PhotoStyle? = .jpKawaii,
        status: SessionStatus = .completed
    ) -> PhotoSession {
        PhotoSession(
            id: UUID().uuidString,
            userId: testUser.id,
            style: style,
            createdAt: createdAt,
            status: status
        )
    }
}
