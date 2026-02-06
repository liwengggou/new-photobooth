import XCTest
@testable import Photobooth

final class ProfileStatsServiceTests: XCTestCase {
    var sut: ProfileStatsService!

    override func setUp() {
        super.setUp()
        sut = ProfileStatsService()
    }

    override func tearDown() {
        sut = nil
        super.tearDown()
    }

    // MARK: - Streak Tests

    func test_calculateStreak_withNoSessions_returnsZero() {
        // Given
        let sessions: [PhotoSession] = []

        // When
        let streak = sut.calculateStreak(from: sessions)

        // Then
        XCTAssertEqual(streak, 0)
    }

    func test_calculateStreak_withConsecutiveDays_returnsCorrectCount() {
        // Given
        let calendar = Calendar.current
        let today = Date()
        let yesterday = calendar.date(byAdding: .day, value: -1, to: today)!
        let twoDaysAgo = calendar.date(byAdding: .day, value: -2, to: today)!

        let sessions = [
            makeSession(createdAt: today, status: .completed),
            makeSession(createdAt: yesterday, status: .completed),
            makeSession(createdAt: twoDaysAgo, status: .completed)
        ]

        // When
        let streak = sut.calculateStreak(from: sessions)

        // Then
        XCTAssertEqual(streak, 3)
    }

    func test_calculateStreak_withGap_stopsAtGap() {
        // Given
        let calendar = Calendar.current
        let today = Date()
        let yesterday = calendar.date(byAdding: .day, value: -1, to: today)!
        // Skip 2 days ago
        let threeDaysAgo = calendar.date(byAdding: .day, value: -3, to: today)!

        let sessions = [
            makeSession(createdAt: today, status: .completed),
            makeSession(createdAt: yesterday, status: .completed),
            makeSession(createdAt: threeDaysAgo, status: .completed)  // Gap here
        ]

        // When
        let streak = sut.calculateStreak(from: sessions)

        // Then
        XCTAssertEqual(streak, 2, "Streak should stop at the gap")
    }

    func test_calculateStreak_ignoresIncompleteSessions() {
        // Given
        let calendar = Calendar.current
        let today = Date()
        let yesterday = calendar.date(byAdding: .day, value: -1, to: today)!

        let sessions = [
            makeSession(createdAt: today, status: .completed),
            makeSession(createdAt: yesterday, status: .inProgress),  // Not completed
            makeSession(createdAt: yesterday, status: .failed)       // Not completed
        ]

        // When
        let streak = sut.calculateStreak(from: sessions)

        // Then
        XCTAssertEqual(streak, 1, "Should only count completed sessions")
    }

    func test_calculateStreak_withMultipleSessionsSameDay_countsAsOneDay() {
        // Given
        let today = Date()

        let sessions = [
            makeSession(createdAt: today, status: .completed),
            makeSession(createdAt: today, status: .completed),
            makeSession(createdAt: today, status: .completed)
        ]

        // When
        let streak = sut.calculateStreak(from: sessions)

        // Then
        XCTAssertEqual(streak, 1, "Multiple sessions on same day should count as 1")
    }

    func test_calculateStreak_startingFromYesterday_continuesStreak() {
        // Given
        let calendar = Calendar.current
        let yesterday = calendar.date(byAdding: .day, value: -1, to: Date())!
        let twoDaysAgo = calendar.date(byAdding: .day, value: -2, to: Date())!

        let sessions = [
            makeSession(createdAt: yesterday, status: .completed),
            makeSession(createdAt: twoDaysAgo, status: .completed)
        ]

        // When
        let streak = sut.calculateStreak(from: sessions)

        // Then
        XCTAssertEqual(streak, 2, "Streak should continue if most recent is yesterday")
    }

    func test_calculateStreak_withOldSessions_returnsZero() {
        // Given
        let calendar = Calendar.current
        let threeDaysAgo = calendar.date(byAdding: .day, value: -3, to: Date())!

        let sessions = [
            makeSession(createdAt: threeDaysAgo, status: .completed)
        ]

        // When
        let streak = sut.calculateStreak(from: sessions)

        // Then
        XCTAssertEqual(streak, 0, "Streak should be 0 if no session today or yesterday")
    }

    func test_calculateStreak_withLongStreak_returnsCorrectCount() {
        // Given - 30 day streak
        let calendar = Calendar.current
        let today = Date()
        var sessions: [PhotoSession] = []

        for dayOffset in 0..<30 {
            let date = calendar.date(byAdding: .day, value: -dayOffset, to: today)!
            sessions.append(makeSession(createdAt: date, status: .completed))
        }

        // When
        let streak = sut.calculateStreak(from: sessions)

        // Then
        XCTAssertEqual(streak, 30, "Should handle long streaks correctly")
    }

    func test_calculateStreak_withExactlyTwoDaysAgo_returnsZero() {
        // Given - session exactly 2 days ago (beyond yesterday)
        let calendar = Calendar.current
        let twoDaysAgo = calendar.date(byAdding: .day, value: -2, to: Date())!

        let sessions = [
            makeSession(createdAt: twoDaysAgo, status: .completed)
        ]

        // When
        let streak = sut.calculateStreak(from: sessions)

        // Then
        XCTAssertEqual(streak, 0, "Streak should be 0 if most recent is 2+ days ago")
    }

    func test_calculateStreak_withMixedStatusesOnSameDay_countsOnlyCompleted() {
        // Given - multiple sessions on same day with different statuses
        let today = Date()
        let sessions = [
            makeSession(createdAt: today, status: .failed),
            makeSession(createdAt: today, status: .inProgress),
            makeSession(createdAt: today, status: .completed),
            makeSession(createdAt: today, status: .failed)
        ]

        // When
        let streak = sut.calculateStreak(from: sessions)

        // Then
        XCTAssertEqual(streak, 1, "Should count day if at least one completed session")
    }

    func test_calculateStreak_withAllFailedSessions_returnsZero() {
        // Given
        let today = Date()
        let sessions = [
            makeSession(createdAt: today, status: .failed),
            makeSession(createdAt: today, status: .failed),
            makeSession(createdAt: today, status: .inProgress)
        ]

        // When
        let streak = sut.calculateStreak(from: sessions)

        // Then
        XCTAssertEqual(streak, 0, "Should return 0 if no completed sessions")
    }

    func test_calculateStreak_withUnsortedSessions_calculatesCorrectly() {
        // Given - sessions not in chronological order
        let calendar = Calendar.current
        let today = Date()
        let yesterday = calendar.date(byAdding: .day, value: -1, to: today)!
        let twoDaysAgo = calendar.date(byAdding: .day, value: -2, to: today)!

        let sessions = [
            makeSession(createdAt: twoDaysAgo, status: .completed),
            makeSession(createdAt: today, status: .completed),
            makeSession(createdAt: yesterday, status: .completed)
        ]

        // When
        let streak = sut.calculateStreak(from: sessions)

        // Then
        XCTAssertEqual(streak, 3, "Should handle unsorted sessions correctly")
    }

    // MARK: - Favorite Style Tests

    func test_findFavoriteStyle_withNoSessions_returnsNil() {
        // Given
        let sessions: [PhotoSession] = []

        // When
        let favorite = sut.findFavoriteStyle(from: sessions)

        // Then
        XCTAssertNil(favorite)
    }

    func test_findFavoriteStyle_returnsMostUsed() {
        // Given
        let sessions = [
            makeSession(style: .jpKawaii, status: .completed),
            makeSession(style: .jpKawaii, status: .completed),
            makeSession(style: .jpKawaii, status: .completed),
            makeSession(style: .nyVintage, status: .completed),
            makeSession(style: .seoulStudio, status: .completed)
        ]

        // When
        let favorite = sut.findFavoriteStyle(from: sessions)

        // Then
        XCTAssertEqual(favorite, .jpKawaii)
    }

    func test_findFavoriteStyle_ignoresIncompleteSessions() {
        // Given
        let sessions = [
            makeSession(style: .jpKawaii, status: .inProgress),
            makeSession(style: .jpKawaii, status: .inProgress),
            makeSession(style: .nyVintage, status: .completed)
        ]

        // When
        let favorite = sut.findFavoriteStyle(from: sessions)

        // Then
        XCTAssertEqual(favorite, .nyVintage, "Should only count completed sessions")
    }

    func test_findFavoriteStyle_ignoresSessionsWithNoStyle() {
        // Given
        let sessions = [
            makeSession(style: nil, status: .completed),
            makeSession(style: nil, status: .completed),
            makeSession(style: .seoulStudio, status: .completed)
        ]

        // When
        let favorite = sut.findFavoriteStyle(from: sessions)

        // Then
        XCTAssertEqual(favorite, .seoulStudio)
    }

    func test_findFavoriteStyle_withSingleCompletedSession_returnsThatStyle() {
        // Given
        let sessions = [
            makeSession(style: .nyVintage, status: .completed)
        ]

        // When
        let favorite = sut.findFavoriteStyle(from: sessions)

        // Then
        XCTAssertEqual(favorite, .nyVintage)
    }

    func test_findFavoriteStyle_withTie_returnsOneOfTheTiedStyles() {
        // Given - equal count of two styles
        let sessions = [
            makeSession(style: .jpKawaii, status: .completed),
            makeSession(style: .jpKawaii, status: .completed),
            makeSession(style: .nyVintage, status: .completed),
            makeSession(style: .nyVintage, status: .completed)
        ]

        // When
        let favorite = sut.findFavoriteStyle(from: sessions)

        // Then - should return one of the tied styles
        XCTAssertNotNil(favorite)
        XCTAssertTrue(favorite == .jpKawaii || favorite == .nyVintage,
                      "Should return one of the tied styles")
    }

    func test_findFavoriteStyle_withAllThreeStyles_returnsMostUsed() {
        // Given - all three styles with clear winner
        let sessions = [
            makeSession(style: .jpKawaii, status: .completed),
            makeSession(style: .jpKawaii, status: .completed),
            makeSession(style: .jpKawaii, status: .completed),
            makeSession(style: .nyVintage, status: .completed),
            makeSession(style: .nyVintage, status: .completed),
            makeSession(style: .seoulStudio, status: .completed)
        ]

        // When
        let favorite = sut.findFavoriteStyle(from: sessions)

        // Then
        XCTAssertEqual(favorite, .jpKawaii)
    }

    func test_findFavoriteStyle_withOnlyFailedAndInProgress_returnsNil() {
        // Given - no completed sessions at all
        let sessions = [
            makeSession(style: .jpKawaii, status: .failed),
            makeSession(style: .nyVintage, status: .inProgress),
            makeSession(style: .seoulStudio, status: .failed)
        ]

        // When
        let favorite = sut.findFavoriteStyle(from: sessions)

        // Then
        XCTAssertNil(favorite, "Should return nil if no completed sessions")
    }

    func test_findFavoriteStyle_withMixedCompletedAndFailed_onlyCountsCompleted() {
        // Given - more failed jpKawaii than completed nyVintage
        let sessions = [
            makeSession(style: .jpKawaii, status: .failed),
            makeSession(style: .jpKawaii, status: .failed),
            makeSession(style: .jpKawaii, status: .failed),
            makeSession(style: .nyVintage, status: .completed),
            makeSession(style: .nyVintage, status: .completed)
        ]

        // When
        let favorite = sut.findFavoriteStyle(from: sessions)

        // Then
        XCTAssertEqual(favorite, .nyVintage, "Should only count completed sessions")
    }

    // MARK: - Session Count Tests

    func test_countCompletedSessions_onlyCountsCompleted() {
        // Given
        let sessions = [
            makeSession(status: .completed),
            makeSession(status: .completed),
            makeSession(status: .inProgress),
            makeSession(status: .failed)
        ]

        // When
        let count = sut.countCompletedSessions(sessions)

        // Then
        XCTAssertEqual(count, 2)
    }

    func test_countCompletedSessions_withNoSessions_returnsZero() {
        // Given
        let sessions: [PhotoSession] = []

        // When
        let count = sut.countCompletedSessions(sessions)

        // Then
        XCTAssertEqual(count, 0)
    }

    func test_countCompletedSessions_withAllCompleted_countsAll() {
        // Given
        let sessions = [
            makeSession(status: .completed),
            makeSession(status: .completed),
            makeSession(status: .completed),
            makeSession(status: .completed),
            makeSession(status: .completed)
        ]

        // When
        let count = sut.countCompletedSessions(sessions)

        // Then
        XCTAssertEqual(count, 5)
    }

    func test_countCompletedSessions_withAllFailed_returnsZero() {
        // Given
        let sessions = [
            makeSession(status: .failed),
            makeSession(status: .failed),
            makeSession(status: .inProgress)
        ]

        // When
        let count = sut.countCompletedSessions(sessions)

        // Then
        XCTAssertEqual(count, 0)
    }

    func test_countCompletedSessions_withLargeMixedSet_countsCorrectly() {
        // Given - 100 sessions with mixed statuses
        var sessions: [PhotoSession] = []
        for i in 0..<100 {
            let status: SessionStatus
            switch i % 3 {
            case 0: status = .completed
            case 1: status = .failed
            default: status = .inProgress
            }
            sessions.append(makeSession(status: status))
        }

        // When
        let count = sut.countCompletedSessions(sessions)

        // Then - every 3rd session is completed (indices 0, 3, 6, ... = 34 sessions)
        XCTAssertEqual(count, 34)
    }

    // MARK: - Build Stats Tests

    func test_buildStats_combinesAllCalculations() {
        // Given
        let user = User(
            id: "test-user",
            email: "test@example.com",
            displayName: "Test User",
            credits: 5,
            referralCount: 2
        )

        let today = Date()
        let sessions = [
            makeSession(createdAt: today, style: .jpKawaii, status: .completed),
            makeSession(createdAt: today, style: .jpKawaii, status: .completed),
            makeSession(createdAt: today, style: .nyVintage, status: .completed),
            makeSession(createdAt: today, style: .seoulStudio, status: .inProgress)
        ]

        // When
        let stats = sut.buildStats(user: user, sessions: sessions)

        // Then
        XCTAssertEqual(stats.sessionCount, 3)
        XCTAssertEqual(stats.streakDays, 1)
        XCTAssertEqual(stats.favoriteStyle, .jpKawaii)
        XCTAssertEqual(stats.referralCount, 2)
        XCTAssertEqual(stats.credits, 5)
    }

    func test_buildStats_withZeroReferrals_showsZero() {
        // Given
        let user = User(
            id: "test-user",
            email: "test@example.com",
            displayName: "Test User",
            credits: 3,
            referralCount: 0
        )

        // When
        let stats = sut.buildStats(user: user, sessions: [])

        // Then
        XCTAssertEqual(stats.referralCount, 0)
        XCTAssertEqual(stats.credits, 3, "New user should have 3 credits")
    }

    func test_buildStats_withMaxReferrals_showsCorrectCount() {
        // Given
        let user = User(
            id: "test-user",
            email: "test@example.com",
            displayName: "Test User",
            credits: 18, // 3 (initial) + 15 (max referral bonus)
            referralCount: 10
        )

        // When
        let stats = sut.buildStats(user: user, sessions: [])

        // Then
        XCTAssertEqual(stats.referralCount, 10)
        XCTAssertEqual(stats.credits, 18)
    }

    func test_buildStats_combinesAllValues_withComplexScenario() {
        // Given - realistic user scenario
        let calendar = Calendar.current
        let today = Date()
        let yesterday = calendar.date(byAdding: .day, value: -1, to: today)!

        let user = User(
            id: "realistic-user",
            email: "realistic@example.com",
            displayName: "Realistic User",
            credits: 12,
            referralCount: 3
        )

        let sessions = [
            // Today - 2 completed (one jpKawaii, one seoulStudio)
            makeSession(createdAt: today, style: .jpKawaii, status: .completed),
            makeSession(createdAt: today, style: .seoulStudio, status: .completed),
            makeSession(createdAt: today, style: .jpKawaii, status: .failed),

            // Yesterday - 1 completed (jpKawaii)
            makeSession(createdAt: yesterday, style: .jpKawaii, status: .completed),
            makeSession(createdAt: yesterday, style: .nyVintage, status: .inProgress)
        ]

        // When
        let stats = sut.buildStats(user: user, sessions: sessions)

        // Then
        XCTAssertEqual(stats.sessionCount, 3, "3 completed sessions")
        XCTAssertEqual(stats.streakDays, 2, "2 day streak (today + yesterday)")
        XCTAssertEqual(stats.favoriteStyle, .jpKawaii, "2 jpKawaii vs 1 seoulStudio")
        XCTAssertEqual(stats.referralCount, 3)
        XCTAssertEqual(stats.credits, 12)
    }

    // MARK: - User Referral Bonus Tests

    func test_userReferralBonusCredits_withZeroReferrals_returnsZero() {
        // Given
        let user = User(
            id: "test",
            email: "test@example.com",
            displayName: "Test",
            referralCount: 0
        )

        // Then
        XCTAssertEqual(user.referralBonusCredits, 0)
    }

    func test_userReferralBonusCredits_withOneReferral_returns3() {
        // Given
        let user = User(
            id: "test",
            email: "test@example.com",
            displayName: "Test",
            referralCount: 1
        )

        // Then
        XCTAssertEqual(user.referralBonusCredits, 3, "Tier 1: 3 credits for 1 referral")
    }

    func test_userReferralBonusCredits_withTwoReferrals_returns8() {
        // Given
        let user = User(
            id: "test",
            email: "test@example.com",
            displayName: "Test",
            referralCount: 2
        )

        // Then
        XCTAssertEqual(user.referralBonusCredits, 8, "Tier 2: 8 credits for 2 referrals")
    }

    func test_userReferralBonusCredits_withThreeOrMoreReferrals_returns15() {
        // Given/Then - test tier 3
        for count in [3, 4, 5, 10, 100] {
            let user = User(
                id: "test",
                email: "test@example.com",
                displayName: "Test",
                referralCount: count
            )
            XCTAssertEqual(user.referralBonusCredits, 15,
                           "Tier 3: 15 credits for \(count) referrals")
        }
    }

    // MARK: - User Default Values Tests

    func test_newUser_hasThreeCredits() {
        // Given/When
        let user = User(
            id: "new-user",
            email: "new@example.com",
            displayName: "New User"
        )

        // Then
        XCTAssertEqual(user.credits, 3, "New users should get 3 free credits")
    }

    func test_newUser_hasZeroReferralCount() {
        // Given/When
        let user = User(
            id: "new-user",
            email: "new@example.com",
            displayName: "New User"
        )

        // Then
        XCTAssertEqual(user.referralCount, 0)
    }

    func test_newUser_hasNoReferrer() {
        // Given/When
        let user = User(
            id: "new-user",
            email: "new@example.com",
            displayName: "New User"
        )

        // Then
        XCTAssertNil(user.referredBy)
    }

    func test_newUser_generatesReferralCode() {
        // Given/When
        let user = User(
            id: "new-user",
            email: "new@example.com",
            displayName: "New User"
        )

        // Then
        XCTAssertFalse(user.referralCode.isEmpty)
        XCTAssertEqual(user.referralCode.count, 8, "Referral code should be 8 characters")
    }

    func test_referralCode_format_isValid() {
        // Given/When
        var codes: Set<String> = []
        for _ in 0..<100 {
            codes.insert(User.generateReferralCode())
        }

        // Then - verify format of all generated codes
        for code in codes {
            XCTAssertEqual(code.count, 8)
            // Should only contain uppercase letters (excluding I, O, L) and digits 2-9
            let validCharacters = CharacterSet(charactersIn: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
            XCTAssertTrue(code.unicodeScalars.allSatisfy { validCharacters.contains($0) },
                          "Code '\(code)' contains invalid characters")
        }

        // Most codes should be unique (very unlikely to have collisions)
        XCTAssertGreaterThan(codes.count, 95, "Should generate mostly unique codes")
    }

    // MARK: - Helper Methods

    private func makeSession(
        createdAt: Date = Date(),
        style: PhotoStyle? = .jpKawaii,
        status: SessionStatus = .completed
    ) -> PhotoSession {
        PhotoSession(
            id: UUID().uuidString,
            userId: "test-user",
            style: style,
            createdAt: createdAt,
            status: status
        )
    }
}
