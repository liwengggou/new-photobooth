"use strict";
/**
 * Test utilities for Photobooth Referral System E2E tests
 *
 * These utilities mirror the Swift implementation to ensure
 * the tests accurately validate the production behavior.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReferralCode = generateReferralCode;
exports.isValidReferralCodeFormat = isValidReferralCodeFormat;
exports.calculateReferralBonusCredits = calculateReferralBonusCredits;
exports.calculateIncrementalCredits = calculateIncrementalCredits;
exports.createTestUser = createTestUser;
exports.fetchUser = fetchUser;
exports.findUserByReferralCode = findUserByReferralCode;
exports.referralCodeExists = referralCodeExists;
exports.ensureUniqueReferralCode = ensureUniqueReferralCode;
exports.processReferral = processReferral;
exports.processPendingReferral = processPendingReferral;
exports.createTestSession = createTestSession;
exports.hasCompletedSession = hasCompletedSession;
exports.deleteTestUser = deleteTestUser;
exports.deleteTestUsers = deleteTestUsers;
exports.cleanupAllTestData = cleanupAllTestData;
exports.generateTestPrefix = generateTestPrefix;
exports.waitForFirestore = waitForFirestore;
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// ----- Referral Code Generation (matching Swift implementation) -----
/**
 * Generates a referral code matching the Swift implementation
 * Uses uppercase letters (excluding I, O, L) and numbers (excluding 0, 1)
 */
function generateReferralCode() {
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
function isValidReferralCodeFormat(code) {
    if (code.length !== 8)
        return false;
    // Excludes I, O, L (confusing letters) and 0, 1 (confusing numbers)
    const validChars = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/;
    return validChars.test(code);
}
// ----- Tier/Credits Calculation (matching Swift implementation) -----
/**
 * Calculate bonus credits based on referral count (cumulative tiers)
 * This matches the Swift User.referralBonusCredits computed property
 */
function calculateReferralBonusCredits(referralCount) {
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
function calculateIncrementalCredits(previousCount, newCount) {
    const previousBonus = calculateReferralBonusCredits(previousCount);
    const newBonus = calculateReferralBonusCredits(newCount);
    return newBonus - previousBonus;
}
// ----- Firebase Operations -----
/**
 * Create a test user in Firestore
 */
async function createTestUser(overrides = {}) {
    const userId = overrides.id || `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const referralCode = overrides.referralCode || generateReferralCode();
    const user = {
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
    const firestoreData = {
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
async function fetchUser(userId) {
    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists)
        return null;
    const data = doc.data();
    return {
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
    };
}
/**
 * Find user by referral code
 */
async function findUserByReferralCode(referralCode) {
    const snapshot = await db
        .collection('users')
        .where('referralCode', '==', referralCode)
        .limit(1)
        .get();
    if (snapshot.empty)
        return null;
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
    };
}
/**
 * Check if a referral code exists in the database
 */
async function referralCodeExists(code) {
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
async function ensureUniqueReferralCode(code) {
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
async function processReferral(referralCode, newUserId) {
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
            console.log(`✅ Processed referral: ${referrer.email} referred ${newUserId}, awarded ${result.creditsAwarded} credits`);
        }
        return result;
    }
    catch (error) {
        console.log(`❌ Transaction failed: ${error}`);
        return { success: false, creditsAwarded: 0 };
    }
}
/**
 * Process pending referral code after first session completion (FIX #1)
 */
async function processPendingReferral(userId) {
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
async function createTestSession(userId, overrides = {}) {
    const sessionId = overrides.id || `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const session = {
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
async function hasCompletedSession(userId) {
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
async function deleteTestUser(userId) {
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
async function deleteTestUsers(userIds) {
    await Promise.all(userIds.map(id => deleteTestUser(id)));
}
/**
 * Clean up all test data (users starting with 'test-')
 */
async function cleanupAllTestData() {
    // Find all test users
    const usersSnapshot = await db
        .collection('users')
        .where('email', '>=', 'test-')
        .where('email', '<', 'test.')
        .get();
    if (usersSnapshot.empty)
        return 0;
    const userIds = usersSnapshot.docs.map(doc => doc.id);
    await deleteTestUsers(userIds);
    return userIds.length;
}
// ----- Test Helpers -----
/**
 * Generate a unique test prefix for isolation
 */
function generateTestPrefix() {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}
/**
 * Wait for Firestore propagation
 */
async function waitForFirestore(ms = 500) {
    await new Promise(resolve => setTimeout(resolve, ms));
}
//# sourceMappingURL=testUtils.js.map