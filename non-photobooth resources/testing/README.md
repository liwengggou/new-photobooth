# Gemini 3 Flash Photo Booth Testing

Test folder for Gemini 3 Flash model with photo booth styles.

## Styles

1. **Japanese Purikura** - FuRyu/Bandai style with dramatic eye enlargement, porcelain skin, V-line face
2. **Korean Photo Booth** - Life Four Cuts (인생네컷) with natural beauty through perfect lighting
3. **New York Vintage** - 1970s-1980s analog photo booth with B&W, film grain, flash effects

## Setup

```bash
cd testing
chmod +x setup.sh
./setup.sh
```

## Usage

```bash
# Load environment
source .env

# Test all styles
python3 test_gemini_flash.py

# Test specific style
python3 test_gemini_flash.py -s japanese
python3 test_gemini_flash.py -s korean
python3 test_gemini_flash.py -s newyork

# Use different model
python3 test_gemini_flash.py -m gemini-3-flash

# Process fewer photos
python3 test_gemini_flash.py -p 2
```

## Folder Structure

```
testing/
├── input/           # Input photos (4 JPG images)
├── output/          # Generated output images
├── prompts/         # Style prompt files
│   ├── japanese_purikura_v2.md
│   ├── korean_photobooth_v2.md
│   └── newyork_photobooth_v2.md
├── test_gemini_flash.py  # Main test script
├── setup.sh         # Setup script
├── .env             # Environment variables
└── README.md        # This file
```

## Requirements

- Python 3.8+
- Google Cloud Project with Vertex AI enabled
- `google-genai` package
- `Pillow` package
