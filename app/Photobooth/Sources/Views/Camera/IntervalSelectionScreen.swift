import SwiftUI

// MARK: - Custom Wheel Picker with adjustable row height
struct IntervalWheelPicker: UIViewRepresentable {
    @Binding var selection: Int
    let range: ClosedRange<Int>
    let isDarkTheme: Bool

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> UIPickerView {
        let picker = UIPickerView()
        picker.delegate = context.coordinator
        picker.dataSource = context.coordinator
        picker.backgroundColor = .clear

        // Hide the selection indicator (gray highlight bar)
        picker.subviews.forEach { subview in
            subview.backgroundColor = .clear
        }

        // Set initial selection
        let initialRow = selection - range.lowerBound
        picker.selectRow(initialRow, inComponent: 0, animated: false)

        return picker
    }

    func updateUIView(_ uiView: UIPickerView, context: Context) {
        // Update coordinator's parent reference
        context.coordinator.parent = self

        // Hide selection indicator on each update
        uiView.subviews.forEach { subview in
            subview.backgroundColor = .clear
        }

        let currentRow = selection - range.lowerBound
        if uiView.selectedRow(inComponent: 0) != currentRow {
            uiView.selectRow(currentRow, inComponent: 0, animated: true)
        }

        // Reload to apply new text color
        uiView.reloadAllComponents()
    }

    class Coordinator: NSObject, UIPickerViewDelegate, UIPickerViewDataSource {
        var parent: IntervalWheelPicker

        init(_ parent: IntervalWheelPicker) {
            self.parent = parent
        }

        func numberOfComponents(in pickerView: UIPickerView) -> Int {
            return 1
        }

        func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
            return parent.range.count
        }

        func pickerView(_ pickerView: UIPickerView, rowHeightForComponent component: Int) -> CGFloat {
            return 100 // Row height to fit 72pt font
        }

        func pickerView(_ pickerView: UIPickerView, viewForRow row: Int, forComponent component: Int, reusing view: UIView?) -> UIView {
            let containerView = UIView()

            let number = parent.range.lowerBound + row

            // Text color based on theme: dark theme = white, light theme = black
            let textColor: UIColor = parent.isDarkTheme ? .white : .black

            // Number label - large (matching .title2.bold() style)
            let numberLabel = UILabel()
            numberLabel.text = "\(number)"
            numberLabel.font = UIFont.systemFont(ofSize: 72, weight: .bold)
            numberLabel.textColor = textColor
            numberLabel.translatesAutoresizingMaskIntoConstraints = false

            // "sec" label - small (matching style)
            let secLabel = UILabel()
            secLabel.text = LanguageManager.shared.sec
            secLabel.font = UIFont.systemFont(ofSize: 16, weight: .bold)
            secLabel.textColor = textColor
            secLabel.translatesAutoresizingMaskIntoConstraints = false

            containerView.addSubview(numberLabel)
            containerView.addSubview(secLabel)

            NSLayoutConstraint.activate([
                numberLabel.centerYAnchor.constraint(equalTo: containerView.centerYAnchor),
                numberLabel.centerXAnchor.constraint(equalTo: containerView.centerXAnchor, constant: -20),

                secLabel.lastBaselineAnchor.constraint(equalTo: numberLabel.lastBaselineAnchor),
                secLabel.leadingAnchor.constraint(equalTo: numberLabel.trailingAnchor, constant: 4)
            ])

            return containerView
        }

        func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
            parent.selection = parent.range.lowerBound + row
        }
    }
}

/// Screen to select interval between photo shots
struct IntervalSelectionScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var lang: LanguageManager
    @Environment(\.theme) var theme
    @State private var selectedInterval: Int = 5

    var body: some View {
        VStack(spacing: 0) {
            // Custom Navigation Bar
            HStack {
                Button {
                    appState.pop()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .semibold))
                        Text(lang.back)
                            .font(Typography.body(16, weight: .semibold))
                    }
                    .foregroundColor(theme.text)
                }

                Spacer()

                Text(lang.setup)
                    .font(Typography.body(16, weight: .semibold))
                    .foregroundColor(theme.text)

                Spacer()

                // Invisible spacer to balance the Back button
                HStack(spacing: 4) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .semibold))
                    Text(lang.back)
                        .font(Typography.body(16, weight: .semibold))
                }
                .opacity(0)
            }
            .padding(.horizontal)
            .padding(.vertical, 12)

            // Main content (no scrolling)
            VStack(spacing: 24) {
                Spacer()

                // Header
                VStack(spacing: 12) {
                    Image(systemName: "timer")
                        .font(.system(size: 36))
                        .foregroundColor(theme.text)

                    Text(lang.setPhotoInterval)
                        .font(Typography.display(32, weight: .black))
                        .trackingTight()
                        .foregroundColor(theme.text)

                    Text(lang.chooseSecondsBetween)
                        .font(Typography.body(14))
                        .foregroundColor(theme.textSecondary)
                        .multilineTextAlignment(.center)
                }

                // Wheel Picker
                IntervalWheelPicker(
                    selection: $selectedInterval,
                    range: 1...10,
                    isDarkTheme: theme.isDark
                )
                .frame(height: 300)

                // Info Text
                Text(lang.intervalDescription)
                    .font(Typography.bodyLG)
                    .foregroundColor(theme.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)

                Spacer()
            }

            // Continue Button - always visible at bottom
            Button {
                // Store the interval in the session
                appState.currentSession?.interval = selectedInterval
                appState.navigate(to: .camera)
            } label: {
                HStack {
                    Text(lang.continueText)
                        .font(Typography.body(16, weight: .semibold))
                    Image(systemName: "arrow.right")
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(theme.text)
                .foregroundColor(theme.background)
                .cornerRadius(16)
            }
            .padding(.horizontal)
            .padding(.bottom, 16)
        }
        .background(theme.background.ignoresSafeArea())
        .navigationBarHidden(true)
    }
}

#Preview {
    NavigationStack {
        IntervalSelectionScreen()
            .environmentObject(AppState())
    }
}
