import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MouthShape } from '../types';

interface MonsterImageProps {
  progress: number; // 0-6 representing damage progression
  mouthShape?: MouthShape; // For future mouth-shape attack logic
  showDebugControls?: boolean; // Optional debug controls
  onProgressChange?: (newProgress: number) => void; // Callback for debug controls
  className?: string;
}

export const MonsterImage: React.FC<MonsterImageProps> = ({
  progress,
  mouthShape = 'neutral',
  showDebugControls = false,
  onProgressChange,
  className = ''
}) => {
  // Image mapping based on progress state
  const getImagePath = (progressState: number): string => {
    const imageMap: Record<number, string> = {
      0: '/healthy.png',      // Healthy state
      1: '/head1.JPG',        // Head damage stage 1
      2: '/head2.JPG',        // Head damage stage 2
      3: '/arm1.JPG',         // Arm damage stage 1
      4: '/arm2.JPG',         // Arm damage stage 2
      5: '/leg1.JPG',         // Leg damage stage 1
      6: '/leg2.JPG'          // Leg damage stage 2
    };
    
    // Clamp progress to valid range
    const clampedProgress = Math.max(0, Math.min(6, progressState));
    return imageMap[clampedProgress] || imageMap[0];
  };

  // Get damage stage description for accessibility and debugging
  const getDamageDescription = (progressState: number): string => {
    const descriptions: Record<number, string> = {
      0: 'Healthy Monster',
      1: 'Head Damage - Stage 1',
      2: 'Head Damage - Stage 2',
      3: 'Arm Damage - Stage 1',
      4: 'Arm Damage - Stage 2',
      5: 'Leg Damage - Stage 1',
      6: 'Leg Damage - Stage 2'
    };
    
    const clampedProgress = Math.max(0, Math.min(6, progressState));
    return descriptions[clampedProgress] || descriptions[0];
  };

  // Animation variants for smooth transitions
  const imageVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.3,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0, 
      scale: 1.1,
      transition: { 
        duration: 0.2,
        ease: "easeIn"
      }
    }
  };

  // Attack effect animation based on mouth shape (for future use)
  const getAttackEffect = () => {
    if (mouthShape === 'neutral') return null;
    
    const effectColors = {
      'aaa': 'from-red-500/30 to-red-600/30',    // Head attacks
      'eee': 'from-blue-500/30 to-blue-600/30',  // Arm attacks
      'ooo': 'from-green-500/30 to-green-600/30' // Leg attacks
    };

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1.2 }}
        exit={{ opacity: 0, scale: 1.4 }}
        transition={{ duration: 0.5 }}
        className={`absolute inset-0 bg-gradient-radial ${effectColors[mouthShape]} rounded-lg pointer-events-none`}
      />
    );
  };

  // Debug controls for testing
  const handleProgressChange = (delta: number) => {
    if (onProgressChange) {
      const newProgress = Math.max(0, Math.min(6, progress + delta));
      onProgressChange(newProgress);
    }
  };

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {/* Monster Image Container */}
      <div className="relative w-80 h-80 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.img
            key={`monster-${progress}`}
            src={getImagePath(progress)}
            alt={getDamageDescription(progress)}
            variants={imageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            onError={(e) => {
              console.error(`Failed to load monster image: ${getImagePath(progress)}`);
              // Fallback to healthy state if image fails to load
              if (progress !== 0 && onProgressChange) {
                onProgressChange(0);
              }
            }}
          />
        </AnimatePresence>

        {/* Attack Effect Overlay */}
        <AnimatePresence>
          {getAttackEffect()}
        </AnimatePresence>

        {/* Progress Indicator */}
        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-black/70 rounded-full px-3 py-1">
            <span className="text-white text-sm font-medium">
              Stage {progress}/6
            </span>
          </div>
        </div>
      </div>

      {/* Damage Description */}
      <motion.div
        key={`description-${progress}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-4 text-center"
      >
        <h3 className="text-lg font-semibold text-white">
          {getDamageDescription(progress)}
        </h3>
        {mouthShape !== 'neutral' && (
          <p className="text-sm text-gray-300 mt-1">
            Attack Mode: {mouthShape.toUpperCase()}
          </p>
        )}
      </motion.div>

      {/* Debug Controls */}
      {showDebugControls && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex items-center space-x-4 bg-black/50 rounded-lg p-4"
        >
          <button
            onClick={() => handleProgressChange(-1)}
            disabled={progress <= 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            ← Previous
          </button>
          
          <div className="flex flex-col items-center">
            <span className="text-white text-sm">Progress</span>
            <span className="text-white font-bold text-xl">{progress}</span>
          </div>
          
          <button
            onClick={() => handleProgressChange(1)}
            disabled={progress >= 6}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            Next →
          </button>
          
          <button
            onClick={() => onProgressChange && onProgressChange(0)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Reset
          </button>
        </motion.div>
      )}

      {/* Mouth Shape Debug (for future development) */}
      {showDebugControls && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 flex items-center space-x-2 bg-black/50 rounded-lg p-3"
        >
          <span className="text-white text-sm">Mouth Shape:</span>
          {(['neutral', 'aaa', 'eee', 'ooo'] as MouthShape[]).map((shape) => (
            <button
              key={shape}
              onClick={() => {
                // This would be connected to mouth shape detection in the future
                console.log(`Mouth shape changed to: ${shape}`);
              }}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                mouthShape === shape
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              {shape.toUpperCase()}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default MonsterImage;