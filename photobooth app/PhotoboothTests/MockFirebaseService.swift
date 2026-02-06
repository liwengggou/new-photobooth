import Foundation
@testable import Photobooth

/// Mock implementation of SessionFetching for unit testing
final class MockSessionFetcher: SessionFetching {
    // MARK: - Test Configuration
    var sessionsToReturn: [PhotoSession] = []
    var errorToThrow: Error?
    var fetchSessionsCallCount = 0
    var lastFetchedUserId: String?

    // MARK: - SessionFetching Protocol

    func fetchSessions(userId: String) async throws -> [PhotoSession] {
        fetchSessionsCallCount += 1
        lastFetchedUserId = userId

        if let error = errorToThrow {
            throw error
        }

        return sessionsToReturn
    }

    // MARK: - Test Helpers

    func reset() {
        sessionsToReturn = []
        errorToThrow = nil
        fetchSessionsCallCount = 0
        lastFetchedUserId = nil
    }
}

/// Mock error for testing error scenarios
enum MockFirebaseError: Error, LocalizedError {
    case networkError
    case authenticationError
    case permissionDenied

    var errorDescription: String? {
        switch self {
        case .networkError:
            return "Network connection failed"
        case .authenticationError:
            return "User not authenticated"
        case .permissionDenied:
            return "Permission denied"
        }
    }
}
