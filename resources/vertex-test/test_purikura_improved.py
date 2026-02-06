#!/usr/bin/env python3
"""
IMPROVED Purikura Processing - Multiple Enhancement Strategies

Improvements over chained+v2:
1. ImageConfig for higher resolution output
2. SystemInstruction for persistent style guidance
3. Seed for reproducibility across session
4. Style extraction and explicit parameter locking
5. Two-pass processing option
6. Post-processing upscaling
"""

import os
from pathlib import Path
from io import BytesIO
from datetime import datetime
import hashlib

try:
    from google import genai
    from google.genai.types import GenerateContentConfig, Modality, ImageConfig
    from PIL import Image, ImageEnhance, ImageFilter
except ImportError as e:
    print("Missing required packages. Install them with:")
    print("  pip install google-genai Pillow")
    raise e


# ============================================================================
# SYSTEM INSTRUCTION - Persistent Style Guide
# ============================================================================

SYSTEM_INSTRUCTION = """You are a professional FuRyu/Bandai Namco Purikura photo booth machine.

CORE IDENTITY:
- You produce authentic Japanese arcade Purikura photos
- Your outputs are indistinguishable from real Purikura machines like "girls mignon", "SOON", "winc"
- You prioritize consistency across multi-photo sessions

STYLE PARAMETERS (LOCKED FOR SESSION):
- Eye enlargement: 135% both axes
- Iris fill: 70% of visible eye
- Sparkle count: 6-8 highlights per eye
- Tear bag opacity: 70%
- Skin smoothing: 100% (zero texture)
- Blush opacity: 60%
- Face width reduction: 15%
- Chin shortening: 18%
- Background: Pure white #FFFFFF

IMMUTABLE RULES:
- NEVER modify mouth shape, openness, or teeth visibility
- NEVER change facial expression emotion
- NEVER alter pose or hand gestures
- NEVER shift eyebrow angles beyond ±3°
- ALWAYS output maximum resolution available
- ALWAYS maintain exact style consistency across session images"""


# ============================================================================
# ENHANCED PROMPTS
# ============================================================================

PROMPT_FIRST_PASS = """Apply FuRyu Purikura transformation. This is Photo {photo_num}, the MASTER STYLE image.

EXECUTE THESE TRANSFORMATIONS:

1. EYES (DRAMATIC):
   - Enlarge 135% both axes
   - Add 6-8 sparkle stars (white + cyan gradient)
   - Fill iris to 70% of eye area
   - Create prominent pink tear bags (#FFD5E5, 70% opacity)

2. SKIN (PORCELAIN):
   - 100% smoothing, zero texture
   - Cool undertone shift (+25% pink, -30% yellow)
   - Brightness +20%

3. BLUSH (IGARI):
   - Color #FFB7B2, 60% opacity
   - Position: high cheekbones, under eyes
   - Soft gradient edges

4. FACE (KOGAO):
   - Width reduction: 15%
   - V-line jaw tapering: aggressive
   - Chin shortening: 18%

5. BACKGROUND: Pure white #FFFFFF

6. OUTPUT: MAXIMUM RESOLUTION, sharp details

PRESERVE EXACTLY: Mouth, expression, pose, gestures, eyebrows."""


PROMPT_SUBSEQUENT = """Apply IDENTICAL Purikura transformation to this TARGET photo.

SESSION INFO: Photo {photo_num} of 4. Reference images show the EXACT style.

CRITICAL: Match reference images PRECISELY:
- Same eye enlargement (135%)
- Same sparkle style and count
- Same tear bag intensity
- Same skin smoothness
- Same blush color/opacity/position
- Same face slimming percentage
- Same lighting and brightness

The ONLY differences from references should be:
- Expression (from TARGET)
- Pose (from TARGET)
- Mouth state (from TARGET)

IMAGE ORDER:
{image_order}

OUTPUT: High resolution image matching reference style exactly."""


PROMPT_ENHANCEMENT_PASS = """Enhance this Purikura photo for maximum quality.

ENHANCE (do not re-transform):
- Sharpen details (especially eyes and hair)
- Boost sparkle highlight visibility
- Ensure tear bags are prominent
- Verify blush is clearly visible
- Confirm skin is perfectly smooth
- Check V-line jaw definition

PRESERVE COMPLETELY:
- All existing transformations
- Expression and pose
- Overall style and color

OUTPUT: Maximum resolution, publication-quality image."""


# ============================================================================
# PROCESSING FUNCTIONS
# ============================================================================

def get_session_seed(input_paths: list) -> int:
    """Generate consistent seed from input files for session reproducibility."""
    combined = "".join([str(p) for p in input_paths])
    # Keep within INT32 range (max 2147483647)
    return int(hashlib.md5(combined.encode()).hexdigest()[:7], 16) % 2147483647


def upscale_image(img: Image.Image, scale: float = 1.5) -> Image.Image:
    """Simple upscaling with sharpening."""
    new_size = (int(img.width * scale), int(img.height * scale))
    upscaled = img.resize(new_size, Image.Resampling.LANCZOS)

    # Apply subtle sharpening
    enhancer = ImageEnhance.Sharpness(upscaled)
    sharpened = enhancer.enhance(1.2)

    return sharpened


def enhance_purikura_effects(img: Image.Image) -> Image.Image:
    """Post-processing to enhance Purikura characteristics."""
    # Boost saturation slightly
    sat_enhancer = ImageEnhance.Color(img)
    img = sat_enhancer.enhance(1.1)

    # Boost contrast slightly
    contrast_enhancer = ImageEnhance.Contrast(img)
    img = contrast_enhancer.enhance(1.05)

    # Boost brightness slightly
    bright_enhancer = ImageEnhance.Brightness(img)
    img = bright_enhancer.enhance(1.03)

    return img


def process_with_improvements(
    input_images: list,
    output_dir: Path,
    client,
    timestamp: str,
    use_system_instruction: bool = True,
    use_seed: bool = True,
    use_two_pass: bool = False,
    use_post_processing: bool = True,
    use_image_config: bool = True
):
    """Process images with all improvements enabled."""

    print(f"\n{'='*70}")
    print("IMPROVED PURIKURA PROCESSING")
    print(f"System Instruction: {'ON' if use_system_instruction else 'OFF'}")
    print(f"Seed (reproducibility): {'ON' if use_seed else 'OFF'}")
    print(f"Two-Pass Enhancement: {'ON' if use_two_pass else 'OFF'}")
    print(f"Post-Processing: {'ON' if use_post_processing else 'OFF'}")
    print(f"ImageConfig (quality): {'ON' if use_image_config else 'OFF'}")
    print("=" * 70)

    # Load input images
    pil_inputs = [Image.open(p) for p in input_images]

    # Generate session seed for reproducibility
    session_seed = get_session_seed(input_images) if use_seed else None
    if session_seed:
        print(f"\nSession seed: {session_seed}")

    # Build config
    config_params = {
        "response_modalities": [Modality.TEXT, Modality.IMAGE]
    }

    if use_system_instruction:
        config_params["systemInstruction"] = SYSTEM_INSTRUCTION

    if use_seed:
        config_params["seed"] = session_seed

    if use_image_config:
        # Request highest quality output
        config_params["imageConfig"] = ImageConfig(
            outputMimeType="image/png",
            outputCompressionQuality=100
        )

    config = GenerateContentConfig(**config_params)

    generated_outputs = []
    output_paths = []

    for i in range(len(input_images)):
        photo_num = i + 1
        print(f"\n  Processing Photo {photo_num}/{len(input_images)}: {input_images[i].name}")

        # === FIRST PASS: Main transformation ===
        if i == 0:
            prompt = PROMPT_FIRST_PASS.format(photo_num=photo_num)
            contents = [pil_inputs[0], prompt]
            print(f"    Pass 1: Establishing master style...")
        else:
            image_order = []
            for ref_idx in range(len(generated_outputs)):
                image_order.append(f"- Image {ref_idx + 1}: REFERENCE (Photo {ref_idx + 1} output)")
            image_order.append(f"- Image {len(generated_outputs) + 1}: TARGET (Photo {photo_num} input)")

            prompt = PROMPT_SUBSEQUENT.format(
                photo_num=photo_num,
                image_order="\n".join(image_order)
            )
            contents = generated_outputs + [pil_inputs[i], prompt]
            print(f"    Pass 1: Matching style from {len(generated_outputs)} reference(s)...")

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
                print(f"    FAILED: No image returned in pass 1")
                generated_outputs.append(pil_inputs[i])
                continue

            print(f"    Pass 1 output: {output_image.size[0]}x{output_image.size[1]}")

            # === SECOND PASS: Enhancement (optional) ===
            if use_two_pass:
                print(f"    Pass 2: Enhancement...")

                enhance_response = client.models.generate_content(
                    model="gemini-3-pro-image-preview",
                    contents=[output_image, PROMPT_ENHANCEMENT_PASS],
                    config=config,
                )

                for part in enhance_response.candidates[0].content.parts:
                    if part.inline_data:
                        output_image = Image.open(BytesIO(part.inline_data.data))
                        print(f"    Pass 2 output: {output_image.size[0]}x{output_image.size[1]}")
                        break

            # === POST-PROCESSING (optional) ===
            if use_post_processing:
                print(f"    Post-processing...")

                # Upscale if needed
                if output_image.width < 1500:
                    scale = 1500 / output_image.width
                    output_image = upscale_image(output_image, scale)
                    print(f"    Upscaled to: {output_image.size[0]}x{output_image.size[1]}")

                # Enhance Purikura effects
                output_image = enhance_purikura_effects(output_image)

            # Save output
            output_path = output_dir / f"improved_{timestamp}_{photo_num}.png"
            output_image.save(output_path, "PNG", quality=100)
            print(f"    SAVED: {output_path.name} ({output_image.size[0]}x{output_image.size[1]})")

            generated_outputs.append(output_image)
            output_paths.append(output_path)

        except Exception as e:
            print(f"    ERROR: {e}")
            import traceback
            traceback.print_exc()
            generated_outputs.append(pil_inputs[i])

    return output_paths


def main():
    """Run improved processing with various configurations."""

    print("=" * 70)
    print("PURIKURA QUALITY IMPROVEMENT TEST")
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

    # Get input images
    input_images = sorted(input_dir.glob("*.jpg")) + sorted(input_dir.glob("*.JPG"))
    input_images = input_images[:4]

    if len(input_images) < 4:
        print(f"\nError: Need 4 images, found {len(input_images)}")
        return

    print(f"\nInput photos: {len(input_images)}")
    for i, p in enumerate(input_images, 1):
        img = Image.open(p)
        print(f"  {i}. {p.name} ({img.size[0]}x{img.size[1]})")

    # Initialize client
    client = genai.Client()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Run with all improvements
    print("\n" + "=" * 70)
    print("CONFIGURATION: All Improvements Enabled")
    print("=" * 70)

    outputs = process_with_improvements(
        input_images=input_images,
        output_dir=output_dir,
        client=client,
        timestamp=timestamp,
        use_system_instruction=True,
        use_seed=True,
        use_two_pass=False,  # Can enable for extra quality (doubles API calls)
        use_post_processing=True,
        use_image_config=True
    )

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
            print(f"  {p.name}: {img.size[0]}x{img.size[1]}")

    print(f"\nOutput directory: {output_dir}")


if __name__ == "__main__":
    main()
