# Vertical Row System Technical Document

## Current Implementation Analysis

### Horizontal Lane System (Working Reference)
The game currently uses a fixed 6-lane horizontal system:

```typescript
const LANE_POSITIONS = [13, 27.8, 42.6, 57.4, 72.2, 87] as const;
const clampLaneIndex = (i: number) => Math.max(0, Math.min(LANE_POSITIONS.length - 1, i));
const getLaneX = (laneIndex: number) => LANE_POSITIONS[clampLaneIndex(laneIndex)];
```

### Current Obstacle Positioning Issues
1. **Random Y Position**: Obstacles spawn at `y: 0` and fall continuously
2. **No Vertical Structure**: No fixed vertical spacing or pattern
3. **Inconsistent Spacing**: Obstacles can appear at any vertical position
4. **No Predictable Pattern**: Players can't anticipate obstacle placement

## New Vertical Row System Design

### System Requirements
- Divide screen height into repeating blocks of 3 vertical rows
- Each block: Row 1 (obstacles), Row 2 (empty), Row 3 (empty)
- Row height = 1 emoji height unit
- Create predictable pattern: obstacles, empty, empty, repeat

### Vertical Row Definitions

```typescript
// Each row is 8% of screen height (approximately 1 emoji height)
const ROW_HEIGHT = 8; // 8% of screen height
const ROWS_PER_BLOCK = 3;

// Define vertical row positions within each 3-row block
const VERTICAL_ROWS = [0, 8, 16] as const; // positions within each block

// Get the Y position for a specific row index (0, 1, 2, 3, 4, 5, ...)
const getRowY = (rowIndex: number): number => {
  const blockIndex = Math.floor(rowIndex / ROWS_PER_BLOCK);
  const rowInBlock = rowIndex % ROWS_PER_BLOCK;
  return blockIndex * (ROWS_PER_BLOCK * ROW_HEIGHT) + VERTICAL_ROWS[rowInBlock];
};

// Determine which rows should have obstacles (row 0, 3, 6, 9, ...)
const shouldHaveObstacles = (rowIndex: number): boolean => {
  return rowIndex % ROWS_PER_BLOCK === 0;
};
```

### Obstacle Generation Pattern

#### Block Structure (Repeating)
```
Block 0:
- Row 0: [Obstacles possible]    (Y = 0%)
- Row 1: [Empty]               (Y = 8%)
- Row 2: [Empty]               (Y = 16%)

Block 1:
- Row 3: [Obstacles possible]  (Y = 24%)
- Row 4: [Empty]               (Y = 32%)
- Row 5: [Empty]               (Y = 40%)

Block 2:
- Row 6: [Obstacles possible]  (Y = 48%)
- Row 7: [Empty]               (Y = 56%)
- Row 8: [Empty]               (Y = 64%)
```

### Enhanced Obstacle Creation

```typescript
const createObstacle = (type: 'rock' | 'balloon', rowIndex?: number): Obstacle => {
  // Determine which row to spawn in
  let targetRowIndex: number;
  
  if (rowIndex !== undefined) {
    // Specific row requested (for pattern generation)
    targetRowIndex = rowIndex;
  } else {
    // Find next available obstacle row (0, 3, 6, 9, ...)
    const currentTime = Date.now();
    const timeSinceStart = currentTime - gameStartTime;
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
    y: getRowY(targetRowIndex), // NEW: Fixed vertical positioning
    width: type === 'rock' ? 8 : 6,
    height: type === 'rock' ? 8 : 6,
    speed: 5, // Same speed for consistency
    isActive: true,
    isExploding: false,
    explodedAt: undefined,
    rowIndex: targetRowIndex // NEW: Track which row this belongs to
  };
};
```

### Pattern-Based Spawning System

```typescript
// Generate obstacle patterns for obstacle rows
const generateObstaclePattern = (rowIndex: number): ('rock' | 'balloon' | 'empty')[] => {
  // Each row has 6 lanes, generate pattern for each lane
  const pattern: ('rock' | 'balloon' | 'empty')[] = [];
  
  // Configuration: 60% obstacles, 40% empty spaces
  const obstacleProbability = 0.6;
  
  for (let lane = 0; lane < LANE_POSITIONS.length; lane++) {
    if (Math.random() < obstacleProbability) {
      // 60% chance of obstacle
      pattern.push(Math.random() > 0.5 ? 'rock' : 'balloon');
    } else {
      // 40% chance of empty space
      pattern.push('empty');
    }
  }
  
  return pattern;
};

// Spawn multiple obstacles following a pattern
const spawnObstacleRow = (rowIndex: number) => {
  const pattern = generateObstaclePattern(rowIndex);
  
  pattern.forEach((type, laneIndex) => {
    if (type !== 'empty') {
      const obstacle = createObstacle(type, rowIndex);
      // Override x position for specific lane
      obstacle.x = getLaneX(laneIndex);
      
      // Add to game state
      set(state => ({
        obstacles: [...state.obstacles, obstacle]
      }));
    }
  });
};
```

## Implementation Steps

### 1. Add Vertical Row Constants
```typescript
// Add to gameState.ts
const ROW_HEIGHT = 8; // 8% of screen height per row
const ROWS_PER_BLOCK = 3;
const VERTICAL_ROWS = [0, 8, 16] as const; // Y positions within each block
```

### 2. Create Vertical Row Helper Functions
```typescript
// Add to gameState.ts
const getRowY = (rowIndex: number): number => {
  const blockIndex = Math.floor(rowIndex / ROWS_PER_BLOCK);
  const rowInBlock = rowIndex % ROWS_PER_BLOCK;
  return blockIndex * (ROWS_PER_BLOCK * ROW_HEIGHT) + VERTICAL_ROWS[rowInBlock];
};

const shouldHaveObstacles = (rowIndex: number): boolean => {
  return rowIndex % ROWS_PER_BLOCK === 0;
};

const getCurrentObstacleRow = (yPosition: number): number => {
  return Math.floor(yPosition / ROW_HEIGHT);
};
```

### 3. Modify Obstacle Creation
```typescript
// Update createObstacle function
const createObstacle = (type: 'rock' | 'balloon', rowIndex?: number): Obstacle => {
  let targetRowIndex: number;
  
  if (rowIndex !== undefined) {
    targetRowIndex = rowIndex;
  } else {
    // Auto-determine next obstacle row based on timing
    const state = get();
    const timeSinceStart = Date.now() - state.currentSession.startTime;
    const rowsPerSecond = 0.5;
    targetRowIndex = Math.floor(timeSinceStart / 1000 * rowsPerSecond) * ROWS_PER_BLOCK;
  }
  
  const laneIndex = Math.floor(Math.random() * LANE_POSITIONS.length);
  
  return {
    id: `obstacle-${Date.now()}-${Math.random()}`,
    type,
    x: getLaneX(laneIndex),
    y: getRowY(targetRowIndex), // Fixed vertical position
    width: type === 'rock' ? 8 : 6,
    height: type === 'rock' ? 8 : 6,
    speed: 5,
    isActive: true,
    isExploding: false,
    explodedAt: undefined,
    rowIndex: targetRowIndex // Track row for pattern management
  };
};
```

### 4. Update spawnObstacle Function
```typescript
// Replace existing spawnObstacle with pattern-based system
spawnObstacle: () => {
  const state = get();
  if (!state.isGameActive) return;

  const now = Date.now();
  
  // Determine next obstacle row
  const timeSinceStart = now - state.currentSession.startTime;
  const rowsPerSecond = 0.5; // Adjust for desired frequency
  const nextRowIndex = Math.floor(timeSinceStart / 1000 * rowsPerSecond) * ROWS_PER_BLOCK;
  
  // Generate pattern for this row
  const pattern = generateObstaclePattern(nextRowIndex);
  
  // Create obstacles following the pattern
  const newObstacles: Obstacle[] = [];
  
  pattern.forEach((type, laneIndex) => {
    if (type !== 'empty') {
      const obstacle = createObstacle(type, nextRowIndex);
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
}
```

### 5. Update Obstacle Movement
```typescript
// Modify updateObstacles to handle row-based movement
updateObstacles: (deltaTime: number = 16) => {
  const state = get();
  if (!state.isGameActive) return;

  const deltaSec = deltaTime / 1000;
  const now = Date.now();
  
  // Update obstacle positions
  const updatedObstacles = state.obstacles
    .map(obstacle => ({
      ...obstacle,
      y: obstacle.y + (obstacle.speed * deltaSec)
    }))
    .filter(obstacle => obstacle.y < 110); // Remove off-screen obstacles
  
  // Clean up exploded balloons
  const cleanedObstacles = updatedObstacles.map(ob => {
    if (ob.type === 'balloon' && ob.isExploding && ob.explodedAt) {
      const elapsed = now - ob.explodedAt;
      if (elapsed > 400) { // EXPLOSION_DURATION_MS
        return { ...ob, isExploding: false, isActive: false };
      }
    }
    return ob;
  });
  
  // Check for collisions (existing logic)
  const collision = get().checkCollisions();
  if (collision) {
    get().endSession();
    return;
  }
  
  // Spawn new obstacle rows based on timing
  const timeSinceLastSpawn = now - state.lastObstacleSpawn;
  const spawnInterval = 2000; // Fixed 2-second interval for row spawning
  
  if (timeSinceLastSpawn > spawnInterval) {
    get().spawnObstacle();
  }

  set({
    obstacles: cleanedObstacles,
    survivalTime: state.survivalTime + deltaTime
  });
}
```

## Testing Considerations

### 1. Visual Pattern Verification
- Verify obstacles appear in rows 0, 3, 6, 9, etc.
- Confirm rows 1, 2, 4, 5, 7, 8, etc. are always empty
- Check that obstacle spacing is consistent within obstacle rows

### 2. Collision Detection
- Ensure collision detection still works with fixed row positions
- Verify bird movement responds correctly to obstacles in fixed rows
- Test that required actions are properly calculated

### 3. Performance
- Monitor obstacle count with new pattern system
- Ensure smooth gameplay with increased obstacle density
- Verify no memory leaks with new row tracking

### 4. Game Balance
- Adjust `rowsPerSecond` rate for appropriate difficulty
- Fine-tune obstacle probability (currently 60%)
- Test different spawn intervals for optimal gameplay

## Migration Strategy

1. **Phase 1**: Implement vertical row constants and helper functions
2. **Phase 2**: Update obstacle creation to use fixed Y positions
3. **Phase 3**: Implement pattern-based spawning system
4. **Phase 4**: Test and refine collision detection
5. **Phase 5**: Fine-tune game balance parameters

## Benefits

1. **Predictable Patterns**: Players can anticipate obstacle placement
2. **Consistent Spacing**: Visual rhythm improves gameplay experience
3. **Better Game Balance**: Controlled obstacle density
4. **Enhanced Strategy**: Players can plan movements based on visible patterns
5. **Professional Polish**: Fixed grid system creates more polished feel