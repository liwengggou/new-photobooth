"use strict";
/**
 * Process Referral Cloud Function
 *
 * Handles referral code processing with admin privileges.
 * This allows updating another user's credits without client-side permission issues.
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
exports.processPendingReferral = exports.processReferral = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Calculate referral bonus credits based on tier progression
 */
function calculateReferralBonusCredits(referralCount) {
    switch (referralCount) {
        case 0: return 0;
        case 1: return 3;
        case 2: return 8;
        default: return 15;
    }
}
/**
 * Cloud Function to process referral codes
 * Called from iOS app when a user enters a referral code
 */
exports.processReferral = functions.https.onCall(async (request) => {
    const data = request.data;
    const auth = request.auth;
    // 1. Verify authentication
    if (!auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in to use referral code");
    }
    const newUserId = auth.uid;
    const { referralCode } = data;
    // 2. Validate referral code
    if (!referralCode || typeof referralCode !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "Referral code is required");
    }
    // 3. Normalize to uppercase for case-insensitive lookup
    const normalizedCode = referralCode.toUpperCase().trim();
    try {
        // 4. Find user with this referral code
        const snapshot = await db.collection("users")
            .where("referralCode", "==", normalizedCode)
            .limit(1)
            .get();
        if (snapshot.empty) {
            console.log(`Referral code not found: ${referralCode}`);
            return { success: false, error: "Invalid referral code" };
        }
        const referrerDoc = snapshot.docs[0];
        const referrerId = referrerDoc.id;
        // 5. Prevent self-referral
        if (referrerId === newUserId) {
            console.log(`Self-referral attempted by user: ${newUserId}`);
            return { success: false, error: "Cannot use your own referral code" };
        }
        // 6. Use transaction for atomic update
        const referrerRef = db.collection("users").doc(referrerId);
        const newUserRef = db.collection("users").doc(newUserId);
        const result = await db.runTransaction(async (transaction) => {
            // Read both documents within transaction
            const referrerSnap = await transaction.get(referrerRef);
            const newUserSnap = await transaction.get(newUserRef);
            if (!referrerSnap.exists) {
                throw new Error("Referrer not found");
            }
            if (!newUserSnap.exists) {
                throw new Error("User not found");
            }
            // Check if user already has a referrer
            const newUserData = newUserSnap.data();
            if (newUserData?.referredBy && newUserData.referredBy !== "") {
                console.log(`User ${newUserId} already has a referrer`);
                return { success: false, error: "Already used a referral code" };
            }
            // Get current referrer data
            const referrerData = referrerSnap.data();
            const currentReferralCount = referrerData?.referralCount || 0;
            const currentCredits = referrerData?.credits || 0;
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
                referredBy: referrerId,
            });
            console.log(`Referral processed: ${referrerId} referred ${newUserId}, ` +
                `awarded ${creditsToAward} credits`);
            return { success: true, creditsAwarded: creditsToAward };
        });
        return result;
    }
    catch (error) {
        console.error("Error processing referral:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: errorMessage };
    }
});
/**
 * Cloud Function to process pending referral after first session completion
 */
exports.processPendingReferral = functions.https.onCall(async (request) => {
    const auth = request.auth;
    if (!auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const userId = auth.uid;
    try {
        // Get user's pending referral code
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return { success: false, error: "User not found" };
        }
        const userData = userDoc.data();
        const pendingCode = userData?.pendingReferralCode;
        if (!pendingCode || pendingCode === "") {
            return { success: false, error: "No pending referral code" };
        }
        // Process the referral using the same logic
        const result = await processReferralInternal(pendingCode, userId);
        if (result.success) {
            // Clear pending code after successful processing
            await db.collection("users").doc(userId).update({
                pendingReferralCode: admin.firestore.FieldValue.delete(),
            });
            console.log(`Cleared pending referral code for user ${userId}`);
        }
        return result;
    }
    catch (error) {
        console.error("Error processing pending referral:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: errorMessage };
    }
});
/**
 * Internal helper function for referral processing
 */
async function processReferralInternal(referralCode, newUserId) {
    const normalizedCode = referralCode.toUpperCase().trim();
    const snapshot = await db.collection("users")
        .where("referralCode", "==", normalizedCode)
        .limit(1)
        .get();
    if (snapshot.empty) {
        return { success: false, error: "Invalid referral code" };
    }
    const referrerDoc = snapshot.docs[0];
    const referrerId = referrerDoc.id;
    if (referrerId === newUserId) {
        return { success: false, error: "Cannot use your own referral code" };
    }
    const referrerRef = db.collection("users").doc(referrerId);
    const newUserRef = db.collection("users").doc(newUserId);
    return db.runTransaction(async (transaction) => {
        const referrerSnap = await transaction.get(referrerRef);
        const newUserSnap = await transaction.get(newUserRef);
        if (!referrerSnap.exists || !newUserSnap.exists) {
            throw new Error("User not found");
        }
        const newUserData = newUserSnap.data();
        if (newUserData?.referredBy && newUserData.referredBy !== "") {
            return { success: false, error: "Already used a referral code" };
        }
        const referrerData = referrerSnap.data();
        const currentReferralCount = referrerData?.referralCount || 0;
        const currentCredits = referrerData?.credits || 0;
        const previousBonus = calculateReferralBonusCredits(currentReferralCount);
        const newReferralCount = currentReferralCount + 1;
        const currentBonus = calculateReferralBonusCredits(newReferralCount);
        const creditsToAward = currentBonus - previousBonus;
        transaction.update(referrerRef, {
            referralCount: newReferralCount,
            credits: currentCredits + creditsToAward,
        });
        transaction.update(newUserRef, {
            referredBy: referrerId,
        });
        return { success: true, creditsAwarded: creditsToAward };
    });
}
//# sourceMappingURL=processReferral.js.map