import Foundation
import FirebaseFirestore

/// Represents a completed in-app purchase record stored in Firestore
struct PurchaseRecord: Identifiable, Codable, Hashable {
    /// Unique identifier (StoreKit transaction ID)
    let id: String

    /// User who made the purchase
    let userId: String

    /// Product ID that was purchased
    let productId: String

    /// Number of credits delivered
    let credits: Int

    /// Price paid (in smallest currency unit, e.g., yen)
    let price: Decimal

    /// Currency code (e.g., "JPY")
    let currency: String

    /// When the purchase was made
    let purchaseDate: Date

    /// Environment: "sandbox" or "production"
    let environment: String

    /// Original transaction ID for subscription renewals (optional)
    let originalTransactionId: String?

    init(
        id: String,
        userId: String,
        productId: String,
        credits: Int,
        price: Decimal,
        currency: String,
        purchaseDate: Date = Date(),
        environment: String = "production",
        originalTransactionId: String? = nil
    ) {
        self.id = id
        self.userId = userId
        self.productId = productId
        self.credits = credits
        self.price = price
        self.currency = currency
        self.purchaseDate = purchaseDate
        self.environment = environment
        self.originalTransactionId = originalTransactionId
    }

    /// Formatted price for display
    var formattedPrice: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency
        return formatter.string(from: price as NSDecimalNumber) ?? "\(currency) \(price)"
    }

    /// Credit product type
    var creditProduct: CreditProduct? {
        CreditProduct(rawValue: productId)
    }
}

// MARK: - Firestore Coding

extension PurchaseRecord {
    enum CodingKeys: String, CodingKey {
        case id
        case userId
        case productId
        case credits
        case price
        case currency
        case purchaseDate
        case environment
        case originalTransactionId
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        userId = try container.decode(String.self, forKey: .userId)
        productId = try container.decode(String.self, forKey: .productId)
        credits = try container.decode(Int.self, forKey: .credits)
        currency = try container.decode(String.self, forKey: .currency)
        environment = try container.decode(String.self, forKey: .environment)
        originalTransactionId = try container.decodeIfPresent(String.self, forKey: .originalTransactionId)

        // Handle Decimal decoding (stored as Double in Firestore)
        let priceDouble = try container.decode(Double.self, forKey: .price)
        price = Decimal(priceDouble)

        // Handle Timestamp from Firestore
        if let timestamp = try? container.decode(Timestamp.self, forKey: .purchaseDate) {
            purchaseDate = timestamp.dateValue()
        } else {
            purchaseDate = try container.decode(Date.self, forKey: .purchaseDate)
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(userId, forKey: .userId)
        try container.encode(productId, forKey: .productId)
        try container.encode(credits, forKey: .credits)
        try container.encode(currency, forKey: .currency)
        try container.encode(environment, forKey: .environment)
        try container.encodeIfPresent(originalTransactionId, forKey: .originalTransactionId)

        // Encode Decimal as Double
        try container.encode(NSDecimalNumber(decimal: price).doubleValue, forKey: .price)

        // Encode Date as Timestamp for Firestore
        try container.encode(Timestamp(date: purchaseDate), forKey: .purchaseDate)
    }
}
