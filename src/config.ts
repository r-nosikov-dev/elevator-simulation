export interface SimulationConfig {
  floorCount: number;
  capacity: number;
}

export const CONFIG_LIMITS = {
  floorCount: { min: 4, max: 10, default: 7 },
  capacity: { min: 2, max: 4, default: 4 },
} as const;

// Domain floors are 1-based (level 1 = ground), never 0.
export const GROUND_FLOOR = 1;

export const TIMING = {
  floorTravelMs: 1000,
  doorStopMs: 800,
  boardMs: 520,
  // First phase of boarding: walk to the door; (1 - ratio) is the slide into the slot.
  boardApproachRatio: 0.4,
  boardStaggerMs: 160,
  spawnMinMs: 4000,
  spawnMaxMs: 10000,
  corridorWalkMs: 1800,
  exitWalkMs: 1400,
  exitStepOutMs: 280,
  queueShiftMs: 250,
  idlePollMs: 200,
  controlLoopMs: 16,
} as const;

export const LAYOUT = {
  paddingX: 40,
  paddingTop: 48,
  paddingBottom: 32,
  floorHeight: 72,
  buildingWidth: 600,
  elevatorWidth: 128,
  elevatorHeight: 58,
  elevatorInsetX: 8,
  personSize: 28,
  personGap: 4,
  queueElevatorGap: 20,
  // Space on the right so waiters do not overlap "level N" labels or the +N badge.
  queueRightReserve: 88,
  queueOverflowBadgeWidth: 32,
  labelOffsetX: 16,
  personAboveFloor: 6,
  elevatorAboveFloor: 4,
  cabinPassengerPad: 10,
  cabinPassengerScale: 0.85,
  cabinDoorInset: 6,
  elevatorShaftExtraWidth: 16,
  doorDividerOffset: 12,
  doorLineNudgeX: 4,
  labelAboveFloor: 6,
  directionArrowGap: 4,
  buildingStrokeWidth: 3,
  floorStrokeWidth: 2,
  shaftStrokeWidth: 1,
  personStrokeWidth: 2,
  personCornerRadius: 3,
  cabinCornerRadius: 4,
  cabinFillAlpha: 0.85,
  personFontSize: 14,
  levelLabelFontSize: 13,
  directionArrowFontSize: 16,
  overflowFontSize: 12,
  overflowCornerRadius: 4,
  overflowStrokeWidth: 1.5,
  fitPadding: 8,
  fitMinDimension: 160,
  fitHostHeightFallback: 120,
  fitMaxScale: 1,
} as const;

export const COLORS = {
  background: 0xf7f8fa,
  buildingStroke: 0x222222,
  floorLine: 0x333333,
  elevatorFill: 0xe8f4ff,
  elevatorStroke: 0x1e90ff,
  elevatorStrokeIdle: 0x888888,
  personUp: 0x3b82f6,
  personUpFill: 0xdbeafe,
  personDown: 0x22c55e,
  personDownFill: 0xdcfce7,
  text: 0x111111,
  shaftBg: 0xf0f4f8,
  levelLabel: 0x555555,
  overflowFill: 0xf1f5f9,
  overflowStroke: 0x94a3b8,
  overflowText: 0x334155,
  shaftStrokeAlpha: 0.3,
  doorDividerAlpha: 0.25,
} as const;

export function clampConfig(partial: Partial<SimulationConfig>): SimulationConfig {
  const floors = Math.round(partial.floorCount ?? CONFIG_LIMITS.floorCount.default);
  const capacity = Math.round(partial.capacity ?? CONFIG_LIMITS.capacity.default);

  return {
    floorCount: Math.min(
      CONFIG_LIMITS.floorCount.max,
      Math.max(CONFIG_LIMITS.floorCount.min, floors),
    ),
    capacity: Math.min(
      CONFIG_LIMITS.capacity.max,
      Math.max(CONFIG_LIMITS.capacity.min, capacity),
    ),
  };
}
