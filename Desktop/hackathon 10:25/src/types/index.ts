// Core game types
export interface Monster {
  id: string;
  name: string;
  type: string;
  level: number;
  parts: {
    head: { health: number; maxHealth: number };
    leftArm: { health: number; maxHealth: number };
    rightArm: { health: number; maxHealth: number };
    legs: { health: number; maxHealth: number };
  };
  isDefeated: boolean;
  weaknesses: {
    head: MouthShape;
    leftArm: MouthShape;
    rightArm: MouthShape;
    legs: MouthShape;
  };
}

export interface Bird {
  id: string;
  x: number; // horizontal position (0-100)
  y: number; // vertical position (fixed at bottom)
  isMoving: boolean;
  direction: 'left' | 'right' | null;
}

export interface GhostBird {
  id: string;
  x: number; // horizontal position (0-100)
  y: number; // vertical position (fixed at bottom)
  isMoving: boolean;
  direction: 'left' | 'right' | null;
  survivalTime: number; // in milliseconds
  isActive: boolean;
}

export interface Obstacle {
  id: string;
  type: 'rock' | 'balloon';
  x: number; // horizontal position (0-100)
  y: number; // vertical position (0-100, falls from top)
  width: number;
  height: number;
  speed: number;
  isActive: boolean;
  // Balloon attack state
  isExploding?: boolean; // true when showing explosion animation
  explodedAt?: number; // timestamp when explosion started
  rowIndex?: number; // NEW: which vertical row this obstacle belongs to
}

export interface GameState {
  currentMonster: Monster;
  currentSession: ExerciseSession | null;
  score: number;
  streak: number;
  isGameActive: boolean;
  isPaused: boolean;
  currentAttackPhase: AttackPhase;
  lastAttack: {
    damage: number;
    part: keyof Monster['parts'];
    timestamp: number;
  } | null;
  // Obstacle race specific
  bird: Bird;
  obstacles: Obstacle[];
  survivalTime: number; // in milliseconds
  lastObstacleSpawn: number;
  nextRequiredAction: 'moveLeft' | 'moveRight' | 'attack' | null;
  actionTimeout: number; // timestamp for action timeout
  successfulMovements: number;
  lastMovementAt: number;
  // Social race ghost movement throttle
  ghostLastMovementAt: number;
  // Social race ghost friend-like movement pattern
  ghostStepIntervalMs: number; // ms per lane step (1 lane/sec => 1000)
  ghostPatternDirection: 'left' | 'right';
  ghostPatternStepsRemaining: number; // remaining steps in current segment
  ghostPatternInitialized: boolean; // whether initial 2-right segment is set
  // Social race specific
  ghostBird: GhostBird | null;
  isSocialRace: boolean;
  ghostBirdSurvivalTime: number; // random survival time for ghost bird in ms
}

export interface AttackResult {
  damage: number;
  target: keyof Monster['parts'];
  mouthShape: MouthShape;
  confidence: number;
  timestamp: number;
  isEffective: boolean;
}

export interface MovementResult {
  success: boolean;
  type: 'moveLeft' | 'moveRight' | 'attack';
  mouthShape: MouthShape;
  confidence: number;
  timestamp: number;
  scoreGained: number;
}

export type MouthShape = 'aaa' | 'eee' | 'ooo' | 'neutral';

export type AttackPhase = 'head' | 'arms' | 'legs';

// Face detection types
export interface FaceDetectionResult {
  landmarks: number[][];
  mouthShape: MouthShape;
  confidence: number;
  timestamp: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Progress tracking types
export interface ExerciseSession {
  id: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  duration: number; // in milliseconds
  score: number;
  accuracy: number; // percentage
  attacksPerformed: AttackLog[];
  monsterDefeated: boolean;
}

export interface AttackLog {
  id: string;
  sessionId: string;
  mouthShape: MouthShape;
  targetPart: keyof Monster['parts'];
  damage: number;
  confidence: number;
  attackTime: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  requirement: {
    type: 'sessions' | 'monsters' | 'accuracy' | 'streak';
    value: number;
  };
  unlockedAt?: Date;
}

// User profile types
export interface UserProfile {
  id: string;
  name: string;
  level: number;
  experience: number;
  totalExercises: number;
  monstersDefeated: number;
  accuracy: number;
  lastActiveAt: string;
}

// Settings types
export interface AppSettings {
  cameraDeviceId?: string;
  detectionSensitivity: number;
  soundEnabled: boolean;
  cameraEnabled: boolean;
  notificationsEnabled: boolean;
  vibrationEnabled: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  mirrorMode: boolean;
}

// Storage types
export interface StoredSession {
  id: string;
  date: string;
  duration: number;
  exerciseCount: number;
  accuracy: number;
  monstersDefeated: number;
  score: number;
  attackLogs: AttackLog[];
}

export interface StoredAchievement {
  id: string;
  type: string;
  unlockedAt: string;
  progress: number;
  isCompleted: boolean;
}

// Constants
export const STORAGE_KEYS = {
  USER_PROFILE: 'faceTraining_userProfile',
  SESSIONS: 'faceTraining_sessions',
  EXERCISE_SESSIONS: 'faceTraining_exerciseSessions',
  SETTINGS: 'faceTraining_settings',
  ACHIEVEMENTS: 'faceTraining_achievements',
  CURRENT_STREAK: 'faceTraining_currentStreak'
} as const;

export const MOUTH_SHAPE_TARGETS: Record<MouthShape, keyof Monster['parts'] | null> = {
  'aaa': 'head',
  'eee': 'leftArm', // or rightArm alternating
  'ooo': 'legs',
  'neutral': null
};

export const DEFAULT_MONSTER_HEALTH = 100;