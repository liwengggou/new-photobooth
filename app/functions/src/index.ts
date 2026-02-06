/**
 * Photobooth Cloud Functions
 *
 * Main entry point for Firebase Cloud Functions.
 * Exports the stylePhotos function for photo styling with Vertex AI Gemini.
 * Exports email notification functions for feedback and contact messages.
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Export cloud functions
export { stylePhotos } from "./stylePhotos";
export { onFeedbackCreated, onContactMessageCreated } from "./sendEmail";
export { processReferral, processPendingReferral } from "./processReferral";
