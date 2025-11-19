import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monster as MonsterType, AttackPhase } from '../types';

interface MonsterProps {
  monster: MonsterType;
  currentAttackPhase: AttackPhase;
  lastAttack?: {
    damage: number;
    part: string;
    timestamp: number;
  } | null;
}

export const Monster: React.FC<MonsterProps> = ({ monster, currentAttackPhase, lastAttack }) => {
  const getHealthPercentage = (current: number, max: number) => (current / max) * 100;
  
  const getHealthBarColor = (percentage: number) => {
    if (percentage > 60) return 'bg-green-500';
    if (percentage > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const isPartAttacked = (part: string) => {
    if (!lastAttack) return false;
    return lastAttack.part === part && Date.now() - lastAttack.timestamp < 1000;
  };
 
  const getCurrentProgressiveImage = () => {
    // Show healthy.png initially, then progress through damaged images based on phase
    // Only show damaged images if we're in that phase (meaning previous phases are complete)
    switch (currentAttackPhase) {
      case 'head':
        // Show healthy initially, then head2 when head phase is active
        return '/head2.JPG';
      case 'arms':
        // Show arm2 when in arms phase (head phase completed)
        return '/arm2.JPG';
      case 'legs':
        // Show leg2 when in legs phase (head and arms phases completed)
        return '/leg2.JPG';
      default:
        // Default to healthy image
        return '/healthy.png';
    }
  };

  const getCurrentAttackedPart = () => {
    // Return the part that corresponds to the current phase
    switch (currentAttackPhase) {
      case 'head':
        return 'head';
      case 'arms':
        return 'leftArm'; // or 'rightArm', using leftArm as representative
      case 'legs':
        return 'legs';
      default:
        return null;
    }
  };

  const shouldShowHealthBar = (part: 'head' | 'arms' | 'legs') => {
    // Show health bar if we're in that phase or if that part is damaged
    switch (part) {
      case 'head':
        return currentAttackPhase === 'head' || monster.parts.head.health < monster.parts.head.maxHealth;
      case 'arms':
        return currentAttackPhase === 'arms' || monster.parts.leftArm.health < monster.parts.leftArm.maxHealth || monster.parts.rightArm.health < monster.parts.rightArm.maxHealth;
      case 'legs':
        return currentAttackPhase === 'legs' || monster.parts.legs.health < monster.parts.legs.maxHealth;
      default:
        return false;
    }
  };

  const getArmsHealth = () => {
    // Combined arms health for display
    const totalHealth = monster.parts.leftArm.health + monster.parts.rightArm.health;
    const totalMaxHealth = monster.parts.leftArm.maxHealth + monster.parts.rightArm.maxHealth;
    return { health: totalHealth, maxHealth: totalMaxHealth };
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Monster Name */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-4"
      >
        <h2 className="text-2xl font-bold text-white text-center">
          {monster.name}
        </h2>
      </motion.div>

      {/* Health Bars */}
      <div className="mb-4 space-y-2 w-full max-w-xs">
        {/* Head Health Bar */}
        {shouldShowHealthBar('head') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-lg p-2"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-white text-sm font-bold">Head</span>
              <span className="text-white text-xs">
                {monster.parts.head.health}/{monster.parts.head.maxHealth}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getHealthBarColor(getHealthPercentage(monster.parts.head.health, monster.parts.head.maxHealth))}`}
                style={{ width: `${getHealthPercentage(monster.parts.head.health, monster.parts.head.maxHealth)}%` }}
              />
            </div>
          </motion.div>
        )}

        {/* Arms Health Bar */}
        {shouldShowHealthBar('arms') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-lg p-2"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-white text-sm font-bold">Arms</span>
              <span className="text-white text-xs">
                {getArmsHealth().health}/{getArmsHealth().maxHealth}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getHealthBarColor(getHealthPercentage(getArmsHealth().health, getArmsHealth().maxHealth))}`}
                style={{ width: `${getHealthPercentage(getArmsHealth().health, getArmsHealth().maxHealth)}%` }}
              />
            </div>
          </motion.div>
        )}

        {/* Legs Health Bar */}
        {shouldShowHealthBar('legs') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-lg p-2"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-white text-sm font-bold">Legs</span>
              <span className="text-white text-xs">
                {monster.parts.legs.health}/{monster.parts.legs.maxHealth}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getHealthBarColor(getHealthPercentage(monster.parts.legs.health, monster.parts.legs.maxHealth))}`}
                style={{ width: `${getHealthPercentage(monster.parts.legs.health, monster.parts.legs.maxHealth)}%` }}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Progressive Monster Image */}
      <motion.div
        animate={isPartAttacked(getCurrentAttackedPart() || '') ? { 
          scale: [1, 1.1, 1], 
          rotate: [0, -5, 5, 0] 
        } : {}}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        {/* Main Progressive Image - Made Much Taller */}
        <div className="w-64 h-80 rounded-2xl flex items-center justify-center border-4 border-green-400 overflow-hidden bg-white shadow-2xl">
          <img 
            src={getCurrentProgressiveImage()} 
            alt={`Monster Phase: ${currentAttackPhase}`}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Attack Effect */}
        <AnimatePresence>
          {isPartAttacked(getCurrentAttackedPart() || '') && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-red-500 rounded-2xl"
            />
          )}
        </AnimatePresence>

        {/* Damage Number */}
        <AnimatePresence>
          {isPartAttacked(getCurrentAttackedPart() || '') && lastAttack && (
            <motion.div
              initial={{ y: 0, opacity: 1, scale: 1 }}
              animate={{ y: -40, opacity: 0, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute top-0 left-1/2 transform -translate-x-1/2 text-red-400 font-bold text-3xl pointer-events-none"
            >
              -{lastAttack.damage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase Indicator */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="bg-black/70 rounded-lg px-3 py-1">
            <div className="text-white text-sm font-bold text-center">
              {currentAttackPhase.toUpperCase()} PHASE
            </div>
          </div>
        </div>
      </motion.div>

      {/* Monster Defeated Overlay */}
      <AnimatePresence>
        {monster.isDefeated && (
          <motion.div
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: 1, scale: 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="bg-black/70 rounded-3xl p-6 text-center">
              <div className="text-6xl mb-2">💀</div>
              <div className="text-white font-bold text-xl">DEFEATED!</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Monster;