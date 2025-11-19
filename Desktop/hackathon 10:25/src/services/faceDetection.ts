import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { FACEMESH_LIPS } from '@mediapipe/face_mesh';
import { FaceDetectionResult, MouthShape } from '../types';

export class FaceDetectionService {
  private faceMesh: FaceMesh | null = null;
  private camera: Camera | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private isInitialized = false;
  private onResultsCallback: ((result: FaceDetectionResult) => void) | null = null;
  
  // Temporal smoothing for reducing false positives
  private recentDetections: MouthShape[] = [];
  private readonly SMOOTHING_WINDOW = 3;
  private readonly CONFIDENCE_THRESHOLD = 0.5;

  constructor() {
    this.initializeFaceMesh();
  }

  private initializeFaceMesh() {
    this.faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.faceMesh.onResults(this.onResults.bind(this));
  }

  async initialize(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement,
    onResults: (result: FaceDetectionResult) => void
  ): Promise<void> {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.canvasCtx = canvasElement.getContext('2d');
    this.onResultsCallback = onResults;

    if (!this.faceMesh) {
      throw new Error('FaceMesh not initialized');
    }

    try {
      this.camera = new Camera(videoElement, {
        onFrame: async () => {
          if (this.faceMesh && this.videoElement) {
            await this.faceMesh.send({ image: this.videoElement });
          }
        },
        width: 640,
        height: 480
      });

      await this.camera.start();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize camera:', error);
      throw error;
    }
  }

  private onResults(results: any) {
    if (!this.canvasElement || !this.canvasCtx || !this.videoElement) {
      return;
    }

    // Clear canvas
    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    // Draw the video frame
    this.canvasCtx.drawImage(
      this.videoElement,
      0,
      0,
      this.canvasElement.width,
      this.canvasElement.height
    );

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];

      // Draw face mesh
      drawConnectors(this.canvasCtx, landmarks, FACEMESH_LIPS, {
        color: '#E0E0E0',
        lineWidth: 1
      });

      // Analyze mouth shape
      const rawMouthShape = this.analyzeMouthShape(landmarks);
      
      // Apply temporal smoothing to reduce false positives
      const smoothedMouthShape = this.applyTemporalSmoothing(rawMouthShape);
      const confidence = this.calculateConfidence(landmarks, smoothedMouthShape);

      // Create result
      const result: FaceDetectionResult = {
        landmarks,
        mouthShape: smoothedMouthShape,
        confidence,
        timestamp: Date.now(),
        boundingBox: {
          x: 0,
          y: 0,
          width: this.canvasElement.width,
          height: this.canvasElement.height
        }
      };

      // Call the callback
      if (this.onResultsCallback) {
        this.onResultsCallback(result);
      }

      // Draw mouth shape indicator
      this.drawMouthShapeIndicator(smoothedMouthShape, confidence);
    }

    this.canvasCtx.restore();
  }

  private applyTemporalSmoothing(currentShape: MouthShape): MouthShape {
    // Add current detection to recent detections
    this.recentDetections.push(currentShape);
    
    // Keep only the most recent detections within the smoothing window
    if (this.recentDetections.length > this.SMOOTHING_WINDOW) {
      this.recentDetections.shift();
    }
    
    // For initial detections, return immediately to be more responsive
    if (this.recentDetections.length < 2) {
      return currentShape;
    }
    
    // Count occurrences of each shape in recent detections
    const shapeCounts: Record<MouthShape, number> = {
      'aaa': 0,
      'eee': 0,
      'ooo': 0,
      'neutral': 0
    };
    
    this.recentDetections.forEach(shape => {
      shapeCounts[shape]++;
    });
    
    // Find the most frequent shape
    let mostFrequentShape: MouthShape = 'neutral';
    let maxCount = 0;
    
    for (const [shape, count] of Object.entries(shapeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequentShape = shape as MouthShape;
      }
    }
    
    // More lenient confidence requirement
    const confidence = maxCount / this.recentDetections.length;
    
    if (confidence >= this.CONFIDENCE_THRESHOLD) {
      return mostFrequentShape;
    }
    
    // If no clear winner, return the current detection
    return currentShape;
  }

  private analyzeMouthShape(landmarks: any[]): MouthShape {
    // Simplified and more reliable landmark detection
    const leftCorner = landmarks[61];   // Left mouth corner
    const rightCorner = landmarks[291]; // Right mouth corner
    const upperLip = landmarks[13];     // Upper lip center
    const lowerLip = landmarks[14];     // Lower lip center
    
    // Calculate basic mouth dimensions
    const mouthWidth = Math.abs(rightCorner.x - leftCorner.x);
    const mouthHeight = Math.abs(lowerLip.y - upperLip.y);
    const aspectRatio = mouthWidth / mouthHeight;
    const circularityRatio = mouthHeight / mouthWidth; // higher means closer to circular "O"
    
    // Calculate mouth center for corner elevation
    const mouthCenterY = (upperLip.y + lowerLip.y) / 2;
    const leftCornerElevation = mouthCenterY - leftCorner.y;
    const rightCornerElevation = mouthCenterY - rightCorner.y;
    const avgCornerElevation = (leftCornerElevation + rightCornerElevation) / 2;
    
    // Debug logging to see what's happening
    console.log('Mouth Detection Debug:', {
      mouthWidth: mouthWidth.toFixed(4),
      mouthHeight: mouthHeight.toFixed(4),
      aspectRatio: aspectRatio.toFixed(2),
      avgCornerElevation: avgCornerElevation.toFixed(4),
      circularityRatio: circularityRatio.toFixed(2)
    });
    
    // Optimized detection thresholds for balanced gameplay
     
     // AAA Detection: MUCH bigger opening to clearly differentiate from OOO
     if (mouthHeight > 0.070 && mouthWidth > 0.065) {
       console.log('Detected: AAA (height:', mouthHeight.toFixed(4), ', width:', mouthWidth.toFixed(4), ')');
       return 'aaa';
     }
     
     // OOO Detection FIRST: generous and clearly separated from EEE/AAA
     // New thresholds: width < 0.065, height between 0.003 and 0.060
     // Circularity: height should be at least ~8% of width
     if (
       mouthWidth < 0.065 &&
       mouthHeight > 0.003 &&
       mouthHeight < 0.060 &&
       circularityRatio > 0.08
     ) {
       console.log(
         'Detected: OOO (width:',
         mouthWidth.toFixed(4),
         ', height:',
         mouthHeight.toFixed(4),
         ', circularity:',
         circularityRatio.toFixed(2),
         ')'
       );
       return 'ooo';
     }

     // Fallback OOO: very small mouths with generous circularity
     if (mouthWidth < 0.055 && mouthHeight > 0.002 && circularityRatio > 0.10) {
       console.log(
         'Detected: OOO (fallback) (width:',
         mouthWidth.toFixed(4),
         ', height:',
         mouthHeight.toFixed(4),
         ', circularity:',
         circularityRatio.toFixed(2),
         ')'
       );
       return 'ooo';
     }

     // EEE Detection: MUCH MUCH wider and allow taller height range
     // Increased max height from 0.025 to 0.050 (double)
     if (mouthWidth > 0.090 && mouthHeight > 0.008 && mouthHeight < 0.050) {
       console.log('Detected: EEE (width:', mouthWidth.toFixed(4), ', height:', mouthHeight.toFixed(4), ')');
       return 'eee';
     }
    
    console.log('Detected: NEUTRAL');
    return 'neutral';
  }

  private calculateConfidence(landmarks: any[], mouthShape: MouthShape): number {
    // Simple confidence calculation based on landmark stability
    // In a real implementation, this would be more sophisticated
    if (mouthShape === 'neutral') {
      return 0.3;
    }

    // Higher confidence for detected shapes
    return Math.random() * 0.3 + 0.7; // 0.7 to 1.0
  }

  private drawMouthShapeIndicator(mouthShape: MouthShape, confidence: number) {
    if (!this.canvasCtx || !this.canvasElement) return;

    const ctx = this.canvasCtx;
    const canvas = this.canvasElement;

    // Draw shape indicator in top-right corner
    const x = canvas.width - 120;
    const y = 30;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y, 100, 60);

    // Shape text
    ctx.fillStyle = confidence > 0.7 ? '#4ade80' : '#fbbf24';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(mouthShape.toUpperCase(), x + 50, y + 25);

    // Confidence bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x + 10, y + 35, 80, 8);

    ctx.fillStyle = confidence > 0.7 ? '#4ade80' : '#fbbf24';
    ctx.fillRect(x + 10, y + 35, 80 * confidence, 8);

    // Confidence text
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText(`${Math.round(confidence * 100)}%`, x + 50, y + 55);
  }

  stop() {
    if (this.camera) {
      this.camera.stop();
    }
    this.isInitialized = false;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  // Mock detection for testing without camera
  startMockDetection(onResults: (result: FaceDetectionResult) => void) {
    console.log('🤖 Mock detection service starting...');
    
    // Start with 'aaa' immediately for testing, then cycle through shapes
    const shapes: MouthShape[] = ['aaa', 'eee', 'ooo', 'neutral'];
    let currentIndex = 0;

    // Send first detection immediately after a small delay to ensure game state is ready
    const initialTimeout = setTimeout(() => {
      const mouthShape = shapes[currentIndex];
      const confidence = mouthShape === 'neutral' ? 0.3 : Math.random() * 0.3 + 0.7;

      const result: FaceDetectionResult = {
        landmarks: [], // Empty for mock
        mouthShape,
        confidence,
        timestamp: Date.now(),
        boundingBox: {
          x: 0,
          y: 0,
          width: 640,
          height: 480
        }
      };

      console.log('🤖 Mock detection sending:', { mouthShape, confidence });
      onResults(result);

      currentIndex = (currentIndex + 1) % shapes.length;
    }, 1500); // Wait 1.5 seconds for game state to be ready

    // Then continue with regular interval
    const interval = setInterval(() => {
      const mouthShape = shapes[currentIndex];
      const confidence = mouthShape === 'neutral' ? 0.3 : Math.random() * 0.3 + 0.7;

      const result: FaceDetectionResult = {
        landmarks: [], // Empty for mock
        mouthShape,
        confidence,
        timestamp: Date.now(),
        boundingBox: {
          x: 0,
          y: 0,
          width: 640,
          height: 480
        }
      };

      console.log('🤖 Mock detection sending:', { mouthShape, confidence });
      onResults(result);

      currentIndex = (currentIndex + 1) % shapes.length;
    }, 2000); // Change shape every 2 seconds

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }
}

export const faceDetectionService = new FaceDetectionService();