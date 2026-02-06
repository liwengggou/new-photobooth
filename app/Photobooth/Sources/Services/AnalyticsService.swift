import Foundation
import FirebaseAnalytics

/// Service for tracking analytics events
@MainActor
final class AnalyticsService {
    static let shared = AnalyticsService()

    private init() {}

    // MARK: - User Events

    /// Track user sign up
    func logSignUp(method: String) {
        Analytics.logEvent(AnalyticsEventSignUp, parameters: [
            AnalyticsParameterMethod: method
        ])
        print("📊 Analytics: Sign up with \(method)")
    }

    /// Track user login
    func logLogin(method: String) {
        Analytics.logEvent(AnalyticsEventLogin, parameters: [
            AnalyticsParameterMethod: method
        ])
        print("📊 Analytics: Login with \(method)")
    }

    /// Set user ID for analytics
    func setUserId(_ userId: String) {
        Analytics.setUserID(userId)
        print("📊 Analytics: Set user ID - \(userId)")
    }

    /// Set user properties
    func setUserProperty(name: String, value: String) {
        Analytics.setUserProperty(value, forName: name)
        print("📊 Analytics: Set user property - \(name): \(value)")
    }

    // MARK: - Photo Session Events

    /// Track photo session started
    func logSessionStarted(style: String, interval: Int) {
        Analytics.logEvent("session_started", parameters: [
            "style": style,
            "interval": interval
        ])
        print("📊 Analytics: Session started - \(style), \(interval)s")
    }

    /// Track photo session completed
    func logSessionCompleted(photoCount: Int, style: String) {
        Analytics.logEvent("session_completed", parameters: [
            "photo_count": photoCount,
            "style": style
        ])
        print("📊 Analytics: Session completed - \(photoCount) photos, \(style)")
    }

    /// Track photo session cancelled
    func logSessionCancelled(photoCount: Int) {
        Analytics.logEvent("session_cancelled", parameters: [
            "photos_captured": photoCount
        ])
        print("📊 Analytics: Session cancelled - \(photoCount) photos captured")
    }

    // MARK: - Style Selection Events

    /// Track style selected
    func logStyleSelected(style: String) {
        Analytics.logEvent("style_selected", parameters: [
            "style_name": style
        ])
        print("📊 Analytics: Style selected - \(style)")
    }

    /// Track layout selected
    func logLayoutSelected(layout: String) {
        Analytics.logEvent("layout_selected", parameters: [
            "layout_type": layout
        ])
        print("📊 Analytics: Layout selected - \(layout)")
    }

    // MARK: - Credit Events

    /// Track credits used
    func logCreditsUsed(amount: Int, reason: String) {
        Analytics.logEvent("credits_used", parameters: [
            "amount": amount,
            "reason": reason
        ])
        print("📊 Analytics: Credits used - \(amount) for \(reason)")
    }

    /// Track credits awarded
    func logCreditsAwarded(amount: Int, source: String) {
        Analytics.logEvent("credits_awarded", parameters: [
            "amount": amount,
            "source": source
        ])
        print("📊 Analytics: Credits awarded - \(amount) from \(source)")
    }

    // MARK: - Referral Events

    /// Track referral code shared
    func logReferralShared(code: String, method: String) {
        Analytics.logEvent(AnalyticsEventShare, parameters: [
            "content_type": "referral_code",
            "item_id": code,
            "method": method
        ])
        print("📊 Analytics: Referral shared - \(code) via \(method)")
    }

    /// Track successful referral
    func logReferralSuccess(referrerUserId: String, newUserId: String, creditsAwarded: Int) {
        Analytics.logEvent("referral_success", parameters: [
            "referrer_id": referrerUserId,
            "new_user_id": newUserId,
            "credits_awarded": creditsAwarded
        ])
        print("📊 Analytics: Referral success - \(creditsAwarded) credits")
    }

    // MARK: - Collage Events

    /// Track collage created
    func logCollageCreated(style: String, layout: String) {
        Analytics.logEvent("collage_created", parameters: [
            "style": style,
            "layout": layout
        ])
        print("📊 Analytics: Collage created - \(style), \(layout)")
    }

    /// Track collage saved
    func logCollageSaved(style: String, layout: String) {
        Analytics.logEvent("collage_saved", parameters: [
            "style": style,
            "layout": layout
        ])
        print("📊 Analytics: Collage saved - \(style), \(layout)")
    }

    /// Track collage shared
    func logCollageShared(method: String) {
        Analytics.logEvent(AnalyticsEventShare, parameters: [
            "content_type": "collage",
            "method": method
        ])
        print("📊 Analytics: Collage shared via \(method)")
    }

    /// Track individual photo saved
    func logIndividualPhotoSaved(index: Int) {
        Analytics.logEvent("individual_photo_saved", parameters: [
            "photo_index": index
        ])
        print("📊 Analytics: Individual photo saved - index \(index)")
    }

    // MARK: - Screen View Events

    /// Track screen view
    func logScreenView(screenName: String, screenClass: String) {
        Analytics.logEvent(AnalyticsEventScreenView, parameters: [
            AnalyticsParameterScreenName: screenName,
            AnalyticsParameterScreenClass: screenClass
        ])
        print("📊 Analytics: Screen view - \(screenName)")
    }

    // MARK: - Error Events

    /// Track error
    func logError(error: String, location: String) {
        Analytics.logEvent("error_occurred", parameters: [
            "error_message": error,
            "location": location
        ])
        print("📊 Analytics: Error - \(error) at \(location)")
    }

    // MARK: - Purchase Events

    /// Track purchase initiated
    func logPurchaseInitiated(productId: String, credits: Int) {
        Analytics.logEvent("purchase_initiated", parameters: [
            "product_id": productId,
            "credits": credits
        ])
        print("📊 Analytics: Purchase initiated - \(productId) (\(credits) credits)")
    }

    /// Track purchase completed
    func logPurchaseCompleted(productId: String, credits: Int, price: Decimal, currency: String) {
        Analytics.logEvent(AnalyticsEventPurchase, parameters: [
            AnalyticsParameterItemID: productId,
            AnalyticsParameterQuantity: credits,
            AnalyticsParameterPrice: NSDecimalNumber(decimal: price).doubleValue,
            AnalyticsParameterCurrency: currency,
            "credits": credits
        ])
        print("📊 Analytics: Purchase completed - \(productId) (\(credits) credits, \(currency) \(price))")
    }

    /// Track purchase failed
    func logPurchaseFailed(productId: String, error: String) {
        Analytics.logEvent("purchase_failed", parameters: [
            "product_id": productId,
            "error_message": error
        ])
        print("📊 Analytics: Purchase failed - \(productId): \(error)")
    }

    /// Track restore purchases
    func logRestorePurchases(success: Bool) {
        Analytics.logEvent("restore_purchases", parameters: [
            "success": success
        ])
        print("📊 Analytics: Restore purchases - success: \(success)")
    }
}
