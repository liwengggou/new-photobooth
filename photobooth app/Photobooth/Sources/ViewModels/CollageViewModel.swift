import SwiftUI
import CoreImage
import CoreImage.CIFilterBuiltins

/// Manages collage creation and customization
@MainActor
final class CollageViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var selectedLayout: CollageLayout = .strip
    @Published var stripColor: Color = .white
    @Published var backgroundImage: UIImage? // Custom background image
    @Published var textColor: Color = .black // Explicit text color for branding
    @Published var collageImage: UIImage?
    @Published var isGenerating = false
    @Published var errorMessage: String?

    // MARK: - Configuration
    private let photoSize = CGSize(width: 600, height: 800) // Individual photo size
    private let padding: CGFloat = 40 // Frame thickness (doubled)
    private let brandingHeight: CGFloat = 267 // Height for TOROTORO branding area (2/3 of 400)
    private let context = CIContext()

    // MARK: - Collage Generation

    /// Generate collage from styled photos
    func generateCollage(from photos: [StyledPhoto]) async -> UIImage? {
        guard photos.count == 4 else {
            errorMessage = "Need exactly 4 photos to create collage"
            return nil
        }

        isGenerating = true
        errorMessage = nil

        let image = await createCollageImage(from: photos)
        collageImage = image
        isGenerating = false

        return image
    }

    private func createCollageImage(from photos: [StyledPhoto]) async -> UIImage? {
        let uiColor = UIColor(stripColor)
        let uiTextColor = UIColor(textColor)
        let images = photos.map { $0.image }

        switch selectedLayout {
        case .strip:
            return createStripCollage(images: images, backgroundColor: uiColor, backgroundImage: backgroundImage, textColor: uiTextColor)
        case .grid:
            return createGridCollage(images: images, backgroundColor: uiColor, backgroundImage: backgroundImage, textColor: uiTextColor)
        }
    }

    /// Creates a vertical 1x4 strip collage
    private func createStripCollage(images: [UIImage], backgroundColor: UIColor, backgroundImage: UIImage?, textColor: UIColor) -> UIImage? {
        let totalWidth = photoSize.width + (padding * 2)
        let totalHeight = (photoSize.height * 4) + (padding * 5) + brandingHeight
        let size = CGSize(width: totalWidth, height: totalHeight)

        UIGraphicsBeginImageContextWithOptions(size, true, 1.0)
        defer { UIGraphicsEndImageContext() }

        guard let context = UIGraphicsGetCurrentContext() else { return nil }

        // Background: image (tiled) or color
        if let bgImage = backgroundImage {
            bgImage.drawTiled(in: CGRect(origin: .zero, size: size))
        } else {
            context.setFillColor(backgroundColor.cgColor)
            context.fill(CGRect(origin: .zero, size: size))
        }

        // Draw photos with crop-to-fill (no distortion)
        for (index, image) in images.enumerated() {
            let y = padding + (CGFloat(index) * (photoSize.height + padding))
            let rect = CGRect(x: padding, y: y, width: photoSize.width, height: photoSize.height)
            image.drawCroppedToFill(in: rect)
        }

        // Draw TOROTORO branding
        let brandingY = (photoSize.height * 4) + (padding * 5)
        drawBranding(in: context, at: CGPoint(x: 0, y: brandingY), width: totalWidth, height: brandingHeight, textColor: textColor)

        return UIGraphicsGetImageFromCurrentImageContext()
    }

    /// Creates a 2x2 grid collage
    private func createGridCollage(images: [UIImage], backgroundColor: UIColor, backgroundImage: UIImage?, textColor: UIColor) -> UIImage? {
        let totalWidth = (photoSize.width * 2) + (padding * 3)
        let totalHeight = (photoSize.height * 2) + (padding * 3) + brandingHeight
        let size = CGSize(width: totalWidth, height: totalHeight)

        UIGraphicsBeginImageContextWithOptions(size, true, 1.0)
        defer { UIGraphicsEndImageContext() }

        guard let context = UIGraphicsGetCurrentContext() else { return nil }

        // Background: image (tiled) or color
        if let bgImage = backgroundImage {
            bgImage.drawTiled(in: CGRect(origin: .zero, size: size))
        } else {
            context.setFillColor(backgroundColor.cgColor)
            context.fill(CGRect(origin: .zero, size: size))
        }

        // Draw photos in 2x2 grid
        let positions = [
            CGPoint(x: padding, y: padding), // Top-left
            CGPoint(x: padding * 2 + photoSize.width, y: padding), // Top-right
            CGPoint(x: padding, y: padding * 2 + photoSize.height), // Bottom-left
            CGPoint(x: padding * 2 + photoSize.width, y: padding * 2 + photoSize.height) // Bottom-right
        ]

        // Draw photos with crop-to-fill (no distortion)
        for (index, image) in images.enumerated() {
            let rect = CGRect(origin: positions[index], size: photoSize)
            image.drawCroppedToFill(in: rect)
        }

        // Draw TOROTORO branding
        let brandingY = (photoSize.height * 2) + (padding * 3)
        drawBranding(in: context, at: CGPoint(x: 0, y: brandingY), width: totalWidth, height: brandingHeight, textColor: textColor)

        return UIGraphicsGetImageFromCurrentImageContext()
    }

    /// Draws the TOROTORO branding with logo
    private func drawBranding(in context: CGContext, at origin: CGPoint, width: CGFloat, height: CGFloat, textColor: UIColor) {
        // Draw "TOROTORO" text
        let text = "TOROTORO"
        let fontSize: CGFloat = 48 // 2/3 size (was 72)
        let font = UIFont.systemFont(ofSize: fontSize, weight: .bold)
        let attributes: [NSAttributedString.Key: Any] = [
            .font: font,
            .foregroundColor: textColor
        ]
        let textSize = (text as NSString).size(withAttributes: attributes)

        // Load logo image - use white logo for white text, black logo otherwise
        var white: CGFloat = 0
        textColor.getWhite(&white, alpha: nil)
        let isWhiteText = white > 0.9
        let logoImage = UIImage(named: isWhiteText ? "LogoWhite" : "Logo")
        let logoHeight: CGFloat = 85 // 2/3 size (was 128)
        let logoWidth: CGFloat = logoImage != nil ? (logoImage!.size.width / logoImage!.size.height) * logoHeight : logoHeight

        // Calculate total width of text + spacing + logo
        let spacing: CGFloat = 16 // 2/3 size (was 24)
        let totalContentWidth = textSize.width + spacing + logoWidth

        // Center the content horizontally
        let startX = origin.x + (width - totalContentWidth) / 2
        let centerY = origin.y + (height - max(textSize.height, logoHeight)) / 2

        // Draw text
        let textRect = CGRect(x: startX, y: centerY, width: textSize.width, height: textSize.height)
        (text as NSString).draw(in: textRect, withAttributes: attributes)

        // Draw logo
        if let logo = logoImage {
            let logoRect = CGRect(x: startX + textSize.width + spacing, y: centerY + (textSize.height - logoHeight) / 2, width: logoWidth, height: logoHeight)
            logo.draw(in: logoRect)
        }
    }

    // MARK: - Save & Share

    /// Save collage to camera roll
    func saveToPhotoLibrary() async -> Bool {
        guard let image = collageImage else {
            errorMessage = "No collage to save"
            return false
        }

        return await withCheckedContinuation { continuation in
            UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
            continuation.resume(returning: true)
        }
    }

    /// Get collage for sharing
    func getShareableCollage() -> UIImage? {
        return collageImage
    }

    func reset() {
        selectedLayout = .strip
        stripColor = .white
        backgroundImage = nil
        textColor = .black
        collageImage = nil
        isGenerating = false
        errorMessage = nil
    }
}

// MARK: - UIImage Crop Extension

extension UIImage {
    /// Draws the image scaled to fill the target rect using "aspect fill"
    /// Preserves original orientation (no rotation), with minimal cropping
    func drawTiled(in rect: CGRect) {
        let targetAspect = rect.width / rect.height
        let sourceAspect = size.width / size.height

        // Calculate draw rect to cover the entire target area with minimal crop
        var drawRect: CGRect
        if sourceAspect > targetAspect {
            // Source is wider - scale to fit height, crop sides
            let scaledWidth = rect.height * sourceAspect
            drawRect = CGRect(
                x: rect.origin.x - (scaledWidth - rect.width) / 2,
                y: rect.origin.y,
                width: scaledWidth,
                height: rect.height
            )
        } else {
            // Source is taller - scale to fit width, crop top/bottom
            let scaledHeight = rect.width / sourceAspect
            drawRect = CGRect(
                x: rect.origin.x,
                y: rect.origin.y - (scaledHeight - rect.height) / 2,
                width: rect.width,
                height: scaledHeight
            )
        }

        // Draw the image at the calculated rect (no rotation applied)
        draw(in: drawRect)
    }

    /// Draws the image into the target rect using "crop to fill" behavior
    /// Centers and scales the image to fill the rect, cropping excess (no distortion)
    func drawCroppedToFill(in rect: CGRect) {
        let targetAspect = rect.width / rect.height
        let sourceAspect = size.width / size.height

        // If aspect ratios match, draw directly
        guard abs(sourceAspect - targetAspect) > 0.001 else {
            draw(in: rect)
            return
        }

        // Calculate crop rect for center crop
        var cropRect: CGRect
        if sourceAspect > targetAspect {
            // Source is wider - crop left/right
            let newWidth = size.height * targetAspect
            cropRect = CGRect(
                x: (size.width - newWidth) / 2,
                y: 0,
                width: newWidth,
                height: size.height
            )
        } else {
            // Source is taller - crop top/bottom
            let newHeight = size.width / targetAspect
            cropRect = CGRect(
                x: 0,
                y: (size.height - newHeight) / 2,
                width: size.width,
                height: newHeight
            )
        }

        // Scale for retina
        let scaledRect = CGRect(
            x: cropRect.origin.x * scale,
            y: cropRect.origin.y * scale,
            width: cropRect.width * scale,
            height: cropRect.height * scale
        )

        guard let cropped = cgImage?.cropping(to: scaledRect) else {
            draw(in: rect)
            return
        }

        UIImage(cgImage: cropped, scale: scale, orientation: imageOrientation).draw(in: rect)
    }
}

// MARK: - Color Extension

extension UIColor {
    var hexString: String {
        var r: CGFloat = 0
        var g: CGFloat = 0
        var b: CGFloat = 0
        var a: CGFloat = 0

        getRed(&r, green: &g, blue: &b, alpha: &a)

        return String(format: "#%02X%02X%02X", Int(r * 255), Int(g * 255), Int(b * 255))
    }

    convenience init(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0
        Scanner(string: hexSanitized).scanHexInt64(&rgb)

        let r = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
        let g = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
        let b = CGFloat(rgb & 0x0000FF) / 255.0

        self.init(red: r, green: g, blue: b, alpha: 1.0)
    }
}
