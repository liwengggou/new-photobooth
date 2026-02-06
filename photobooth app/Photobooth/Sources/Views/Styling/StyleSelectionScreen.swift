import SwiftUI

/// Screen to select photo style - Redesigned to match web UI
struct StyleSelectionScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var lang: LanguageManager
    @State private var selectedStyle: PhotoStyle?

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Header
                VStack(spacing: 8) {
                    Text(lang.selectMode)
                        .font(Typography.display(32, weight: .black))
                        .trackingTight()
                        .foregroundColor(.primary)

                    Text(lang.choosePhotobooth)
                        .font(Typography.body(14))
                        .foregroundColor(.secondary)
                }
                .padding(.top, 32)
                .padding(.horizontal, 20)

                // Style Cards
                VStack(spacing: 16) {
                    ForEach(PhotoStyle.allCases, id: \.self) { style in
                        ThemeCardButton(
                            style: style,
                            isSelected: selectedStyle == style
                        ) {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                selectedStyle = style
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)

                Spacer(minLength: 100)
            }
        }
        .photoboothBackground()
        .safeAreaInset(edge: .bottom) {
            // Continue Button
            Button {
                guard let style = selectedStyle else { return }
                appState.selectStyle(style) // Update theme and session style
                appState.navigate(to: .intervalSelection)
            } label: {
                Text(lang.continueText)
                    .frame(maxWidth: .infinity)
            }
            .photoboothPrimaryButton(isDisabled: selectedStyle == nil)
            .disabled(selectedStyle == nil)
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
            .background(
                Color(.systemBackground)
                    .ignoresSafeArea(edges: .bottom)
            )
        }
        .navigationTitle(lang.style)
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Theme Card Button

struct ThemeCardButton: View {
    @EnvironmentObject private var lang: LanguageManager
    let style: PhotoStyle
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    // Icon + Localized Description
                    HStack(spacing: 8) {
                        Image(systemName: style.iconName)
                            .font(.system(size: 20, weight: .medium))

                        Text(lang.themeDescription(style).uppercased())
                            .font(Typography.body(11, weight: .medium))
                            .trackingWider()
                    }
                    .foregroundColor(style.theme.text.opacity(0.7))

                    // Display Name - Always English
                    Text(style.displayName.uppercased())
                        .font(Typography.display(24, weight: .black))
                        .trackingTight()
                        .foregroundColor(style.theme.text)
                }

                Spacer()

                // Arrow Icon
                Image(systemName: "arrow.right")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(style.theme.text)
            }
            .padding(20)
            .frame(height: 144)
            .background(style.theme.cardBackground)
            .cornerRadius(24)
            .shadow(
                color: .black.opacity(isSelected ? 0.15 : 0.08),
                radius: isSelected ? 20 : 8,
                x: 0,
                y: isSelected ? 8 : 4
            )
            .scaleEffect(isSelected ? 1.02 : 1.0)
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .stroke(style.theme.text.opacity(isSelected ? 0.2 : 0), lineWidth: 2)
            )
        }
        .buttonStyle(ScaleButtonStyle())
    }
}

// MARK: - Scale Button Style

struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

#Preview {
    NavigationStack {
        StyleSelectionScreen()
            .environmentObject(AppState())
            .environmentObject(LanguageManager.shared)
            .environment(\.theme, .jpKawaii)
    }
}
