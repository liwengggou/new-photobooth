import SwiftUI
import FirebaseAuth
import PhotosUI
import UniformTypeIdentifiers

// MARK: - Frame Option Model

/// Represents a frame color/style option
enum FrameOption: Equatable, Hashable {
    case white
    case black
    case salmonPink
    case navy
    case photo(UIImage)

    var color: Color? {
        switch self {
        case .white: return .white
        case .black: return .black
        case .salmonPink: return Color(hex: "FF9999")
        case .navy: return Color(hex: "1F2F54")
        case .photo: return nil
        }
    }

    var defaultTextColor: Color {
        switch self {
        case .white, .salmonPink: return .black
        case .black, .navy: return .white
        case .photo: return .white // Default for photo, user can change
        }
    }

    var displayName: String {
        switch self {
        case .white: return "White"
        case .black: return "Black"
        case .salmonPink: return "Pink"
        case .navy: return "Navy"
        case .photo: return "Photo"
        }
    }

    static func == (lhs: FrameOption, rhs: FrameOption) -> Bool {
        switch (lhs, rhs) {
        case (.white, .white), (.black, .black), (.salmonPink, .salmonPink), (.navy, .navy):
            return true
        case (.photo(let lhsImage), .photo(let rhsImage)):
            return lhsImage === rhsImage  // Compare image identity
        default:
            return false
        }
    }

    func hash(into hasher: inout Hasher) {
        switch self {
        case .white: hasher.combine(0)
        case .black: hasher.combine(1)
        case .salmonPink: hasher.combine(2)
        case .navy: hasher.combine(3)
        case .photo(let image):
            hasher.combine(4)
            hasher.combine(ObjectIdentifier(image))
        }
    }
}

/// Screen to customize collage layout and colors
struct CustomizationScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var lang: LanguageManager
    @Environment(\.theme) var theme
    @StateObject private var collageViewModel = CollageViewModel()
    @State private var selectedLayout: CollageLayout = .strip
    @State private var selectedFrameOption: FrameOption = .white
    @State private var selectedTextColor: Color = .black
    @State private var customFrameImage: UIImage?
    @State private var showPhotoPicker = false
    @State private var photoPickerItem: PhotosPickerItem?
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var previewImage: UIImage?
    @State private var isGeneratingPreview = false
    @State private var showFullscreenPreview = false
    @State private var photoOrder: [Int] = [0, 1, 2, 3]
    @State private var draggingIndex: Int?
    @State private var dropTargetIndex: Int?

    // Frame options
    private let frameOptions: [FrameOption] = [.white, .black, .salmonPink, .navy]

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
                    }
                    .foregroundColor(theme.text)
                }

                Spacer()

                Text(lang.customize)
                    .font(.headline)
                    .foregroundColor(theme.text)

                Spacer()

                // Invisible spacer to balance the Back button
                HStack(spacing: 4) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .semibold))
                    Text(lang.back)
                }
                .opacity(0)
            }
            .padding(.horizontal)
            .padding(.vertical, 12)

            // Actual Collage Preview (exactly what will be saved)
            VStack(spacing: theme.spacing.sm) {
                if let image = previewImage {
                    Image(uiImage: image)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .shadow(color: .black.opacity(0.12), radius: 16, x: 0, y: 6)
                        .onTapGesture {
                            showFullscreenPreview = true
                        }
                } else if isGeneratingPreview {
                    Rectangle()
                        .fill(theme.accent)
                        .aspectRatio(selectedLayout == .strip ? 0.4 : 0.8, contentMode: .fit)
                        .overlay(
                            ProgressView()
                                .tint(theme.text)
                        )
                }
            }
            .frame(maxHeight: UIScreen.main.bounds.height * 0.35)
            .padding(.horizontal, theme.spacing.xl)
            .padding(.top, theme.spacing.sm)

            // Customization Options
            ScrollView {
                VStack(spacing: theme.spacing.md) {
                    // Photo Reorder Section
                    photoReorderSection

                    // Layout Selection
                    layoutSection

                    // Color Selection
                    colorSection
                }
                .padding(.horizontal, theme.spacing.xl)
                .padding(.vertical, theme.spacing.sm)
            }

            // Save & Continue Button
            Button {
                Task {
                    await saveCollageAndContinue()
                }
            } label: {
                HStack(spacing: theme.spacing.sm) {
                    if isSaving {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: theme.background))
                    } else {
                        Text(lang.saveAndContinue)
                        Image(systemName: "arrow.right")
                    }
                }
            }
            .photoboothPrimaryButton(isDisabled: isSaving)
            .disabled(isSaving)
            .padding(.horizontal, theme.spacing.xl)
            .padding(.vertical, theme.spacing.sm)
        }
        .photoboothBackground()
        .navigationBarHidden(true)
        .alert(lang.error, isPresented: $showError) {
            Button(lang.ok, role: .cancel) {}
        } message: {
            if let errorMessage = errorMessage {
                Text(errorMessage)
            }
        }
        .fullScreenCover(isPresented: $showFullscreenPreview) {
            fullscreenPreviewOverlay
        }
        .onAppear {
            initializePhotoOrder()
            generatePreview()
        }
        .onChange(of: selectedLayout) { _, _ in
            generatePreview()
        }
        .onChange(of: selectedFrameOption) { _, _ in
            generatePreview()
        }
        .onChange(of: selectedTextColor) { _, _ in
            generatePreview()
        }
        .onChange(of: photoOrder) { _, _ in
            generatePreview()
        }
    }

    // MARK: - Initialize Photo Order

    private func initializePhotoOrder() {
        let count = appState.styledPhotos.count
        photoOrder = Array(0..<count)
    }

    // MARK: - Reordered Photos

    private var reorderedPhotos: [StyledPhoto] {
        photoOrder.compactMap { index in
            guard index < appState.styledPhotos.count else { return nil }
            return appState.styledPhotos[index]
        }
    }

    // MARK: - Fullscreen Preview Overlay

    private var fullscreenPreviewOverlay: some View {
        ZStack {
            theme.background
                .ignoresSafeArea()

            VStack {
                HStack {
                    Spacer()
                    Button {
                        showFullscreenPreview = false
                    } label: {
                        Image(systemName: "xmark")
                            .font(.title2.weight(.medium))
                            .foregroundColor(theme.text)
                            .padding(theme.spacing.lg)
                    }
                }

                Spacer()

                if let image = previewImage {
                    Image(uiImage: image)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .padding(theme.spacing.xl)
                }

                Spacer()
            }
        }
    }

    // MARK: - Generate Preview

    private func generatePreview() {
        guard !appState.styledPhotos.isEmpty else { return }

        isGeneratingPreview = true

        // Configure view model with current settings
        collageViewModel.selectedLayout = selectedLayout
        collageViewModel.textColor = selectedTextColor

        if case .photo(let image) = selectedFrameOption {
            collageViewModel.stripColor = .white
            collageViewModel.backgroundImage = image
        } else if let color = selectedFrameOption.color {
            collageViewModel.stripColor = color
            collageViewModel.backgroundImage = nil
        }

        Task {
            let image = await collageViewModel.generateCollage(from: reorderedPhotos)
            await MainActor.run {
                previewImage = image
                isGeneratingPreview = false
            }
        }
    }

    // MARK: - Save Collage and Continue

    private func saveCollageAndContinue() async {
        guard let userId = Auth.auth().currentUser?.uid else {
            errorMessage = lang.userNotAuthenticated
            showError = true
            return
        }

        // Use the already-generated preview image to ensure preview matches saved output
        guard let collage = previewImage else {
            errorMessage = lang.failedToGenerateCollage
            showError = true
            return
        }

        isSaving = true

        // Set up session settings
        appState.currentSession?.layout = selectedLayout

        // Set color or background image in session
        if case .photo = selectedFrameOption {
            appState.currentSession?.stripColor = "#CUSTOM"
        } else if let color = selectedFrameOption.color {
            appState.currentSession?.stripColor = UIColor(color).hexString
        }

        do {
            // 1. Fetch current user data
            guard let user = try await FirebaseService.shared.fetchUser(userId: userId) else {
                errorMessage = lang.failedToFetchUser
                showError = true
                isSaving = false
                return
            }

            // 2. Check if user has enough credits
            guard user.credits >= 1 else {
                errorMessage = lang.insufficientCreditsEarn
                showError = true
                isSaving = false
                return
            }

            // 3. Deduct 1 credit
            let newCredits = user.credits - 1
            try await FirebaseService.shared.updateCredits(userId: userId, credits: newCredits)

            // 4. Update local app state
            var updatedUser = user
            updatedUser.credits = newCredits
            appState.currentUser = updatedUser

            // 5. Save collage to local storage
            let sessionId = appState.currentSession?.id ?? UUID().uuidString
            let _ = try await StorageService.shared.saveCollage(collage, sessionId: sessionId)

            // 6. Save collage to photo library
            try await StorageService.shared.saveToPhotoLibrary(collage)

            // 7. Save session to Firestore
            if var session = appState.currentSession {
                session.userId = userId
                session.status = .completed
                try await FirebaseService.shared.saveSession(session)
            }

            // 8. Store generated collage in app state for success screen
            appState.generatedCollage = collage

            // 9. Track analytics
            AnalyticsService.shared.logCreditsUsed(amount: 1, reason: "collage_saved")
            AnalyticsService.shared.logCollageSaved(
                style: appState.currentSession?.style?.rawValue ?? "unknown",
                layout: appState.currentSession?.layout?.rawValue ?? "unknown"
            )
            AnalyticsService.shared.logCollageShared(method: "camera_roll")

            print("Successfully deducted 1 credit. New balance: \(newCredits)")

            // 10. Navigate to success screen (skip preview)
            isSaving = false
            appState.navigate(to: .success)

        } catch {
            errorMessage = "Failed to save collage: \(error.localizedDescription)"
            showError = true
            isSaving = false
            print("Error saving collage: \(error)")
        }
    }

    // MARK: - Photo Reorder Section

    private var photoReorderSection: some View {
        VStack(alignment: .center, spacing: theme.spacing.md) {
            Text(lang.dragToReorder)
                .font(Typography.bodySM)
                .foregroundColor(theme.textSecondary)

            HStack(spacing: theme.spacing.xs) {
                ForEach(0..<4, id: \.self) { position in
                    HStack(spacing: 0) {
                        // Drop indicator line (left side of target photo)
                        dropIndicatorLine(at: position)

                        reorderablePhotoThumbnail(at: position)
                    }
                }

                // Trailing drop zone for moving to the end
                trailingDropZone
            }
        }
    }

    /// Trailing drop zone to allow dropping at the end
    private var trailingDropZone: some View {
        // Don't show if dragging the last item (dropping at end wouldn't change anything)
        let showIndicator = dropTargetIndex == 4 && draggingIndex != nil && draggingIndex != 3

        return VStack(spacing: 0) {
            Circle()
                .fill(theme.primary)
                .frame(width: 8, height: 8)
            Rectangle()
                .fill(theme.primary)
                .frame(width: 3, height: 82)
        }
        .frame(width: showIndicator ? 12 : 0)
        .opacity(showIndicator ? 1 : 0)
        .animation(.easeInOut(duration: 0.15), value: showIndicator)
        .background(
            // Invisible drop target area
            Color.clear
                .frame(width: 30, height: 90)
                .contentShape(Rectangle())
                .onDrop(of: [.plainText], delegate: TrailingDropDelegate(
                    photoOrder: $photoOrder,
                    draggingIndex: $draggingIndex,
                    dropTargetIndex: $dropTargetIndex
                ))
        )
    }

    /// Vertical line indicator shown during drag-to-reorder
    private func dropIndicatorLine(at position: Int) -> some View {
        // Don't show indicator if:
        // - Not the drop target
        // - No item being dragged
        // - Dragging this same position
        // - Dragging the position right before (dropping here wouldn't change anything)
        let showIndicator = dropTargetIndex == position &&
            draggingIndex != nil &&
            draggingIndex != position &&
            draggingIndex != position - 1

        return VStack(spacing: 0) {
            // Top circle indicator
            Circle()
                .fill(theme.primary)
                .frame(width: 8, height: 8)

            // Vertical line
            Rectangle()
                .fill(theme.primary)
                .frame(width: 3, height: 82)
        }
        .frame(width: showIndicator ? 12 : 0)
        .opacity(showIndicator ? 1 : 0)
        .animation(.easeInOut(duration: 0.15), value: showIndicator)
    }

    private func reorderablePhotoThumbnail(at position: Int) -> some View {
        let photoIndex = position < photoOrder.count ? photoOrder[position] : position
        let isDragging = draggingIndex == position

        return ZStack {
            if photoIndex < appState.styledPhotos.count {
                Image(uiImage: appState.styledPhotos[photoIndex].image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 70, height: 90)
                    .clipped()
                    .cornerRadius(4)
                    .overlay(
                        Text("\(position + 1)")
                            .font(Typography.bodySM.bold())
                            .foregroundColor(.white)
                            .padding(4)
                            .background(Circle().fill(Color.black.opacity(0.6)))
                            .padding(4),
                        alignment: .topLeading
                    )
                    .opacity(isDragging ? 0.4 : 1.0)
                    .scaleEffect(isDragging ? 0.95 : 1.0)
                    .animation(.easeInOut(duration: 0.15), value: isDragging)
                    .onDrag {
                        draggingIndex = position
                        dropTargetIndex = nil
                        return NSItemProvider(object: String(position) as NSString)
                    }
                    .onDrop(of: [.plainText], delegate: PhotoDropDelegate(
                        currentIndex: position,
                        photoOrder: $photoOrder,
                        draggingIndex: $draggingIndex,
                        dropTargetIndex: $dropTargetIndex
                    ))
            } else {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .frame(width: 70, height: 90)
            }
        }
    }

    // MARK: - Layout Section

    private var layoutSection: some View {
        VStack(alignment: .center, spacing: theme.spacing.md) {
            Text(lang.selectLayout)
                .font(Typography.bodySM)
                .foregroundColor(theme.textSecondary)

            HStack(spacing: theme.spacing.sm) {
                ForEach(CollageLayout.allCases, id: \.self) { layout in
                    LayoutOptionButton(
                        layout: layout,
                        isSelected: selectedLayout == layout
                    ) {
                        withAnimation(.spring(response: 0.3)) {
                            selectedLayout = layout
                        }
                    }
                }
            }
        }
    }

    // MARK: - Color Section

    private var colorSection: some View {
        VStack(alignment: .center, spacing: theme.spacing.sm) {
            Text(lang.selectFrameColor)
                .font(Typography.bodySM)
                .foregroundColor(theme.textSecondary)

            // Frame Options (4 colors + 1 photo option)
            HStack(spacing: theme.spacing.sm) {
                ForEach(frameOptions, id: \.self) { option in
                    FrameOptionButton(
                        option: option,
                        isSelected: selectedFrameOption == option
                    ) {
                        withAnimation(.spring(response: 0.2)) {
                            selectedFrameOption = option
                            selectedTextColor = option.defaultTextColor
                        }
                    }
                }

                // Photo option
                PhotoOptionButton(
                    isSelected: isPhotoOptionSelected,
                    selectedImage: customFrameImage
                ) {
                    showPhotoPicker = true
                }
            }

            // Text color picker (only for photo option)
            if isPhotoOptionSelected {
                HStack(spacing: theme.spacing.sm) {
                    Text(lang.textColor)
                        .font(Typography.bodySM)
                        .foregroundColor(theme.textSecondary)

                    HStack(spacing: theme.spacing.sm) {
                        TextColorButton(color: .white, isSelected: selectedTextColor == .white) {
                            selectedTextColor = .white
                        }
                        TextColorButton(color: .black, isSelected: selectedTextColor == .black) {
                            selectedTextColor = .black
                        }
                    }
                }
                .padding(.top, theme.spacing.xs)
            }
        }
        .photosPicker(isPresented: $showPhotoPicker, selection: $photoPickerItem, matching: .images)
        .onChange(of: photoPickerItem) { _, newItem in
            Task {
                if let data = try? await newItem?.loadTransferable(type: Data.self),
                   let image = UIImage(data: data) {
                    customFrameImage = image
                    selectedFrameOption = .photo(image)
                }
            }
        }
    }

    private var isPhotoOptionSelected: Bool {
        if case .photo = selectedFrameOption {
            return true
        }
        return false
    }
}

// MARK: - Layout Option Button

struct LayoutOptionButton: View {
    @Environment(\.theme) var theme
    let layout: CollageLayout
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: theme.spacing.sm) {
                // Layout Preview
                ZStack {
                    Rectangle()
                        .fill(theme.accent)
                        .frame(width: 44, height: 58)

                    if layout == .strip {
                        VStack(spacing: 1) {
                            ForEach(0..<4, id: \.self) { _ in
                                Rectangle()
                                    .fill(theme.text.opacity(0.5))
                                    .frame(width: 30, height: 10)
                            }
                        }
                    } else {
                        VStack(spacing: 1) {
                            HStack(spacing: 1) {
                                Rectangle()
                                    .fill(theme.text.opacity(0.5))
                                    .frame(width: 18, height: 20)
                                Rectangle()
                                    .fill(theme.text.opacity(0.5))
                                    .frame(width: 18, height: 20)
                            }
                            HStack(spacing: 1) {
                                Rectangle()
                                    .fill(theme.text.opacity(0.5))
                                    .frame(width: 18, height: 20)
                                Rectangle()
                                    .fill(theme.text.opacity(0.5))
                                    .frame(width: 18, height: 20)
                            }
                        }
                    }
                }
                .overlay(
                    Rectangle()
                        .stroke(isSelected ? theme.primary : Color.clear, lineWidth: 2)
                )

                Text(layout.displayName)
                    .font(Typography.bodySM)
                    .foregroundColor(isSelected ? theme.primary : theme.textSecondary)
            }
        }
    }
}

// MARK: - Frame Option Button

struct FrameOptionButton: View {
    @Environment(\.theme) var theme
    let option: FrameOption
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            Circle()
                .fill(option.color ?? .clear)
                .frame(width: 40, height: 40)
                .overlay(
                    Circle()
                        .stroke(option == .white ? theme.textSecondary.opacity(0.3) : Color.clear, lineWidth: 1)
                )
                .overlay(
                    Circle()
                        .stroke(isSelected ? theme.primary : Color.clear, lineWidth: 2)
                        .padding(1)
                )
                .overlay {
                    if isSelected {
                        Image(systemName: "checkmark")
                            .font(.caption2.bold())
                            .foregroundColor(option.defaultTextColor)
                    }
                }
        }
    }
}

// MARK: - Photo Option Button

struct PhotoOptionButton: View {
    @Environment(\.theme) var theme
    let isSelected: Bool
    let selectedImage: UIImage?
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            ZStack {
                if let image = selectedImage, isSelected {
                    Circle()
                        .fill(.clear)
                        .frame(width: 40, height: 40)
                        .overlay(
                            Image(uiImage: image)
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .clipShape(Circle())
                        )
                } else {
                    Circle()
                        .fill(theme.accent.opacity(0.3))
                        .frame(width: 40, height: 40)
                        .overlay(
                            Image(systemName: "photo.on.rectangle")
                                .font(.system(size: 16))
                                .foregroundColor(theme.textSecondary)
                        )
                }
            }
            .overlay(
                Circle()
                    .stroke(isSelected ? theme.primary : Color.clear, lineWidth: 2)
                    .padding(1)
            )
        }
    }
}

// MARK: - Text Color Button

struct TextColorButton: View {
    @Environment(\.theme) var theme
    let color: Color
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            Circle()
                .fill(color)
                .frame(width: 32, height: 32)
                .overlay(
                    Circle()
                        .stroke(color == .white ? theme.textSecondary.opacity(0.5) : Color.clear, lineWidth: 1)
                )
                .overlay(
                    Circle()
                        .stroke(isSelected ? theme.primary : Color.clear, lineWidth: 2)
                        .padding(1)
                )
                .overlay {
                    if isSelected {
                        Image(systemName: "checkmark")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(color == .white ? .black : .white)
                    }
                }
        }
    }
}

// MARK: - Photo Drop Delegate

struct PhotoDropDelegate: DropDelegate {
    let currentIndex: Int
    @Binding var photoOrder: [Int]
    @Binding var draggingIndex: Int?
    @Binding var dropTargetIndex: Int?

    func performDrop(info: DropInfo) -> Bool {
        // Perform the actual reorder on drop
        if let dragging = draggingIndex, dragging != currentIndex {
            withAnimation(.spring(response: 0.3)) {
                let fromIndex = dragging
                var toIndex = currentIndex

                if fromIndex < photoOrder.count && toIndex < photoOrder.count {
                    // Remove the item from its original position
                    let movedItem = photoOrder.remove(at: fromIndex)

                    // Adjust target index when moving forward (since removal shifts indices)
                    if fromIndex < toIndex {
                        toIndex -= 1
                    }

                    photoOrder.insert(movedItem, at: toIndex)
                }
            }
        }

        dropTargetIndex = nil
        draggingIndex = nil
        return true
    }

    func dropEntered(info: DropInfo) {
        guard let dragging = draggingIndex,
              dragging != currentIndex,
              dragging != currentIndex - 1 // Skip if dropping here wouldn't change anything
        else { return }

        // Only update the drop target indicator - don't swap yet
        withAnimation(.easeInOut(duration: 0.15)) {
            dropTargetIndex = currentIndex
        }
    }

    func dropExited(info: DropInfo) {
        // Clear drop target when leaving
        withAnimation(.easeInOut(duration: 0.15)) {
            dropTargetIndex = nil
        }
    }

    func dropUpdated(info: DropInfo) -> DropProposal? {
        return DropProposal(operation: .move)
    }
}

// MARK: - Trailing Drop Delegate (for dropping at the end)

struct TrailingDropDelegate: DropDelegate {
    @Binding var photoOrder: [Int]
    @Binding var draggingIndex: Int?
    @Binding var dropTargetIndex: Int?

    func performDrop(info: DropInfo) -> Bool {
        // Move the dragged item to the end
        if let dragging = draggingIndex {
            withAnimation(.spring(response: 0.3)) {
                if dragging < photoOrder.count {
                    let movedItem = photoOrder.remove(at: dragging)
                    photoOrder.append(movedItem)
                }
            }
        }

        dropTargetIndex = nil
        draggingIndex = nil
        return true
    }

    func dropEntered(info: DropInfo) {
        // Skip if dragging the last item (dropping at end wouldn't change anything)
        guard let dragging = draggingIndex, dragging != 3 else { return }

        withAnimation(.easeInOut(duration: 0.15)) {
            dropTargetIndex = 4 // Special index for trailing position
        }
    }

    func dropExited(info: DropInfo) {
        withAnimation(.easeInOut(duration: 0.15)) {
            dropTargetIndex = nil
        }
    }

    func dropUpdated(info: DropInfo) -> DropProposal? {
        return DropProposal(operation: .move)
    }
}

#Preview {
    NavigationStack {
        CustomizationScreen()
            .environmentObject(AppState())
    }
}
