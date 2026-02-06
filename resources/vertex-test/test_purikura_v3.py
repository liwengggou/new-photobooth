#!/usr/bin/env python3
"""
PURIKURA v3 - Single Reference + Enhanced Upscaling

Key improvements:
1. Single reference (Output 1 only) - prevents style drift
2. Enhanced multi-pass upscaling (no ML dependencies)
3. Optimized prompts
"""

import os
from pathlib import Path
from io import BytesIO
from datetime import datetime

try:
    from google import genai
    from google.genai.types import GenerateContentConfig, Modality, ImageConfig
    from PIL import Image, ImageEnhance, ImageFilter
except ImportError as e:
    print("Missing required packages. Install them with:")
    print("  pip install google-genai Pillow")
    raise e


# ============================================================================
# ENHANCED UPSCALING (No ML dependencies)
# ============================================================================

def enhanced_upscale(img: Image.Image, target_size: tuple = None, scale: float = 2.0) -> Image.Image:
    """
    Multi-pass enhanced upscaling for better quality than simple resize.
    Combines multiple techniques for sharper, cleaner results.
    """
    if target_size:
        new_width, new_height = target_size
    else:
        new_width = int(img.width * scale)
        new_height = int(img.height * scale)

    # Step 1: Initial high-quality upscale
    upscaled = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

    # Step 2: Slight blur to reduce upscaling artifacts
    smoothed = upscaled.filter(ImageFilter.GaussianBlur(radius=0.3))

    # Step 3: Unsharp mask for edge enhancement
    # Create sharpened version
    sharpened = smoothed.filter(ImageFilter.UnsharpMask(radius=1.5, percent=80, threshold=2))

    # Step 4: Blend original upscale with sharpened (keeps detail without over-sharpening)
    result = Image.blend(upscaled, sharpened, alpha=0.7)

    # Step 5: Subtle contrast and color enhancement
    enhancer = ImageEnhance.Contrast(result)
    result = enhancer.enhance(1.02)

    enhancer = ImageEnhance.Color(result)
    result = enhancer.enhance(1.03)

    return result


def purikura_enhance(img: Image.Image) -> Image.Image:
    """Apply Purikura-specific enhancements after upscaling."""
    # Boost saturation for vivid colors
    enhancer = ImageEnhance.Color(img)
    img = enhancer.enhance(1.08)

    # Slight brightness boost for that "lit" look
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(1.02)

    # Subtle sharpness for crisp details
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(1.1)

    return img


# ============================================================================
# PROMPTS - Optimized for single reference approach
# ============================================================================

SYSTEM_INSTRUCTION = """You are a professional FuRyu Purikura machine producing authentic Japanese arcade photos.

LOCKED STYLE PARAMETERS:
- Eye enlargement: 135% both axes
- Sparkles: 6-8 star highlights per eye
- Tear bags: 70% opacity pink (#FFD5E5)
- Skin: 100% smooth porcelain
- Blush: 60% opacity Igari style (#FFB7B2)
- Face width: -15%
- Chin: -18%
- Background: Pure white #FFFFFF

NEVER MODIFY: Mouth, expression, pose, gestures, eyebrow angles."""


PROMPT_MASTER = """Apply FuRyu Purikura transformation to create the MASTER STYLE photo.

TRANSFORMATIONS:
1. EYES: Enlarge 135%, add 6-8 sparkle stars, prominent pink tear bags (70% opacity)
2. SKIN: 100% porcelain smooth, cool undertones, +20% brightness
3. BLUSH: Igari style #FFB7B2, 60% opacity, under eyes
4. FACE: Width -15%, V-line jaw, chin -18%
5. BACKGROUND: Pure white #FFFFFF
6. HAIR: Silky gloss highlights

PRESERVE: Mouth shape, expression, pose, gestures exactly.
OUTPUT: Maximum resolution, sharp details."""


PROMPT_MATCH_MASTER = """Apply IDENTICAL Purikura style to this TARGET photo.

REFERENCE IMAGE: Shows the EXACT style to replicate.
TARGET IMAGE: Apply the same transformations.

MATCH FROM REFERENCE EXACTLY:
- Eye enlargement scale and sparkle style
- Tear bag color and intensity
- Skin smoothness and tone
- Blush color, opacity, position
- Face slimming percentage
- Background (pure white)
- Lighting and brightness

COPY FROM TARGET ONLY:
- Expression
- Pose
- Mouth state

IMAGE ORDER:
- Image 1: REFERENCE (master style)
- Image 2: TARGET (to transform)

OUTPUT: High resolution image matching reference style perfectly."""


# ============================================================================
# PROCESSING
# ============================================================================

def process_single_reference(input_images: list, output_dir: Path, client, timestamp: str):
    """
    Process with single reference approach.
    Only Output 1 is used as reference for all subsequent images.
    """
    print(f"\n{'='*70}")
    print("PURIKURA v3 - Single Reference + Enhanced Upscaling")
    print("=" * 70)
    print("Strategy: Use ONLY master (Photo 1) as reference for all others")
    print("Upscaling: Enhanced multi-pass PIL (2x target)")

    # Load inputs
    pil_inputs = [Image.open(p) for p in input_images]
    print(f"\nInput resolution: {pil_inputs[0].width}x{pil_inputs[0].height}")

    # Target output size (2x the Gemini output for quality)
    target_width = 2400
    target_height = int(target_width * pil_inputs[0].height / pil_inputs[0].width)
    print(f"Target output: {target_width}x{target_height}")

    # Config
    config = GenerateContentConfig(
        systemInstruction=SYSTEM_INSTRUCTION,
        response_modalities=[Modality.TEXT, Modality.IMAGE],
        imageConfig=ImageConfig(
            outputMimeType="image/png",
            outputCompressionQuality=100
        )
    )

    master_output = None
    output_paths = []

    for i in range(len(input_images)):
        photo_num = i + 1
        print(f"\n  Photo {photo_num}/{len(input_images)}: {input_images[i].name}")

        if i == 0:
            # First photo - establish master style
            prompt = PROMPT_MASTER
            contents = [pil_inputs[0], prompt]
            print("    Creating MASTER style...")
        else:
            # All subsequent photos use ONLY the master as reference
            prompt = PROMPT_MATCH_MASTER
            contents = [master_output, pil_inputs[i], prompt]
            print("    Matching to MASTER style (single reference)...")

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

            # Save master for reference
            if i == 0:
                master_output = output_image

            # Enhanced upscaling
            print(f"    Upscaling to {target_width}x{target_height}...")
            upscaled = enhanced_upscale(output_image, target_size=(target_width, target_height))

            # Purikura-specific enhancement
            enhanced = purikura_enhance(upscaled)

            # Save
            output_path = output_dir / f"purikura_v3_{timestamp}_{photo_num}.png"
            enhanced.save(output_path, "PNG")
            print(f"    SAVED: {output_path.name} ({enhanced.width}x{enhanced.height})")
            output_paths.append(output_path)

        except Exception as e:
            print(f"    ERROR: {e}")
            import traceback
            traceback.print_exc()

    return output_paths


def main():
    print("=" * 70)
    print("PURIKURA v3 TEST")
    print("Single Reference + Enhanced Upscaling")
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

    # Process
    client = genai.Client()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    outputs = process_single_reference(input_images, output_dir, client, timestamp)

    # Summary
    print(f"\n{'='*70}")
    print("SUMMARY")
    print("=" * 70)
    print(f"Input: {len(input_images)} photos")
    print(f"Output: {len(outputs)} photos")

    if outputs:
        print("\nOutput files:")
        for p in outputs:
            img = Image.open(p)
            print(f"  {p.name}: {img.width}x{img.height}")

    print(f"\nOutput directory: {output_dir}")


if __name__ == "__main__":
    main()
