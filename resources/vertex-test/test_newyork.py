#!/usr/bin/env python3
"""
NEW YORK VINTAGE STYLE TEST
1970s-1980s Analog Photo Booth Aesthetic

Features:
- Black & White with faded tones (lifted blacks, dulled whites)
- Visible film grain (ISO 400-800 equivalent)
- Frontal flash with glow/halation effects
- Medium-dark gray background with flash shadow
- NO face modification or beautification
- NO post-processing - relies entirely on Gemini prompt
"""

import os
import time
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
# IMAGE PROCESSING FUNCTIONS
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

    return result


# ============================================================================
# NEW YORK STYLE CONFIGURATION
# ============================================================================

NEWYORK_STYLE = {
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
OUTPUT: High-res matching vintage B&W style."""
}


# ============================================================================
# PROCESSING
# ============================================================================

def process_newyork(input_images: list, output_dir: Path, client, timestamp: str):
    """Process all images with New York vintage style (prompt only, no post-processing)."""

    style = NEWYORK_STYLE
    print(f"\n{'='*70}")
    print(f"STYLE: {style['name']}")
    print("1970s-1980s Analog Photo Booth Aesthetic")
    print("NO post-processing - Gemini prompt only")
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
    max_retries = 3
    retry_delay = 30  # seconds

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

        # Retry loop for rate limiting
        output_image = None
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model="gemini-3-pro-image-preview",
                    contents=contents,
                    config=config,
                )

                for part in response.candidates[0].content.parts:
                    if part.inline_data:
                        output_image = Image.open(BytesIO(part.inline_data.data))
                        break

                if output_image:
                    break  # Success, exit retry loop

            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "503" in error_str or "RESOURCE_EXHAUSTED" in error_str or "UNAVAILABLE" in error_str:
                    if attempt < max_retries - 1:
                        print(f"    Rate limited, waiting {retry_delay}s... (attempt {attempt + 1}/{max_retries})")
                        time.sleep(retry_delay)
                        continue
                print(f"    ERROR: {e}")
                break

        if not output_image:
            print("    FAILED: No image returned")
            continue

        print(f"    Gemini output: {output_image.width}x{output_image.height}")

        # NO post-processing - use Gemini output directly

        # Save master
        if i == 0:
            master_output = output_image

        # Upscale
        print(f"    Upscaling to {target_width}x{target_height}...")
        upscaled = enhanced_upscale(output_image, target_size=(target_width, target_height))

        # Save
        output_path = output_dir / f"newyork_{timestamp}_{photo_num}.png"
        upscaled.save(output_path, "PNG")
        print(f"    SAVED: {output_path.name} ({upscaled.width}x{upscaled.height})")
        output_paths.append(output_path)

        # Small delay between photos to avoid rate limiting
        if i < len(input_images) - 1:
            print("    Waiting 5s before next photo...")
            time.sleep(5)

    return output_paths


def main():
    print("=" * 70)
    print("NEW YORK VINTAGE STYLE TEST")
    print("1970s-1980s Analog Photo Booth")
    print("=" * 70)

    # Environment
    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    if not project:
        print("\nError: GOOGLE_CLOUD_PROJECT not set")
        print("Run: export GOOGLE_CLOUD_PROJECT=your-project-id")
        return

    print(f"\nProject: {project}")
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
        print(f"Place 4 JPG images in: {input_dir}")
        return

    print(f"\nInput photos:")
    for i, p in enumerate(input_images, 1):
        img = Image.open(p)
        print(f"  {i}. {p.name} ({img.width}x{img.height})")

    # Process
    client = genai.Client()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    outputs = process_newyork(input_images, output_dir, client, timestamp)

    # Summary
    print(f"\n{'='*70}")
    print("SUMMARY")
    print("=" * 70)
    print(f"\nNew York Vintage: {len(outputs)}/4 photos processed")
    for p in outputs:
        print(f"  {p.name}")

    print(f"\nOutput directory: {output_dir}")


if __name__ == "__main__":
    main()
