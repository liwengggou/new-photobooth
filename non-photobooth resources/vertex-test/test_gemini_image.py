#!/usr/bin/env python3
"""
Test script for Google Vertex AI Gemini 3 Pro Image
Uses Application Default Credentials (ADC) for authentication

This tests:
1. Image input (reading a photo)
2. Style transformation via Gemini 3 Pro Image
3. Image output (saving the styled photo)
"""

import os
from pathlib import Path
from io import BytesIO

# Check for required packages
try:
    from google import genai
    from google.genai.types import GenerateContentConfig, Modality
    from PIL import Image
except ImportError as e:
    print("Missing required packages. Install them with:")
    print("  pip install google-genai Pillow")
    raise e

# Style prompts for your photobooth app
STYLE_PROMPTS = {
    "korean": """Edit this photo to have a Korean photobooth style:
- Soft, natural beauty aesthetic
- Clean white/light background feel
- Subtle skin smoothing
- Natural skin tones preserved
- Soft, even lighting
- Polaroid-like quality
Keep the person's identity and features recognizable.""",

    "newyork": """Edit this photo to have a classic New York photobooth style:
- Convert to black & white
- High contrast
- Add subtle film grain texture
- Vintage/retro photobooth aesthetic
- Slightly gritty, editorial feel
Keep the person's identity and features recognizable.""",

    "japanese": """Edit this photo to have a Japanese Purikura-inspired style:
- Skin beautification and smoothing
- Slightly enlarged eyes effect
- Doll-like soft skin
- Pastel pink/soft background tones
- Saturated, enhanced colors
- Do NOT add stickers or accessories
Keep the person's identity and features recognizable."""
}


def test_gemini_image_editing(input_image_path: str, style: str, output_path: str):
    """
    Test Gemini 3 Pro Image for photo style transformation.

    Args:
        input_image_path: Path to input image
        style: One of 'korean', 'newyork', 'japanese'
        output_path: Path to save the output image
    """
    # Validate style
    if style not in STYLE_PROMPTS:
        raise ValueError(f"Style must be one of: {list(STYLE_PROMPTS.keys())}")

    # Initialize the client (uses ADC automatically)
    client = genai.Client()

    # Load the input image
    print(f"Loading image: {input_image_path}")
    input_image = Image.open(input_image_path)
    print(f"Image size: {input_image.size}, mode: {input_image.mode}")

    # Get the style prompt
    prompt = STYLE_PROMPTS[style]
    print(f"\nApplying '{style}' style...")
    print(f"Prompt: {prompt[:100]}...")

    # Call Gemini 3 Pro Image
    print("\nSending request to Gemini 3 Pro Image...")
    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=[input_image, prompt],
        config=GenerateContentConfig(
            response_modalities=[Modality.TEXT, Modality.IMAGE]
        ),
    )

    # Process the response
    print("\nProcessing response...")
    text_response = None
    output_image = None

    for part in response.candidates[0].content.parts:
        if part.text:
            text_response = part.text
            print(f"Text response: {text_response}")
        elif part.inline_data:
            output_image = Image.open(BytesIO(part.inline_data.data))
            print(f"Received image: {output_image.size}, mode: {output_image.mode}")

    if output_image:
        # Save the output image
        output_image.save(output_path)
        print(f"\n✅ Success! Styled image saved to: {output_path}")
        return True
    else:
        print("\n❌ Error: No image received in response")
        return False


def main():
    """Main test function."""
    print("=" * 60)
    print("Gemini 3 Pro Image - Vertex AI Test")
    print("Using Application Default Credentials (ADC)")
    print("=" * 60)

    # Check environment variables
    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "global")
    use_vertex = os.environ.get("GOOGLE_GENAI_USE_VERTEXAI")

    print(f"\nEnvironment:")
    print(f"  GOOGLE_CLOUD_PROJECT: {project or 'NOT SET ⚠️'}")
    print(f"  GOOGLE_CLOUD_LOCATION: {location}")
    print(f"  GOOGLE_GENAI_USE_VERTEXAI: {use_vertex or 'NOT SET ⚠️'}")

    if not project:
        print("\n❌ Error: GOOGLE_CLOUD_PROJECT environment variable not set")
        print("Run: export GOOGLE_CLOUD_PROJECT=your-project-id")
        return

    if not use_vertex:
        print("\n⚠️  Warning: GOOGLE_GENAI_USE_VERTEXAI not set, setting to True")
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"

    # Find test image
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    examples_dir = project_dir / "examples"

    # Look for example images
    test_images = list(examples_dir.glob("*.jpg")) + list(examples_dir.glob("*.JPG")) + list(examples_dir.glob("*.png"))

    if not test_images:
        print(f"\n❌ No test images found in {examples_dir}")
        print("Please add a test image (jpg/png) to the examples folder")
        return

    # Use the first available image
    input_image = test_images[0]
    print(f"\nUsing test image: {input_image}")

    # Create output directory
    output_dir = script_dir / "output"
    output_dir.mkdir(exist_ok=True)

    # Test each style
    for style in ["korean", "newyork", "japanese"]:
        output_path = output_dir / f"test_{style}_style.png"
        print(f"\n{'='*60}")
        print(f"Testing {style.upper()} style")
        print("=" * 60)

        try:
            success = test_gemini_image_editing(
                str(input_image),
                style,
                str(output_path)
            )
            if not success:
                print(f"Failed to generate {style} style")
        except Exception as e:
            print(f"Error testing {style} style: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "=" * 60)
    print("Test complete!")
    print(f"Check output images in: {output_dir}")
    print("=" * 60)


if __name__ == "__main__":
    main()
