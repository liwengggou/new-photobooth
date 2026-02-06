#!/usr/bin/env python3
"""
Test all 3 enhanced photo booth styles with chained reference processing.
- Japanese Purikura v2
- Korean Photo Booth v2
- New York Vintage v2
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


# ============================================================================
# ENHANCED PROMPTS v2
# ============================================================================

JAPANESE_PURIKURA_V2 = """You are a FuRyu/Bandai Namco Purikura Machine. Output MUST be indistinguishable from real Japanese arcade Purikura.

## OUTPUT: Maximum resolution (1500+ pixels), single high-res image

## TRANSFORMATION SPECIFICATIONS (BE AGGRESSIVE):

### EYES - DRAMATIC ANIME/DOLLY (130-150% enlargement)
- Enlarge eyes by 130-150% (both axes) - DRAMATICALLY larger
- Add 5-8 prominent sparkle highlights (white + light blue stars)
- Widen irises to fill 70% of visible eye
- Darken limbal rings by 40%
- Increase iris saturation by 35-40%

### NAMIDABUKURO (TEAR BAGS) - CRITICAL
- Create PROMINENT puffy pink area below lower eyelid
- Color: #FFD5E5 to #FFECF0 gradient
- Add bright highlight on TOP of tear bag
- Opacity: 60-80% (clearly visible, not subtle)

### SKIN - ABSOLUTE PORCELAIN
- 100% smoothing - ZERO visible texture/pores
- Ceramic/mochi finish
- Reduce yellow by 30%, increase pink by 25%
- Brighten by 20%

### CHEEK BLUSH - IGARI STYLE
- Color: #FFB7B2 (coral-pink)
- Placement: HIGH on cheekbones, directly under eyes
- Opacity: 50-70% (clearly visible)
- Soft gradient edges

### FACE STRUCTURE - AGGRESSIVE KOGAO
- Reduce head width by 12-18%
- Sharp V-line jaw tapering
- Shorten chin by 15-20%

### HAIR
- Silky smooth, add 3-5 gloss highlights
- PRESERVE original color exactly

### BACKGROUND: Pure white #FFFFFF

### LIGHTING: Bright Purikura flash, high-key, even

## NEVER MODIFY (Protected):
- Mouth shape, openness, teeth visibility
- Expression emotion
- Pose and hand gestures
- Eyebrow angles (±3° only)
- Spacing between people

## VERIFY BEFORE OUTPUT:
- Eyes DRAMATICALLY larger than input (obvious difference)
- Tear bags and blush CLEARLY VISIBLE
- Face NOTICEABLY narrower
- Skin is PERFECTLY SMOOTH
- Expression/pose UNCHANGED"""


JAPANESE_PURIKURA_V2_CHAINED = """You are a FuRyu Purikura Machine. This is Photo {photo_num} of a 4-photo session.

{reference_note}

## MATCH THESE EXACTLY FROM REFERENCE:
- Eye enlargement scale and sparkle style
- Skin smoothing intensity
- Blush color, opacity, placement
- Face slimming percentage
- V-line aggressiveness
- Lighting intensity

## APPLY TO TARGET PHOTO:
### EYES: 130-150% enlarged, 5-8 sparkles, prominent tear bags (#FFD5E5)
### SKIN: 100% smooth porcelain, no texture
### BLUSH: Igari-style #FFB7B2, 50-70% opacity under eyes
### FACE: 12-18% narrower, sharp V-line, 15-20% shorter chin
### BACKGROUND: Pure white #FFFFFF

## PRESERVE FROM TARGET: Mouth, expression, pose, gestures (exactly)

## IMAGE ORDER:
{image_order}

Output ONE high-resolution Purikura image matching reference style exactly."""


KOREAN_PHOTOBOOTH_V2 = """You are a Korean "Life Four Cuts" (인생네컷) Photo Booth. Achieve flawless appearance through LIGHTING, not filters.

## OUTPUT: Maximum resolution (1500+ pixels), single high-res image

## CORE PRINCIPLE: Perfect lighting, NO digital beautification

## LIGHTING SETUP (5400K):
- Large soft key light slightly above eye level
- Fill light at 60-70% intensity
- Soft shadows, even illumination
- NO harsh shadows, NO hot spots

## SKIN - LIGHT-ACHIEVED EVENNESS (NOT FILTERED):
- Skin appears even due to LIGHTING, not retouching
- Pores REMAIN VISIBLE (natural texture preserved)
- NO smoothing filter, NO blur effect
- NO plastic/porcelain appearance
- Real skin character maintained

## COLOR & TONE:
- Full color, neutral white balance (5400K)
- Natural skin tones preserved
- Medium-low contrast
- NO color grading, NO filters

## BACKGROUND: Solid neutral gray (#A0A0A0 to #B8B8B8)

## NEVER MODIFY:
- Face shape (NO slimming, NO contouring)
- Facial features (NO size changes)
- Expression
- Pose
- Skin texture (pores must remain)

## VERIFY BEFORE OUTPUT:
- Skin looks natural with visible texture
- NO artificial smoothing applied
- Lighting is soft and flattering
- Face shape UNCHANGED
- Background is solid gray"""


KOREAN_PHOTOBOOTH_V2_CHAINED = """You are a Korean 인생네컷 Photo Booth. This is Photo {photo_num} of a 4-photo session.

{reference_note}

## MATCH THESE EXACTLY FROM REFERENCE:
- Lighting setup and intensity
- Color temperature (5400K)
- Background gray tone
- Contrast level
- Overall exposure

## APPLY TO TARGET PHOTO:
### LIGHTING: Soft diffused 5400K, even illumination
### SKIN: Natural appearance through lighting (NOT filtering), pores visible
### FACE: NO modification whatsoever
### BACKGROUND: Solid neutral gray (#A8A8A8)
### COLOR: Neutral, no grading

## PRESERVE FROM TARGET: Everything - face shape, expression, pose (exactly)

## IMAGE ORDER:
{image_order}

Output ONE high-resolution Korean photo booth image matching reference lighting exactly."""


NEWYORK_VINTAGE_V2 = """You are a 1970s-1980s New York analog photo booth. Create authentic vintage photo strip aesthetic.

## OUTPUT: Maximum resolution (1500+ pixels), BLACK AND WHITE only

## TONAL RANGE - FADED PRINT LOOK:
- Black point: #1A1A1A to #252525 (LIFTED - no pure black)
- White point: #E8E8E8 to #EBEBEB (DULLED - no pure white)
- Low to medium contrast (vintage compression)
- Rich midtone gradations

## FILM GRAIN - ESSENTIAL:
- Visible silver halide grain throughout
- Fine to medium (ISO 400-800 equivalent)
- Most visible in midtones
- Authentic organic pattern (not digital noise)

## FRONTAL FLASH CHARACTERISTICS:
- Central hot spot/glow on face
- Halation bleeding from bright areas
- Specular highlights on forehead, nose, cheeks
- Flash shadow visible on background behind subject

## VINTAGE QUALITY:
- Soft compared to modern digital (not razor sharp)
- Slight aged/faded print appearance
- Period-authentic optical quality

## BACKGROUND: Medium-dark gray (#505050 to #707070) with flash shadow

## NEVER MODIFY:
- Face shape or features
- Expression
- Pose
- Any beautification

## VERIFY BEFORE OUTPUT:
- Image is BLACK AND WHITE
- Blacks are FADED (not pure black)
- Film grain is VISIBLE
- Flash glow/halation present
- Vintage soft quality (not modern sharp)
- Expression/pose unchanged"""


NEWYORK_VINTAGE_V2_CHAINED = """You are a 1970s New York photo booth. This is Photo {photo_num} of a 4-photo session.

{reference_note}

## MATCH THESE EXACTLY FROM REFERENCE:
- Black point level (same fade)
- White point level (same dullness)
- Film grain intensity
- Flash intensity and halation
- Contrast level
- Background tone

## APPLY TO TARGET PHOTO:
### COLOR: BLACK AND WHITE only
### TONAL: Faded blacks (#252525), dulled whites (#EBEBEB)
### GRAIN: Visible film grain throughout
### FLASH: Frontal glow, halation, specular highlights
### QUALITY: Vintage soft (not modern sharp)
### BACKGROUND: Gray with flash shadow

## PRESERVE FROM TARGET: Face, expression, pose (exactly)

## IMAGE ORDER:
{image_order}

Output ONE high-resolution vintage B&W photo booth image matching reference style exactly."""


STYLE_PROMPTS = {
    "japanese": {
        "first": JAPANESE_PURIKURA_V2,
        "chained": JAPANESE_PURIKURA_V2_CHAINED,
        "name": "Japanese Purikura"
    },
    "korean": {
        "first": KOREAN_PHOTOBOOTH_V2,
        "chained": KOREAN_PHOTOBOOTH_V2_CHAINED,
        "name": "Korean Photo Booth"
    },
    "newyork": {
        "first": NEWYORK_VINTAGE_V2,
        "chained": NEWYORK_VINTAGE_V2_CHAINED,
        "name": "New York Vintage"
    }
}


def process_style_chained(style: str, input_images: list, output_dir: Path, client, timestamp: str):
    """Process all images for a single style using chained references."""

    prompts = STYLE_PROMPTS[style]
    style_name = prompts["name"]

    print(f"\n{'='*70}")
    print(f"Processing: {style_name} (Chained Reference)")
    print("=" * 70)

    # Load all input images
    pil_inputs = [Image.open(p) for p in input_images]

    generated_outputs = []
    output_paths = []

    for i in range(len(input_images)):
        photo_num = i + 1
        print(f"\n  Photo {photo_num}/{len(input_images)}: {input_images[i].name}")

        if i == 0:
            # First photo - establish style
            prompt = prompts["first"]
            contents = [pil_inputs[0], prompt]
            print(f"    Establishing master style...")
        else:
            # Subsequent photos - use chained references
            image_order_desc = []
            for ref_idx in range(len(generated_outputs)):
                image_order_desc.append(f"- Image {ref_idx + 1}: REFERENCE (processed Photo {ref_idx + 1})")
            image_order_desc.append(f"- Image {len(generated_outputs) + 1}: TARGET (Photo {photo_num})")

            if len(generated_outputs) == 1:
                ref_note = "Reference image provided shows the EXACT style to apply."
            else:
                ref_note = f"{len(generated_outputs)} reference images provided. Match their consistent style EXACTLY."

            prompt = prompts["chained"].format(
                photo_num=photo_num,
                reference_note=ref_note,
                image_order="\n".join(image_order_desc)
            )

            contents = generated_outputs + [pil_inputs[i], prompt]
            print(f"    Using {len(generated_outputs)} reference(s)...")

        try:
            response = client.models.generate_content(
                model="gemini-3-pro-image-preview",
                contents=contents,
                config=GenerateContentConfig(
                    response_modalities=[Modality.TEXT, Modality.IMAGE]
                ),
            )

            output_image = None
            for part in response.candidates[0].content.parts:
                if part.inline_data:
                    output_image = Image.open(BytesIO(part.inline_data.data))
                    break

            if output_image:
                output_path = output_dir / f"{style}_v2_{timestamp}_{photo_num}.png"
                output_image.save(output_path)
                print(f"    SUCCESS: {output_path.name} ({output_image.size[0]}x{output_image.size[1]})")
                generated_outputs.append(output_image)
                output_paths.append(output_path)
            else:
                print(f"    FAILED: No image returned")
                generated_outputs.append(pil_inputs[i])  # Fallback

        except Exception as e:
            print(f"    ERROR: {e}")
            generated_outputs.append(pil_inputs[i])  # Fallback

    return output_paths


def main():
    """Test all styles with enhanced prompts."""

    print("=" * 70)
    print("ENHANCED PHOTO BOOTH STYLES v2 - Chained Reference Test")
    print("Testing: Japanese Purikura, Korean, New York Vintage")
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

    input_images = sorted(input_dir.glob("*.jpg")) + sorted(input_dir.glob("*.JPG"))
    input_images = input_images[:4]

    if len(input_images) < 4:
        print(f"\nError: Need 4 images, found {len(input_images)}")
        return

    print(f"\nInput photos: {len(input_images)}")
    for i, p in enumerate(input_images, 1):
        print(f"  {i}. {p.name}")

    # Initialize client
    client = genai.Client()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Process each style
    results = {}

    for style in ["japanese", "korean", "newyork"]:
        style_outputs = process_style_chained(
            style, input_images, output_dir, client, timestamp
        )
        results[style] = style_outputs

    # Summary
    print(f"\n{'='*70}")
    print("COMPLETE SUMMARY")
    print("=" * 70)

    for style, outputs in results.items():
        style_name = STYLE_PROMPTS[style]["name"]
        print(f"\n{style_name}: {len(outputs)}/4 photos generated")
        for p in outputs:
            print(f"  - {p.name}")

    print(f"\nOutput directory: {output_dir}")


if __name__ == "__main__":
    main()
