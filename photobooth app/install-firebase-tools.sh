#!/bin/bash

# Firebase Development Tools Installation Script
# This script installs Homebrew, Node.js, and Firebase CLI

set -e  # Exit on error

echo "🚀 Starting installation of development tools..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Homebrew is installed
if command -v brew &> /dev/null; then
    echo -e "${GREEN}✓ Homebrew is already installed${NC}"
else
    echo -e "${BLUE}📦 Installing Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Add Homebrew to PATH
    echo -e "${BLUE}🔧 Adding Homebrew to PATH...${NC}"
    if [[ $(uname -m) == 'arm64' ]]; then
        # Apple Silicon
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        # Intel Mac
        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/usr/local/bin/brew shellenv)"
    fi
    echo -e "${GREEN}✓ Homebrew installed successfully${NC}"
fi

echo ""

# Check if Node.js is installed
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js is already installed (${NODE_VERSION})${NC}"
else
    echo -e "${BLUE}📦 Installing Node.js...${NC}"
    brew install node
    echo -e "${GREEN}✓ Node.js installed successfully${NC}"
fi

echo ""

# Check if npm is working
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm is available (version ${NPM_VERSION})${NC}"
else
    echo -e "${RED}✗ npm not found - something went wrong${NC}"
    exit 1
fi

echo ""

# Install Firebase CLI globally
echo -e "${BLUE}📦 Installing Firebase CLI...${NC}"
npm install -g firebase-tools

echo ""

# Verify Firebase CLI installation
if command -v firebase &> /dev/null; then
    FIREBASE_VERSION=$(firebase --version)
    echo -e "${GREEN}✓ Firebase CLI installed successfully (${FIREBASE_VERSION})${NC}"
else
    echo -e "${RED}✗ Firebase CLI installation failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 All tools installed successfully!${NC}"
echo ""
echo "Installed tools:"
echo "  • Homebrew: $(brew --version | head -1)"
echo "  • Node.js: $(node --version)"
echo "  • npm: $(npm --version)"
echo "  • Firebase CLI: $(firebase --version)"
echo ""
echo "Next steps:"
echo "  1. Restart your terminal or run: source ~/.zprofile"
echo "  2. Run: firebase login"
echo "  3. Let Claude know you're ready to continue!"
echo ""
