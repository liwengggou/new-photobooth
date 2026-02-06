import SwiftUI
import StoreKit
import FirebaseAuth

/// Screen for purchasing credit packages
struct CreditsPurchaseScreen: View {
    @EnvironmentObject private var appState: AppState
    @ObservedObject private var storeKit = StoreKitManager.shared
    @Environment(\.theme) var theme
    @EnvironmentObject private var lang: LanguageManager
    @Environment(\.dismiss) var dismiss

    @State private var showSuccessAlert = false
    @State private var creditsAwarded = 0

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                ScreenHeader(
                    lang.buyCredits,
                    subtitle: lang.buyCreditsSubtitle
                )

                VStack(spacing: theme.spacing.xxl) {
                    // Current Balance
                    balanceCard

                    // Credit Packages
                    packagesSection

                    // Info Section
                    infoSection

                    // Restore Purchases
                    restoreButton
                }
                .padding(.horizontal, 24)
                .padding(.top, theme.spacing.xxl)
            }
        }
        .background(Color.white.ignoresSafeArea())
        .task {
            await storeKit.loadProducts()
        }
        .onChange(of: storeKit.purchaseState) { _, newState in
            if case .success(let credits) = newState {
                creditsAwarded = credits
                showSuccessAlert = true
                // Refresh user data
                Task {
                    if let userId = appState.currentUser?.id {
                        appState.currentUser = try? await FirebaseService.shared.fetchUser(userId: userId)
                    }
                }
            }
        }
        .alert(lang.purchaseSuccessful, isPresented: $showSuccessAlert) {
            Button(lang.ok) {
                storeKit.resetPurchaseState()
            }
        } message: {
            Text(lang.youReceivedCredits(creditsAwarded))
        }
        .alert(lang.purchaseFailed, isPresented: isPurchaseFailed) {
            Button(lang.ok) {
                storeKit.resetPurchaseState()
            }
        } message: {
            if case .failed(let message) = storeKit.purchaseState {
                Text(message)
            }
        }
    }

    private var isPurchaseFailed: Binding<Bool> {
        Binding(
            get: {
                if case .failed = storeKit.purchaseState { return true }
                return false
            },
            set: { _ in storeKit.resetPurchaseState() }
        )
    }

    // MARK: - Balance Card

    private var balanceCard: some View {
        VStack(spacing: theme.spacing.md) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(lang.currentBalance)
                        .font(Typography.bodySM)
                        .foregroundColor(theme.textSecondary)

                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text("\(appState.currentUser?.credits ?? 0)")
                            .font(Typography.display(48, weight: .bold))
                            .foregroundColor(theme.text)

                        Text(lang.credits)
                            .font(Typography.bodyMD)
                            .foregroundColor(theme.textSecondary)
                    }
                }

                Spacer()

                Image(systemName: "sparkles")
                    .font(.system(size: 40))
                    .foregroundColor(.yellow)
            }
        }
        .photoboothCard()
    }

    // MARK: - Packages Section

    private var packagesSection: some View {
        VStack(alignment: .leading, spacing: theme.spacing.lg) {
            Text(lang.creditPackages)
                .font(Typography.display(20, weight: .bold))
                .trackingTight()
                .foregroundColor(theme.text)

            if storeKit.isLoadingProducts {
                HStack {
                    Spacer()
                    ProgressView()
                        .padding(.vertical, 40)
                    Spacer()
                }
            } else if storeKit.products.isEmpty {
                VStack(spacing: theme.spacing.md) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 40))
                        .foregroundColor(.orange)

                    Text(lang.unableToLoadProducts)
                        .font(Typography.bodyMD)
                        .foregroundColor(theme.textSecondary)

                    Button(lang.retry) {
                        Task {
                            await storeKit.loadProducts()
                        }
                    }
                    .font(Typography.bodyMD.bold())
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
            } else {
                VStack(spacing: theme.spacing.md) {
                    ForEach(storeKit.products, id: \.id) { product in
                        ProductCard(
                            product: product,
                            isPurchasing: isPurchasing(product),
                            onPurchase: {
                                purchase(product)
                            }
                        )
                    }
                }
            }
        }
        .photoboothCard()
    }

    private func isPurchasing(_ product: Product) -> Bool {
        if case .purchasing(let id) = storeKit.purchaseState {
            return id == product.id
        }
        return false
    }

    private func purchase(_ product: Product) {
        // Verify Firebase Auth is still valid
        guard let authUser = Auth.auth().currentUser else {
            storeKit.purchaseState = .failed("Please sign in to purchase credits.")
            return
        }

        guard let userId = appState.currentUser?.id else {
            storeKit.purchaseState = .failed("User not found. Please sign in again.")
            return
        }

        // Ensure cached userId matches Firebase Auth
        guard userId == authUser.uid else {
            print("❌ Session mismatch: cached=\(userId), auth=\(authUser.uid)")
            storeKit.purchaseState = .failed("Session mismatch. Please sign out and sign in again.")
            return
        }

        Task {
            await storeKit.purchase(product, userId: userId)
        }
    }

    // MARK: - Info Section

    private var infoSection: some View {
        VStack(alignment: .leading, spacing: theme.spacing.md) {
            Text(lang.aboutCredits)
                .font(Typography.display(16, weight: .bold))
                .foregroundColor(theme.text)

            VStack(alignment: .leading, spacing: theme.spacing.sm) {
                infoRow(icon: "camera.fill", text: lang.creditEqualsPhotoSession)
                infoRow(icon: "arrow.clockwise", text: lang.creditsNeverExpire)
                infoRow(icon: "gift.fill", text: lang.referFriendsForFreeCredits)
            }
        }
        .photoboothCard()
    }

    private func infoRow(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(.black)
                .frame(width: 24)

            Text(text)
                .font(Typography.bodySM)
                .foregroundColor(theme.textSecondary)
        }
    }

    // MARK: - Restore Button

    private var restoreButton: some View {
        Button {
            Task {
                await storeKit.restorePurchases()
            }
        } label: {
            Text(lang.restorePurchases)
                .font(Typography.bodySM)
                .foregroundColor(theme.textSecondary)
                .underline()
        }
        .disabled(storeKit.purchaseState != .idle)
        .padding(.vertical, theme.spacing.lg)
    }
}

// MARK: - Product Card

private struct ProductCard: View {
    let product: Product
    let isPurchasing: Bool
    let onPurchase: () -> Void

    @Environment(\.theme) var theme
    @EnvironmentObject private var lang: LanguageManager

    private var creditProduct: CreditProduct? {
        CreditProduct(rawValue: product.id)
    }

    var body: some View {
        HStack(spacing: 16) {
            // Credit Icon
            ZStack {
                Circle()
                    .fill(Color.black)
                    .frame(width: 50, height: 50)

                Text("\(creditProduct?.credits ?? 0)")
                    .font(Typography.display(20, weight: .bold))
                    .foregroundColor(.white)
            }

            // Product Info
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(product.displayName)
                        .font(Typography.bodyMD.bold())
                        .foregroundColor(theme.text)

                    if creditProduct?.isBestValue == true {
                        Text(lang.bestValue)
                            .font(Typography.bodyXS.bold())
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color.green)
                            .cornerRadius(4)
                    }
                }

                Text(product.formattedPricePerCredit + lang.perCredit)
                    .font(Typography.bodySM)
                    .foregroundColor(theme.textSecondary)
            }

            Spacer()

            // Purchase Button
            Button(action: onPurchase) {
                if isPurchasing {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .frame(width: 80, height: 36)
                } else {
                    Text(product.displayPrice)
                        .font(Typography.bodySM.bold())
                        .foregroundColor(.white)
                        .frame(width: 80, height: 36)
                }
            }
            .background(Color.black)
            .cornerRadius(18)
            .disabled(isPurchasing)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .stroke(creditProduct?.isBestValue == true ? Color.green : Color.gray.opacity(0.2), lineWidth: creditProduct?.isBestValue == true ? 2 : 1)
        )
    }
}

#Preview {
    NavigationStack {
        CreditsPurchaseScreen()
            .environmentObject(AppState())
    }
}
