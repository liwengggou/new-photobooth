import SwiftUI

/// Screen displaying purchase history
struct PurchaseHistoryScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var lang: LanguageManager
    @ObservedObject private var storeKit = StoreKitManager.shared
    @Environment(\.theme) var theme

    @State private var isLoading = true

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                ScreenHeader(
                    lang.purchaseHistory,
                    subtitle: lang.purchaseHistorySubtitle
                )

                VStack(spacing: theme.spacing.xxl) {
                    if isLoading {
                        loadingView
                    } else if storeKit.purchaseHistory.isEmpty {
                        emptyView
                    } else {
                        historyList
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, theme.spacing.xxl)
            }
        }
        .background(Color.white.ignoresSafeArea())
        .task {
            await loadHistory()
        }
    }

    private func loadHistory() async {
        guard let userId = appState.currentUser?.id else {
            isLoading = false
            return
        }

        isLoading = true
        await storeKit.loadPurchaseHistory(userId: userId)
        isLoading = false
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack {
            ProgressView()
                .padding(.vertical, 60)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Empty View

    private var emptyView: some View {
        VStack(spacing: theme.spacing.lg) {
            Image(systemName: "cart")
                .font(.system(size: 60))
                .foregroundColor(theme.textSecondary.opacity(0.5))

            Text(lang.noPurchasesYet)
                .font(Typography.display(20, weight: .bold))
                .foregroundColor(theme.text)

            Text(lang.purchaseCreditsPrompt)
                .font(Typography.bodyMD)
                .foregroundColor(theme.textSecondary)
                .multilineTextAlignment(.center)

            NavigationLink(destination: CreditsPurchaseScreen()) {
                Text(lang.getCredits)
                    .font(Typography.bodyMD.bold())
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.black)
                    .cornerRadius(12)
            }
            .padding(.top, theme.spacing.md)
        }
        .padding(.vertical, 40)
        .photoboothCard()
    }

    // MARK: - History List

    private var historyList: some View {
        VStack(alignment: .leading, spacing: theme.spacing.lg) {
            Text(lang.allPurchases)
                .font(Typography.display(20, weight: .bold))
                .trackingTight()
                .foregroundColor(theme.text)

            VStack(spacing: 0) {
                ForEach(Array(storeKit.purchaseHistory.enumerated()), id: \.element.id) { index, record in
                    PurchaseHistoryRow(record: record)

                    if index < storeKit.purchaseHistory.count - 1 {
                        Divider()
                            .background(theme.textSecondary.opacity(0.2))
                    }
                }
            }
        }
        .photoboothCard()
    }
}

// MARK: - Purchase History Row

private struct PurchaseHistoryRow: View {
    let record: PurchaseRecord

    @Environment(\.theme) var theme

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: record.purchaseDate)
    }

    var body: some View {
        HStack(spacing: 16) {
            // Credit Icon
            ZStack {
                Circle()
                    .fill(Color.black)
                    .frame(width: 44, height: 44)

                Text("+\(record.credits)")
                    .font(Typography.bodySM.bold())
                    .foregroundColor(.white)
            }

            // Purchase Details
            VStack(alignment: .leading, spacing: 4) {
                Text(record.creditProduct?.displayName ?? "\(record.credits) Credits")
                    .font(Typography.bodyMD.bold())
                    .foregroundColor(theme.text)

                Text(formattedDate)
                    .font(Typography.bodyXS)
                    .foregroundColor(theme.textSecondary)
            }

            Spacer()

            // Price
            VStack(alignment: .trailing, spacing: 4) {
                Text(record.formattedPrice)
                    .font(Typography.bodyMD.bold())
                    .foregroundColor(theme.text)

                if record.environment == "sandbox" {
                    Text("Sandbox")
                        .font(Typography.bodyXS)
                        .foregroundColor(.orange)
                }
            }
        }
        .padding(.vertical, 12)
    }
}

#Preview {
    NavigationStack {
        PurchaseHistoryScreen()
            .environmentObject(AppState())
    }
}
