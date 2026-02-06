import Foundation
import StoreKit

/// Represents a credit package available for purchase
enum CreditProduct: String, CaseIterable, Identifiable {
    case credits1 = "com.photobooth.credits.1"
    case credits5 = "com.photobooth.credits.5"
    case credits10 = "com.photobooth.credits.10"

    var id: String { rawValue }

    /// Number of credits for this product
    var credits: Int {
        switch self {
        case .credits1: return 1
        case .credits5: return 5
        case .credits10: return 10
        }
    }

    /// Display name for the product
    var displayName: String {
        switch self {
        case .credits1: return "1 Credit"
        case .credits5: return "5 Credits"
        case .credits10: return "10 Credits"
        }
    }

    /// Whether this is the best value option
    var isBestValue: Bool {
        self == .credits10
    }

    /// Get credits for a given product ID
    static func credits(for productId: String) -> Int? {
        CreditProduct(rawValue: productId)?.credits
    }

    /// All product IDs for StoreKit
    static var allProductIds: Set<String> {
        Set(CreditProduct.allCases.map { $0.rawValue })
    }
}

/// Extension to calculate price per credit from StoreKit Product
extension Product {
    /// Price per credit based on the product
    var pricePerCredit: Decimal? {
        guard let creditProduct = CreditProduct(rawValue: id) else { return nil }
        return price / Decimal(creditProduct.credits)
    }

    /// Formatted price per credit
    var formattedPricePerCredit: String {
        guard let pricePerCredit = pricePerCredit else { return "" }
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = priceFormatStyle.locale
        return formatter.string(from: pricePerCredit as NSDecimalNumber) ?? ""
    }
}
