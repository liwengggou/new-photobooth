#!/usr/bin/env python3
"""
Test Gemini 3 Pro Preview with 4-photo Purikura batch processing.
Tests consistency across multiple images in a single session.
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

# The detailed Purikura prompt from description.md
PURIKURA_PROMPT = """Act as a "FuRyu-Style Purikura Engine" with Selective Feature Warping.
Your objective is to apply Japanese Purikura stylization to the eyes, skin, and head shape, while strictly PRESERVING the mouth and expression geometry via masking. Make sure the photo quality is high enough to seem like a real Purikura photo.
This system operates in MULTI-IMAGE PHOTObooth MODE. The input consists of EXACTLY FOUR separate photos. Treat all four photos as being taken during the SAME Purikura booth session, moments apart, using the SAME preset. Each input photo MUST generate exactly one corresponding output photo (1:1 mapping). All four outputs must share IDENTICAL editing strength, stylistic parameters, scale of transformations, lighting, color treatment, and overall Purikura intensity so that they visually read as a cohesive matched set. Style parameters are SESSION-LEVEL and MUST NOT vary between images. Identity, expression, pose, and mouth geometry remain image-specific and must be preserved per image, but the editing style is globally locked across all four outputs. If any inconsistency in style strength or appearance is detected between outputs, ALL four images must be reprocessed to match perfectly.

[CRITICAL PROCESSING RULE - READ FIRST]
HIERARCHY OF OPERATIONS:
This transformation uses LAYERED MASKING with ABSOLUTE PRIORITY LEVELS.

Priority 1 (IMMUTABLE): Mouth, Expression, Pose, Eyebrow Angles
Priority 2 (TRANSFORM): Eyes, Skin, Face Shape
Priority 3 (ENHANCE): Hair, Lighting
If ANY conflict occurs between priorities → ALWAYS preserve higher priority.

[INPUT SPECIFICATIONS]
Subject: {Original User Image Set of 4 Photos Treated as One Session}
Background: Replace with Pure White (#FFFFFF)
Output Quality: Professional Purikura Photography Standard (High Resolution, Sharp Details)

Before processing any individual image, analyze ALL FOUR images together and derive a single shared global style profile, including eye enlargement scale, skin smoothing strength, blush opacity and placement logic, face slimming percentages, chin shortening percentage, lighting intensity, flash harshness, color temperature, brightness, contrast, and hair gloss intensity. Once determined, these parameters are LOCKED and must be applied identically to all four images. No per-image stylistic deviation is allowed. The perceived intensity of editing must match across the entire set.

[PROCESSING SEQUENCE - EXECUTE IN ORDER]

STEP 1: FEATURE DETECTION & PROTECTION MASK
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
- Body positions (standing/sitting/hand gestures)
- Hand poses (thumbs up/peace sign/etc.)
- Spacing between people (if multiple subjects)
- Head tilt angle

1d. EYEBROW GEOMETRY LOCK:
- Record eyebrow angles (degrees from horizontal)
- Record arch height and position
- ALLOWED: Minor darkness adjustments only
- FORBIDDEN: Angle changes, shape changes, position shifts

CREATE PROTECTION MASK: Generate immutable overlay covering:
- Entire mouth region (lips + 15% margin)
- Interior mouth (teeth, tongue, gums)
- Eyebrow structure (preserve angles)
- Pose-critical body parts (hands, arms, torso positions)

STEP 2: PURIKURA TRANSFORMATIONS (Apply OUTSIDE Protected Zones)

2A. EYES (Anime/Dolly Enhancement)
Target: Large, Sparkling, Dolly-Style Eyes
- Scale: Enlarge eyes by 120% (vertical and horizontal)
- Iris Enhancement:
  - Widen irises to fill more of the visible eye
  - Add 3-5 "sparkle" highlights (white/light blue gradient)
  - Darken limbal rings (outer iris border)
  - Increase iris saturation by 30%
- Shape Adjustment:
  - Round out eyes (increase vertical height by 15%)
  - Soften eye corners for dolly effect
- Namidabukuro (Tear Bags):
  - Heavily emphasize tear bags with pinkish shadowing (#FFD5E5)
  - Add subtle highlight on top of tear bag
- Repositioning:
  - Adjust eye position to harmonize with new face proportions
  - Maintain original eye spacing ratio
  - Ensure eyes remain symmetrical

2B. SKIN (Marshmallow/Mochi Texture)
Target: Flawless, Ceramic, Soft-Focus Finish
- Texture Elimination:
  - 100% smoothing (remove all pores, moles, blemishes, texture)
  - Apply "soft focus" blur effect
  - Create ceramic/porcelain finish
- Tone Adjustment:
  - Shift to cooler undertones (reduce yellow, increase pink)
  - Brighten overall by 15%
  - Even out all skin tone variations
- Cheek Blush (Igari Style):
  - Color: Soft pink (#FFB7B2)
  - Placement: High on cheekbones, below eyes
  - Style: Diffuse, gradient edges (no hard lines)
  - Opacity: 40-60%

2C. FACE STRUCTURE (Kogao/Small Face)
Target: V-Line Jawline, Compact Face Shape
CRITICAL CONSTRAINT: All warping MUST avoid the protected mouth mask.
- Jawline Reshaping:
  - Aggressive V-tapering from ear to chin
  - Create sharp, defined jawline
  - Taper AROUND the mouth region (do not compress mouth)
- Chin Adjustment:
  - Shorten chin length by 10-15%
  - Maintain natural chin point
- Overall Head Shape:
  - Reduce head width by 8-12% (thinner face)
  - Maintain natural proportions with enlarged eyes
- Mouth Position Adjustment:
  - ONLY adjust position/scale to match new face proportions
  - Maximum scale change: ±5%
  - PRESERVE all locked mouth characteristics (openness, shape, expression)

2D. HAIR (Silky, Glossy Enhancement)
- Texture: Smooth and silky (reduce flyaways)
- Highlights: Add natural gloss highlights (locate on hair curves)
- Colors: PRESERVE original tones and colors (no color changes)
- Style: DO NOT change hairstyle, length, or parting
- Enhancement Only: Refine existing style with better definition

2E. EYEBROWS (Minimal Refinement)
STRICT LIMITATION: Preserve original angles and shapes
- ALLOWED ONLY: Lighting/shadow refinement
- FORBIDDEN: Angle changes, Arch shape changes, Position shifts, Style transformation

STEP 3: LIGHTING & ATMOSPHERE
- Lighting Type: Commercial Beauty Studio Photography
- Flash Aesthetic: Strong, realistic flash photography look
- Shadows: Moderate contrast (not flat, not dramatic)
- Highlights: Crisp and defined (professional photo quality)
- Background: Pure white (#FFFFFF) with subtle gradient if needed for depth
- Overall Brightness: Well-lit, vibrant, professional Purikura booth quality
- Lighting, flash intensity, brightness, contrast, and color temperature MUST be identical across all four images

STEP 4: PRE-RENDER VERIFICATION PROTOCOL
MANDATORY CHECKPOINT - Execute before finalizing output:
Verify EACH item for EACH image independently. If ANY fails → ABORT and regenerate ALL FOUR images to restore full consistency:
- Mouth Aperture: Openness matches source (±2% tolerance)
- Teeth Visibility: Exactly matches source
- Lip Shape: Geometry preserved
- Expression Emotion: Matches source exactly
- Eyebrow Angles: Within ±5° of source
- Pose Preservation: All body positions/hand gestures unchanged
- Spacing (Multi-Person): Distance between subjects maintained
- Cross-Image Consistency: All four outputs share identical editing strength and style
- Overall Quality: High-resolution, sharp, professional Purikura standard

ABORT CONDITIONS:
If output shows ANY of these errors → This is a FAILED generation:
- Closed mouth when source is open
- Hidden teeth when source shows teeth
- Different emotional expression
- Compressed/altered mouth shape
- Changed eyebrow angles
- Altered hand poses or body positions
- One image appearing more or less edited than the others

STEP 5: FINAL COMPOSITE
- Merge all transformed layers
- Apply protected mask overlay (restore original mouth/expression with perfect blend)
- Final quality check against source
- Render all four images at high resolution as a visually unified Purikura session set

[NEGATIVE PROMPTS - ACTIVELY AVOID]
Realistic skin texture, small eyes, visible pores, dark circles, realistic lighting, closing an open mouth, hiding visible teeth, altering emotional expression, changing mouth size significantly, dull colors, natural/outdoor background, eyebrow angle changes, pose alterations, hand gesture changes, spacing changes between people, inconsistent editing strength between images, low resolution, blurry details, unnatural mouth positioning.

[POSITIVE REINFORCEMENT PROMPTS]
Large sparkling eyes, flawless smooth skin, soft pink blush, V-line jaw, high resolution, sharp details, professional Purikura quality, perfect expression matching, natural mouth position, preserved smile/expression, accurate teeth visibility, maintained pose, white background, vibrant colors, studio lighting, glossy hair, dolly aesthetic, cohesive multi-image photobooth consistency.

Please generate all 4 output images now, ensuring they form a cohesive Purikura photobooth session set."""


def test_purikura_batch():
    """Test Gemini 3 Pro Preview with 4-photo batch for Purikura consistency."""

    print("=" * 70)
    print("Gemini 3 Pro Preview - Purikura Batch Test (4 Photos)")
    print("Testing multi-image consistency with detailed Purikura prompt")
    print("=" * 70)

    # Check environment
    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "global")
    use_vertex = os.environ.get("GOOGLE_GENAI_USE_VERTEXAI")

    print(f"\nEnvironment:")
    print(f"  GOOGLE_CLOUD_PROJECT: {project or 'NOT SET'}")
    print(f"  GOOGLE_CLOUD_LOCATION: {location}")
    print(f"  GOOGLE_GENAI_USE_VERTEXAI: {use_vertex or 'NOT SET'}")

    if not project:
        print("\nError: GOOGLE_CLOUD_PROJECT not set")
        return

    if not use_vertex:
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"

    # Find input images
    script_dir = Path(__file__).parent
    input_dir = script_dir / "input"

    # Get all 4 photos sorted
    input_images = sorted(input_dir.glob("*.jpg")) + sorted(input_dir.glob("*.JPG"))

    if len(input_images) < 4:
        print(f"\nError: Need 4 images in {input_dir}, found {len(input_images)}")
        return

    # Use first 4 images
    input_images = input_images[:4]

    print(f"\nInput images ({len(input_images)} photos):")
    for i, img_path in enumerate(input_images, 1):
        print(f"  {i}. {img_path.name}")

    # Load all images
    print("\nLoading images...")
    pil_images = []
    for img_path in input_images:
        img = Image.open(img_path)
        print(f"  Loaded: {img_path.name} ({img.size[0]}x{img.size[1]})")
        pil_images.append(img)

    # Initialize client
    print("\nInitializing Gemini client...")
    client = genai.Client()

    # Build content with all 4 images + prompt
    print("\nSending batch request to Gemini 3 Pro Preview...")
    print(f"  Model: gemini-3-pro-image-preview")
    print(f"  Prompt length: {len(PURIKURA_PROMPT)} characters")

    # Create contents list: [image1, image2, image3, image4, prompt]
    contents = pil_images + [PURIKURA_PROMPT]

    try:
        response = client.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=contents,
            config=GenerateContentConfig(
                response_modalities=[Modality.TEXT, Modality.IMAGE]
            ),
        )

        # Process response
        print("\nProcessing response...")

        text_parts = []
        image_parts = []

        for part in response.candidates[0].content.parts:
            if part.text:
                text_parts.append(part.text)
            elif part.inline_data:
                img = Image.open(BytesIO(part.inline_data.data))
                image_parts.append(img)

        print(f"\nResponse received:")
        print(f"  Text parts: {len(text_parts)}")
        print(f"  Image parts: {len(image_parts)}")

        if text_parts:
            print(f"\nModel response text:")
            for text in text_parts:
                print(f"  {text[:500]}{'...' if len(text) > 500 else ''}")

        # Save output images
        if image_parts:
            output_dir = script_dir / "output"
            output_dir.mkdir(exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

            print(f"\nSaving {len(image_parts)} output images:")
            for i, img in enumerate(image_parts, 1):
                output_path = output_dir / f"purikura_{timestamp}_{i}.png"
                img.save(output_path)
                print(f"  Saved: {output_path.name} ({img.size[0]}x{img.size[1]})")

            print(f"\n{'='*70}")
            print("TEST RESULTS")
            print("="*70)
            print(f"Input images: {len(pil_images)}")
            print(f"Output images: {len(image_parts)}")

            if len(image_parts) == 4:
                print("\nSUCCESS: Received 4 output images (1:1 mapping)")
                print("Please visually inspect the outputs for:")
                print("  - Consistent editing strength across all 4 images")
                print("  - Preserved expressions and mouth geometry")
                print("  - Matching Purikura styling (eyes, skin, face shape)")
                print("  - White background")
                print("  - Professional quality")
            else:
                print(f"\nWARNING: Expected 4 images, got {len(image_parts)}")
                print("The model may not support 1:1 multi-image output.")

            print(f"\nOutput directory: {output_dir}")
        else:
            print("\nERROR: No images received in response")
            print("The model may have refused to generate images.")

    except Exception as e:
        print(f"\nError during API call: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_purikura_batch()
