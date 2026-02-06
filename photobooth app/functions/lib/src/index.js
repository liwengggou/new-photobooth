"use strict";
/**
 * Photobooth Cloud Functions
 *
 * Main entry point for Firebase Cloud Functions.
 * Exports the stylePhotos function for photo styling with Vertex AI Gemini.
 * Exports email notification functions for feedback and contact messages.
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
exports.processPendingReferral = exports.processReferral = exports.onContactMessageCreated = exports.onFeedbackCreated = exports.stylePhotos = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
// Export cloud functions
var stylePhotos_1 = require("./stylePhotos");
Object.defineProperty(exports, "stylePhotos", { enumerable: true, get: function () { return stylePhotos_1.stylePhotos; } });
var sendEmail_1 = require("./sendEmail");
Object.defineProperty(exports, "onFeedbackCreated", { enumerable: true, get: function () { return sendEmail_1.onFeedbackCreated; } });
Object.defineProperty(exports, "onContactMessageCreated", { enumerable: true, get: function () { return sendEmail_1.onContactMessageCreated; } });
var processReferral_1 = require("./processReferral");
Object.defineProperty(exports, "processReferral", { enumerable: true, get: function () { return processReferral_1.processReferral; } });
Object.defineProperty(exports, "processPendingReferral", { enumerable: true, get: function () { return processReferral_1.processPendingReferral; } });
//# sourceMappingURL=index.js.map