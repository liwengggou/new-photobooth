import {
  GoogleGenAI,
  Modality,
  // MINIMAL VERSION: Removed HarmCategory, HarmBlockThreshold, MediaResolution
} from "@google/genai";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import sharp from "sharp";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Firebase Storage bucket (explicitly set to avoid "bucket does not exist" error)
const STORAGE_BUCKET = "react-77170.firebasestorage.app";
const storage = admin.storage();

import {
  japaneseSystemInstruction,
  japaneseMasterPrompt,
  japaneseMatchPrompt,
} from "./prompts/japanese";
import { koreanPrompt } from "./prompts/korean";
import {
  newyorkSystemInstruction,
  newyorkMasterPrompt,
  newyorkMatchPrompt,
} from "./prompts/newyork";

// Types
export type StyleType = "japanese" | "korean" | "newyork";

interface StylePhotosRequest {
  photos: string[]; // Base64 encoded images
  style: StyleType;
}

interface StylePhotosResponse {
  styledPhotoUrls: string[]; // Download URLs from Firebase Storage
  error?: string;
}

// Style configurations
const styleConfigs: Record<
  StyleType,
  {
    systemInstruction: string;
    masterPrompt: string;
    matchPrompt: string;
  }
> = {
  japanese: {
    systemInstruction: japaneseSystemInstruction,
    masterPrompt: japaneseMasterPrompt,
    matchPrompt: japaneseMatchPrompt,
  },
  korean: {
    systemInstruction: koreanPrompt,
    masterPrompt: koreanPrompt,
    matchPrompt: koreanPrompt,
  },
  newyork: {
    systemInstruction: newyorkSystemInstruction,
    masterPrompt: newyorkMasterPrompt,
    matchPrompt: newyorkMatchPrompt,
  },
};

// Initialize Google Gen AI with Vertex AI
// Image generation models available:
// - gemini-3-pro-image-preview: Pro tier, up to 4096px (current)
// - gemini-2.0-flash-exp: Flash experimental, good for image editing
// - imagen-3.0-capability-001: Dedicated image editing model (different API)
// NOTE: gemini-3-pro-image-preview requires global location per Google Cloud docs
const PROJECT_ID = "fluent-radar-482717-c2";
const LOCATION = "global";

// Model selection:
// - gemini-3-pro-image-preview: Pro tier, up to 4096px, best quality
// - gemini-2.0-flash-exp: Faster but lower quality
const MODEL_ID = "gemini-3-pro-image-preview";

// MINIMAL VERSION: Removed GENERATION_CONFIG - using model defaults
// const GENERATION_CONFIG = {
//   temperature: 1.0,
//   topP: 0.95,
//   topK: 40,
//   seed: 42,
// };

// Image output configuration for native high-resolution generation
// MINIMAL VERSION: Removed IMAGE_CONFIG, THINKING_CONFIG, INPUT_MEDIA_RESOLUTION
// const IMAGE_CONFIG = {
//   imageSize: "2K",
//   aspectRatio: "3:4",
// };
// const INPUT_MEDIA_RESOLUTION = MediaResolution.MEDIA_RESOLUTION_HIGH;

// Retry configuration for handling 429 errors
const MAX_RETRIES = 7;
const INITIAL_DELAY_MS = 5000; // 5 seconds initial delay
const DELAY_BETWEEN_PHOTOS_MS = 5000; // 5 second delay between photos

/**
 * Sleep helper for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// MARK: - Debug Configuration
const DEBUG_LOGGING = true;

/**
 * Debug timing helper for structured logging
 */
class PhotoDebugTimer {
  private phaseStartTimes = new Map<string, number>();
  private sessionStartTime = 0;

  startSession(): void {
    this.sessionStartTime = Date.now();
    this.phaseStartTimes.clear();
    this.log("SESSION", "START", "Cloud Function started");
  }

  startPhase(phase: string): void {
    this.phaseStartTimes.set(phase, Date.now());
  }

  progress(phase: string, message: string): void {
    this.log(phase, "PROGRESS", message, this.getElapsed(phase), this.getCumulative());
  }

  endPhase(phase: string, message: string): void {
    this.log(phase, "DONE", message, this.getElapsed(phase), this.getCumulative());
  }

  error(phase: string, message: string): void {
    this.log(phase, "ERROR", message, this.getElapsed(phase), this.getCumulative());
  }

  retry(phase: string, attempt: number, max: number, delayMs: number): void {
    this.log(phase, "RETRY", `Attempt ${attempt}/${max} - waiting ${delayMs}ms`, this.getElapsed(phase), this.getCumulative());
  }

  summary(phases: Array<{ name: string; duration: number }>): void {
    if (!DEBUG_LOGGING) return;
    const total = this.getCumulative();
    console.log("\n[PHOTOBOOTH-SERVER] ========== TIMING SUMMARY ==========");
    for (const { name, duration } of phases) {
      const pct = total > 0 ? (duration / total) * 100 : 0;
      console.log(`[PHOTOBOOTH-SERVER] ${name}: ${(duration / 1000).toFixed(1)}s (${pct.toFixed(0)}%)`);
    }
    console.log(`[PHOTOBOOTH-SERVER] TOTAL: ${(total / 1000).toFixed(1)}s`);
    console.log("[PHOTOBOOTH-SERVER] ==========================================\n");
  }

  private getElapsed(phase: string): number {
    const start = this.phaseStartTimes.get(phase);
    return start ? Date.now() - start : 0;
  }

  private getCumulative(): number {
    return Date.now() - this.sessionStartTime;
  }

  private log(phase: string, status: string, message: string, elapsed = 0, cumulative = 0): void {
    if (!DEBUG_LOGGING) return;
    const ts = new Date().toISOString();
    console.log(`[PHOTOBOOTH-SERVER] [${ts}] [${phase}] [${status}] ${message} | elapsed: ${(elapsed / 1000).toFixed(1)}s | cumulative: ${(cumulative / 1000).toFixed(1)}s`);
  }
}

const debugTimer = new PhotoDebugTimer();

/**
 * Target output dimensions for upscaling
 * 2400x3200 = high resolution 3:4 portrait aspect ratio
 * Using Firebase Storage, no response limit
 */
const TARGET_WIDTH = 2400;
const TARGET_HEIGHT = 3200; // 3:4 aspect ratio (2400 / 0.75)

/**
 * Upscale image to target dimensions using high-quality Lanczos3 resize
 * Uses "cover" mode to crop-to-fill (no distortion, center crop)
 * Returns Buffer for uploading to Storage as PNG
 */
async function enhancedUpscale(imageBase64: string): Promise<Buffer> {
  // Decode base64 to buffer
  const inputBuffer = Buffer.from(imageBase64, "base64");

  // Resize with:
  // - fit: "cover" = crop to fill (preserves aspect ratio, crops excess)
  // - position: "centre" = center the crop
  // - kernel: lanczos3 = high quality interpolation
  const upscaledBuffer = await sharp(inputBuffer)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      kernel: sharp.kernel.lanczos3,
      fit: "cover", // Crop to fill - no distortion
      position: "centre", // Center the crop
    })
    .png({ compressionLevel: 6 })
    .toBuffer();

  return upscaledBuffer;
}

/**
 * Upload image buffer to Firebase Storage and return download URL
 */
async function uploadToStorage(
  imageBuffer: Buffer,
  sessionId: string,
  photoIndex: number,
  style: StyleType
): Promise<string> {
  const bucket = storage.bucket(STORAGE_BUCKET);
  const filename = `styled-photos/${sessionId}/${style}_${photoIndex + 1}.png`;
  const file = bucket.file(filename);

  await file.save(imageBuffer, {
    metadata: {
      contentType: "image/png",
      metadata: {
        style: style,
        photoIndex: String(photoIndex),
        createdAt: new Date().toISOString(),
      },
    },
  });

  // Make the file publicly accessible and get the URL
  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

  console.log(`Uploaded photo ${photoIndex + 1} to ${filename}`);
  return publicUrl;
}

/**
 * Get the shared generation config for all API calls
 * MINIMAL VERSION: Only responseModalities required for image output
 * Removed: systemInstruction, temperature, topP, topK, seed, imageConfig, mediaResolution, safetySettings
 */
function getGenerationConfig(_styleConfig: { systemInstruction: string }) {
  return {
    // Only this is required to get image output
    responseModalities: [Modality.TEXT, Modality.IMAGE],
  };
}

// NOTE: Chat-based approach disabled - using individual photo processing only
// The chat approach sends one image per turn and relies on model memory.
// The individual approach explicitly passes both images (master + target) which is clearer.
//
// Helper function for chat approach (also disabled):
// async function extractAndProcessImage(
//   response: { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }> }
// ): Promise<Buffer | null> {
//   if (response.candidates && response.candidates.length > 0) {
//     const parts = response.candidates[0].content?.parts || [];
//     for (const part of parts) {
//       if (part.inlineData && part.inlineData.data) {
//         const rawBase64 = part.inlineData.data;
//         const processedBuffer = await enhancedUpscale(rawBase64);
//         return processedBuffer;
//       }
//     }
//   }
//   return null;
// }
//
// async function processPhotosWithChat(
//   ai: GoogleGenAI,
//   photos: string[],
//   style: StyleType
// ): Promise<Buffer[]> {
//   const styleConfig = styleConfigs[style];
//   const results: Buffer[] = [];
//
//   // Create a chat session - this maintains context and thought signatures automatically
//   console.log("Creating chat session for multi-turn style consistency...");
//   const chat = ai.chats.create({
//     model: MODEL_ID,
//     config: getGenerationConfig(styleConfig),
//   });
//
//   for (let i = 0; i < photos.length; i++) {
//     console.log(`Processing photo ${i + 1}/${photos.length} in chat session...`);
//
//     // Create image part from base64
//     const imagePart = {
//       inlineData: {
//         mimeType: "image/jpeg",
//         data: photos[i],
//       },
//     };
//
//     let prompt: string;
//     if (i === 0) {
//       // First photo: Use master prompt to establish the style
//       prompt = styleConfig.masterPrompt;
//       console.log("Sending MASTER photo to establish style...");
//     } else {
//       // Subsequent photos: Use match prompt with identity preservation phrases
//       prompt = styleConfig.matchPrompt;
//       console.log("Sending MATCH photo with identity preservation...");
//     }
//
//     // Send message in chat session - thought signatures are handled automatically
//     const response = await chat.sendMessage({
//       message: [imagePart, { text: prompt }],
//     });
//
//     // Extract and process the generated image
//     const imageBuffer = await extractAndProcessImage(response);
//     if (imageBuffer) {
//       console.log(`Photo ${i + 1} generated successfully (model: ${MODEL_ID}, temp: ${GENERATION_CONFIG.temperature})`);
//       results.push(imageBuffer);
//     } else {
//       console.log(`No image in response for photo ${i + 1}`);
//       throw new Error(`Failed to generate image for photo ${i + 1}`);
//     }
//
//     // Add delay between photos to avoid rate limiting
//     if (i < photos.length - 1) {
//       console.log(`Waiting ${DELAY_BETWEEN_PHOTOS_MS}ms before next photo...`);
//       await sleep(DELAY_BETWEEN_PHOTOS_MS);
//     }
//   }
//
//   return results;
// }

/**
 * MINIMAL VERSION: Process ANY photo with the same masterPrompt
 * Each photo is transformed independently - no master/match distinction
 * Returns Buffer for uploading to Storage
 */
async function processPhoto(
  ai: GoogleGenAI,
  imageBase64: string,
  style: StyleType
): Promise<Buffer | null> {
  const styleConfig = styleConfigs[style];

  try {
    const imagePart = {
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64,
      },
    };

    // Call Gemini with masterPrompt
    const apiStart = Date.now();
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: [
        {
          role: "user",
          parts: [imagePart, { text: styleConfig.masterPrompt }],
        },
      ],
      config: getGenerationConfig(styleConfig),
    });
    const apiDuration = Date.now() - apiStart;

    if (DEBUG_LOGGING) {
      console.log(`[PHOTOBOOTH-SERVER] Gemini API call: ${(apiDuration / 1000).toFixed(1)}s`);
    }

    // Extract image from response
    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content?.parts || [];
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const rawBase64 = part.inlineData.data;

          // Upscale the image
          const upscaleStart = Date.now();
          const upscaledBuffer = await enhancedUpscale(rawBase64);
          const upscaleDuration = Date.now() - upscaleStart;

          if (DEBUG_LOGGING) {
            console.log(`[PHOTOBOOTH-SERVER] Sharp upscale: ${(upscaleDuration / 1000).toFixed(1)}s`);
          }

          return upscaledBuffer;
        }
      }
    }

    throw new Error("No image in Gemini response");
  } catch (error) {
    if (DEBUG_LOGGING) {
      console.log(`[PHOTOBOOTH-SERVER] processPhoto error: ${error instanceof Error ? error.message : "Unknown"}`);
    }
    throw error;
  }
}

/**
 * Main Cloud Function to style photos using Gemini 3 Pro Image
 */
export const stylePhotos = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes for processing 4 photos
    memory: "2GB",
  })
  .https.onCall(async (data: StylePhotosRequest): Promise<StylePhotosResponse> => {
    const { photos, style } = data;

    // Validate input
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return { styledPhotoUrls: [], error: "No photos provided" };
    }

    if (!style || !styleConfigs[style]) {
      return { styledPhotoUrls: [], error: "Invalid style" };
    }

    // Generate unique session ID for this request
    const sessionId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const phaseDurations: Array<{ name: string; duration: number }> = [];

    debugTimer.startSession();
    debugTimer.progress("SESSION", `Processing ${photos.length} photos with style: ${style}`);
    debugTimer.progress("SESSION", `Session ID: ${sessionId}, Model: ${MODEL_ID}`);

    try {
      // ========== PHASE: INIT ==========
      debugTimer.startPhase("INIT");
      const initStart = Date.now();

      const ai = new GoogleGenAI({
        vertexai: true,
        project: PROJECT_ID,
        location: LOCATION,
      });

      phaseDurations.push({ name: "INIT", duration: Date.now() - initStart });
      debugTimer.endPhase("INIT", "Vertex AI client initialized");

      const styledPhotoUrls: string[] = [];
      let processedBuffers: Buffer[] = [];

      // NOTE: Chat-based approach disabled - using individual photo processing only
      // The chat approach sends one image per turn and relies on model memory.
      // The individual approach explicitly passes both images (master + target) which is clearer.
      /*
      // Try chat-based processing first (better style consistency via thought signatures)
      let useChatApproach = true;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          if (useChatApproach) {
            console.log("Using chat-based processing for multi-turn consistency...");
            processedBuffers = await processPhotosWithChat(ai, photos, style);
          }
          break; // Success
        } catch (error) {
          const lastError = error instanceof Error ? error : new Error(String(error));
          const errorMsg = lastError.message.toLowerCase();
          const isRateLimitError = errorMsg.includes("429") ||
            errorMsg.includes("resource_exhausted") ||
            errorMsg.includes("quota") ||
            errorMsg.includes("503") ||
            errorMsg.includes("unavailable");

          if (isRateLimitError && attempt < MAX_RETRIES - 1) {
            const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempt);
            console.log(`Rate limit hit, retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
            await sleep(delayMs);
          } else if (useChatApproach && attempt === 0) {
            // If chat approach fails on first try (non-rate-limit), fall back to individual calls
            console.log("Chat approach failed, falling back to individual photo processing...");
            useChatApproach = false;
            // Reset attempt counter for fallback
            attempt = -1;
          } else {
            throw lastError;
          }
        }
      }
      */

      // ========== PHASE: GEMINI ==========
      debugTimer.startPhase("GEMINI");
      const geminiStart = Date.now();

      for (let i = 0; i < photos.length; i++) {
        debugTimer.progress("GEMINI", `Photo ${i + 1}/${photos.length} starting...`);
        const photoStart = Date.now();

        let imageBuffer: Buffer | null = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            debugTimer.progress("GEMINI", `Photo ${i + 1} - API call attempt ${attempt + 1}/${MAX_RETRIES}`);
            imageBuffer = await processPhoto(ai, photos[i], style);
            break;
          } catch (error) {
            const lastError = error instanceof Error ? error : new Error(String(error));
            const errorMsg = lastError.message.toLowerCase();

            const isRetryableError = errorMsg.includes("429") ||
              errorMsg.includes("resource_exhausted") ||
              errorMsg.includes("quota") ||
              errorMsg.includes("503") ||
              errorMsg.includes("unavailable") ||
              errorMsg.includes("fetch failed") ||
              errorMsg.includes("network") ||
              errorMsg.includes("econnreset") ||
              errorMsg.includes("timeout") ||
              errorMsg.includes("socket");

            if (isRetryableError && attempt < MAX_RETRIES - 1) {
              const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempt);
              debugTimer.error("GEMINI", `Error: ${errorMsg.substring(0, 100)}`);
              debugTimer.retry("GEMINI", attempt + 1, MAX_RETRIES, delayMs);
              await sleep(delayMs);
            } else {
              debugTimer.error("GEMINI", `Non-retryable or max retries: ${errorMsg.substring(0, 100)}`);
              throw lastError;
            }
          }
        }

        if (imageBuffer) {
          const photoDuration = Date.now() - photoStart;
          debugTimer.progress("GEMINI", `Photo ${i + 1} complete in ${(photoDuration / 1000).toFixed(1)}s`);
          processedBuffers.push(imageBuffer);
        } else {
          debugTimer.error("GEMINI", `Photo ${i + 1} failed - no image generated`);
          throw new Error(`Photo ${i + 1} failed to generate`);
        }

        if (i < photos.length - 1) {
          debugTimer.progress("GEMINI", `Waiting ${DELAY_BETWEEN_PHOTOS_MS}ms before next photo (rate limit protection)`);
          await sleep(DELAY_BETWEEN_PHOTOS_MS);
        }
      }

      phaseDurations.push({ name: "GEMINI", duration: Date.now() - geminiStart });
      debugTimer.endPhase("GEMINI", `All ${photos.length} photos processed by Gemini`);

      // ========== PHASE: UPLOAD ==========
      debugTimer.startPhase("UPLOAD");
      const uploadStart = Date.now();

      for (let i = 0; i < processedBuffers.length; i++) {
        const photoUploadStart = Date.now();
        debugTimer.progress("UPLOAD", `Uploading photo ${i + 1}/${processedBuffers.length} to Firebase Storage...`);

        const url = await uploadToStorage(processedBuffers[i], sessionId, i, style);
        styledPhotoUrls.push(url);

        const uploadDuration = Date.now() - photoUploadStart;
        debugTimer.progress("UPLOAD", `Photo ${i + 1} uploaded in ${(uploadDuration / 1000).toFixed(1)}s`);
      }

      phaseDurations.push({ name: "UPLOAD", duration: Date.now() - uploadStart });
      debugTimer.endPhase("UPLOAD", `All ${styledPhotoUrls.length} photos uploaded`);

      // ========== SUMMARY ==========
      debugTimer.summary(phaseDurations);

      return { styledPhotoUrls };
    } catch (error) {
      debugTimer.error("SESSION", `Fatal error: ${error instanceof Error ? error.message : "Unknown"}`);
      return {
        styledPhotoUrls: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });
