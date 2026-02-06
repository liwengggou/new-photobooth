import SwiftUI

/// Success screen with save and share options
struct SuccessScreen: View {
    @Environment(\.theme) private var theme
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var lang: LanguageManager
    @State private var isVideoSaved = false
    @State private var showShareSheet = false
    @State private var showSaveSuccess = false
    @State private var saveSuccessMessage = ""
    @State private var isSaving = false

    // Individual photos save state
    @State private var isAllPhotosSaved = false
    @State private var isSavingAllPhotos = false

    // Share destinations (icons only, color comes from theme)
    private var shareOptions: [(name: String, icon: String)] {
        [
            ("Instagram", "camera.fill"),
            ("LINE", "message.fill"),
            ("Snapchat", "bolt.fill"),
            (lang.more, "square.and.arrow.up")
        ]
    }

    /// Check if the recorded video file actually exists and is valid
    private var videoFileExists: Bool {
        guard let url = appState.recordedVideoURL else { return false }
        let fileManager = FileManager.default
        guard fileManager.fileExists(atPath: url.path) else { return false }

        // Check file is not empty
        if let attrs = try? fileManager.attributesOfItem(atPath: url.path),
           let size = attrs[.size] as? Int64 {
            return size > 0
        }
        return false
    }

    var body: some View {
        VStack(spacing: 16) {
            // Custom Navigation Bar with Done button
            HStack {
                Spacer()
                Button {
                    appState.resetSession()
                    appState.popToRoot()
                } label: {
                    Text(lang.done)
                        .font(Typography.body(16, weight: .semibold))
                        .foregroundColor(theme.text)
                }
            }
            .padding(.horizontal)
            .padding(.top, 8)

            // Success Header (without check icon)
            successHeader

            // Collage Preview (smaller)
            collagePreview

            // Save Options
            saveOptionsSection

            // Share Section
            shareSection

            Spacer()
        }
        .background(theme.background)
        .navigationBarHidden(true)
        .sheet(isPresented: $showShareSheet) {
            if let collage = appState.generatedCollage {
                ShareSheet(items: [collage])
            }
        }
        .overlay {
            if showSaveSuccess {
                saveSuccessToast
            }
        }
    }

    // MARK: - Success Header

    private var successHeader: some View {
        VStack(spacing: 8) {
            Text(lang.collageSaved)
                .font(Typography.displayMD)
                .foregroundColor(theme.text)

            Text(lang.oneCreditUsed)
                .font(Typography.bodyMD)
                .foregroundColor(theme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .center)
        .multilineTextAlignment(.center)
        .padding(.top, 60)
    }

    // MARK: - Collage Preview

    private var collagePreview: some View {
        Group {
            if let collage = appState.generatedCollage {
                Image(uiImage: collage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 120, height: 180)
                    .shadow(color: theme.text.opacity(0.1), radius: 5)
            } else {
                RoundedRectangle(cornerRadius: 12)
                    .fill(theme.accent)
                    .frame(width: 120, height: 180)
                    .overlay(
                        Image(systemName: "photo.fill")
                            .font(.largeTitle)
                            .foregroundColor(theme.textSecondary)
                    )
            }
        }
    }

    // MARK: - Save Options

    private var saveOptionsSection: some View {
        VStack(spacing: 12) {
            // Save Video (only show if video was recorded AND file exists)
            if videoFileExists {
                SaveOptionRow(
                    icon: "video.fill",
                    title: lang.saveBTSVideo,
                    subtitle: lang.saveRecordingToCameraRoll,
                    isSaved: isVideoSaved,
                    isLoading: isSaving && !isVideoSaved,
                    savedText: lang.saved,
                    theme: theme
                ) {
                    saveVideo()
                }
            }

            // Save Individual Photos (only show if photos exist)
            if !appState.styledPhotos.isEmpty {
                SaveOptionRow(
                    icon: "photo.on.rectangle",
                    title: lang.saveIndividualPhotos,
                    subtitle: lang.saveAllPhotos(appState.styledPhotos.count),
                    isSaved: isAllPhotosSaved,
                    isLoading: isSavingAllPhotos,
                    savedText: lang.saved,
                    theme: theme
                ) {
                    saveAllIndividualPhotos()
                }
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Share Section

    private var shareSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(lang.shareTo)
                .font(Typography.body(16, weight: .semibold))
                .foregroundColor(theme.text)
                .padding(.horizontal)

            HStack(spacing: 20) {
                ForEach(shareOptions, id: \.name) { option in
                    ShareButton(
                        name: option.name,
                        icon: option.icon,
                        theme: theme
                    ) {
                        if option.name == lang.more {
                            showShareSheet = true
                        } else {
                            shareToApp(option.name)
                        }
                    }
                }
            }
            .padding(.horizontal)
        }
    }

    // MARK: - Save Success Toast

    private var saveSuccessToast: some View {
        VStack {
            Spacer()

            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(theme.primary)
                Text(saveSuccessMessage)
                    .font(Typography.body(14, weight: .bold))
                    .foregroundColor(theme.text)
            }
            .padding()
            .background(theme.cardBackground)
            .cornerRadius(12)
            .shadow(color: theme.text.opacity(0.15), radius: 10)
            .padding(.bottom, 100)
        }
        .transition(.move(edge: .bottom).combined(with: .opacity))
        .allowsHitTesting(false)
    }

    // MARK: - Actions

    private func saveVideo() {
        guard let videoURL = appState.recordedVideoURL else {
            saveSuccessMessage = lang.noVideoToSave
            showSaveSuccessToast()
            return
        }

        isSaving = true

        Task {
            do {
                try await StorageService.shared.saveVideoToPhotoLibrary(videoURL)
                isVideoSaved = true
                saveSuccessMessage = lang.videoSavedToPhotos

                // Track analytics
                AnalyticsService.shared.logCollageShared(method: "video_saved")
            } catch {
                saveSuccessMessage = "Failed to save: \(error.localizedDescription)"
            }

            isSaving = false
            showSaveSuccessToast()
        }
    }

    private func saveAllIndividualPhotos() {
        guard !appState.styledPhotos.isEmpty else { return }

        isSavingAllPhotos = true

        Task {
            var savedCount = 0
            for photo in appState.styledPhotos {
                do {
                    try await StorageService.shared.saveToPhotoLibrary(photo.image)
                    savedCount += 1
                } catch {
                    // Continue saving other photos even if one fails
                }
            }

            isAllPhotosSaved = true
            saveSuccessMessage = lang.photosSavedToPhotos(savedCount)

            // Track analytics
            AnalyticsService.shared.logCollageShared(method: "individual_photos_saved")

            isSavingAllPhotos = false
            showSaveSuccessToast()
        }
    }

    private func showSaveSuccessToast() {
        withAnimation(.spring()) {
            showSaveSuccess = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            withAnimation {
                showSaveSuccess = false
            }
        }
    }

    private func shareToApp(_ app: String) {
        // For specific apps, we use URL schemes when available
        // Otherwise fall back to the share sheet
        guard let collage = appState.generatedCollage else {
            showShareSheet = true
            return
        }

        switch app {
        case "Instagram":
            // Instagram Stories URL scheme
            if let url = URL(string: "instagram-stories://share"),
               UIApplication.shared.canOpenURL(url) {
                // Save image temporarily and share via Instagram
                shareToInstagramStories(collage)
            } else {
                showShareSheet = true
            }

        case "LINE":
            // LINE URL scheme for image sharing
            if let url = URL(string: "line://"),
               UIApplication.shared.canOpenURL(url) {
                showShareSheet = true // LINE doesn't support direct image passing via URL
            } else {
                showShareSheet = true
            }

        case "Snapchat":
            // Snapchat doesn't have a simple URL scheme for images
            showShareSheet = true

        default:
            showShareSheet = true
        }

        // Track analytics
        AnalyticsService.shared.logCollageShared(method: app.lowercased())
    }

    private func shareToInstagramStories(_ image: UIImage) {
        guard let imageData = image.pngData() else {
            showShareSheet = true
            return
        }

        let pasteboardItems: [String: Any] = [
            "com.instagram.sharedSticker.backgroundImage": imageData
        ]

        let pasteboardOptions: [UIPasteboard.OptionsKey: Any] = [
            .expirationDate: Date().addingTimeInterval(300)
        ]

        UIPasteboard.general.setItems([pasteboardItems], options: pasteboardOptions)

        if let url = URL(string: "instagram-stories://share") {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Save Option Row

struct SaveOptionRow: View {
    let icon: String
    let title: String
    let subtitle: String
    let isSaved: Bool
    var isLoading: Bool = false
    var savedText: String = "Saved"
    let theme: AppTheme
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle())
                        .frame(width: 24, height: 24)
                } else {
                    Image(systemName: isSaved ? "checkmark" : icon)
                        .font(.system(size: 18))
                        .foregroundColor(theme.text)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(Typography.bodyLG)
                        .foregroundColor(theme.text)

                    if isSaved {
                        Text(savedText)
                            .font(Typography.bodySM)
                            .foregroundColor(theme.textSecondary)
                    }
                }

                Spacer()

                if !isSaved && !isLoading {
                    Image(systemName: "arrow.down.circle")
                        .foregroundColor(theme.textSecondary)
                }
            }
            .padding()
            .background(theme.background)
            .cornerRadius(12)
            .shadow(
                color: .black.opacity(0.08),
                radius: 8,
                x: 0,
                y: 4
            )
        }
        .disabled(isSaved || isLoading)
    }
}

// MARK: - Share Button

struct ShareButton: View {
    let name: String
    let icon: String
    let theme: AppTheme
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(theme.background)
                        .frame(width: 56, height: 56)
                        .shadow(
                            color: .black.opacity(0.08),
                            radius: 8,
                            x: 0,
                            y: 4
                        )

                    Image(systemName: icon)
                        .font(.title3)
                        .foregroundColor(theme.text)
                }

                Text(name)
                    .font(Typography.bodyXS)
                    .foregroundColor(theme.textSecondary)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Share Sheet

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview {
    SuccessScreen()
        .environmentObject(AppState())
}
