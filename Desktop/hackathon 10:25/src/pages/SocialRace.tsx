import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Home, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useGameStore } from '../services/gameState';
import { faceDetectionService } from '../services/faceDetection';
import { FaceDetectionResult, GameState, MouthShape, Obstacle, GhostBird } from '../types';

const SocialRace: React.FC = () => {
  const navigate = useNavigate();
  const {
    isGameActive,
    isPaused,
    bird,
    ghostBird,
    obstacles,
    survivalTime,
    nextRequiredAction,
    actionTimeout,
    score,
    isSocialRace,
    endSession,
    pauseSession,
    resumeSession,
    updateObstacles,
    checkCollisions,
    generateNextAction,
    startSocialSession,
    updateGhostBird,
    attackBalloon,
    moveBird,
    performMovement
  } = useGameStore();

  // Log when ghost bird position changes
  useEffect(() => {
    if (ghostBird) {
      console.log('👻 UI: Component re-rendered with ghost bird at x:', ghostBird.x);
    }
  }, [ghostBird?.x]);

  // Periodic logging to track ghost bird movement
  useEffect(() => {
    if (!isGameActive) return;

    const logInterval = setInterval(() => {
      const state = useGameStore.getState();
      console.log('👻 PERIODIC CHECK:', {
        ghostBirdX: state.ghostBird?.x,
        ghostBirdIsActive: state.ghostBird?.isActive,
        ghostBirdSurvivalTime: state.ghostBird?.survivalTime,
        ghostLastMovementAt: state.ghostLastMovementAt,
        timeSinceLastMove: Date.now() - state.ghostLastMovementAt,
        ghostPatternDirection: state.ghostPatternDirection,
        ghostPatternStepsRemaining: state.ghostPatternStepsRemaining,
        isSocialRace: state.isSocialRace,
        isGameActive: state.isGameActive
      });
    }, 2000); // Log every 2 seconds

    return () => clearInterval(logInterval);
  }, [isGameActive]);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const gameLoopRef = useRef<number>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentMouthShape, setCurrentMouthShape] = useState<MouthShape>('neutral');

  // Initialize camera and start social race
  useEffect(() => {
    console.log('🏁 SOCIAL RACE COMPONENT: Starting game session...');

    // Use atomic startSocialSession to avoid race condition
    startSocialSession();
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

  // Game loop for social race (includes ghost bird updates)
  useEffect(() => {
    if (!isGameActive || isPaused) {
      console.log('🎮 GAME LOOP: Not running', { isGameActive, isPaused });
      return;
    }

    console.log('🎮 GAME LOOP: Starting');
    let lastTime = performance.now();
    let frameCount = 0;

    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      frameCount++;

      // Log every 60 frames (roughly once per second at 60fps)
      if (frameCount % 60 === 0) {
        const latestState = useGameStore.getState();
        console.log('🎮 GAME LOOP FRAME:', {
          frame: frameCount,
          deltaTime,
          ghostBirdX: latestState.ghostBird?.x,
          ghostBirdIsActive: latestState.ghostBird?.isActive,
          ghostBirdSurvivalTime: latestState.ghostBird?.survivalTime
        });
      }

      updateObstacles(deltaTime);
      updateGhostBird(deltaTime); // Update ghost bird movement

      // End the race when the ghost's timer expires (ghost deactivates)
      const latestState = useGameStore.getState();
      if (latestState.isSocialRace && latestState.ghostBird && !latestState.ghostBird.isActive) {
        handleGameOver();
        return;
      }

      // Check collisions for player bird
      const collision = checkCollisions();
      if (collision) {
        handleGameOver();
        }

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

  // Ensure obstacles spawn periodically regardless of survival time logic (mirror home Race)
  useEffect(() => {
    if (!isGameActive || isPaused) return;
    const interval = setInterval(() => {
      useGameStore.getState().spawnObstacle();
    }, 2000);
    return () => clearInterval(interval);
  }, [isGameActive, isPaused]);

  // Handle game over logic
  const handleGameOver = () => {
    if (showGameOver) return; // Prevent multiple calls
    
    setShowGameOver(true);
    endSession();
    
    // Determine winner based on survival times
    const playerSurvivalTime = survivalTime;
    const ghostSurvivalTime = ghostBird?.survivalTime || 0;
    const ghostMaxTime = useGameStore.getState().ghostBirdSurvivalTime;
    
    console.log('🏁 RACE RESULTS:', {
      playerTime: playerSurvivalTime,
      ghostTime: ghostSurvivalTime,
      ghostMaxTime: ghostMaxTime
    });
    
    // Player wins if they survived longer than ghost's predetermined time
    const playerWon = playerSurvivalTime > ghostMaxTime;
    setGameResult(playerWon ? 'win' : 'lose');
  };

  // Initialize camera for face detection
  const initializeCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640,
          height: 480,
          facingMode: 'user' 
        } 
      });
      setStream(mediaStream);

      // Attach stream to video element and play (matches Race.tsx)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      // Initialize real face detection service
      if (videoRef.current && canvasRef.current) {
        await faceDetectionService.initialize(
          videoRef.current,
          canvasRef.current,
          handleFaceDetection
        );
      }
    } catch (error) {
      console.error('Camera initialization failed:', error);
      console.log('🤖 Starting mock face detection for testing...');

      // Start mock detection for testing when camera fails
      const stopMock = faceDetectionService.startMockDetection(handleFaceDetection);
      
      return () => {
        if (stopMock) stopMock();
      };
    }
  };

  // Handle face detection results
  const handleFaceDetection = (result: FaceDetectionResult) => {
    const currentState = useGameStore.getState();

    // Track latest detection in UI
    setCurrentMouthShape(result.mouthShape);

    // Mirror original Race behavior: only act when game active and not paused
    if (result.mouthShape !== 'neutral' && currentState.isGameActive && !currentState.isPaused) {
      performMovement(result.mouthShape, result.confidence);
    }
  };

  // Note: movement and attack actions are routed via performMovement,
  // which enforces a 1-second cooldown and single-lane steps.

  // Timer for action timeout
  useEffect(() => {
    if (!isGameActive || isPaused || !nextRequiredAction) return;

    const timer = setInterval(() => {
      const timeRemaining = Math.max(0, actionTimeout - Date.now());
      setTimeLeft(Math.ceil(timeRemaining / 1000));
      
      // Do not end the game on timeout in social race; clear UI only
      if (timeRemaining <= 0) {
        setTimeLeft(0);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [isGameActive, isPaused, nextRequiredAction, actionTimeout]);

  // Handle game controls
  const handlePlayAgain = () => {
    setShowGameOver(false);
    setGameResult(null);
    startSocialSession();
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handlePauseToggle = () => {
    if (isPaused) {
      resumeSession();
    } else {
      pauseSession();
    }
  };

  // Get obstacle icon
  const getObstacleIcon = (obstacle: Obstacle) => {
    if (obstacle.type === 'rock') return '🪨';
    if (obstacle.type === 'balloon') {
      if (obstacle.isExploding) return '💥';
      return '🎈';
    }
    return '❓';
  };

  // Format survival time for display
  const formatTime = (ms: number) => {
    return (ms / 1000).toFixed(1) + 's';
  };

  return (
    <Layout showNavigation={false}>
      <div className="h-full flex flex-col relative overflow-hidden">
        {/* Game Area */}
        <div className="flex-1 relative bg-gradient-to-b from-sky-400 to-sky-600">
          {/* Player Bird */}
          <motion.div
            className="absolute w-12 h-12 flex items-center justify-center text-4xl z-20 pointer-events-none"
            animate={{ left: `${bird.x}%` }}
            transition={{ type: "tween", duration: 0 }}
            style={{ transform: 'translateX(-50%)', top: `${bird.y}%` }}
          >
            🐦
          </motion.div>

          {/* Ghost Bird - Semi-transparent */}
          {ghostBird && ghostBird.isActive && (
            <motion.div
              className="absolute w-12 h-12 flex items-center justify-center text-4xl z-30 pointer-events-none opacity-60"
              animate={{ left: `${ghostBird.x}%` }}
              transition={{ type: "tween", duration: 0 }}
              style={{ transform: 'translateX(-50%)', top: `${ghostBird.y}%` }}
              onAnimationStart={() => {
                console.log('👻 UI: Ghost bird animation started, x:', ghostBird.x);
              }}
            >
              🐤
            </motion.div>
          )}
          {/* Debug info for ghost bird */}
          {ghostBird && (
            <div className="absolute top-32 right-4 bg-black/70 text-white p-2 rounded text-xs z-50">
              <div>Ghost X: {ghostBird.x.toFixed(1)}%</div>
              <div>Ghost Active: {ghostBird.isActive ? 'Yes' : 'No'}</div>
              <div>Ghost Survival: {(ghostBird.survivalTime / 1000).toFixed(1)}s</div>
            </div>
          )}

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
                {/* Mouth shape chip to the right of camera */}
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
        </div>

        {/* Top HUD */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
          <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2">
            <div className="text-white text-sm">Score: {score}</div>
          </div>
          
          <div className="flex space-x-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePauseToggle}
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
              onClick={handleBackToHome}
              className="bg-black/50 backdrop-blur-sm rounded-xl p-3"
            >
              <Home className="w-5 h-5 text-white" />
            </motion.button>
          </div>
        </div>

        {/* Movement Instructions */}
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
              className="absolute inset-0 bg-red-700/30 z-50 flex items-center justify-center p-4"
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="text-center"
              >
                <h2 className="text-6xl font-extrabold text-red-600 drop-shadow-md mb-6">
                  Game Over
                </h2>
                <div className="space-y-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePlayAgain}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-4 text-white font-semibold border border-white/20"
                  >
                    Play Again
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleBackToHome}
                    className="w-full bg-white/10 rounded-xl p-3 text-white/80 font-medium border border-white/10"
                  >
                    Back to Home
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

export default SocialRace;
