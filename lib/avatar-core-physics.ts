export type AvatarPhysicsState = 'Walking' | 'Running' | 'Driving' | 'Sailing' | 'Jumping';
export type AvatarKey = 'KeyW' | 'KeyA' | 'KeyS' | 'KeyD' | 'ArrowUp' | 'ArrowLeft' | 'ArrowDown' | 'ArrowRight';

export interface AvatarBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface AvatarInputEvent {
  code: AvatarKey;
  pressed: boolean;
  timestamp: number;
}

export interface AvatarVector {
  x: number;
  y: number;
}

export interface AvatarPhysicsConfig {
  tickMs: number;
  bounds: AvatarBounds;
  speedByState: Record<AvatarPhysicsState, number>;
}

export interface AvatarPhysicsSnapshot {
  position: AvatarVector;
  velocity: AvatarVector;
  state: AvatarPhysicsState;
  activeKeys: AvatarKey[];
  tick: number;
  bounds: AvatarBounds;
}

const INPUT_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'] as const;
const KEY_TO_VECTOR: Record<AvatarKey, AvatarVector> = {
  KeyW: { x: 0, y: -1 },
  KeyA: { x: -1, y: 0 },
  KeyS: { x: 0, y: 1 },
  KeyD: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowDown: { x: 0, y: 1 },
  ArrowRight: { x: 1, y: 0 }
};

export const STAMFORD_GRID_BOUNDS: AvatarBounds = Object.freeze({ minX: 0, maxX: 800, minY: 0, maxY: 750 });

export const AVATAR_PHYSICS_CONFIG: AvatarPhysicsConfig = Object.freeze({
  tickMs: 33,
  bounds: STAMFORD_GRID_BOUNDS,
  speedByState: Object.freeze({
    Walking: 110,
    Running: 190,
    Driving: 360,
    Sailing: 150,
    Jumping: 130
  })
});

export function isAvatarKey(code: string): code is AvatarKey {
  return INPUT_KEYS.includes(code as AvatarKey);
}

export function createKeyboardEventBuffer() {
  const queued: AvatarInputEvent[] = [];

  return {
    push(code: string, pressed: boolean, timestamp = Date.now()) {
      if (!isAvatarKey(code)) return false;
      queued.push({ code, pressed, timestamp });
      return true;
    },
    drain() {
      return queued.splice(0, queued.length);
    },
    peek() {
      return [...queued];
    }
  };
}

export function clampToStamfordGrid(position: AvatarVector, bounds: AvatarBounds = STAMFORD_GRID_BOUNDS): AvatarVector {
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, position.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, position.y))
  };
}

export class AvatarCorePhysics {
  private readonly activeKeys = new Set<AvatarKey>();
  private tickCount = 0;
  private position: AvatarVector;
  private velocity: AvatarVector = { x: 0, y: 0 };
  private state: AvatarPhysicsState;

  constructor(
    initialPosition: AvatarVector = { x: 400, y: 375 },
    initialState: AvatarPhysicsState = 'Walking',
    private readonly config: AvatarPhysicsConfig = AVATAR_PHYSICS_CONFIG
  ) {
    this.position = clampToStamfordGrid(initialPosition, config.bounds);
    this.state = initialState;
  }

  setState(state: AvatarPhysicsState) {
    this.state = state;
  }

  applyInput(events: AvatarInputEvent[]) {
    for (const event of events) {
      if (event.pressed) this.activeKeys.add(event.code);
      else this.activeKeys.delete(event.code);
    }
  }

  tick(deltaMs = this.config.tickMs): AvatarPhysicsSnapshot {
    const movement = this.resolveMovementVector();
    const speed = this.config.speedByState[this.state];
    const deltaSeconds = deltaMs / 1000;

    this.velocity = { x: movement.x * speed, y: movement.y * speed };
    this.position = clampToStamfordGrid({
      x: this.position.x + this.velocity.x * deltaSeconds,
      y: this.position.y + this.velocity.y * deltaSeconds
    }, this.config.bounds);
    this.tickCount += 1;

    return this.snapshot();
  }

  snapshot(): AvatarPhysicsSnapshot {
    return {
      position: { ...this.position },
      velocity: { ...this.velocity },
      state: this.state,
      activeKeys: [...this.activeKeys].sort(),
      tick: this.tickCount,
      bounds: { ...this.config.bounds }
    };
  }

  private resolveMovementVector(): AvatarVector {
    const aggregate = [...this.activeKeys].reduce<AvatarVector>((vector, key) => ({
      x: vector.x + KEY_TO_VECTOR[key].x,
      y: vector.y + KEY_TO_VECTOR[key].y
    }), { x: 0, y: 0 });

    const length = Math.hypot(aggregate.x, aggregate.y);
    if (!length) return { x: 0, y: 0 };
    return { x: aggregate.x / length, y: aggregate.y / length };
  }
}
