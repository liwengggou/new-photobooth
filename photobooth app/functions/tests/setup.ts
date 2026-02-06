/**
 * Jest setup file for Firebase E2E tests
 *
 * IMPORTANT: These tests run against your REAL Firebase project.
 * Make sure you have:
 * 1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable to your service account key
 * 2. Or run: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp();
}

// Increase timeout for Firebase operations
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  // Give Firebase some time to complete any pending operations
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Clean up Firebase app
  await Promise.all(admin.apps.map(app => app?.delete()));
});
