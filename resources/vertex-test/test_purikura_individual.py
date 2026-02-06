#!/usr/bin/env python3
"""
Test Gemini 3 Pro Preview - Individual photo processing with consistency anchoring.
Processes 4 photos individually but maintains style consistency using reference images.
"""

import os
from pathlib import Path
from io import BytesIO
from datetime import datetime

try:
    from google import genai
    from google.genai.types import GenerateContentConfig, Modality
    from PIL import Image
except ImportError as e:
    print("Missing required packages. Install them with:")
    print("  pip install google-genai Pillow")
    raise e

# Simplified but still detailed Purikura prompt for individual processing
PURIKURA_STYLE_PROMPT = """Apply Japanese FuRyu-Style Purikura transformation to THIS photo (Photo #{photo_num} of 4).

STYLE SPECIFICATIONS (apply IDENTICALLY to all 4 photos in this session):

EYES - Anime/Dolly Enhancement:
- Enlarge eyes by 120% (both axes)
- Add 3-5 sparkle highlights (white/light blue)
- Widen irises, darken limbal rings
- Emphasize namidabukuro (tear bags) with pinkish tone (#FFD5E5)

SKIN - Marshmallow/Mochi Texture:
- 100% smoothing (porcelain finish)
- Shift to cooler undertones (reduce yellow, increase pink)
- Brighten by 15%
- Add Igari-style cheek blush (soft pink #FFB7B2, 40-60% opacity)

FACE STRUCTURE - Kogao/Small Face:
- V-line jawline tapering
- Shorten chin 10-15%
- Reduce head width 8-12%

HAIR:
- Smooth silky texture, add gloss highlights
- PRESERVE original color and style

BACKGROUND:
- Pure white (#FFFFFF)

CRITICAL - PRESERVE EXACTLY:
- Mouth shape, openness, and expression
- Teeth visibility (if showing)
- Pose and hand gestures
- Eyebrow angles

LIGHTING:
- Professional Purikura booth flash aesthetic
- High brightness, crisp highlights
- Studio quality

Output a single high-resolution Purikura-styled image of THIS photo only."""


def process_individual_photos():
    """Process each photo individually with Purikura style."""

    print("=" * 70)
    print("Gemini 3 Pro Preview - Individual Purikura Processing")
    print("Processing 4 photos separately with consistent style")
    print("=" * 70)

    # Environment setup
    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    if not project:
        print("\nError: GOOGLE_CLOUD_PROJECT not set")
        return

    os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")

    # Find input images
    script_dir = Path(__file__).parent
    input_dir = script_dir / "input"
    output_dir = script_dir / "output"
    output_dir.mkdir(exist_ok=True)

    # Get all images sorted
    input_images = sorted(input_dir.glob("*.jpg")) + sorted(input_dir.glob("*.JPG"))
    input_images = input_images[:4]

    if len(input_images) < 4:
        print(f"\nError: Need 4 images, found {len(input_images)}")
        return

    print(f"\nInput photos: {len(input_images)}")
    for i, p in enumerate(input_images, 1):
        print(f"  {i}. {p.name}")

    # Load all images
    pil_images = []
    for p in input_images:
        img = Image.open(p)
        pil_images.append(img)
        print(f"  Loaded: {p.name} ({img.size[0]}x{img.size[1]})")

    # Initialize client
    client = genai.Client()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    results = []

    # Process each photo
    for i, (img_path, pil_img) in enumerate(zip(input_images, pil_images), 1):
        print(f"\n{'='*70}")
        print(f"Processing Photo {i}/4: {img_path.name}")
        print("=" * 70)

        prompt = PURIKURA_STYLE_PROMPT.format(photo_num=i)

        try:
            response = client.models.generate_content(
                model="gemini-3-pro-image-preview",
                contents=[pil_img, prompt],
                config=GenerateContentConfig(
                    response_modalities=[Modality.TEXT, Modality.IMAGE]
                ),
            )

            # Extract output image
            output_image = None
            text_response = None

            for part in response.candidates[0].content.parts:
                if part.text:
                    text_response = part.text
                elif part.inline_data:
                    output_image = Image.open(BytesIO(part.inline_data.data))

            if output_image:
                output_path = output_dir / f"purikura_individual_{timestamp}_{i}.png"
                output_image.save(output_path)
                print(f"  SUCCESS: Saved {output_path.name} ({output_image.size[0]}x{output_image.size[1]})")
                results.append(output_path)
            else:
                print(f"  FAILED: No image returned")
                if text_response:
                    print(f"  Response: {text_response[:300]}...")

        except Exception as e:
            print(f"  ERROR: {e}")

    # Summary
    print(f"\n{'='*70}")
    print("SUMMARY")
    print("=" * 70)
    print(f"Input photos: {len(pil_images)}")
    print(f"Output photos: {len(results)}")

    if len(results) == 4:
        print("\nSUCCESS: Generated 4 individual Purikura photos")
    else:
        print(f"\nPARTIAL: {len(results)}/4 photos generated")

    print(f"\nOutput directory: {output_dir}")


if __name__ == "__main__":
    process_individual_photos()
