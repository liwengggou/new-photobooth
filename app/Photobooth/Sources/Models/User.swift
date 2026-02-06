import Foundation

/// Represents a user in the app
struct User: Identifiable, Codable, Hashable {
    let id: String
    var email: String
    var displayName: String
    var credits: Int
    var referralCode: String
    var referredBy: String?
    var referralCount: Int
    var createdAt: Date
    var pendingReferralCode: String?  // Stored on signup, processed on first session completion

    init(
        id: String = UUID().uuidString,
        email: String,
        displayName: String,
        credits: Int = 3, // New users get 3 free credits
        referralCode: String = "",
        referredBy: String? = nil,
        referralCount: Int = 0,
        createdAt: Date = Date(),
        pendingReferralCode: String? = nil
    ) {
        self.id = id
        self.email = email
        self.displayName = displayName
        self.credits = credits
        self.referralCode = referralCode.isEmpty ? User.generateReferralCode() : referralCode
        self.referredBy = referredBy
        self.referralCount = referralCount
        self.createdAt = createdAt
        self.pendingReferralCode = pendingReferralCode
    }

    /// Generates a unique referral code
    static func generateReferralCode() -> String {
        let characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        return String((0..<8).map { _ in characters.randomElement()! })
    }

    /// Calculate bonus credits based on referral count (cumulative tiers)
    var referralBonusCredits: Int {
        switch referralCount {
        case 0: return 0
        case 1: return 3
        case 2: return 8
        default: return 15 // 3+ referrals
        }
    }
}
