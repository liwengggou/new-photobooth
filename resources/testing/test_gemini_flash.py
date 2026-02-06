#!/usr/bin/env python3
"""
GEMINI IMAGE GENERATION PHOTO BOOTH STYLE TEST
Tests all three photo booth styles using Gemini image generation models.

Styles:
- Japanese Purikura (FuRyu/Bandai style)
- Korean Photo Booth (Life Four Cuts / 인생네컷)
- New York Vintage (1970s-1980s analog)

Uses the prompts from the prompts/ folder and input images from input/ folder.

Available models for image generation:
- gemini-3-pro-image-preview: Pro tier, up to 4096px (default)
- gemini-2.5-flash-image: Flash tier, up to 1024px (faster/cheaper)

Note: gemini-3-flash-preview does NOT support image output.
"""

import os
import sys
import time
import argparse
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
    sys.exit(1)


# ============================================================================
# CONFIGURATION
# ============================================================================

# Gemini 3 Pro Image model (supports image generation, up to 4096px)
MODEL_NAME = "gemini-3-pro-image-preview"

# Alternative model: Gemini 2.5 Flash Image (faster/cheaper, up to 1024px)
FALLBACK_MODELS = [
    "gemini-2.5-flash-image",
]

# Rate limiting settings
MAX_RETRIES = 3
RETRY_DELAY = 30  # seconds
BETWEEN_PHOTO_DELAY = 5  # seconds

# Output settings
TARGET_WIDTH = 2400


# ============================================================================
# STYLE CONFIGURATIONS
# ============================================================================

def load_prompt(prompts_dir: Path, filename: str) -> str:
    """Load a prompt from the prompts directory."""
    prompt_path = prompts_dir / filename
    if prompt_path.exists():
        return prompt_path.read_text()
    return ""


def get_styles(prompts_dir: Path) -> dict:
    """Load all styles with their prompts."""

    japanese_prompt = load_prompt(prompts_dir, "japanese_purikura_v2.md")
    korean_prompt = load_prompt(prompts_dir, "korean_photobooth_v2.md")
    newyork_prompt = load_prompt(prompts_dir, "newyork_photobooth_v2.md")

    return {
        "japanese": {
            "name": "Japanese Purikura",
            "description": "FuRyu/Bandai style with dramatic eye enlargement, porcelain skin, V-line face",
            "prompt_file": "japanese_purikura_v2.md",
            "system_instruction": """You are a FuRyu/Bandai Purikura Machine Simulator.
Your output MUST be indistinguishable from real Purikura photos.

CRITICAL RULES:
- Eyes: Enlarge 130-150%, add 5-8 sparkle highlights, create tear bags
- Skin: 100% smooth porcelain, zero texture, pink Igari blush on cheeks
- Face: Aggressive V-line jaw, 15-20% shorter chin, 12-18% narrower
- Background: Pure white #FFFFFF
- NEVER modify: Mouth shape, expression, pose, gestures""",
            "prompt_master": japanese_prompt if japanese_prompt else """Transform into authentic Japanese Purikura style:
- DRAMATICALLY enlarged sparkling anime eyes (130%+) with prominent tear bags
- COMPLETELY smooth porcelain skin with visible pink Igari blush
- AGGRESSIVELY slimmed face with sharp V-line jaw and shortened chin
- PURE WHITE background with bright flash lighting
- PERFECTLY PRESERVED mouth, expression, pose, and gestures
- MAXIMUM resolution output with sharp details""",
        },

        "korean": {
            "name": "Korean Photo Booth",
            "description": "Life Four Cuts (인생네컷) style with natural beauty through perfect lighting",
            "prompt_file": "korean_photobooth_v2.md",
            "system_instruction": """You are a Korean Life Four Cuts (인생네컷) Photo Booth Simulator.
The Korean style prioritizes NATURAL beauty through perfect LIGHTING.

CRITICAL RULES:
- Lighting: Perfect studio lighting, soft diffused 5400K neutral
- Skin: Natural appearance through lighting, NOT filtering (pores visible)
- Face: ZERO modification - no reshaping, slimming, or beautification
- Background: Neutral gray, solid, seamless studio backdrop
- Expression: Exact pose and emotion unchanged
- NO beauty filters, NO smoothing, NO color grading""",
            "prompt_master": korean_prompt if korean_prompt else """Transform into authentic Korean Life Four Cuts (인생네컷) style:
- PERFECT STUDIO LIGHTING - soft, diffused, 5400K neutral
- NATURAL SKIN - even appearance through lighting, NOT filtering (pores visible)
- ZERO FACE MODIFICATION - no reshaping, slimming, or beautification
- NEUTRAL GRAY BACKGROUND - solid, seamless studio backdrop
- PRESERVED EXPRESSION - exact pose and emotion unchanged
- CLEAN PROFESSIONAL QUALITY - high resolution, natural sharpness
- NO FILTERS - no beauty apps, no smoothing, no color grading""",
        },

        "newyork": {
            "name": "New York Vintage",
            "description": "1970s-1980s analog photo booth with B&W, film grain, flash effects",
            "prompt_file": "newyork_photobooth_v2.md",
            "system_instruction": """You are a 1970s-1980s New York Analog Photo Booth Simulator.
Replicate the exact aesthetic of classic American photo booths.

CRITICAL RULES:
- Color: BLACK AND WHITE only (grayscale)
- Tones: Faded print look - lifted blacks #252525, dulled whites #EBEBEB
- Grain: Visible film grain throughout (ISO 400-800 equivalent)
- Flash: Frontal glow, halation, specular highlights
- Background: Medium-dark gray with flash shadow
- Face: NO modification or beautification""",
            "prompt_master": newyork_prompt if newyork_prompt else """Transform into authentic 1970s-1980s New York photo booth style:
- BLACK AND WHITE - grayscale only, no color
- FADED TONAL RANGE - lifted blacks (#252525), dulled whites (#EBEBEB)
- VISIBLE FILM GRAIN - authentic silver halide texture throughout
- DIRECT FLASH LOOK - frontal glow, halation, specular highlights
- VINTAGE SOFTNESS - not modern digital sharpness
- PRESERVED IDENTITY - no beautification or face modification
- AGED PRINT QUALITY - looks like a 40-year-old photograph
- SIMPLE BACKGROUND - plain backdrop with flash shadow""",
        }
    }


# ============================================================================
# IMAGE PROCESSING
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


def process_style(
    style_key: str,
    style_config: dict,
    input_images: list,
    output_dir: Path,
    client,
    timestamp: str,
    model_name: str
) -> list:
    """Process all images with a specific style."""

    print(f"\n{'='*70}")
    print(f"STYLE: {style_config['name']}")
    print(f"Description: {style_config['description']}")
    print(f"Model: {model_name}")
    print("=" * 70)

    pil_inputs = [Image.open(p) for p in input_images]

    target_height = int(TARGET_WIDTH * pil_inputs[0].height / pil_inputs[0].width)
    print(f"Target output: {TARGET_WIDTH}x{target_height}")

    config = GenerateContentConfig(
        system_instruction=style_config["system_instruction"],
        response_modalities=[Modality.TEXT, Modality.IMAGE],
    )

    master_output = None
    output_paths = []

    for i in range(len(input_images)):
        photo_num = i + 1
        print(f"\n  Photo {photo_num}/{len(input_images)}: {input_images[i].name}")

        if i == 0:
            prompt = style_config["prompt_master"]
            contents = [pil_inputs[0], prompt]
            print("    Creating MASTER style...")
        else:
            prompt = f"""Match the style from the REFERENCE image to the TARGET photo.

MATCH FROM REFERENCE:
- All visual style characteristics
- Color/tone treatment
- Background style
- Overall aesthetic

PRESERVE FROM TARGET:
- Face, expression, pose exactly

Images: [REFERENCE master, TARGET input]
OUTPUT: High-resolution image matching reference style."""
            contents = [master_output, pil_inputs[i], prompt]
            print("    Matching to MASTER...")

        output_image = None
        for attempt in range(MAX_RETRIES):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config,
                )

                for part in response.candidates[0].content.parts:
                    if part.inline_data:
                        output_image = Image.open(BytesIO(part.inline_data.data))
                        break

                if output_image:
                    break

            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "503" in error_str or "RESOURCE_EXHAUSTED" in error_str or "UNAVAILABLE" in error_str:
                    if attempt < MAX_RETRIES - 1:
                        print(f"    Rate limited, waiting {RETRY_DELAY}s... (attempt {attempt + 1}/{MAX_RETRIES})")
                        time.sleep(RETRY_DELAY)
                        continue
                print(f"    ERROR: {e}")
                break

        if not output_image:
            print("    FAILED: No image returned")
            continue

        print(f"    Gemini output: {output_image.width}x{output_image.height}")

        if i == 0:
            master_output = output_image

        print(f"    Upscaling to {TARGET_WIDTH}x{target_height}...")
        upscaled = enhanced_upscale(output_image, target_size=(TARGET_WIDTH, target_height))

        output_path = output_dir / f"{style_key}_{timestamp}_{photo_num}.png"
        upscaled.save(output_path, "PNG")
        print(f"    SAVED: {output_path.name} ({upscaled.width}x{upscaled.height})")
        output_paths.append(output_path)

        if i < len(input_images) - 1:
            print(f"    Waiting {BETWEEN_PHOTO_DELAY}s before next photo...")
            time.sleep(BETWEEN_PHOTO_DELAY)

    return output_paths


# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Test Gemini Flash model with photo booth styles"
    )
    parser.add_argument(
        "--style", "-s",
        choices=["japanese", "korean", "newyork", "all"],
        default="all",
        help="Style to test (default: all)"
    )
    parser.add_argument(
        "--model", "-m",
        default=MODEL_NAME,
        help=f"Gemini model name (default: {MODEL_NAME})"
    )
    parser.add_argument(
        "--photos", "-p",
        type=int,
        default=4,
        help="Number of photos to process (default: 4)"
    )
    args = parser.parse_args()

    print("=" * 70)
    print("GEMINI FLASH PHOTO BOOTH STYLE TEST")
    print("=" * 70)

    # Environment setup
    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    if not project:
        print("\nError: GOOGLE_CLOUD_PROJECT not set")
        print("Run: source .env")
        print("  or: export GOOGLE_CLOUD_PROJECT=your-project-id")
        return 1

    print(f"\nProject: {project}")
    print(f"Model: {args.model}")
    os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")

    # Paths
    script_dir = Path(__file__).parent
    input_dir = script_dir / "input"
    output_dir = script_dir / "output"
    prompts_dir = script_dir / "prompts"
    output_dir.mkdir(exist_ok=True)

    # Get input images
    input_images = sorted(input_dir.glob("*.jpg")) + sorted(input_dir.glob("*.JPG"))
    input_images = input_images[:args.photos]

    if len(input_images) < args.photos:
        print(f"\nError: Need {args.photos} images, found {len(input_images)}")
        print(f"Place JPG images in: {input_dir}")
        return 1

    print(f"\nInput photos:")
    for i, p in enumerate(input_images, 1):
        img = Image.open(p)
        print(f"  {i}. {p.name} ({img.width}x{img.height})")

    # Load styles
    styles = get_styles(prompts_dir)

    # Determine which styles to run
    if args.style == "all":
        styles_to_run = list(styles.keys())
    else:
        styles_to_run = [args.style]

    print(f"\nStyles to test: {', '.join(styles_to_run)}")

    # Process
    client = genai.Client()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    results = {}
    for style_key in styles_to_run:
        style_config = styles[style_key]
        outputs = process_style(
            style_key,
            style_config,
            input_images,
            output_dir,
            client,
            timestamp,
            args.model
        )
        results[style_key] = outputs

        # Delay between styles
        if style_key != styles_to_run[-1]:
            print(f"\nWaiting 10s before next style...")
            time.sleep(10)

    # Summary
    print(f"\n{'='*70}")
    print("SUMMARY")
    print("=" * 70)

    for style_key, outputs in results.items():
        style_name = styles[style_key]["name"]
        print(f"\n{style_name}: {len(outputs)}/{args.photos} photos processed")
        for p in outputs:
            print(f"  {p.name}")

    print(f"\nOutput directory: {output_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
