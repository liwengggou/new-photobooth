import Foundation

/// Holds calculated profile statistics
struct ProfileStats {
    let sessionCount: Int
    let streakDays: Int
    let favoriteStyle: PhotoStyle?
    let referralCount: Int
    let credits: Int
}

/// Service for calculating profile statistics from user data and sessions
/// This is a pure calculation service with no Firebase dependency, making it easily testable
final class ProfileStatsService {

    // MARK: - Streak Calculation

    /// Calculate the current streak of consecutive days with completed sessions
    /// - Parameter sessions: Array of photo sessions
    /// - Returns: Number of consecutive days from today (or yesterday) with completed sessions
    func calculateStreak(from sessions: [PhotoSession]) -> Int {
        // Filter to completed sessions only
        let completedSessions = sessions.filter { $0.status == .completed }

        guard !completedSessions.isEmpty else {
            return 0
        }

        // Extract unique dates (normalized to day start)
        let calendar = Calendar.current
        let uniqueDates = Set(completedSessions.map { session in
            calendar.startOfDay(for: session.createdAt)
        }).sorted(by: >)  // Sort descending (most recent first)

        guard !uniqueDates.isEmpty else {
            return 0
        }

        let today = calendar.startOfDay(for: Date())
        let yesterday = calendar.date(byAdding: .day, value: -1, to: today)!

        // Check if the most recent session is from today or yesterday
        // If not, streak is broken
        guard let mostRecentDate = uniqueDates.first,
              mostRecentDate >= yesterday else {
            return 0
        }

        // Count consecutive days
        var streakCount = 0
        var expectedDate = mostRecentDate

        for date in uniqueDates {
            if date == expectedDate {
                streakCount += 1
                expectedDate = calendar.date(byAdding: .day, value: -1, to: expectedDate)!
            } else if date < expectedDate {
                // Gap found, streak ends
                break
            }
            // If date > expectedDate, skip (shouldn't happen with sorted desc)
        }

        return streakCount
    }

    // MARK: - Favorite Style

    /// Find the most frequently used photo style from completed sessions
    /// - Parameter sessions: Array of photo sessions
    /// - Returns: The most used PhotoStyle, or nil if no completed sessions with styles
    func findFavoriteStyle(from sessions: [PhotoSession]) -> PhotoStyle? {
        // Filter to completed sessions with a style
        let completedWithStyle = sessions.filter {
            $0.status == .completed && $0.style != nil
        }

        guard !completedWithStyle.isEmpty else {
            return nil
        }

        // Group by style and count
        var styleCounts: [PhotoStyle: Int] = [:]
        for session in completedWithStyle {
            if let style = session.style {
                styleCounts[style, default: 0] += 1
            }
        }

        // Find the style with the highest count
        // In case of tie, returns any of the tied styles
        return styleCounts.max(by: { $0.value < $1.value })?.key
    }

    // MARK: - Session Count

    /// Count the number of completed sessions
    /// - Parameter sessions: Array of photo sessions
    /// - Returns: Count of sessions with completed status
    func countCompletedSessions(_ sessions: [PhotoSession]) -> Int {
        return sessions.filter { $0.status == .completed }.count
    }

    // MARK: - Build Stats

    /// Build complete ProfileStats from user data and sessions
    /// - Parameters:
    ///   - user: The current user
    ///   - sessions: Array of user's photo sessions
    /// - Returns: ProfileStats with all calculated values
    func buildStats(user: User, sessions: [PhotoSession]) -> ProfileStats {
        return ProfileStats(
            sessionCount: countCompletedSessions(sessions),
            streakDays: calculateStreak(from: sessions),
            favoriteStyle: findFavoriteStyle(from: sessions),
            referralCount: user.referralCount,
            credits: user.credits
        )
    }
}
