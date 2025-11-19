import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Home, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Monster as MonsterComponent } from '../components/Monster';
import { useGameStore } from '../services/gameState';
import { faceDetectionService } from '../services/faceDetection';
import { FaceDetectionResult, GameState, MouthShape, Monster } from '../types';

export const Battle: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Use the actual game store instead of local state
  const gameState = useGameStore();
  const { 
    currentMonster, 
    currentAttackPhase, 
    isGameActive, 
    isPaused, 
    score, 
    performAttack,
    startSession,
    getCurrentPhaseAllowedMouthShape,
    currentSession
  } = gameState;

  // Debug current game state
  console.log('🎮 BATTLE RENDER - Current Game State:', { 
    isGameActive, 
    isPaused, 
    currentAttackPhase,
    hasCurrentSession: !!currentSession,
    monsterDefeated: currentMonster.isDefeated,
    score,
    monsterHealth: {
      head: `${currentMonster.parts.head.health}/${currentMonster.parts.head.maxHealth}`,
      leftArm: `${currentMonster.parts.leftArm.health}/${currentMonster.parts.leftArm.maxHealth}`,
      rightArm: `${currentMonster.parts.rightArm.health}/${currentMonster.parts.rightArm.maxHealth}`,
      legs: `${currentMonster.parts.legs.health}/${currentMonster.parts.legs.maxHealth}`
    }
  });

  // Monitor monster health changes
  useEffect(() => {
    console.log('🏥 MONSTER HEALTH CHANGED:', {
      head: `${currentMonster.parts.head.health}/${currentMonster.parts.head.maxHealth}`,
      leftArm: `${currentMonster.parts.leftArm.health}/${currentMonster.parts.leftArm.maxHealth}`,
      rightArm: `${currentMonster.parts.rightArm.health}/${currentMonster.parts.rightArm.maxHealth}`,
      legs: `${currentMonster.parts.legs.health}/${currentMonster.parts.legs.maxHealth}`,
      isDefeated: currentMonster.isDefeated
    });
  }, [currentMonster]);

  const [currentMouthShape, setCurrentMouthShape] = useState<MouthShape>('neutral');
  const [currentConfidence, setCurrentConfidence] = useState<number>(0);
  const [lastAttack, setLastAttack] = useState<{
    damage: number;
    part: string;
    timestamp: number;
  } | null>(null);
  const [showVictory, setShowVictory] = useState(false);

  const handleFaceDetectionResult = (result: FaceDetectionResult) => {
    // Get current state directly from store to avoid stale closure values
    const currentState = useGameStore.getState();
    
    console.log('👄 Face detection result:', { 
      mouthShape: result.mouthShape, 
      confidence: result.confidence,
      isGameActive: currentState.isGameActive,
      isPaused: currentState.isPaused,
      currentPhase: currentState.currentAttackPhase
    });
    
    setCurrentMouthShape(result.mouthShape);
    setCurrentConfidence(result.confidence);
    
    // Trigger attack if not neutral and game is active
    if (result.mouthShape !== 'neutral' && currentState.isGameActive && !currentState.isPaused) {
      console.log('🚀 Attempting attack with:', { mouthShape: result.mouthShape, confidence: result.confidence });
      const attackResult = performAttack(result.mouthShape, result.confidence);
      if (attackResult) {
        console.log('✅ Attack result received:', attackResult);
        setLastAttack({
          damage: attackResult.damage,
          part: attackResult.target,
          timestamp: attackResult.timestamp
        });
        
        // Clear attack indicator after animation
        setTimeout(() => {
          setLastAttack(null);
        }, 1000);
      } else {
        console.log('❌ Attack failed - no result returned');
      }
    } else {
      console.log('⏸️ Attack not triggered:', { 
        mouthShape: result.mouthShape, 
        isGameActive: currentState.isGameActive, 
        isPaused: currentState.isPaused 
      });
    }
  };

  useEffect(() => {
    // Initialize game session
    console.log('🎮 BATTLE COMPONENT: Starting game session...');
    startSession();
    console.log('🎮 BATTLE COMPONENT: Game session started, current state:', { 
      isGameActive, 
      isPaused, 
      hasCurrentSession: !!currentSession 
    });
    initializeCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      // Cleanup face detection service
      faceDetectionService.stop();
    };
  }, []);

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
      
      // Store cleanup function
      return () => {
        if (stopMock) stopMock();
      };
    }
  };



  // Check for monster defeat and show victory
  useEffect(() => {
    if (currentMonster.isDefeated) {
      setShowVictory(true);
      setTimeout(() => {
        setShowVictory(false);
        startSession(); // Start a new session with a fresh monster
      }, 1000);
    }
  }, [currentMonster.isDefeated]);

  const togglePause = () => {
    if (isPaused) {
      gameState.resumeSession();
    } else {
      gameState.pauseSession();
    }
  };

  const endSession = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    gameState.endSession();
    navigate('/progress');
  };

  return (
    <Layout showNavigation={false}>
      <div className="h-full flex flex-col relative">
        {/* Top HUD */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
          <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2">
            <div className="text-white text-sm">Score: {score}</div>
          </div>
          
          {/* Phase Indicator */}
          <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2">
            <div className="text-white text-sm font-bold">
              Phase: {currentAttackPhase.toUpperCase()}
            </div>
            <div className="text-white text-xs">
              Use: {getCurrentPhaseAllowedMouthShape()?.toUpperCase() || 'NONE'}
            </div>
          </div>
          
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
              onClick={endSession}
              className="bg-black/50 backdrop-blur-sm rounded-xl p-3"
            >
              <Home className="w-5 h-5 text-white" />
            </motion.button>
          </div>
        </div>

        {/* Camera View */}
        <div className="absolute bottom-4 right-4 z-20">
          <div className="w-24 h-18 bg-black/50 rounded-lg overflow-hidden">
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
          
          {/* Current mouth shape and confidence indicator */}
          <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 space-y-1">
            <div className="bg-black/70 rounded-lg px-2 py-1">
              <span className="text-white text-xs font-bold">
                {currentMouthShape.toUpperCase()}
              </span>
            </div>
            <div className="bg-black/70 rounded-lg px-2 py-1">
              <div className="text-white text-xs">
                Conf: {(currentConfidence * 100).toFixed(0)}%
              </div>
              <div className="w-12 h-1 bg-gray-600 rounded-full mt-1">
                <div 
                  className={`h-full rounded-full transition-all duration-200 ${
                    currentConfidence >= 0.5 ? 'bg-green-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${Math.min(currentConfidence * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Monster Area */}
        <div className="flex-1 flex items-center justify-center">
          <MonsterComponent 
            monster={currentMonster}
            currentAttackPhase={currentAttackPhase}
            lastAttack={lastAttack}
          />
        </div>

        {/* Attack Instructions */}
        <div className="absolute bottom-4 left-4 z-20">
          <div className="bg-black/50 backdrop-blur-sm rounded-xl p-4">
            <div className="space-y-1 text-white text-xs">
              <div className="text-white text-xs font-bold mb-2">Current Phase: {currentAttackPhase.toUpperCase()}</div>
              <div className={`flex items-center ${currentAttackPhase === 'head' ? 'text-green-400 font-bold' : 'text-gray-500'}`}>
                <span className="mr-2">😮</span>
                <span>AAA → Head {currentAttackPhase === 'head' ? '(ACTIVE)' : ''}</span>
              </div>
              <div className={`flex items-center ${currentAttackPhase === 'arms' ? 'text-green-400 font-bold' : 'text-gray-500'}`}>
                <span className="mr-2">😁</span>
                <span>EEE → Arms {currentAttackPhase === 'arms' ? '(ACTIVE)' : ''}</span>
              </div>
              <div className={`flex items-center ${currentAttackPhase === 'legs' ? 'text-green-400 font-bold' : 'text-gray-500'}`}>
                <span className="mr-2">😗</span>
                <span>OOO → Legs {currentAttackPhase === 'legs' ? '(ACTIVE)' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Victory Modal */}
        <AnimatePresence>
          {showVictory && (
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
                className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl p-8 text-center"
              >
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Monster Defeated!
                </h2>
                <p className="text-white/90 mb-4">
                  Great job! A new challenger approaches...
                </p>
                <div className="text-white/80 text-sm">
                  Score: +{gameState.score}
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
                  Game Paused
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
                    onClick={endSession}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                  >
                    End Session
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

export default Battle;