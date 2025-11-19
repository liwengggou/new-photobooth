import { create } from 'zustand';
import { 
  GameState, 
  Monster, 
  AttackResult, 
  AttackLog,
  MovementResult,
  MouthShape, 
  AttackPhase,
  ExerciseSession, 
  UserProfile, 
  Achievement,
  Bird,
  Obstacle,
  GhostBird,
  STORAGE_KEYS,
  DEFAULT_MONSTER_HEALTH 
} from '../types';

// Strict 6-lane layout across the screen (percent positions)
// Equal spacing around center (50%), with ~13% side margins
// Positions: 13, 27.8, 42.6, 57.4, 72.2, 87 => center sits between lanes 3 & 4
const LANE_POSITIONS = [13, 27.8, 42.6, 57.4, 72.2, 87] as const;

const clampLaneIndex = (i: number) => Math.max(0, Math.min(LANE_POSITIONS.length - 1, i));
const getLaneIndexFromX = (x: number) => {
  // Find nearest lane index to a given x percentage
  let nearestIndex = 0;
  let nearestDist = Infinity;
  for (let i = 0; i < LANE_POSITIONS.length; i++) {
    const d = Math.abs(LANE_POSITIONS[i] - x);
    if (d < nearestDist) {
      nearestDist = d;
      nearestIndex = i;
    }
  }
  return nearestIndex;
};
const getLaneX = (laneIndex: number) => LANE_POSITIONS[clampLaneIndex(laneIndex)];

  interface GameStore extends GameState {
  // Actions
  initializeGame: () => void;
  startSession: () => void;
  endSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  performAttack: (mouthShape: MouthShape, confidence: number) => AttackResult | null;
  performMovement: (mouthShape: MouthShape, confidence: number) => MovementResult | null;
  updateScore: (points: number) => void;
  resetGame: () => void;
  loadUserProfile: () => UserProfile;
  saveUserProfile: (profile: UserProfile) => void;
  updateAchievements: (session: ExerciseSession) => void;
  advancePhase: () => void;
  getCurrentPhaseAllowedMouthShape: () => MouthShape | null;
  testDamageSystem: () => void;
  // Obstacle race specific
  spawnObstacle: () => void;
  updateObstacles: (deltaTime?: number) => void;
  checkCollisions: () => boolean;
  generateNextAction: () => void;
  moveBird: (direction: 'left' | 'right') => void;
  attackBalloon: (obstacleId: string) => void;
  // Social race specific
  startSocialRace: () => void;
  startSocialSession: () => void;
  updateGhostBird: (deltaTime?: number) => void;
    moveGhostBird: (direction: 'left' | 'right') => void;
  }

const createDefaultMonster = (): Monster => ({
  id: 'goblin-1',
  name: 'Training Goblin',
  type: 'goblin',
  level: 1,
  parts: {
    head: { health: DEFAULT_MONSTER_HEALTH, maxHealth: DEFAULT_MONSTER_HEALTH },
    leftArm: { health: DEFAULT_MONSTER_HEALTH, maxHealth: DEFAULT_MONSTER_HEALTH },
    rightArm: { health: DEFAULT_MONSTER_HEALTH, maxHealth: DEFAULT_MONSTER_HEALTH },
    legs: { health: DEFAULT_MONSTER_HEALTH, maxHealth: DEFAULT_MONSTER_HEALTH }
  },
  isDefeated: false,
  weaknesses: {
    head: 'aaa',
    leftArm: 'eee',
    rightArm: 'eee',
    legs: 'ooo'
  }
});

const createDefaultBird = (): Bird => ({
  id: 'bird-1',
  // Center in lane 3 (index 3 out of 0..5)
  x: getLaneX(3),
  y: 78, // slightly higher to match new visual row
  isMoving: false,
  direction: null
});

const createGhostBird = (): GhostBird => ({
  id: 'ghost-bird',
  x: getLaneX(3), // center lane using lane helper
  y: 78, // match player bird vertical position
  isMoving: false,
  direction: null,
  survivalTime: 0,
  isActive: true
});

const createObstacle = (type: 'rock' | 'balloon', rowIndex?: number, sessionStartTime?: number): Obstacle => {
  // Determine which row to spawn in
  let targetRowIndex: number;
  
  if (rowIndex !== undefined) {
    // Specific row requested (for pattern generation)
    targetRowIndex = rowIndex;
  } else {
    // Auto-determine next obstacle row based on timing
    const timeSinceStart = sessionStartTime ? Date.now() - sessionStartTime : 0;
    const rowsPerSecond = 0.5; // Adjust for desired obstacle frequency
    targetRowIndex = Math.floor(timeSinceStart / 1000 * rowsPerSecond) * ROWS_PER_BLOCK;
  }
  
  // Only spawn obstacles in rows that should have them
  if (!shouldHaveObstacles(targetRowIndex)) {
    throw new Error(`Row ${targetRowIndex} should not have obstacles`);
  }
  
  // Spawn ONLY on exact lane positions (existing system)
  const laneIndex = Math.floor(Math.random() * LANE_POSITIONS.length);
  
  return {
    id: `obstacle-${Date.now()}-${Math.random()}`,
    type,
    x: getLaneX(laneIndex), // Horizontal positioning (existing)
    // Spawn new rows at the top so they drop down over time
    y: 0,
    width: type === 'rock' ? 8 : 6,
    height: type === 'rock' ? 8 : 6,
    speed: 5, // equal speed for rock and balloon (~5%/s)
    isActive: true,
    isExploding: false,
    explodedAt: undefined,
    rowIndex: targetRowIndex // NEW: Track which row this belongs to
  };
};

const getAttackTarget = (mouthShape: MouthShape): keyof Monster['parts'] => {
  switch (mouthShape) {
    case 'aaa': return 'head';
    case 'eee': return Math.random() > 0.5 ? 'leftArm' : 'rightArm';
    case 'ooo': return 'legs';
    default: return 'head';
  }
};

const calculateDamage = (mouthShape: MouthShape, target: keyof Monster['parts'], monster: Monster, confidence: number): number => {
  // Fixed damage of 20 per successful attack for consistent 5-attack progression
  // This ensures exactly 5 expressions defeat each 100 HP monster part
  const baseDamage = 20;
  
  // Check if attack is effective against target (for visual feedback)
  const isEffective = monster.weaknesses[target] === mouthShape;
  
  console.log('⚔️ CALCULATE DAMAGE:', { 
    mouthShape, 
    target, 
    confidence, 
    baseDamage, 
    isEffective,
    targetHealth: monster.parts[target].health,
    targetMaxHealth: monster.parts[target].maxHealth
  });
  
  // Return consistent damage regardless of confidence or effectiveness
  // This creates predictable progression: 5 attacks = 1 defeated part
  return baseDamage;
};

  export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  currentMonster: createDefaultMonster(),
  currentSession: null,
  score: 0,
  streak: 0,
  isGameActive: false,
  isPaused: false,
  currentAttackPhase: 'head',
  lastAttack: null,
  // Obstacle race specific
  bird: createDefaultBird(),
  obstacles: [],
  survivalTime: 0,
  lastObstacleSpawn: Date.now(),
  nextRequiredAction: null,
  actionTimeout: 0,
    successfulMovements: 0,
    lastMovementAt: 0,
    // Throttle ghost movement separately to avoid jitter
    ghostLastMovementAt: 0,
    // Ghost friend-like movement pattern defaults
    ghostStepIntervalMs: 1000, // 1 lane per second
    ghostPatternDirection: 'right',
    ghostPatternStepsRemaining: 0,
    ghostPatternInitialized: false,
  // Social race specific
  ghostBird: null,
  isSocialRace: false,
  ghostBirdSurvivalTime: 0,

  // Actions
  initializeGame: () => {
    set({
      currentMonster: createDefaultMonster(),
      currentSession: null,
      score: 0,
      streak: 0,
      isGameActive: false,
      isPaused: false,
      currentAttackPhase: 'head' as AttackPhase,
      lastAttack: null,
      // Obstacle race specific
      bird: createDefaultBird(),
      obstacles: [],
      survivalTime: 0,
      lastObstacleSpawn: 0,
      nextRequiredAction: null,
      actionTimeout: 0,
      successfulMovements: 0,
      lastMovementAt: 0
    });
  },

  startSession: () => {
    // Create a fresh monster for each new session
    const freshMonster = createDefaultMonster();
    
    const newSession: ExerciseSession = {
      id: `session-${Date.now()}`,
      userId: 'user-1',
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
      score: 0,
      accuracy: 0,
      attacksPerformed: [],
      monsterDefeated: false
    };

    console.log('🎮 OBSTACLE RACE SESSION STARTED');
    console.log('🐦 BIRD CREATED AT CENTER POSITION');

    set({
      currentMonster: freshMonster, // Keep for compatibility
      currentSession: newSession,
      isGameActive: true,
      isPaused: false,
      currentAttackPhase: 'head', // Keep for compatibility
      score: 0,
      streak: 0,
      lastAttack: null, // Clear any previous attack data
      // Obstacle race specific
      bird: createDefaultBird(),
      obstacles: [],
      survivalTime: 0,
      lastObstacleSpawn: Date.now(),
      nextRequiredAction: null,
      actionTimeout: 0,
      successfulMovements: 0,
      lastMovementAt: 0,
      // Social race specific - reset to defaults
      ghostBird: null,
      isSocialRace: false,
      ghostBirdSurvivalTime: 0
    });

    // Spawn an initial obstacle immediately, and another after 2 seconds
    get().spawnObstacle();
    setTimeout(() => {
      get().spawnObstacle();
    }, 2000);
  },

  endSession: () => {
    const currentState = get();
    console.log('🛑 ENDING SESSION - Current State:', {
      isActive: currentState.isGameActive,
      hasSession: !!currentState.currentSession,
      score: currentState.score,
      survivalTime: currentState.survivalTime
    });
    
    if (currentState.currentSession) {
      const session = currentState.currentSession;
      session.endTime = new Date().toISOString();
      session.duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
      
      // Save race statistics if this was a race session
      if (currentState.survivalTime > 0) {
        const bestTime = localStorage.getItem('best_survival_time');
        if (!bestTime || currentState.survivalTime > parseInt(bestTime)) {
          localStorage.setItem('best_survival_time', currentState.survivalTime.toString());
        }
        
        const totalRaces = localStorage.getItem('total_races');
        const currentRaces = totalRaces ? parseInt(totalRaces) : 0;
        localStorage.setItem('total_races', (currentRaces + 1).toString());
      }
      
      // Save session to history
      const sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.EXERCISE_SESSIONS) || '[]');
      sessions.push(session);
      localStorage.setItem(STORAGE_KEYS.EXERCISE_SESSIONS, JSON.stringify(sessions));
      
      // Update user profile
      const profile = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PROFILE) || '{}');
      profile.totalExercises = (profile.totalExercises || 0) + currentState.successfulMovements;
      profile.lastActiveAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    }
    
    set({
      isGameActive: false,
      isPaused: false,
      currentSession: null,
      bird: createDefaultBird(),
      obstacles: [],
      survivalTime: 0,
      lastObstacleSpawn: 0,
      nextRequiredAction: null,
      actionTimeout: 0,
      successfulMovements: 0
    });
  },

  pauseSession: () => {
    set({ isPaused: true });
  },

  resumeSession: () => {
    set({ isPaused: false });
  },

  performAttack: (mouthShape: MouthShape, confidence: number): AttackResult | null => {
    console.log('🚀 PERFORM ATTACK CALLED:', { mouthShape, confidence });
    const state = get();
    
    console.log('🎮 CURRENT GAME STATE:', { 
      isGameActive: state.isGameActive, 
      isPaused: state.isPaused, 
      hasCurrentSession: !!state.currentSession,
      isMonsterDefeated: state.currentMonster.isDefeated,
      currentPhase: state.currentAttackPhase
    });
    
    if (!state.isGameActive || state.isPaused || !state.currentSession || state.currentMonster.isDefeated) {
      console.log('❌ ATTACK BLOCKED: Game not active or paused');
      return null;
    }

    // Only block neutral mouth shapes - NO confidence threshold for instant attacks
    if (mouthShape === 'neutral') {
      console.log('❌ ATTACK BLOCKED: Neutral mouth shape', { mouthShape });
      return null;
    }

    // Check if the mouth shape is allowed for the current phase
    const allowedMouthShape = get().getCurrentPhaseAllowedMouthShape();
    console.log('🔍 PHASE CHECK:', { allowedMouthShape, mouthShape, currentPhase: state.currentAttackPhase });
    if (allowedMouthShape !== mouthShape) {
      console.log('❌ ATTACK BLOCKED: Wrong mouth shape for current phase');
      return null; // Attack not allowed in current phase
    }

    const target = getAttackTarget(mouthShape);
    
    // Ensure attack targets the correct part for the current phase
    const currentPhase = state.currentAttackPhase;
    let isValidTarget = false;
    
    if (currentPhase === 'head' && target === 'head') {
      isValidTarget = true;
    } else if (currentPhase === 'arms' && (target === 'leftArm' || target === 'rightArm')) {
      isValidTarget = true;
    } else if (currentPhase === 'legs' && target === 'legs') {
      isValidTarget = true;
    }
    
    if (!isValidTarget) {
      console.log('❌ ATTACK BLOCKED: Invalid target for current phase', { target, currentPhase });
      return null; // Attack doesn't target the correct part for current phase
    }

    const damage = calculateDamage(mouthShape, target, state.currentMonster, confidence);
    console.log('💥 ATTACK SUCCESSFUL!', { target, damage, mouthShape, confidence });
    
    // Apply damage
    const newMonster = { ...state.currentMonster };
    const oldHealth = newMonster.parts[target].health;
    const maxHealth = newMonster.parts[target].maxHealth;
    
    console.log('🩸 BEFORE DAMAGE APPLICATION:', {
      target,
      currentHealth: oldHealth,
      maxHealth,
      damageToApply: damage,
      healthPercentage: Math.round((oldHealth / maxHealth) * 100)
    });
    
    newMonster.parts[target].health = Math.max(0, newMonster.parts[target].health - damage);
    const newHealth = newMonster.parts[target].health;
    
    console.log('🩸 AFTER DAMAGE APPLICATION:', { 
      target, 
      damage, 
      oldHealth, 
      newHealth, 
      maxHealth,
      healthRemaining: newHealth,
      healthPercentage: Math.round((newHealth / maxHealth) * 100),
      attacksNeeded: newHealth > 0 ? Math.ceil(newHealth / damage) : 0,
      isPartDefeated: newHealth === 0,
      healthBarWidth: `${Math.round((newHealth / maxHealth) * 100)}%`
    });
    
    // Log all monster parts health after this attack
    console.log('🏥 ALL MONSTER PARTS HEALTH AFTER ATTACK:', {
      head: `${newMonster.parts.head.health}/${newMonster.parts.head.maxHealth} (${Math.round((newMonster.parts.head.health / newMonster.parts.head.maxHealth) * 100)}%)`,
      leftArm: `${newMonster.parts.leftArm.health}/${newMonster.parts.leftArm.maxHealth} (${Math.round((newMonster.parts.leftArm.health / newMonster.parts.leftArm.maxHealth) * 100)}%)`,
      rightArm: `${newMonster.parts.rightArm.health}/${newMonster.parts.rightArm.maxHealth} (${Math.round((newMonster.parts.rightArm.health / newMonster.parts.rightArm.maxHealth) * 100)}%)`,
      legs: `${newMonster.parts.legs.health}/${newMonster.parts.legs.maxHealth} (${Math.round((newMonster.parts.legs.health / newMonster.parts.legs.maxHealth) * 100)}%)`
    });
    
    // Check if monster is defeated
    const totalHealth = Object.values(newMonster.parts).reduce((sum, part) => sum + part.health, 0);
    newMonster.isDefeated = totalHealth === 0;

    const attackResult: AttackResult = {
      damage,
      target,
      mouthShape,
      confidence,
      timestamp: Date.now(),
      isEffective: newMonster.weaknesses[target] === mouthShape
    };

    // Create attack log entry
    const attackLog: AttackLog = {
      id: `attack-${Date.now()}`,
      sessionId: state.currentSession.id,
      mouthShape,
      targetPart: target,
      damage,
      confidence,
      attackTime: Date.now()
    };

    // Update session
    const updatedSession = {
      ...state.currentSession,
      attacksPerformed: [...state.currentSession.attacksPerformed, attackLog]
    };

    // Update score
    const scoreIncrease = damage * (attackResult.isEffective ? 2 : 1);
    const newScore = state.score + scoreIncrease;
    
    // Update streak
    const newStreak = attackResult.isEffective ? state.streak + 1 : 0;

    // Check for phase progression
    let newPhase = state.currentAttackPhase;
    let phaseChanged = false;
    
    if (state.currentAttackPhase === 'head' && newMonster.parts.head.health === 0) {
      newPhase = 'arms';
      phaseChanged = true;
      console.log('🎯 PHASE PROGRESSION: Head defeated! Moving to Arms phase');
    } else if (state.currentAttackPhase === 'arms' && 
               newMonster.parts.leftArm.health === 0 && 
               newMonster.parts.rightArm.health === 0) {
      newPhase = 'legs';
      phaseChanged = true;
      console.log('🎯 PHASE PROGRESSION: Both arms defeated! Moving to Legs phase');
    }
    
    if (phaseChanged) {
      console.log('🎯 PHASE CHANGE DETAILS:', { 
        from: state.currentAttackPhase, 
        to: newPhase,
        monsterHealth: {
          head: `${newMonster.parts.head.health}/${newMonster.parts.head.maxHealth}`,
          leftArm: `${newMonster.parts.leftArm.health}/${newMonster.parts.leftArm.maxHealth}`,
          rightArm: `${newMonster.parts.rightArm.health}/${newMonster.parts.rightArm.maxHealth}`,
          legs: `${newMonster.parts.legs.health}/${newMonster.parts.legs.maxHealth}`
        }
      });
    }

    console.log('🔄 UPDATING STATE WITH NEW VALUES:', {
      newMonsterHealth: {
        head: `${newMonster.parts.head.health}/${newMonster.parts.head.maxHealth}`,
        leftArm: `${newMonster.parts.leftArm.health}/${newMonster.parts.leftArm.maxHealth}`,
        rightArm: `${newMonster.parts.rightArm.health}/${newMonster.parts.rightArm.maxHealth}`,
        legs: `${newMonster.parts.legs.health}/${newMonster.parts.legs.maxHealth}`
      },
      newScore,
      newStreak,
      newPhase,
      lastAttack: { damage, part: target, timestamp: Date.now() }
    });

    set({
      currentMonster: newMonster,
      currentSession: updatedSession,
      score: newScore,
      streak: newStreak,
      currentAttackPhase: newPhase,
      lastAttack: {
        damage,
        part: target,
        timestamp: Date.now()
      }
    });

    // Verify state was updated
    const updatedState = get();
    console.log('✅ STATE UPDATE VERIFICATION:', {
      stateAfterUpdate: {
        head: `${updatedState.currentMonster.parts.head.health}/${updatedState.currentMonster.parts.head.maxHealth}`,
        leftArm: `${updatedState.currentMonster.parts.leftArm.health}/${updatedState.currentMonster.parts.leftArm.maxHealth}`,
        rightArm: `${updatedState.currentMonster.parts.rightArm.health}/${updatedState.currentMonster.parts.rightArm.maxHealth}`,
        legs: `${updatedState.currentMonster.parts.legs.health}/${updatedState.currentMonster.parts.legs.maxHealth}`
      },
      score: updatedState.score,
      phase: updatedState.currentAttackPhase,
      lastAttack: updatedState.lastAttack
    });

    console.log('✅ ATTACK COMPLETED - State updated successfully');
    return attackResult;
  },

  updateScore: (points: number) => {
    set(state => ({ score: state.score + points }));
  },

  resetGame: () => {
    get().initializeGame();
  },

  loadUserProfile: (): UserProfile => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (saved) {
      return JSON.parse(saved);
    }

    const defaultProfile: UserProfile = {
      id: 'user-1',
      name: 'Player',
      level: 1,
      experience: 0,
      totalExercises: 0,
      monstersDefeated: 0,
      accuracy: 0,
      lastActiveAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(defaultProfile));
    return defaultProfile;
  },

  saveUserProfile: (profile: UserProfile) => {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  },

  updateAchievements: (session: ExerciseSession) => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    let achievements: Achievement[] = [];

    if (saved) {
      achievements = JSON.parse(saved);
    } else {
      // Initialize default achievements
      achievements = [
        {
          id: 'first-monster',
          name: 'First Victory',
          description: 'Defeat your first monster',
          requirement: {
            type: 'monsters',
            value: 1
          },
          unlockedAt: undefined
        },
        {
          id: 'streak-master',
          name: 'Streak Master',
          description: 'Maintain a 7-day streak',
          requirement: {
            type: 'streak',
            value: 7
          },
          unlockedAt: undefined
        },
        {
          id: 'accuracy-expert',
          name: 'Accuracy Expert',
          description: 'Achieve 90% accuracy in a session',
          requirement: {
            type: 'accuracy',
            value: 90
          },
          unlockedAt: undefined
        },
        {
          id: 'monster-slayer',
          name: 'Monster Slayer',
          description: 'Defeat 10 monsters',
          requirement: {
            type: 'monsters',
            value: 10
          },
          unlockedAt: undefined
        }
      ];
    }

    const profile = get().loadUserProfile();
    let updated = false;

    // Update achievements based on session
    achievements.forEach(achievement => {
      if (achievement.unlockedAt) return;

      switch (achievement.id) {
        case 'first-monster':
          if (session.monsterDefeated && !achievement.unlockedAt) {
            achievement.unlockedAt = new Date();
            updated = true;
          }
          break;

        case 'accuracy-expert':
          if (session.accuracy >= 90 && !achievement.unlockedAt) {
            achievement.unlockedAt = new Date();
            updated = true;
          }
          break;

        case 'monster-slayer':
          if (profile.monstersDefeated >= 10 && !achievement.unlockedAt) {
            achievement.unlockedAt = new Date();
            updated = true;
          }
          break;

        case 'streak-master':
          // Note: We don't have streak tracking in the current profile, so this is disabled for now
          // if (profile.currentStreak >= 7 && !achievement.unlockedAt) {
          //   achievement.unlockedAt = new Date();
          //   updated = true;
          // }
          break;
      }
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
    }
  },

  advancePhase: () => {
    const state = get();
    let newPhase: AttackPhase = state.currentAttackPhase;
    
    if (state.currentAttackPhase === 'head' && state.currentMonster.parts.head.health === 0) {
      newPhase = 'arms';
    } else if (state.currentAttackPhase === 'arms' && 
               state.currentMonster.parts.leftArm.health === 0 && 
               state.currentMonster.parts.rightArm.health === 0) {
      newPhase = 'legs';
    }
    
    if (newPhase !== state.currentAttackPhase) {
      set({ currentAttackPhase: newPhase });
    }
  },

  getCurrentPhaseAllowedMouthShape: (): MouthShape | null => {
    const state = get();
    switch (state.currentAttackPhase) {
      case 'head':
        return 'aaa';
      case 'arms':
        return 'eee';
      case 'legs':
        return 'ooo';
      default:
        return null;
    }
  },

  // Obstacle race specific methods
  spawnObstacle: () => {
    const state = get();
    if (!state.isGameActive) return;
  
    const now = Date.now();
    
    // Determine next obstacle row based on timing
    const sessionStartTime = state.currentSession ? new Date(state.currentSession.startTime).getTime() : now;
    const timeSinceStart = now - sessionStartTime;
    const rowsPerSecond = 0.5; // Adjust for desired frequency
    const nextRowIndex = Math.floor(timeSinceStart / 1000 * rowsPerSecond);

    // Enforce 1 obstacle row + 2 blank rows pattern
    if (!shouldHaveObstacles(nextRowIndex)) {
      // Skip spawning on non-obstacle rows
      set({ lastObstacleSpawn: now });
      return;
    }
    
    // Generate pattern for this row
    const pattern = generateObstaclePattern(nextRowIndex);
    
    // Create obstacles following the pattern
    const newObstacles: Obstacle[] = [];
    
    pattern.forEach((type, laneIndex) => {
      if (type !== 'empty') {
        // Prevent overlapping: ensure only one obstacle per row+lane
        const existsSameRowLane = state.obstacles.some(ob =>
          ob.rowIndex === nextRowIndex && getLaneIndexFromX(ob.x) === laneIndex && ob.isActive
        );
        if (existsSameRowLane) {
          return; // skip spawning duplicate on the same position
        }

        const obstacle = createObstacle(type, nextRowIndex, sessionStartTime);
        obstacle.x = getLaneX(laneIndex);
        newObstacles.push(obstacle);
      }
    });
    
    // Determine required actions based on obstacles in bird's lane
    let requiredAction: 'moveLeft' | 'moveRight' | 'attack' | null = null;
    
    const birdLane = getLaneIndexFromX(state.bird.x);
    const obstacleInBirdLane = newObstacles.find(obs => 
      getLaneIndexFromX(obs.x) === birdLane
    );
    
    if (obstacleInBirdLane) {
      if (obstacleInBirdLane.type === 'balloon') {
        requiredAction = 'attack';
      } else {
        requiredAction = birdLane > 0 ? 'moveLeft' : 'moveRight';
      }
    }
  
    set({
      obstacles: [...state.obstacles, ...newObstacles],
      lastObstacleSpawn: now,
      nextRequiredAction: requiredAction,
      actionTimeout: now + 3000
    });
  },

  updateObstacles: (deltaTime: number = 16) => {
    const state = get();
    if (!state.isGameActive) return;

    // Fallback if deltaTime is not provided or invalid
    if (!deltaTime || Number.isNaN(deltaTime)) {
      deltaTime = 16; // ~60fps
    }

    // Convert to seconds for speed calculation (speed is % per second)
    const deltaSec = deltaTime / 1000;

    const now = Date.now();
    const updatedObstacles = state.obstacles
      .map(obstacle => ({
        ...obstacle,
        y: obstacle.y + (obstacle.speed * deltaSec) // speed in %/s
      }))
      .filter(obstacle => obstacle.y < 110); // Remove obstacles that fell off screen

    // Clear explosion state after duration for balloons
    const EXPLOSION_DURATION_MS = 400;
    const cleanedObstacles = updatedObstacles.map(ob => {
      if (ob.type === 'balloon' && ob.isExploding && ob.explodedAt) {
        const elapsed = now - ob.explodedAt;
        if (elapsed > EXPLOSION_DURATION_MS) {
          return { ...ob, isExploding: false, isActive: false };
        }
      }
      return ob;
    });

    // Check for timeout
    if (state.nextRequiredAction && now > state.actionTimeout) {
      // Timeout should not end the session; clear required action and continue
      set({ nextRequiredAction: null, actionTimeout: 0 });
    }

    // Check for collisions (lane-based)
    const collision = get().checkCollisions();
    if (collision) {
      // In Social Race, let the page component handle game over UI and winner logic
      if (state.isSocialRace) {
        return;
      }
      // Normal race: end session immediately
      get().endSession();
      return;
    }

    // Spawn new obstacles periodically
    const timeSinceLastSpawn = now - state.lastObstacleSpawn;
    // More reasonable spawn timing; min 1200ms, scales slightly with survival time
    const spawnInterval = Math.max(2000 - (state.survivalTime / 15000), 1200);
    
    if (timeSinceLastSpawn > spawnInterval) {
      get().spawnObstacle();
    }

    set({
      obstacles: cleanedObstacles,
      survivalTime: state.survivalTime + deltaTime
    });
  },

  checkCollisions: (): boolean => {
    const state = get();
    const bird = state.bird;
    const birdLane = getLaneIndexFromX(bird.x);

    // Lane-based collision: collide if same lane and overlapping near bird
    return state.obstacles.some(obstacle => {
      if (!obstacle.isActive) return false;

      const obstacleLane = getLaneIndexFromX(obstacle.x);
      if (obstacleLane !== birdLane) return false;

      // Vertical proximity: consider collision when obstacle reaches bird's vertical zone
      const verticalOverlap = Math.abs(obstacle.y - bird.y) <= (obstacle.height / 2 + 2);

      if (!verticalOverlap) return false;

      if (obstacle.type === 'rock') {
        // Rocks always cause game over on collision
        return true;
      }

      if (obstacle.type === 'balloon') {
        // Balloons cause game over ONLY if not attacked yet (still 🎈)
        const notAttacked = !obstacle.isExploding; // not currently exploding
        return notAttacked;
      }

      return false;
    });
  },

  generateNextAction: () => {
    const state = get();
    if (!state.isGameActive) return;

    // Find the most urgent obstacle
    const urgentObstacle = state.obstacles
      .filter(obstacle => obstacle.y > 20 && obstacle.y < 70) // In the danger zone
      .sort((a, b) => a.y - b.y)[0];

    if (!urgentObstacle) {
      set({ nextRequiredAction: null, actionTimeout: 0 });
      return;
    }

    let requiredAction: 'moveLeft' | 'moveRight' | 'attack' | null = null;

    if (urgentObstacle.type === 'balloon') {
      requiredAction = 'attack';
    } else {
      // Rock - require movement ONLY if obstacle shares bird lane
      const birdLane = getLaneIndexFromX(state.bird.x);
      const obstacleLane = getLaneIndexFromX(urgentObstacle.x);
      if (obstacleLane === birdLane) {
        requiredAction = birdLane > 0 ? 'moveLeft' : 'moveRight';
      }
    }

    set({
      nextRequiredAction: requiredAction,
      actionTimeout: Date.now() + 3000
    });
  },

  moveBird: (direction: 'left' | 'right') => {
    const state = get();
    if (!state.isGameActive) return;
    // Snap by one lane at a time
    const currentLane = getLaneIndexFromX(state.bird.x);
    const targetLane = clampLaneIndex(direction === 'left' ? currentLane - 1 : currentLane + 1);
    const newX = getLaneX(targetLane);

    console.log('🐦 MOVE BIRD:', { from: state.bird.x, to: newX, direction });

    set({
      bird: {
        ...state.bird,
        x: newX,
        isMoving: true,
        direction
      },
      lastMovementAt: Date.now()
    });

    // Stop movement animation after short delay
    setTimeout(() => {
      set(state => ({
        bird: {
          ...state.bird,
          isMoving: false,
          direction: null
        }
      }));
    }, 300);
  },

  attackBalloon: (obstacleId: string) => {
    const state = get();
    if (!state.isGameActive) return;

    // Set exploding state for visual feedback, then remove after delay
    const EXPLOSION_DURATION_MS = 400;
    const updatedObstacles = state.obstacles.map(obstacle => {
      if (obstacle.id === obstacleId && obstacle.type === 'balloon') {
        return { ...obstacle, isExploding: true, explodedAt: Date.now() };
      }
      return obstacle;
    });

    set({
      obstacles: updatedObstacles,
      score: state.score + 100,
      successfulMovements: state.successfulMovements + 1
    });

    // After explosion duration, deactivate the balloon
    setTimeout(() => {
      const s = get();
      set({
        obstacles: s.obstacles.map(ob =>
          ob.id === obstacleId && ob.type === 'balloon'
            ? { ...ob, isActive: false, isExploding: false }
            : ob
        )
      });
    }, EXPLOSION_DURATION_MS);
  },

  // Social race specific methods
  startSocialRace: () => {
    const state = get();

    // Set random survival time for ghost bird (between 15-45 seconds for testing)
    const randomSurvivalTime = 15000 + Math.random() * 30000;
    const now = Date.now();

    const ghostBird = createGhostBird();

    // Set ghostLastMovementAt to 1 second in the past so the first move happens immediately
    const initialMovementTime = now - 1000;

    console.log('👻 SOCIAL RACE STARTED:', {
      survivalTime: randomSurvivalTime,
      ghostBirdInitialX: ghostBird.x,
      ghostBirdInitialY: ghostBird.y,
      ghostBirdIsActive: ghostBird.isActive,
      initialDirection: 'right',
      initialStepsRemaining: 2,
      ghostLastMovementAt: initialMovementTime,
      now: now,
      timeSinceLastMove: now - initialMovementTime,
      stepIntervalMs: 1000
    });

    set({
      isSocialRace: true,
      ghostBird: ghostBird,
      ghostBirdSurvivalTime: randomSurvivalTime,
      // Initialize friend-like stepping pattern: first segment is 2 steps to right
      ghostPatternDirection: 'right',
      ghostPatternStepsRemaining: 2,
      ghostPatternInitialized: true,
      ghostLastMovementAt: initialMovementTime // Set to 1 second ago so first move happens immediately
    });
  },

  startSocialSession: () => {
    // Create a fresh monster for compatibility
    const freshMonster = createDefaultMonster();

    const newSession: ExerciseSession = {
      id: `session-${Date.now()}`,
      userId: 'user-1',
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
      score: 0,
      accuracy: 0,
      attacksPerformed: [],
      monsterDefeated: false
    };

    // Set random survival time for ghost bird (between 15-45 seconds for testing)
    const randomSurvivalTime = 15000 + Math.random() * 30000;
    const now = Date.now();

    const ghostBird = createGhostBird();

    // Set ghostLastMovementAt to 1 second in the past so the first move happens immediately
    const initialMovementTime = now - 1000;

    console.log('🎮 SOCIAL RACE SESSION STARTED (ATOMIC)');
    console.log('🐦 BIRD CREATED AT CENTER POSITION');
    console.log('👻 GHOST BIRD INITIALIZED:', {
      survivalTime: randomSurvivalTime,
      ghostBirdInitialX: ghostBird.x,
      ghostBirdInitialY: ghostBird.y,
      ghostBirdIsActive: ghostBird.isActive,
      initialDirection: 'right',
      initialStepsRemaining: 2,
      ghostLastMovementAt: initialMovementTime,
      now: now,
      timeSinceLastMove: now - initialMovementTime,
      stepIntervalMs: 1000
    });

    // Atomically set all state in one operation to avoid race conditions
    set({
      // Session state
      currentMonster: freshMonster,
      currentSession: newSession,
      isGameActive: true,
      isPaused: false,
      currentAttackPhase: 'head',
      score: 0,
      streak: 0,
      lastAttack: null,
      // Obstacle race specific
      bird: createDefaultBird(),
      obstacles: [],
      survivalTime: 0,
      lastObstacleSpawn: Date.now(),
      nextRequiredAction: null,
      actionTimeout: 0,
      successfulMovements: 0,
      lastMovementAt: 0,
      // Social race specific - initialize ghost bird atomically
      isSocialRace: true,
      ghostBird: ghostBird,
      ghostBirdSurvivalTime: randomSurvivalTime,
      // Ghost movement pattern
      ghostPatternDirection: 'right',
      ghostPatternStepsRemaining: 2,
      ghostPatternInitialized: true,
      ghostLastMovementAt: initialMovementTime
    });

    // Spawn initial obstacles
    get().spawnObstacle();
    setTimeout(() => {
      get().spawnObstacle();
    }, 2000);
  },

  updateGhostBird: (deltaTime: number = 16) => {
    const state = get();

    // ALWAYS log the first check to debug
    console.log('👻 updateGhostBird CALLED:', {
      isGameActive: state.isGameActive,
      hasGhostBird: !!state.ghostBird,
      isActive: state.ghostBird?.isActive,
      ghostLastMovementAt: state.ghostLastMovementAt,
      now: Date.now(),
      timeSinceLastMove: Date.now() - state.ghostLastMovementAt
    });

    if (!state.isGameActive || !state.ghostBird || !state.ghostBird.isActive) {
      console.log('👻 updateGhostBird EARLY RETURN:', {
        isGameActive: state.isGameActive,
        hasGhostBird: !!state.ghostBird,
        isActive: state.ghostBird?.isActive
      });
      return;
    }

    const ghostBird = state.ghostBird;
    const newSurvivalTime = ghostBird.survivalTime + deltaTime;
    const now = Date.now();

    // Friend-like stepping pattern at 1 lane/sec (1000ms per step)
    const timeSinceLastMove = now - state.ghostLastMovementAt;
    const stepReady = timeSinceLastMove >= state.ghostStepIntervalMs;

    console.log('👻 updateGhostBird CHECK:', {
      timeSinceLastMove,
      stepIntervalMs: state.ghostStepIntervalMs,
      stepReady,
      currentX: ghostBird.x,
      direction: state.ghostPatternDirection,
      stepsRemaining: state.ghostPatternStepsRemaining,
      now: now,
      ghostLastMovementAt: state.ghostLastMovementAt
    });

    if (stepReady) {
      let direction = state.ghostPatternDirection;
      let stepsRemaining = state.ghostPatternStepsRemaining;

      console.log('👻 BEFORE DIRECTION CHECK:', { direction, stepsRemaining });

      if (stepsRemaining <= 0) {
        // Toggle direction
        const oldDirection = direction;
        direction = direction === 'right' ? 'left' : 'right';
        // After initial 2-right, all subsequent segments use 4 steps
        stepsRemaining = 4;
        console.log('👻 DIRECTION TOGGLED:', { from: oldDirection, to: direction, newStepsRemaining: stepsRemaining });
      }

      // Check boundaries: avoid moving off the lane edges
      const currentLaneIndex = getLaneIndexFromX(state.ghostBird!.x);
      const canGoLeft = currentLaneIndex > 0;
      const canGoRight = currentLaneIndex < LANE_POSITIONS.length - 1;

      // Only move if we can move in the intended direction, otherwise skip this step
      const canMove = (direction === 'left' && canGoLeft) || (direction === 'right' && canGoRight);

      console.log('👻 MOVE CHECK:', {
        direction,
        stepsRemaining,
        currentLaneIndex,
        canGoLeft,
        canGoRight,
        canMove,
        lanePositions: LANE_POSITIONS
      });

      if (canMove) {
        console.log('👻 ✅ MOVING GHOST BIRD:', { direction, from: ghostBird.x });
        get().moveGhostBird(direction);

        // Verify the move happened
        const afterMoveState = get();
        console.log('👻 AFTER MOVE:', {
          newX: afterMoveState.ghostBird?.x,
          oldX: ghostBird.x,
          changed: afterMoveState.ghostBird?.x !== ghostBird.x
        });

        set({
          ghostLastMovementAt: now,
          ghostPatternDirection: direction,
          ghostPatternStepsRemaining: Math.max(0, stepsRemaining - 1)
        });
      } else {
        console.log('👻 ❌ CANNOT MOVE - at boundary');
        // If we can't move in the intended direction, just update the timer
        // and decrement steps so we continue the pattern
        set({
          ghostLastMovementAt: now,
          ghostPatternStepsRemaining: Math.max(0, stepsRemaining - 1)
        });
      }
    }

    // Check if ghost bird should be defeated (based on random survival time)
    // IMPORTANT: Get fresh state after potential movement to avoid overwriting position
    const currentState = get();
    const currentGhostBird = currentState.ghostBird;

    if (!currentGhostBird) return; // Safety check

    if (newSurvivalTime >= state.ghostBirdSurvivalTime) {
      set({
        ghostBird: {
          ...currentGhostBird, // Use current ghost bird state, not the stale reference
          isActive: false,
          survivalTime: newSurvivalTime
        }
      });
      console.log('👻 GHOST BIRD DEFEATED after', newSurvivalTime, 'ms');
    } else {
      set({
        ghostBird: {
          ...currentGhostBird, // Use current ghost bird state, not the stale reference
          survivalTime: newSurvivalTime
        }
      });
    }
  },

  moveGhostBird: (direction: 'left' | 'right') => {
    const state = get();
    if (!state.isGameActive || !state.ghostBird || !state.ghostBird.isActive) {
      console.log('👻 moveGhostBird BLOCKED:', {
        isGameActive: state.isGameActive,
        hasGhostBird: !!state.ghostBird,
        isActive: state.ghostBird?.isActive
      });
      return;
    }

    const ghostBird = state.ghostBird;
    const currentLane = getLaneIndexFromX(ghostBird.x);
    const targetLane = clampLaneIndex(direction === 'left' ? currentLane - 1 : currentLane + 1);
    const newX = getLaneX(targetLane);

    console.log('👻 moveGhostBird EXECUTING:', {
      fromX: ghostBird.x,
      toX: newX,
      fromLane: currentLane,
      toLane: targetLane,
      direction,
      lanePositions: LANE_POSITIONS
    });

    set({
      ghostBird: {
        ...ghostBird,
        x: newX,
        isMoving: true,
        direction
      }
    });

    // Verify the state was updated
    const afterState = get();
    console.log('👻 moveGhostBird STATE UPDATED:', {
      newGhostBirdX: afterState.ghostBird?.x,
      expectedX: newX,
      success: afterState.ghostBird?.x === newX
    });

    // Stop movement animation after short delay
    setTimeout(() => {
      set(state => ({
        ghostBird: state.ghostBird ? {
          ...state.ghostBird,
          isMoving: false,
          direction: null
        } : null
      }));
    }, 300);
  },

  performMovement: (mouthShape: MouthShape, confidence: number): MovementResult | null => {
    const state = get();
    
    if (!state.isGameActive || state.isPaused || !state.currentSession) {
      return null;
    }

    if (mouthShape === 'neutral') {
      return null;
    }

    const now = Date.now();
    let movementType: 'moveLeft' | 'moveRight' | 'attack' | null = null;
    let success = false;
    let scoreGained = 0;

    // Map mouth shapes to movements
    if (mouthShape === 'eee') {
      movementType = 'moveLeft';
    } else if (mouthShape === 'ooo') {
      movementType = 'moveRight';
    } else if (mouthShape === 'aaa') {
      movementType = 'attack';
    }

    // Throttle movement to once per second
    const MOVEMENT_COOLDOWN_MS = 1000;
    const canMove = now - state.lastMovementAt >= MOVEMENT_COOLDOWN_MS;

    // Allow movement only if cooldown passed
    if ((movementType === 'moveLeft' || movementType === 'moveRight') && canMove) {
      console.log('➡️ MOVE BIRD:', movementType);
      // Map to actual direction strings expected by moveBird('left' | 'right')
      const dir = movementType === 'moveLeft' ? 'left' : 'right';
      get().moveBird(dir);
    } else if (movementType === 'attack') {
      // Attempt to attack balloon ONLY if in same lane and near bird
      const birdLane = getLaneIndexFromX(state.bird.x);
      const NEAR_VERTICAL_UNITS = 10; // widen to 10 units to register reliably
      const targetBalloon = state.obstacles
        .filter(obstacle => obstacle.type === 'balloon' && obstacle.isActive && !obstacle.isExploding)
        .find(ob => {
          const sameLane = getLaneIndexFromX(ob.x) === birdLane;
          const nearBird = Math.abs(ob.y - state.bird.y) <= NEAR_VERTICAL_UNITS;
          return sameLane && nearBird;
        });

      if (targetBalloon) {
        console.log('🎯 ATTACK BALLOON:', targetBalloon.id);
        get().attackBalloon(targetBalloon.id);
        // Reward extra if attack was required
        scoreGained = state.nextRequiredAction === 'attack' ? 100 : 50;
      }
    }

    // Determine success only if matching required action
    if (state.nextRequiredAction && movementType === state.nextRequiredAction) {
      success = true;
      scoreGained = movementType === 'attack' ? Math.max(scoreGained, 100) : 50;

      // Clear required action on success
      set({
        nextRequiredAction: null,
        actionTimeout: 0,
        score: state.score + scoreGained,
        successfulMovements: state.successfulMovements + 1
      });
    } else {
      // Not matching required action: no game over, keep timer running
      if (scoreGained > 0) {
        set({ score: state.score + scoreGained });
      }
    }

    return {
      success,
      type: movementType!,
      mouthShape,
      confidence,
      timestamp: now,
      scoreGained
    };
  },

  // Test function to verify the 5-attack system
  testDamageSystem: () => {
    console.log('🧪 TESTING DAMAGE SYSTEM - Starting test...');
    
    // Initialize fresh game state
    get().initializeGame();
    get().startSession();
    
    const state = get();
    console.log('🧪 Initial monster health:', {
      head: `${state.currentMonster.parts.head.health}/${state.currentMonster.parts.head.maxHealth}`,
      leftArm: `${state.currentMonster.parts.leftArm.health}/${state.currentMonster.parts.leftArm.maxHealth}`,
      rightArm: `${state.currentMonster.parts.rightArm.health}/${state.currentMonster.parts.rightArm.maxHealth}`,
      legs: `${state.currentMonster.parts.legs.health}/${state.currentMonster.parts.legs.maxHealth}`
    });
    
    // Test 5 attacks on head (should defeat it)
    console.log('🧪 Testing 5 attacks on head...');
    for (let i = 1; i <= 5; i++) {
      const result = get().performAttack('aaa', 0.9);
      if (result) {
        console.log(`🧪 Attack ${i}/5 - Head health: ${get().currentMonster.parts.head.health}/100 (${Math.round((get().currentMonster.parts.head.health / 100) * 100)}%)`);
      }
    }
    
    const finalState = get();
    console.log('🧪 Final head health after 5 attacks:', finalState.currentMonster.parts.head.health);
    console.log('🧪 Head should be defeated (0 HP):', finalState.currentMonster.parts.head.health === 0);
    console.log('🧪 Current phase should be "arms":', finalState.currentAttackPhase === 'arms');
    
    if (finalState.currentMonster.parts.head.health === 0 && finalState.currentAttackPhase === 'arms') {
      console.log('✅ 5-ATTACK SYSTEM TEST PASSED!');
    } else {
      console.log('❌ 5-ATTACK SYSTEM TEST FAILED!');
    }
  }
}));

// Add vertical row system constants after existing lane constants
const ROW_HEIGHT = 8; // 8% of screen height per row
const ROWS_PER_BLOCK = 2;
const VERTICAL_ROWS = [0, 8] as const; // Y positions within each block

// Helper functions for vertical row system
const getRowY = (rowIndex: number): number => {
  const blockIndex = Math.floor(rowIndex / ROWS_PER_BLOCK);
  const rowInBlock = rowIndex % ROWS_PER_BLOCK;
  return blockIndex * (ROWS_PER_BLOCK * ROW_HEIGHT) + VERTICAL_ROWS[rowInBlock];
};

const shouldHaveObstacles = (rowIndex: number): boolean => {
  // Alternating pattern: even rows blank, odd rows obstacle-capable
  return rowIndex % 2 === 1;
};

const getCurrentObstacleRow = (yPosition: number): number => {
  return Math.floor(yPosition / ROW_HEIGHT);
};

// Generate obstacle patterns for obstacle rows
const generateObstaclePattern = (rowIndex: number): ('rock' | 'balloon' | 'empty')[] => {
  // Each row has 6 lanes, generate pattern for each lane
  const pattern: ('rock' | 'balloon' | 'empty')[] = [];
  
  // Configuration: 60% obstacles, 40% empty spaces
  const obstacleProbability = 0.6;
  
  let prevEmpty = false;
  for (let lane = 0; lane < LANE_POSITIONS.length; lane++) {
    if (prevEmpty) {
      pattern.push(Math.random() > 0.5 ? 'rock' : 'balloon');
      prevEmpty = false;
      continue;
    }
    if (Math.random() < obstacleProbability) {
      pattern.push(Math.random() > 0.5 ? 'rock' : 'balloon');
      prevEmpty = false;
    } else {
      pattern.push('empty');
      prevEmpty = true;
    }
  }
  
  return pattern;
};
