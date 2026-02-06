#!/usr/bin/env python3
"""
Gemini 3 Pro Preview - Chained Reference Purikura Processing
Each generated photo becomes a style reference for the next, ensuring perfect consistency.

Flow:
1. Process Photo 1 → Output 1
2. Process Photo 2 + Output 1 as reference → Output 2
3. Process Photo 3 + Outputs 1,2 as reference → Output 3
4. Process Photo 4 + Outputs 1,2,3 as reference → Output 4
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


# Base style specification - detailed and consistent
PURIKURA_STYLE_SPEC = """PURIKURA STYLE SPECIFICATION (FuRyu-Style):

EYES - Anime/Dolly Enhancement:
- Enlarge eyes by 120% (both vertical and horizontal)
- Add 3-5 sparkle highlights (white/light blue gradient)
- Widen irises to fill more of visible eye
- Darken limbal rings (outer iris border)
- Increase iris saturation by 30%
- Emphasize namidabukuro (tear bags) with pinkish shadowing (#FFD5E5)
- Round out eyes, soften corners for dolly effect

SKIN - Marshmallow/Mochi Texture:
- 100% smoothing - remove ALL pores, blemishes, texture
- Apply soft focus blur, ceramic/porcelain finish
- Shift to cooler undertones (reduce yellow, increase pink)
- Brighten overall by 15%
- Even out all skin tone variations

CHEEK BLUSH - Igari Style:
- Color: Soft pink (#FFB7B2)
- Placement: High on cheekbones, directly below eyes
- Style: Diffuse gradient edges, NO hard lines
- Opacity: 40-60%

FACE STRUCTURE - Kogao/Small Face:
- Aggressive V-line jawline tapering from ear to chin
- Shorten chin length by 10-15%
- Reduce head width by 8-12%
- Create sharp, defined jawline

HAIR Enhancement:
- Smooth silky texture, reduce flyaways
- Add natural gloss highlights on curves
- PRESERVE original hair color exactly
- DO NOT change hairstyle, length, or parting

BACKGROUND:
- Pure white (#FFFFFF)

LIGHTING:
- Professional Purikura booth flash aesthetic
- Strong, realistic studio flash look
- Moderate contrast (not flat, not dramatic)
- Crisp, defined highlights
- High brightness, vibrant colors

CRITICAL PRESERVATION (DO NOT CHANGE):
- Mouth shape, aperture (open/closed), expression
- Teeth visibility - if showing, keep showing
- Exact pose and hand gestures
- Eyebrow angles and shape
- Spacing between people
- Original identity features"""


PROMPT_FIRST_PHOTO = """You are a FuRyu-Style Purikura Engine. Apply the following Purikura transformation to this photo.

{style_spec}

This is Photo 1 of a 4-photo Purikura session. This output will set the MASTER STYLE for all subsequent photos.
Apply the transformation with HIGH QUALITY and establish the exact editing parameters that will be replicated.

Output ONE high-resolution Purikura-styled image."""


PROMPT_WITH_REFERENCE = """You are a FuRyu-Style Purikura Engine. Apply Purikura transformation to the TARGET photo.

{style_spec}

CRITICAL CONSISTENCY REQUIREMENT:
This is Photo {photo_num} of a 4-photo Purikura session.
I am providing {num_refs} REFERENCE IMAGE(S) - these are the ALREADY PROCESSED photos from this session.

You MUST match the EXACT SAME:
- Eye enlargement scale and sparkle style
- Skin smoothing intensity and tone
- Blush color, opacity, and placement
- Face slimming percentage
- Jawline sharpness
- Lighting intensity and color temperature
- Overall brightness and contrast
- Hair gloss intensity

The reference images define the style. Copy their editing parameters EXACTLY.
The only differences should be the pose/expression which come from the TARGET photo.

IMAGE ORDER:
{image_order}

Output ONE high-resolution Purikura-styled image of the TARGET photo, matching the reference style perfectly."""


def process_chained_photos():
    """Process photos with chained references for perfect consistency."""

    print("=" * 70)
    print("Gemini 3 Pro Preview - CHAINED Reference Purikura Processing")
    print("Each output becomes a style reference for the next photo")
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

    # Load all input images
    pil_inputs = []
    for p in input_images:
        img = Image.open(p)
        pil_inputs.append(img)
        print(f"  Loaded: {p.name} ({img.size[0]}x{img.size[1]})")

    # Initialize client
    client = genai.Client()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Store generated outputs for reference
    generated_outputs = []
    output_paths = []

    # Process each photo with chained references
    for i in range(4):
        photo_num = i + 1
        print(f"\n{'='*70}")
        print(f"Processing Photo {photo_num}/4: {input_images[i].name}")

        if generated_outputs:
            print(f"Using {len(generated_outputs)} reference image(s) for style consistency")
        else:
            print("First photo - establishing MASTER STYLE")
        print("=" * 70)

        # Build the prompt and contents
        if i == 0:
            # First photo - no references
            prompt = PROMPT_FIRST_PHOTO.format(style_spec=PURIKURA_STYLE_SPEC)
            contents = [pil_inputs[0], prompt]
        else:
            # Subsequent photos - include references
            image_order_desc = []
            for ref_idx in range(len(generated_outputs)):
                image_order_desc.append(f"- Image {ref_idx + 1}: REFERENCE (already processed Photo {ref_idx + 1})")
            image_order_desc.append(f"- Image {len(generated_outputs) + 1}: TARGET (Photo {photo_num} to process)")

            prompt = PROMPT_WITH_REFERENCE.format(
                style_spec=PURIKURA_STYLE_SPEC,
                photo_num=photo_num,
                num_refs=len(generated_outputs),
                image_order="\n".join(image_order_desc)
            )

            # Contents: [ref1, ref2, ..., target_photo, prompt]
            contents = generated_outputs + [pil_inputs[i], prompt]

        try:
            print(f"  Sending request with {len(contents) - 1} image(s)...")

            response = client.models.generate_content(
                model="gemini-3-pro-image-preview",
                contents=contents,
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
                output_path = output_dir / f"purikura_chained_{timestamp}_{photo_num}.png"
                output_image.save(output_path)
                print(f"  SUCCESS: {output_path.name} ({output_image.size[0]}x{output_image.size[1]})")

                # Add to references for next iteration
                generated_outputs.append(output_image)
                output_paths.append(output_path)

                if text_response:
                    # Show brief response
                    brief = text_response[:200].replace('\n', ' ')
                    print(f"  Model note: {brief}...")
            else:
                print(f"  FAILED: No image returned")
                if text_response:
                    print(f"  Response: {text_response[:500]}")
                # Still try to continue with remaining photos
                # Use input as placeholder (not ideal but allows continuation)
                generated_outputs.append(pil_inputs[i])

        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback
            traceback.print_exc()
            # Use input as fallback
            generated_outputs.append(pil_inputs[i])

    # Summary
    print(f"\n{'='*70}")
    print("CHAINED PROCESSING COMPLETE")
    print("=" * 70)
    print(f"Input photos: {len(pil_inputs)}")
    print(f"Output photos: {len(output_paths)}")

    if len(output_paths) == 4:
        print("\nSUCCESS: Generated 4 Purikura photos with chained consistency")
        print("\nConsistency chain:")
        print("  Photo 1 → established master style")
        print("  Photo 2 → matched to Photo 1")
        print("  Photo 3 → matched to Photos 1-2")
        print("  Photo 4 → matched to Photos 1-3")
    else:
        print(f"\nPARTIAL: {len(output_paths)}/4 photos generated")

    print(f"\nOutput directory: {output_dir}")

    # Create comparison grid
    if len(output_paths) == 4:
        print("\nCreating comparison grid...")
        try:
            create_comparison_grid(pil_inputs, [Image.open(p) for p in output_paths], output_dir, timestamp)
        except Exception as e:
            print(f"  Could not create grid: {e}")


def create_comparison_grid(inputs, outputs, output_dir, timestamp):
    """Create a side-by-side comparison grid of inputs vs outputs."""
    # Resize all to same size for grid
    target_size = (400, 267)  # 3:2 aspect ratio

    # Create 2x4 grid (top: inputs, bottom: outputs)
    grid_width = target_size[0] * 4
    grid_height = target_size[1] * 2 + 40  # Extra space for labels

    grid = Image.new('RGB', (grid_width, grid_height), 'white')

    for i, (inp, out) in enumerate(zip(inputs, outputs)):
        # Resize
        inp_resized = inp.resize(target_size, Image.Resampling.LANCZOS)
        out_resized = out.resize(target_size, Image.Resampling.LANCZOS)

        # Paste input (top row)
        grid.paste(inp_resized, (i * target_size[0], 0))
        # Paste output (bottom row, with gap for label)
        grid.paste(out_resized, (i * target_size[0], target_size[1] + 40))

    grid_path = output_dir / f"comparison_grid_{timestamp}.png"
    grid.save(grid_path)
    print(f"  Saved comparison grid: {grid_path.name}")


if __name__ == "__main__":
    process_chained_photos()
