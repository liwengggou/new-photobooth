#!/bin/bash
# Setup script for Vertex AI Gemini 3 Pro Image test

set -e

echo "========================================"
echo "Vertex AI Gemini 3 Pro Image Setup"
echo "========================================"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo ""
    echo "❌ gcloud CLI not found. Installing..."
    echo ""

    if command -v brew &> /dev/null; then
        echo "Installing via Homebrew..."
        brew install --cask google-cloud-sdk
    else
        echo "Please install Google Cloud SDK manually:"
        echo "  https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
fi

echo ""
echo "✅ gcloud CLI found: $(which gcloud)"
gcloud --version | head -1

# Check if logged in
echo ""
echo "Checking authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q "@"; then
    echo "Not logged in. Starting gcloud init..."
    gcloud init
fi

# Set up Application Default Credentials
echo ""
echo "Setting up Application Default Credentials..."
echo "This will open a browser for Google OAuth login."
echo ""
read -p "Press Enter to continue..."
gcloud auth application-default login

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo ""
    read -p "Enter your Google Cloud Project ID: " PROJECT_ID
    gcloud config set project "$PROJECT_ID"
fi

echo ""
echo "Using project: $PROJECT_ID"

# Enable APIs
echo ""
echo "Enabling required APIs..."
gcloud services enable aiplatform.googleapis.com --project="$PROJECT_ID"
echo "✅ Vertex AI API enabled"

# Install Python dependencies
echo ""
echo "Installing Python dependencies..."
pip install --upgrade google-genai Pillow

# Create .env file for convenience
cat > .env << EOF
export GOOGLE_CLOUD_PROJECT=$PROJECT_ID
export GOOGLE_CLOUD_LOCATION=global
export GOOGLE_GENAI_USE_VERTEXAI=True
EOF

echo ""
echo "========================================"
echo "✅ Setup complete!"
echo "========================================"
echo ""
echo "To run the test:"
echo ""
echo "  cd vertex-test"
echo "  source .env"
echo "  python test_gemini_image.py"
echo ""
echo "Or in one command:"
echo "  source .env && python test_gemini_image.py"
echo ""
