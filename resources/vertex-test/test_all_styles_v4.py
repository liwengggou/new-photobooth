#!/usr/bin/env python3
"""
ALL STYLES v4 - Japanese, Korean, New York
Single Reference + Enhanced Upscaling + Background Enforcement

Features:
- Japanese: Pure white background #FFFFFF
- Korean: Neutral gray background #A8A8A8
- New York: Faded B&W with medium-dark gray background
"""

import os
from pathlib import Path
from io import BytesIO
from datetime import datetime

try:
    from google import genai
    from google.genai.types import GenerateContentConfig, Modality
    from PIL import Image, ImageEnhance, ImageFilter
except ImportError as e:
    print("Missing required packages. Install them with:")
    print("  pip install google-genai Pillow")
    raise e


# ============================================================================
# BACKGROUND PROCESSING
# ============================================================================

def ensure_background_color(img: Image.Image, target_color: tuple, threshold: int = 235, edge_aware: bool = False) -> Image.Image:
    """
    Ensure background matches target color.
    For light backgrounds (white/gray), brightens near-target pixels.

    Args:
        edge_aware: If True, only replace edge pixels (safer for preserving clothing/text)
    """
    if img.mode != 'RGB':
        img = img.convert('RGB')

    pixels = img.load()
    width, height = img.size

    if edge_aware:
        # Only process edge regions (top, sides, bottom)
        edge_margin = int(height * 0.15)  # Top/bottom 15%
        side_margin = int(width * 0.15)   # Left/right 15%

        for y in range(height):
            for x in range(width):
                # Check if pixel is in edge region
                is_edge = (y < edge_margin or y > height - edge_margin or
                          x < side_margin or x > width - side_margin)

                if is_edge:
                    r, g, b = pixels[x, y]
                    if r > threshold and g > threshold and b > threshold:
                        pixels[x, y] = target_color
    else:
        # Original behavior - replace all light pixels
        for y in range(height):
            for x in range(width):
                r, g, b = pixels[x, y]
                if r > threshold and g > threshold and b > threshold:
                    pixels[x, y] = target_color

    return img


def convert_to_faded_bw(img: Image.Image) -> Image.Image:
    """
    Convert to faded black & white for New York vintage style.
    Blacks lifted to #252525, whites dulled to #EBEBEB.
    """
    # Convert to grayscale
    bw = img.convert('L')

    # Fade the tones - lift blacks, dull whites
    pixels = bw.load()
    width, height = bw.size

    for y in range(height):
        for x in range(width):
            value = pixels[x, y]
            # Map 0-255 to 37-235 (faded range)
            # 0 (black) -> 37 (#252525)
            # 255 (white) -> 235 (#EBEBEB)
            faded = int(37 + (value / 255.0) * (235 - 37))
            pixels[x, y] = faded

    # Convert back to RGB
    return bw.convert('RGB')


def add_film_grain(img: Image.Image, intensity: float = 0.02) -> Image.Image:
    """Add film grain texture for vintage look."""
    import random

    pixels = img.load()
    width, height = img.size

    for y in range(height):
        for x in range(width):
            # Add random grain
            grain = int((random.random() - 0.5) * 255 * intensity * 2)
            r, g, b = pixels[x, y]

            # Apply grain to all channels equally (for B&W)
            new_val = max(0, min(255, r + grain))
            pixels[x, y] = (new_val, new_val, new_val)

    return img


# ============================================================================
# UPSCALING
# ============================================================================

def enhanced_upscale(img: Image.Image, target_size: tuple = None, scale: float = 2.0) -> Image.Image:
    """Multi-pass enhanced upscaling."""
    if target_size:
        new_width, new_height = target_size
    else:
        new_width = int(img.width * scale)
        new_height = int(img.height * scale)

    upscaled = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    smoothed = upscaled.filter(ImageFilter.GaussianBlur(radius=0.3))
    sharpened = smoothed.filter(ImageFilter.UnsharpMask(radius=1.5, percent=80, threshold=2))
    result = Image.blend(upscaled, sharpened, alpha=0.7)

    enhancer = ImageEnhance.Contrast(result)
    result = enhancer.enhance(1.02)

    enhancer = ImageEnhance.Color(result)
    result = enhancer.enhance(1.03)

    return result


# ============================================================================
# STYLE-SPECIFIC PROMPTS
# ============================================================================

STYLES = {
    "japanese": {
        "name": "Japanese Purikura",
        "background_color": (255, 255, 255),  # White
        "skip_background_enforcement": True,  # Rely only on Gemini prompt
        "skip_color_boost": True,  # No post-processing color enhancement
        "system_instruction": """You are a FuRyu-Style Purikura Engine with Selective Feature Warping.

Your objective is to apply Japanese Purikura stylization to the eyes, skin, and head shape, while strictly PRESERVING the mouth and expression geometry via masking. Make sure the photo quality is high enough to seem like a real Purikura photo.

[CRITICAL PROCESSING RULE]
HIERARCHY OF OPERATIONS (LAYERED MASKING with ABSOLUTE PRIORITY):
- Priority 1 (IMMUTABLE): Mouth, Expression, Pose, Eyebrow Angles
- Priority 2 (TRANSFORM): Eyes, Skin, Face Shape
- Priority 3 (ENHANCE): Hair, Lighting

If ANY conflict occurs between priorities → ALWAYS preserve higher priority.""",

        "prompt_master": """Act as a FuRyu-Style Purikura Engine with Selective Feature Warping.

[INPUT]
Subject: Original User Image
Background: Replace with Pure White (#FFFFFF)
Output Quality: Professional Purikura Photography Standard (High Resolution, Sharp Details)

[STEP 1: FEATURE DETECTION & PROTECTION MASK]
Before ANY transformation, analyze and lock:

1a. MOUTH STATE DETECTION:
- Measure mouth aperture (open/closed)
- Record teeth visibility (yes/no)
- Document lip shape (neutral/smile/frown/pucker/kiss)
- Measure mouth width in pixels
- Record corner positions (up/neutral/down)

1b. EXPRESSION LOCK:
- Emotion: [Detect: happy/neutral/playful/serious/etc.]
- Freeze this emotion state - DO NOT alter

1c. POSE & POSITION LOCK:
- Body positions, hand gestures, spacing between people, head tilt angle

1d. EYEBROW GEOMETRY LOCK:
- Record eyebrow angles, arch height and position
- ONLY ALLOWED: Minor darkness adjustments
- Strictly preserve angles, shapes, and positions

CREATE PROTECTION MASK: Immutable overlay covering entire mouth region (lips + 15% margin), interior mouth, eyebrow structure, pose-critical body parts.

[STEP 2: PURIKURA TRANSFORMATIONS (Apply OUTSIDE Protected Zones)]

2A. EYES (Anime/Dolly Enhancement):
- Scale: Enlarge eyes by 120% (vertical and horizontal)
- Iris: Widen irises, add natural highlights (white/light blue gradient), darken limbal rings, increase saturation by 30%
- Shape: Round out eyes (increase vertical height by 15%), soften corners for dolly effect
- Namidabukuro: Heavily emphasize tear bags with pinkish shadowing (#FFD5E5)
- Repositioning: Adjust to harmonize with new face proportions, maintain spacing ratio, ensure symmetry

2B. SKIN (Marshmallow/Mochi Texture):
- Texture: 100% smoothing (remove all pores, moles, blemishes), soft focus blur, ceramic/porcelain finish
- Tone: Shift to cooler undertones (reduce yellow, increase pink), brighten by 30%, even out variations
- Cheek Blush (Igari Style): Color #FFB7B2, high on cheekbones below eyes, diffuse gradient edges, 40-60% opacity

2C. FACE STRUCTURE (Kogao/Small Face):
CRITICAL: All warping MUST avoid the protected mouth mask.
- Jawline: Aggressive V-tapering from ear to chin, sharp defined jawline, taper AROUND mouth region
- Chin: Shorten length by 10-15%, maintain natural point
- Head Shape: Reduce width by 8-12% (thinner face)
- Mouth Position: ONLY adjust position/scale to match new proportions (max ±5%), PRESERVE all locked characteristics

2D. HAIR: Smooth silky texture, add natural gloss highlights, PRESERVE original colors and style

2E. EYEBROWS: ONLY lighting/shadow refinement. FORBIDDEN: angle/arch/position/style changes

[STEP 3: LIGHTING & ATMOSPHERE]
- Lighting: Commercial Beauty Studio Photography with strong realistic flash
- Shadows: Moderate contrast
- Highlights: Crisp and defined
- Background: Pure white (#FFFFFF)
- Quality: High resolution, slight optical softness typical of studio portraits

[STEP 4: VERIFICATION - ABORT if ANY fails]
☐ Mouth Aperture: Openness matches source (±2%)
☐ Teeth Visibility: Exactly matches source
☐ Lip Shape: Geometry preserved
☐ Expression Emotion: Matches exactly
☐ Eyebrow Angles: Within ±5° of source
☐ Pose Preservation: All body positions/gestures unchanged
☐ Quality: High-resolution, sharp, professional Purikura standard

[NEGATIVE PROMPTS - AVOID]
Realistic skin texture, small eyes, visible pores, dark circles, closing open mouth, hiding visible teeth, altering expression, changing mouth size, dull colors, natural background, eyebrow angle changes, pose alterations, low resolution, blurry details.

[POSITIVE PROMPTS - DESIRED]
Large sparkling eyes, flawless smooth skin, soft pink blush, V-line jaw, high resolution, sharp details, professional Purikura quality, perfect expression matching, preserved smile, accurate teeth visibility, white background, vibrant colors, studio lighting, glossy hair, dolly aesthetic.""",

        "prompt_match": """Match REFERENCE Purikura style to TARGET photo.

MATCH FROM REFERENCE:
- Eye enlargement style, tear bags, skin smoothing, blush placement, face shape transformation
- Pure white background (#FFFFFF)
- Lighting and color treatment

PRESERVE FROM TARGET (IMMUTABLE):
- Mouth state (open/closed, teeth visibility)
- Expression emotion exactly
- Pose, hand gestures, body positions
- Eyebrow angles (within ±5°)

Images: [REFERENCE master, TARGET input]
OUTPUT: High-resolution matching reference Purikura style with white background.""",

        "post_process": lambda img: img  # No extra processing
    },

    "korean": {
        "name": "Korean 인생네컷",
        "background_color": (168, 168, 168),  # Neutral gray
        "skip_background_enforcement": True,  # Disable post-processing, rely on Gemini
        "system_instruction": """You are a Korean Life Four Cuts (인생네컷) photo booth.

PHILOSOPHY: Natural beauty through LIGHTING, not filters.

LIGHTING: 5400K soft diffused, even illumination
SKIN: Natural with visible pores (NO smoothing)
FACE: NO modification whatsoever
BACKGROUND: Solid neutral gray #A8A8A8
CLOTHING: Preserve all details, text, and patterns

NEVER MODIFY: Face shape, features, expression, pose, clothing details.""",

        "prompt_master": """Apply Korean 인생네컷 style.

LIGHTING SETUP:
- Soft diffused key light (5400K)
- Fill light 60-70% intensity
- Even, flattering illumination

CRITICAL RULES:
- Skin: Natural appearance through LIGHTING only (pores visible)
- Face: NO reshaping, NO slimming, NO modifications
- Background: Replace with solid neutral gray #A8A8A8
- Clothing: PRESERVE all text, logos, patterns exactly
- NO filters, NO beauty effects

PRESERVE: Face, expression, pose, clothing details.
OUTPUT: Maximum resolution, clean professional quality.""",

        "prompt_match": """Match REFERENCE lighting to TARGET photo.

MATCH FROM REFERENCE:
- Lighting setup (5400K diffused)
- Neutral gray background #A8A8A8
- Natural skin appearance

PRESERVE FROM TARGET:
- Face exactly as is (no modifications)
- Expression, pose
- Clothing details and text

Images: [REFERENCE master, TARGET input]
OUTPUT: High-res with reference lighting, gray background.""",

        "post_process": lambda img: img  # Natural, no extra processing
    },

    "newyork": {
        "name": "New York Vintage",
        "background_color": (96, 96, 96),  # Medium-dark gray
        "system_instruction": """You are a 1970s-1980s New York analog photo booth.

AESTHETIC: Authentic vintage with beautiful imperfections.

COLOR: Black & white only (faded print look)
TONAL: Lifted blacks #252525, dulled whites #EBEBEB
GRAIN: Visible film grain throughout
FLASH: Frontal glow, halation, specular highlights
BACKGROUND: Medium-dark gray with flash shadow

NEVER MODIFY: Face, features, expression, pose.""",

        "prompt_master": """Apply 1970s New York photo booth style.

STYLE:
- BLACK AND WHITE only (grayscale)
- Faded print look (blacks: #252525, whites: #EBEBEB)
- Low-medium contrast, compressed tonal range
- Frontal flash with glow/halation
- Background: Medium-dark gray with flash shadow

GRAIN: Visible film grain (ISO 400-800 equivalent)

PRESERVE: Face, expression, pose exactly (no beautification).
OUTPUT: Maximum resolution, authentic vintage B&W.""",

        "prompt_match": """Match REFERENCE vintage style to TARGET photo.

MATCH FROM REFERENCE:
- Faded B&W tonal range
- Flash characteristics
- Background gray tone
- Vintage quality

PRESERVE FROM TARGET:
- Face, expression, pose

Images: [REFERENCE master, TARGET input]
OUTPUT: High-res matching vintage B&W style.""",

        "post_process": lambda img: add_film_grain(convert_to_faded_bw(img), 0.015)
    }
}


# ============================================================================
# PROCESSING
# ============================================================================

def process_style(style_key: str, input_images: list, output_dir: Path, client, timestamp: str):
    """Process all images for a single style with v4 improvements."""

    style = STYLES[style_key]
    print(f"\n{'='*70}")
    print(f"STYLE: {style['name']}")
    print("=" * 70)

    pil_inputs = [Image.open(p) for p in input_images]

    target_width = 2400
    target_height = int(target_width * pil_inputs[0].height / pil_inputs[0].width)
    print(f"Target output: {target_width}x{target_height}")

    config = GenerateContentConfig(
        systemInstruction=style["system_instruction"],
        response_modalities=[Modality.TEXT, Modality.IMAGE],
    )

    master_output = None
    output_paths = []

    for i in range(len(input_images)):
        photo_num = i + 1
        print(f"\n  Photo {photo_num}/{len(input_images)}: {input_images[i].name}")

        if i == 0:
            prompt = style["prompt_master"]
            contents = [pil_inputs[0], prompt]
            print("    Creating MASTER style...")
        else:
            prompt = style["prompt_match"]
            contents = [master_output, pil_inputs[i], prompt]
            print("    Matching to MASTER...")

        try:
            response = client.models.generate_content(
                model="gemini-3-pro-image-preview",
                contents=contents,
                config=config,
            )

            output_image = None
            for part in response.candidates[0].content.parts:
                if part.inline_data:
                    output_image = Image.open(BytesIO(part.inline_data.data))
                    break

            if not output_image:
                print("    FAILED: No image returned")
                continue

            print(f"    Gemini output: {output_image.width}x{output_image.height}")

            # Apply style-specific post-processing
            output_image = style["post_process"](output_image)

            # Enforce background color (before upscaling)
            if style_key != "newyork" and not style.get("skip_background_enforcement", False):
                print(f"    Enforcing background color...")
                threshold = style.get("background_threshold", 230)
                edge_aware = style.get("edge_aware", False)
                output_image = ensure_background_color(
                    output_image,
                    style["background_color"],
                    threshold=threshold,
                    edge_aware=edge_aware
                )
            elif style.get("skip_background_enforcement", False):
                print(f"    Skipping background enforcement (relying on Gemini prompt)...")

            # Save master
            if i == 0:
                master_output = output_image

            # Upscale
            print(f"    Upscaling to {target_width}x{target_height}...")
            upscaled = enhanced_upscale(output_image, target_size=(target_width, target_height))

            # Style-specific enhancements
            if style_key == "japanese" and not style.get("skip_color_boost", False):
                # Boost colors for Purikura
                enhancer = ImageEnhance.Color(upscaled)
                upscaled = enhancer.enhance(1.08)
                enhancer = ImageEnhance.Brightness(upscaled)
                upscaled = enhancer.enhance(1.02)

            # Final background check
            if style_key != "newyork" and not style.get("skip_background_enforcement", False):
                threshold = style.get("background_threshold", 230)
                edge_aware = style.get("edge_aware", False)
                upscaled = ensure_background_color(
                    upscaled,
                    style["background_color"],
                    threshold=threshold,
                    edge_aware=edge_aware
                )

            # Save
            output_path = output_dir / f"{style_key}_v4_{timestamp}_{photo_num}.png"
            upscaled.save(output_path, "PNG")
            print(f"    SAVED: {output_path.name} ({upscaled.width}x{upscaled.height})")
            output_paths.append(output_path)

        except Exception as e:
            print(f"    ERROR: {e}")
            import traceback
            traceback.print_exc()

    return output_paths


def main():
    print("=" * 70)
    print("ALL STYLES v4 TEST")
    print("Japanese Purikura | Korean 인생네컷 | New York Vintage")
    print("=" * 70)

    # Environment
    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    if not project:
        print("\nError: GOOGLE_CLOUD_PROJECT not set")
        return

    os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")

    # Paths
    script_dir = Path(__file__).parent
    input_dir = script_dir / "input"
    output_dir = script_dir / "output"
    output_dir.mkdir(exist_ok=True)

    # Get inputs
    input_images = sorted(input_dir.glob("*.jpg")) + sorted(input_dir.glob("*.JPG"))
    input_images = input_images[:4]

    if len(input_images) < 4:
        print(f"\nError: Need 4 images, found {len(input_images)}")
        return

    print(f"\nInput photos:")
    for i, p in enumerate(input_images, 1):
        img = Image.open(p)
        print(f"  {i}. {p.name} ({img.width}x{img.height})")

    # Process each style
    client = genai.Client()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    results = {}
    for style_key in ["japanese"]:  # Testing Japanese only
        outputs = process_style(style_key, input_images, output_dir, client, timestamp)
        results[style_key] = outputs

    # Summary
    print(f"\n{'='*70}")
    print("SUMMARY")
    print("=" * 70)

    for style_key, outputs in results.items():
        style_name = STYLES[style_key]["name"]
        print(f"\n{style_name}: {len(outputs)}/4 photos")
        for p in outputs:
            print(f"  {p.name}")

    print(f"\nOutput directory: {output_dir}")


if __name__ == "__main__":
    main()
