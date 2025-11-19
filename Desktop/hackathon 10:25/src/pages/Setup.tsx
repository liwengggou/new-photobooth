import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import { Layout } from '../components/Layout';
import { faceDetectionService } from '../services/faceDetection';
import { FaceDetectionResult } from '../types';

export const Setup: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [detectedShape, setDetectedShape] = useState<string>('neutral');
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [useMockDetection, setUseMockDetection] = useState(false);

  useEffect(() => {
    requestCameraPermission();
    
    return () => {
      // Cleanup face detection service when component unmounts
      faceDetectionService.stop();
    };
  }, []);

  const handleFaceDetectionResult = (result: FaceDetectionResult) => {
    setDetectedShape(result.mouthShape);
    setDetectionConfidence(result.confidence);
  };

  const requestCameraPermission = async () => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        setTimeout(requestCameraPermission, 100);
        return;
      }

      await faceDetectionService.initialize(
        videoRef.current,
        canvasRef.current,
        handleFaceDetectionResult
      );
      
      setCameraPermission('granted');
      setUseMockDetection(false);
    } catch (error) {
      console.error('Camera permission denied:', error);
      setCameraPermission('denied');
      
      // Start mock detection for demo purposes
      setUseMockDetection(true);
      const stopMock = faceDetectionService.startMockDetection(handleFaceDetectionResult);
      
      // Store cleanup function for later use
      return stopMock;
    }
  };

  

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-400';
    if (confidence > 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Layout showTopNavigation={false}>
      <div className="h-full overflow-y-auto p-4 pt-4 pb-20 space-y-6">
        {/* Camera Permission Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gray-800 rounded-2xl p-6"
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              cameraPermission === 'granted' ? 'bg-green-500' : 
              cameraPermission === 'denied' ? 'bg-red-500' : 'bg-yellow-500'
            }`}>
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Camera Access</h3>
              <p className="text-gray-400">
                {cameraPermission === 'granted' && 'Camera ready for face detection'}
                {cameraPermission === 'denied' && 'Using mock detection for demo'}
                {cameraPermission === 'pending' && 'Requesting camera permission...'}
              </p>
            </div>
          </div>

          {cameraPermission === 'denied' && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4">
              <p className="text-yellow-400 text-sm">
                Camera access was denied, but you can still try the demo with mock face detection.
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={requestCameraPermission}
                className="mt-3 bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-lg text-white font-medium"
              >
                Try Camera Again
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Camera Preview */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white mb-4">
            {useMockDetection ? 'Mock Detection Preview' : 'Camera Preview'}
          </h3>
          
          <div className="relative bg-black rounded-xl overflow-hidden">
            {!useMockDetection ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                />
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  className="absolute inset-0 w-full h-full"
                />
              </>
            ) : (
              <div className="w-full h-64 bg-gray-700 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">🤖</div>
                  <div className="text-white">Mock Detection Mode</div>
                  <div className="text-gray-400 text-sm">Simulating face detection</div>
                </div>
              </div>
            )}
            
            {/* Detection overlay */}
            <div className="absolute top-4 right-4 bg-black/70 rounded-lg p-2">
              <div className="text-white text-sm">
                Shape: <span className="font-bold text-yellow-400">{detectedShape.toUpperCase()}</span>
              </div>
              <div className={`text-sm ${getConfidenceColor(detectionConfidence)}`}>
                Confidence: {Math.round(detectionConfidence * 100)}%
              </div>
            </div>
          </div>
        </motion.div>

        {/* Detection Adjustment Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white mb-4">Detection Adjustment</h3>
          <p className="text-gray-400 mb-6">
            Fine-tune detection per sound. These controls are coming soon.
          </p>
          <div className="space-y-3">
            <motion.button
              className="w-full bg-white/10 hover:bg-white/15 py-3 px-6 rounded-xl text-white font-medium flex items-center justify-center"
            >
              Adjust AAA
            </motion.button>
            <motion.button
              className="w-full bg-white/10 hover:bg-white/15 py-3 px-6 rounded-xl text-white font-medium flex items-center justify-center"
            >
              Adjust EEE
            </motion.button>
            <motion.button
              className="w-full bg-white/10 hover:bg-white/15 py-3 px-6 rounded-xl text-white font-medium flex items-center justify-center"
            >
              Adjust OOO
            </motion.button>
          </div>
        </motion.div>

        

        {/* Instructions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white mb-4">How It Works</h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                A
              </div>
              <div className="text-gray-300">
                <span className="text-red-400 font-bold">AAA</span> - Open mouth wide to attack the monster's head
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                E
              </div>
              <div className="text-gray-300">
                <span className="text-blue-400 font-bold">EEE</span> - Stretch mouth wide to attack the monster's arms
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                O
              </div>
              <div className="text-gray-300">
                <span className="text-green-400 font-bold">OOO</span> - Make round mouth to attack the monster's legs
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <p className="text-blue-400 text-sm">
              💡 Tip: Make clear, exaggerated mouth shapes for best detection results!
            </p>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Setup;
