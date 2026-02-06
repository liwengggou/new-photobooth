# Photobooth iOS App - Product Requirements Document

## Overview

A mobile photobooth app that lets users take 4 photos, apply AI-powered style filters via Gemini, and create customizable photo collages. Features a credit-based system with referral rewards.

---

## Tech Stack

- **Platform**: iOS (Swift/SwiftUI)
- **Backend**: Firebase
  - Authentication (Google, Apple, Email+Password)
  - Firestore (user data, credits, referrals)
  - Analytics
- **AI Processing**: Google Gemini API
- **Local**: Core Image for collage assembly

---

## User Flow

### 1. Authentication
- Sign up / Login via:
  - Google Account
  - Apple Account
  - Email + Password
- New users receive **3 free credits**

### 2. Home Screen
- Display remaining credits
- "Start Photobooth" button
- Access to gallery (past collages)
- Referral section
- Settings

### 3. Photo Session Setup
- Select interval between shots: **5 to 10 seconds** (slider or picker)
- Confirm and proceed

### 4. Photo Capture
- **Front camera** with live preview
- User positions phone and taps "Start"
- **Video recording begins** (raw camera feed, no audio)
- For each of 4 photos:
  - Countdown number displayed on screen
  - Flash effect on capture
  - Brief preview of captured photo
  - Option to **redo individual photo** before proceeding
- **Video recording stops** after 4th photo captured

### 5. Style Selection
- Choose from 3 styles:
  - **Korean**
  - **New York**
  - **Japanese**
- Send 4 photos + style prompt to Gemini
- Loading state while processing
- On failure: automatic retry
- **Credit deducted** only when 4 styled photos successfully returned

### 6. Collage Customization
- Receive 4 individually styled photos from Gemini
- User selects:
  - **Strip color**: Full color picker
  - **Layout**: 1×4 (vertical strip) or 2×2 (grid)
- Preview final collage
- Confirm to save

### 7. Save & Share
- Save collage to device (Camera Roll)
- Save behind-the-scenes video to device
- Share options:
  - Instagram
  - LINE
  - Snapchat
  - Camera Roll (direct save)

---

## Style Definitions

### Korean Style
- Soft, natural beauty aesthetic
- Clean white/light backgrounds
- Subtle skin smoothing
- Natural skin tones preserved
- Soft, even lighting
- Polaroid-like quality

### New York Style
- Classic black & white
- High contrast
- Film grain texture
- Vintage/retro photobooth aesthetic
- Slightly gritty, editorial feel

### Japanese Style (Purikura-inspired)
- Heavy skin beautification
- Enlarged eyes effect
- Doll-like skin smoothing
- Pastel pink/soft background
- Saturated, enhanced colors
- **No added accessories/stickers**

---

## Credit System

### Initial Credits
- New users: **3 free credits**

### Credit Usage
- **1 credit** = 1 complete photo session (4 styled photos returned successfully)
- Credit deducted only on successful Gemini response
- Failed/retried requests do not consume credits

### Referral Rewards (Cumulative)
| Total Referrals | Total Bonus Credits |
|-----------------|---------------------|
| 1 user          | 3 credits           |
| 2 users         | 8 credits           |
| 3 users         | 15 credits          |

*Example: If you refer 3 users, you get 15 credits total (not 3+8+15=26)*

### Credit Limits
- **Cap**: Unlimited - users can accumulate as many credits as they earn
- **Expiration**: Credits never expire

### Referral Mechanics
- Each user gets unique referral code/link
- New user must sign up using referral link
- Credits awarded to referrer after referee completes signup

---

## Technical Requirements

### Camera
- Front-facing camera only
- Live preview during capture
- Flash effect simulation on capture (screen flash)

### Video Recording
- Start: When user taps "Start" button
- Stop: After 4th photo captured
- Content: Raw camera feed only (no UI overlay)
- Audio: None
- Storage: Local device
- Format: MP4
- Resolution: **1080p**

### Gemini Integration
- Send: 4 original photos + style-specific prompt
- Receive: 4 individually styled photos
- Error handling: Automatic retry on failure
- **Retry limit: 3 attempts** before showing error to user
- Failed requests do not deduct credits

### Collage Assembly (Local)
- Input: 4 styled photos from Gemini
- User selections: color + layout
- Layouts:
  - 1×4: Vertical strip
  - 2×2: Grid
- Output: Single image file
- Processing: Core Image / local rendering

### Storage
- Collages: Local device only
- Videos: Local device only
- No cloud backup (future feature)

### Network
- Internet required for all functionality
- Offline mode: Not supported

---

## Firebase Data Structure

```
users/
  {userId}/
    email: string
    displayName: string
    credits: number
    referralCode: string
    referredBy: string | null
    referralCount: number
    createdAt: timestamp

sessions/
  {sessionId}/
    userId: string
    style: "korean" | "newyork" | "japanese"
    layout: "1x4" | "2x2"
    stripColor: string (hex)
    createdAt: timestamp
    status: "completed" | "failed"
```

---

## Screens

1. **Splash Screen** - App logo, loading
2. **Login/Signup Screen** - Auth options
3. **Home Screen** - Credits, start button, navigation
4. **Settings Screen** - Account, logout
5. **Referral Screen** - Code, share link, progress
6. **Interval Selection Screen** - 5-10 second picker
7. **Camera Screen** - Live preview, countdown, capture
8. **Photo Review Screen** - Review 4 photos, redo option
9. **Style Selection Screen** - 3 style options with previews
10. **Processing Screen** - Loading while Gemini processes
11. **Customization Screen** - Color picker, layout toggle
12. **Preview Screen** - Final collage preview
13. **Success Screen** - Save/share options

---

## Out of Scope (v1)

- Text/date stamps on collages
- Cloud backup of photos
- Social feed / public gallery
- In-app purchases (future monetization)
- Offline mode
- Additional styles beyond 3
- Accessory/sticker overlays

---

## Example Assets

Style examples located in `/examples/`:
- `korean-style.jpg`
- `new-york-style.jpg`
- `japanese-style.JPG`
