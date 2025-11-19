import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Home, Trophy } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useGameStore } from '../services/gameState';
import { faceDetectionService } from '../services/faceDetection';
import { FaceDetectionResult, GameState, MouthShape, Obstacle } from '../types';

export const Race: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Get custom course parameters from navigation state
  const customCourseData = location.state as {
    customCourse?: boolean;
    focusArea?: string;
    intensity?: string;
  } | null;
  
  // Use the actual game store
  const gameState = useGameStore();
  const { 
    bird,
    obstacles,
    isGameActive, 
    isPaused, 
    score,
    survivalTime,
    nextRequiredAction,
    actionTimeout,
    successfulMovements,
    performMovement,
    startSession,
    endSession,
    spawnObstacle,
    updateObstacles,
    checkCollisions,
    generateNextAction,
    moveBird,
    attackBalloon,
    currentSession
  } = gameState;

  const [currentMouthShape, setCurrentMouthShape] = useState<MouthShape>('neutral');
  const [currentConfidence, setCurrentConfidence] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(3);
  const [showGameOver, setShowGameOver] = useState(false);
  const startedRef = useRef(false);

  const handleFaceDetectionResult = (result: FaceDetectionResult) => {
    const currentState = useGameStore.getState();
    
    console.log('👄 Face detection result:', { 
      mouthShape: result.mouthShape, 
      confidence: result.confidence,
      isGameActive: currentState.isGameActive,
      isPaused: currentState.isPaused,
      nextRequiredAction: currentState.nextRequiredAction
    });
    
    setCurrentMouthShape(result.mouthShape);
    setCurrentConfidence(result.confidence);
    
    // Trigger movement if not neutral and game is active
    if (result.mouthShape !== 'neutral' && currentState.isGameActive && !currentState.isPaused) {
      console.log('🚀 Attempting movement with:', { mouthShape: result.mouthShape, confidence: result.confidence });
      const movementResult = performMovement(result.mouthShape, result.confidence);
      if (movementResult) {
        console.log('✅ Movement result received:', movementResult);
      } else {
        console.log('❌ Movement failed - no result returned');
      }
    }
  };

  useEffect(() => {
    console.log('🏁 RACE COMPONENT: Starting game session...');
    
    // Log custom course data if present
    if (customCourseData?.customCourse) {
      console.log('🎯 Custom Course Detected:', {
        focusArea: customCourseData.focusArea,
        intensity: customCourseData.intensity
      });
    }
    
    startSession();
    initializeCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      faceDetectionService.stop();
    };
  }, []);

  // Game loop for obstacle race (track deltaTime)
  useEffect(() => {
    if (!isGameActive || isPaused) return;

    let lastTime = performance.now();

    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;

      updateObstacles(deltaTime);
      checkCollisions();
      generateNextAction();
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isGameActive, isPaused]);

  // Ensure obstacles spawn periodically regardless of survival time logic
  useEffect(() => {
    if (!isGameActive || isPaused) return;
    const interval = setInterval(() => {
      spawnObstacle();
    }, 2000);
    return () => clearInterval(interval);
  }, [isGameActive, isPaused, spawnObstacle]);

  // Timer for action timeout
  useEffect(() => {
    if (!isGameActive || isPaused || !nextRequiredAction) return;

    const timer = setInterval(() => {
      const timeRemaining = Math.max(0, actionTimeout - Date.now());
      setTimeLeft(Math.ceil(timeRemaining / 1000));
      
      if (timeRemaining <= 0) {
        setShowGameOver(true);
        endSession();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [isGameActive, isPaused, nextRequiredAction, actionTimeout]);

  // Track when a game session has actually started
  useEffect(() => {
    if (isGameActive) {
      startedRef.current = true;
      setShowGameOver(false);
    }
  }, [isGameActive]);

  // Show Game Over only after a started session ends
  useEffect(() => {
    if (!isGameActive && startedRef.current) {
      setShowGameOver(true);
    }
  }, [isGameActive]);

  const initializeCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user' 
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setStream(mediaStream);
      
      // Initialize real face detection service
      if (videoRef.current && canvasRef.current) {
        await faceDetectionService.initialize(
          videoRef.current,
          canvasRef.current,
          handleFaceDetectionResult
        );
      }
      
    } catch (error) {
      console.error('Camera initialization failed:', error);
      console.log('🤖 Starting mock face detection for testing...');
      
      // Start mock detection for testing when camera fails
      const stopMock = faceDetectionService.startMockDetection(handleFaceDetectionResult);
      
      return () => {
        if (stopMock) stopMock();
      };
    }
  };

  // Temporary keyboard controls for testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isGameActive || isPaused) return;
      if (e.key === 'ArrowLeft') {
        performMovement('eee', 0.9); // move left
      } else if (e.key === 'ArrowRight') {
        performMovement('ooo', 0.9); // move right
      } else if (e.key === ' ') {
        performMovement('aaa', 0.9); // attack
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameActive, isPaused]);

  const togglePause = () => {
    if (isPaused) {
      gameState.resumeSession();
    } else {
      gameState.pauseSession();
    }
  };

  const endRace = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    endSession();
    navigate('/progress');
  };

  const handlePlayAgain = () => {
    setShowGameOver(false);
    startSession();
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const getActionDisplay = (action: string) => {
    switch (action) {
      case 'moveLeft': return 'Move Left (EEE)';
      case 'moveRight': return 'Move Right (OOO)';
      case 'attack': return 'Attack (AAA)';
      default: return 'No Action';
    }
  };

  const getObstacleIcon = (obstacle: Obstacle) => {
    if (obstacle.type === 'rock') return '🪨';
    if (obstacle.type === 'balloon') {
      if (obstacle.isExploding) return '💥';
      return '🎈';
    }
    return '❓';
  };

  return (
    <Layout showNavigation={false}>
      <div className="h-full flex flex-col relative overflow-hidden">
        {/* Game Area */}
        <div className="flex-1 relative bg-gradient-to-b from-sky-400 to-sky-600">
          {/* Bird - position vertically based on game state's bird.y (percent from top) */}
          <motion.div
            className="absolute w-12 h-12 flex items-center justify-center text-4xl z-20 pointer-events-none"
            animate={{ left: `${bird.x}%` }}
            transition={{ type: "tween", duration: 0 }}
            style={{ transform: 'translateX(-50%)', top: `${bird.y}%` }}
          >
            🐦
          </motion.div>

          {/* Obstacles */}
          <AnimatePresence>
            {obstacles
              .filter((ob) => ob.isActive || ob.isExploding)
              .map((obstacle) => (
              <motion.div
                key={obstacle.id}
                className="absolute w-20 h-20 flex items-center justify-center text-5xl z-10 pointer-events-none"
                initial={{ top: '-10%', left: `${obstacle.x}%` }}
                animate={{ top: `${obstacle.y}%`, left: `${obstacle.x}%` }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                style={{ transform: 'translateX(-50%)' }}
              >
                {getObstacleIcon(obstacle)}
              </motion.div>
            ))}
          </AnimatePresence>

        {/* Ground with centered camera and mouth UI */}
          <div className="absolute bottom-0 left-0 right-0 h-28 bg-green-600 z-0">
            {/* Center the camera horizontally in the ground */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="w-28 h-20 bg-black/50 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    playsInline
                  />
                  {/* Hidden canvas for face detection processing */}
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                    width={640}
                    height={480}
                  />
                </div>
                {/* Mouth shape chip to the right of camera (no confidence) */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3">
                  <div className="bg-black/70 rounded-lg px-3 py-2">
                    <span className="text-white text-xs font-bold">
                      {currentMouthShape.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/* HUD removed (debug info not needed) */}

        {/* Debug controls removed */}
      </div>

        {/* Top HUD */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
          <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2">
            <div className="text-white text-sm">Score: {score}</div>
          </div>
          
          {/* Action Required removed */}
          
          <div className="flex space-x-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={togglePause}
              className="bg-black/50 backdrop-blur-sm rounded-xl p-3"
            >
              {isPaused ? (
                <Play className="w-5 h-5 text-white" />
              ) : (
                <Pause className="w-5 h-5 text-white" />
              )}
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={endRace}
              className="bg-black/50 backdrop-blur-sm rounded-xl p-3"
            >
              <Home className="w-5 h-5 text-white" />
            </motion.button>
          </div>
        </div>

        {/* Camera View moved into ground above; confidence UI removed */}

        {/* Movement Instructions moved to top-left under score */}
        <div className="absolute top-20 left-4 z-20">
          <div className="bg-black/50 backdrop-blur-sm rounded-xl p-4">
            <div className="space-y-1 text-white text-xs">
              <div className="text-white text-xs font-bold mb-2">Face Yoga Controls:</div>
              <div className="flex items-center text-blue-400">
                <span className="mr-2">😮</span>
                <span>AAA → Attack Balloon</span>
              </div>
              <div className="flex items-center text-green-400">
                <span className="mr-2">😁</span>
                <span>EEE → Move Left</span>
              </div>
              <div className="flex items-center text-purple-400">
                <span className="mr-2">😗</span>
                <span>OOO → Move Right</span>
              </div>
            </div>
          </div>
        </div>

        
        <AnimatePresence>
          {showGameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                x: [0, -8, 8, -8, 8, 0],
                y: [0, -4, 4, -4, 4, 0]
              }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-700/30 flex items-center justify-center z-30"
              transition={{ duration: 0.6 }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="text-center"
              >
                <h2 className="text-6xl font-extrabold text-red-600 drop-shadow-md mb-6">Game Over</h2>
                <div className="space-y-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePlayAgain}
                    className="w-48 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-4 text-white font-semibold border border-white/20 mx-auto block"
                  >
                    Play Again
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleBackToHome}
                    className="w-48 bg-white/10 rounded-xl p-3 text-white/80 font-medium border border-white/10 mx-auto block"
                  >
                    Home
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pause Overlay */}
        <AnimatePresence>
          {gameState.isPaused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 flex items-center justify-center z-30"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white/20 backdrop-blur-md rounded-3xl p-8 text-center"
              >
                <Pause className="w-16 h-16 text-white mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-4">
                  Race Paused
                </h2>
                <div className="space-y-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={togglePause}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                  >
                    Resume
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={endRace}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                  >
                    End Race
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default Race;
