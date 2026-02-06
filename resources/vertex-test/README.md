# Vertex AI Gemini 3 Pro Image Test

Test script for image style transformation using Google Vertex AI with Application Default Credentials (ADC).

## Setup Instructions

### 1. Install Google Cloud SDK (gcloud CLI)

```bash
# macOS with Homebrew
brew install --cask google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

### 2. Initialize gcloud and Login

```bash
# Initialize gcloud (follow prompts to select project)
gcloud init

# Login to set up Application Default Credentials
gcloud auth application-default login
```

This opens a browser for Google OAuth. After login, ADC credentials are stored locally.

### 3. Enable Required APIs

```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Enable Generative AI API
gcloud services enable generativelanguage.googleapis.com
```

### 4. Install Python Dependencies

```bash
pip install google-genai Pillow
```

**Note:** Requires `google-genai` version 1.51.0 or later for Gemini 3 features.

### 5. Set Environment Variables

```bash
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_LOCATION=global
export GOOGLE_GENAI_USE_VERTEXAI=True
```

### 6. Run the Test

```bash
cd vertex-test
python test_gemini_image.py
```

## What This Tests

1. **Image Input**: Loads a photo from `/examples/` directory
2. **Style Transformation**: Sends to Gemini 3 Pro Image with style prompts
3. **Image Output**: Saves styled images to `/vertex-test/output/`

## Styles Tested

- **Korean**: Soft, natural beauty, light background, subtle smoothing
- **New York**: Black & white, high contrast, film grain, vintage feel
- **Japanese**: Purikura-inspired, skin beautification, enhanced colors

## Model Details

- **Model ID**: `gemini-3-pro-image-preview`
- **Max Input Tokens**: 65,536
- **Max Output Tokens**: 32,768
- **Max Images per Prompt**: 14
- **Supported Formats**: PNG, JPEG, WebP, HEIC, HEIF

## Troubleshooting

### "Could not automatically determine credentials"
Run: `gcloud auth application-default login`

### "Permission denied" or "API not enabled"
Run: `gcloud services enable aiplatform.googleapis.com`

### "Model not found"
Ensure you have access to Gemini 3 Pro Image preview. Check:
https://console.cloud.google.com/vertex-ai/publishers/google/model-garden/gemini-3-pro-image-preview

## References

- [Gemini 3 Pro Image Docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro-image)
- [Image Generation Guide](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/image-generation)
- [Google Gen AI SDK](https://googleapis.github.io/python-genai/)
