/**
 * Test utilities for Photobooth Referral System E2E tests
 *
 * These utilities mirror the Swift implementation to ensure
 * the tests accurately validate the production behavior.
 */

import * as admin from 'firebase-admin';

const db = admin.firestore();

// ----- Types (matching Swift User model) -----

export interface User {
  id: string;
  email: string;
  displayName: string;
  credits: number;
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  createdAt: Date;
  pendingReferralCode?: string | null;  // Stored on signup, processed on first session
}

export interface PhotoSession {
  id: string;
  userId: string;
  style: 'korean' | 'newyork' | 'japanese';
  layout: '1x4' | '2x2';
  stripColor: string;
  createdAt: Date;
  status: 'completed' | 'failed';
}

// ----- Referral Code Generation (matching Swift implementation) -----

/**
 * Generates a referral code matching the Swift implementation
 * Uses uppercase letters (excluding I, O, L) and numbers (excluding 0, 1)
 */
export function generateReferralCode(): string {
  // Excludes I, O, L (confusing letters) and 0, 1 (confusing numbers)
  const characters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

/**
 * Validates referral code format
 */
export function isValidReferralCodeFormat(code: string): boolean {
  if (code.length !== 8) return false;
  // Excludes I, O, L (confusing letters) and 0, 1 (confusing numbers)
  const validChars = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/;
  return validChars.test(code);
}

// ----- Tier/Credits Calculation (matching Swift implementation) -----

/**
 * Calculate bonus credits based on referral count (cumulative tiers)
 * This matches the Swift User.referralBonusCredits computed property
 */
export function calculateReferralBonusCredits(referralCount: number): number {
  switch (referralCount) {
    case 0:
      return 0;
    case 1:
      return 3;
    case 2:
      return 8;
    default:
      return 15; // 3+ referrals
  }
}

/**
 * Calculate incremental credits to award when reaching a new tier
 */
export function calculateIncrementalCredits(
  previousCount: number,
  newCount: number
): number {
  const previousBonus = calculateReferralBonusCredits(previousCount);
  const newBonus = calculateReferralBonusCredits(newCount);
  return newBonus - previousBonus;
}

// ----- Firebase Operations -----

/**
 * Create a test user in Firestore
 */
export async function createTestUser(
  overrides: Partial<User> = {}
): Promise<User> {
  const userId = overrides.id || `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const referralCode = overrides.referralCode || generateReferralCode();

  const user: User = {
    id: userId,
    email: overrides.email || `test-${userId}@example.com`,
    displayName: overrides.displayName || `Test User ${userId.slice(-4)}`,
    credits: overrides.credits ?? 3, // New users get 3 free credits
    referralCode: referralCode,
    referredBy: overrides.referredBy ?? null,
    referralCount: overrides.referralCount ?? 0,
    createdAt: overrides.createdAt || new Date(),
    pendingReferralCode: overrides.pendingReferralCode ?? null,
  };

  const firestoreData: Record<string, unknown> = {
    ...user,
    createdAt: admin.firestore.Timestamp.fromDate(user.createdAt),
  };

  // Only include pendingReferralCode if it has a value
  if (!user.pendingReferralCode) {
    delete firestoreData.pendingReferralCode;
  }

  await db.collection('users').doc(userId).set(firestoreData);

  return user;
}

/**
 * Fetch a user from Firestore
 */
export async function fetchUser(userId: string): Promise<User | null> {
  const doc = await db.collection('users').doc(userId).get();
  if (!doc.exists) return null;

  const data = doc.data();
  return {
    ...data,
    createdAt: data?.createdAt?.toDate() || new Date(),
  } as User;
}

/**
 * Find user by referral code
 */
export async function findUserByReferralCode(
  referralCode: string
): Promise<User | null> {
  const snapshot = await db
    .collection('users')
    .where('referralCode', '==', referralCode)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt?.toDate() || new Date(),
  } as User;
}

/**
 * Check if a referral code exists in the database
 */
export async function referralCodeExists(code: string): Promise<boolean> {
  const snapshot = await db
    .collection('users')
    .where('referralCode', '==', code)
    .limit(1)
    .get();
  return !snapshot.empty;
}

/**
 * Ensure unique referral code (matching Swift implementation)
 */
export async function ensureUniqueReferralCode(code: string): Promise<string> {
  let currentCode = code;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const exists = await referralCodeExists(currentCode);
    if (!exists) {
      return currentCode;
    }
    currentCode = generateReferralCode();
    attempts++;
  }

  // Fallback: append timestamp to ensure uniqueness
  return currentCode + Math.round(Date.now() / 1000);
}

/**
 * Process referral (matching Swift FirebaseService.processReferral)
 *
 * This implementation includes all bug fixes:
 * - FIX #2: Self-referral prevention
 * - FIX #3: Case-insensitive lookup
 * - FIX #4: ReferredBy can only be set once
 * - FIX #5: Race condition prevention using Firestore transaction
 *
 * NOTE: FIX #1 (credits after session) is handled separately via processPendingReferral
 */
export async function processReferral(
  referralCode: string,
  newUserId: string
): Promise<{ success: boolean; creditsAwarded: number; referrerId?: string }> {
  // FIX #3: Normalize to uppercase for case-insensitive lookup
  const normalizedCode = referralCode.toUpperCase();

  // 1. Find user with this referral code (outside transaction - read-only query)
  const referrer = await findUserByReferralCode(normalizedCode);

  if (!referrer) {
    console.log(`❌ Referral code not found: ${referralCode}`);
    return { success: false, creditsAwarded: 0 };
  }

  // FIX #2: Prevent self-referral
  if (referrer.id === newUserId) {
    console.log(`❌ Self-referral not allowed`);
    return { success: false, creditsAwarded: 0 };
  }

  // FIX #5: Use transaction to ensure atomic check-and-update
  const referrerRef = db.collection('users').doc(referrer.id);
  const newUserRef = db.collection('users').doc(newUserId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      // Read both documents within transaction for consistency
      const referrerSnapshot = await transaction.get(referrerRef);
      const newUserSnapshot = await transaction.get(newUserRef);

      // FIX #4: Atomic check if user already has a referrer within transaction
      const existingReferrer = newUserSnapshot.data()?.referredBy;
      if (existingReferrer && existingReferrer !== '') {
        console.log(`❌ User already has a referrer`);
        return { success: false, creditsAwarded: 0 };
      }

      // Get current referrer data
      const referrerData = referrerSnapshot.data();
      if (!referrerData) {
        return { success: false, creditsAwarded: 0 };
      }

      const currentReferralCount = referrerData.referralCount || 0;
      const currentCredits = referrerData.credits || 0;

      // Calculate credits based on tier progression
      const previousBonus = calculateReferralBonusCredits(currentReferralCount);
      const newReferralCount = currentReferralCount + 1;
      const currentBonus = calculateReferralBonusCredits(newReferralCount);
      const creditsToAward = currentBonus - previousBonus;

      // Update referrer: increment referral count and add credits
      transaction.update(referrerRef, {
        referralCount: newReferralCount,
        credits: currentCredits + creditsToAward,
      });

      // Update new user: set referredBy
      transaction.update(newUserRef, {
        referredBy: referrer.id,
      });

      return {
        success: true,
        creditsAwarded: creditsToAward,
        referrerId: referrer.id,
      };
    });

    if (result.success) {
      console.log(
        `✅ Processed referral: ${referrer.email} referred ${newUserId}, awarded ${result.creditsAwarded} credits`
      );
    }

    return result;
  } catch (error) {
    console.log(`❌ Transaction failed: ${error}`);
    return { success: false, creditsAwarded: 0 };
  }
}

/**
 * Process pending referral code after first session completion (FIX #1)
 */
export async function processPendingReferral(
  userId: string
): Promise<{ success: boolean; creditsAwarded: number; referrerId?: string }> {
  const user = await fetchUser(userId);

  if (!user || !user.pendingReferralCode) {
    return { success: false, creditsAwarded: 0 };
  }

  const result = await processReferral(user.pendingReferralCode, userId);

  if (result.success) {
    // Clear pending code after successful processing
    await db.collection('users').doc(userId).update({
      pendingReferralCode: admin.firestore.FieldValue.delete(),
    });
    console.log(`✅ Cleared pending referral code for user ${userId}`);
  }

  return result;
}

/**
 * Create a test photo session
 */
export async function createTestSession(
  userId: string,
  overrides: Partial<PhotoSession> = {}
): Promise<PhotoSession> {
  const sessionId = overrides.id || `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const session: PhotoSession = {
    id: sessionId,
    userId: userId,
    style: overrides.style || 'korean',
    layout: overrides.layout || '1x4',
    stripColor: overrides.stripColor || '#FFFFFF',
    createdAt: overrides.createdAt || new Date(),
    status: overrides.status || 'completed',
  };

  await db.collection('sessions').doc(sessionId).set({
    ...session,
    createdAt: admin.firestore.Timestamp.fromDate(session.createdAt),
  });

  return session;
}

/**
 * Check if user has completed at least one session
 */
export async function hasCompletedSession(userId: string): Promise<boolean> {
  const snapshot = await db
    .collection('sessions')
    .where('userId', '==', userId)
    .where('status', '==', 'completed')
    .limit(1)
    .get();

  return !snapshot.empty;
}

// ----- Cleanup Utilities -----

/**
 * Delete a test user and their sessions
 */
export async function deleteTestUser(userId: string): Promise<void> {
  // Delete sessions
  const sessionsSnapshot = await db
    .collection('sessions')
    .where('userId', '==', userId)
    .get();

  const batch = db.batch();
  sessionsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  // Delete user document
  batch.delete(db.collection('users').doc(userId));

  await batch.commit();
}

/**
 * Delete multiple test users
 */
export async function deleteTestUsers(userIds: string[]): Promise<void> {
  await Promise.all(userIds.map(id => deleteTestUser(id)));
}

/**
 * Clean up all test data (users starting with 'test-')
 */
export async function cleanupAllTestData(): Promise<number> {
  // Find all test users
  const usersSnapshot = await db
    .collection('users')
    .where('email', '>=', 'test-')
    .where('email', '<', 'test.')
    .get();

  if (usersSnapshot.empty) return 0;

  const userIds = usersSnapshot.docs.map(doc => doc.id);
  await deleteTestUsers(userIds);

  return userIds.length;
}

// ----- Test Helpers -----

/**
 * Generate a unique test prefix for isolation
 */
export function generateTestPrefix(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Wait for Firestore propagation
 */
export async function waitForFirestore(ms: number = 500): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}
