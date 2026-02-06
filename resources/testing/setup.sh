#!/bin/bash
# Setup script for Gemini Flash testing

echo "========================================"
echo "GEMINI FLASH TESTING SETUP"
echo "========================================"

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required"
    exit 1
fi

echo "Python: $(python3 --version)"

# Install required packages
echo ""
echo "Installing required packages..."
pip3 install google-genai Pillow

# Load environment
echo ""
echo "Loading environment..."
source .env

# Verify setup
echo ""
echo "Configuration:"
echo "  Project: $GOOGLE_CLOUD_PROJECT"
echo "  Location: $GOOGLE_CLOUD_LOCATION"
echo "  Use Vertex AI: $GOOGLE_GENAI_USE_VERTEXAI"

# Check input images
echo ""
echo "Input images:"
ls -la input/

echo ""
echo "========================================"
echo "Setup complete!"
echo ""
echo "To run tests:"
echo "  source .env"
echo "  python3 test_gemini_flash.py              # Test all styles"
echo "  python3 test_gemini_flash.py -s japanese  # Test Japanese only"
echo "  python3 test_gemini_flash.py -s korean    # Test Korean only"
echo "  python3 test_gemini_flash.py -s newyork   # Test New York only"
echo "========================================"
