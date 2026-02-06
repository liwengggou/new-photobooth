# Referral System Analysis Report

## Summary

The referral system has been thoroughly analyzed and tested. This report documents the findings, including bugs and potential security issues.

---

## System Overview

The referral system consists of:
- **User Model** (`User.swift`): Contains referral code, referral count, and credits
- **Firebase Service** (`FirebaseService.swift`): Handles referral processing
- **Auth ViewModel** (`AuthViewModel.swift`): Integrates referrals into signup flow
- **Deep Linking** (`PhotoboothApp.swift`): Captures referral codes from URLs
- **UI** (`ReferralScreen.swift`): Displays referral code and progress

### Tier Structure (Cumulative)
| Referrals | Total Bonus Credits |
|-----------|---------------------|
| 0         | 0                   |
| 1         | 3                   |
| 2         | 8                   |
| 3+        | 15                  |

---

## Bugs Found

### 1. **CRITICAL: Credits Awarded on Signup Instead of After Session**

**Location**: `FirebaseService.swift:77-129` and `AuthViewModel.swift`

**Issue**: The UI (`ReferralScreen.swift:79`) states:
> "They create an account using your code **and complete at least one session**"

However, the code awards credits immediately when a user signs up, without waiting for session completion.

**Current Behavior**:
```swift
// In AuthViewModel.signUpWithEmail()
if let referralCode = referralCode, !referralCode.isEmpty {
    let success = try await FirebaseService.shared.processReferral(
        referralCode: referralCode,
        newUserId: result.user.uid
    )
    // Credits awarded immediately ❌
}
```

**Expected Behavior**: Credits should only be awarded after the referred user completes their first photo session.

**Impact**: Users could create multiple accounts with the same referral code to farm credits without actually using the app.

**Fix Required**:
1. Store `pendingReferralCode` on the new user document
2. Move `processReferral()` call to session completion handler
3. Check if user has a pending referral code when saving a completed session

---

### 2. **SECURITY: No Self-Referral Prevention**

**Location**: `FirebaseService.swift:77-129`

**Issue**: The `processReferral` function does not check if the new user is trying to use their own referral code.

**Current Behavior**:
```swift
func processReferral(referralCode: String, newUserId: String) async throws -> Bool {
    // No check if newUserId owns the referralCode! ❌
    let snapshot = try await db.collection("users")
        .whereField("referralCode", isEqualTo: referralCode)
        .limit(to: 1)
        .getDocuments()
    // ...
}
```

**Fix Required**:
```swift
// After finding the referrer
guard referrer.id != newUserId else {
    print("❌ Self-referral not allowed")
    return false
}
```

---

### 3. **MEDIUM: Case-Sensitive Referral Codes**

**Location**: `FirebaseService.swift:79-82`

**Issue**: Referral code lookup is case-sensitive. If a user manually types their friend's code in lowercase, it won't match.

**Current Behavior**:
- Code `ABCD1234` works ✅
- Code `abcd1234` does NOT match ❌

**Fix Options**:
1. Store codes as uppercase and convert input to uppercase before lookup
2. Use case-insensitive Firestore query (not natively supported - would need normalization)

---

### 4. **LOW: ReferredBy Can Be Overwritten**

**Location**: `FirebaseService.swift:113-115`

**Issue**: If `processReferral` is called multiple times for the same user, their `referredBy` field gets overwritten.

**Fix Required**:
```swift
// Only set referredBy if not already set
let newUserDoc = try await db.collection("users").document(newUserId).getDocument()
if newUserDoc.data()?["referredBy"] == nil {
    try await db.collection("users").document(newUserId).updateData([
        "referredBy": referrer.id
    ])
}
```

---

### 5. **LOW: Long Fallback Codes**

**Location**: `FirebaseService.swift:153-154`

**Issue**: If 10 collision attempts fail, the fallback appends a timestamp, creating very long codes.

**Example**: `ABCD56781737654321` (18+ characters)

**Impact**: May cause UI issues or confusion.

---

## Test Coverage

The E2E tests cover:

| Test Category | Tests | Status |
|--------------|-------|--------|
| Code Generation | 4 tests | ✅ |
| Tier Calculation | 3 tests | ✅ |
| Code Uniqueness | 4 tests | ✅ |
| Referral Processing | 4 tests | ✅ |
| Edge Cases & Security | 5 tests | ✅ (documents bugs) |
| Session-Based Referral | 3 tests | ✅ (documents intended behavior) |
| Concurrent Operations | 1 test | ✅ |
| Full Integration | 1 test | ✅ |

---

## Running the Tests

### Prerequisites
1. Firebase service account key
2. Node.js 20+

### Setup
```bash
cd functions

# Install dependencies
npm install

# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
```

### Run Tests
```bash
# Run all referral tests
npm run test:referral

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## Recommendations

### Immediate Fixes (High Priority)
1. **Fix credit timing**: Award credits after session completion, not signup
2. **Add self-referral check**: Prevent users from referring themselves

### Short-Term Fixes (Medium Priority)
3. **Normalize referral codes**: Make lookups case-insensitive
4. **Prevent referredBy overwrite**: Only set once

### Long-Term Improvements
5. **Add referral abuse detection**: Limit referrals from same IP/device
6. **Add expiration**: Pending referrals should expire after X days
7. **Consider transactions**: Use Firestore transactions for atomic updates

---

## Files Modified/Created

### New Files
- `functions/jest.config.js` - Jest configuration
- `functions/tests/setup.ts` - Test setup
- `functions/tests/testUtils.ts` - Test utilities
- `functions/tests/referral.test.ts` - E2E tests
- `functions/tests/REFERRAL_SYSTEM_REPORT.md` - This report

### Modified Files
- `functions/package.json` - Added test scripts and dependencies
