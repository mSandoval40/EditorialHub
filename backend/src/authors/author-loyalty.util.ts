import { LoyaltyLevel } from '@prisma/client';

export type AuthorLoyaltyMetrics = {
  publishedWorksCount: number;
  confirmedSalesCount: number;
  hasCompletePublicProfile: boolean;
  manualLevel: LoyaltyLevel | null;
};

export type AuthorLoyaltySnapshot = {
  level: LoyaltyLevel;
  points: number;
  currentRatePercent: string;
  nextLevel: LoyaltyLevel | null;
  nextLevelLabel: string | null;
  nextLevelRatePercent: string | null;
  pointsToNextLevel: number;
  progressPercent: number;
  estimatedExtraPer100Mxn: string;
  isManualDiamond: boolean;
};

type LoyaltyRule = {
  level: LoyaltyLevel;
  minPoints: number;
  ratePercent: number;
  label: string;
};

const LOYALTY_RULES: LoyaltyRule[] = [
  { level: LoyaltyLevel.BRONZE, minPoints: 0, ratePercent: 10.0, label: 'Bronce' },
  { level: LoyaltyLevel.SILVER, minPoints: 150, ratePercent: 8.0, label: 'Plata' },
  { level: LoyaltyLevel.GOLD, minPoints: 400, ratePercent: 6.0, label: 'Oro' },
  { level: LoyaltyLevel.PLATINUM, minPoints: 600, ratePercent: 4.0, label: 'Platino' },
];

const DIAMOND_RATE_PERCENT = 2.0;

export function calculateAuthorLoyaltyPoints(metrics: AuthorLoyaltyMetrics) {
  let points = 0;

  points += Math.max(metrics.publishedWorksCount, 0) * 5;
  points += Math.max(metrics.confirmedSalesCount, 0) * 10;

  if (metrics.hasCompletePublicProfile) {
    points += 5;
  }

  return points;
}

export function buildAuthorLoyaltySnapshot(
  metrics: AuthorLoyaltyMetrics,
): AuthorLoyaltySnapshot {
  const points = calculateAuthorLoyaltyPoints(metrics);
  const isManualDiamond = metrics.manualLevel === LoyaltyLevel.DIAMOND;

  if (isManualDiamond) {
    return {
      level: LoyaltyLevel.DIAMOND,
      points,
      currentRatePercent: DIAMOND_RATE_PERCENT.toFixed(2),
      nextLevel: null,
      nextLevelLabel: null,
      nextLevelRatePercent: null,
      pointsToNextLevel: 0,
      progressPercent: 100,
      estimatedExtraPer100Mxn: '0.00',
      isManualDiamond: true,
    };
  }

  const currentRule = [...LOYALTY_RULES]
    .reverse()
    .find((rule) => points >= rule.minPoints) ?? LOYALTY_RULES[0];
  const nextRule =
    LOYALTY_RULES.find((rule) => rule.minPoints > currentRule.minPoints && points < rule.minPoints) ??
    null;
  const previousMin = currentRule.minPoints;
  const nextMin = nextRule?.minPoints ?? previousMin;
  const denominator = nextMin > previousMin ? nextMin - previousMin : 0;
  const progressPercent =
    denominator > 0
      ? Math.max(0, Math.min(100, Math.round(((points - previousMin) / denominator) * 100)))
      : 100;
  const estimatedExtraPer100Mxn = nextRule
    ? (currentRule.ratePercent - nextRule.ratePercent).toFixed(2)
    : '0.00';

  return {
    level: currentRule.level,
    points,
    currentRatePercent: currentRule.ratePercent.toFixed(2),
    nextLevel: nextRule?.level ?? null,
    nextLevelLabel: nextRule?.label ?? null,
    nextLevelRatePercent: nextRule ? nextRule.ratePercent.toFixed(2) : null,
    pointsToNextLevel: nextRule ? Math.max(nextRule.minPoints - points, 0) : 0,
    progressPercent,
    estimatedExtraPer100Mxn,
    isManualDiamond: false,
  };
}

export function loyaltyLevelLabel(level: LoyaltyLevel) {
  switch (level) {
    case LoyaltyLevel.SILVER:
      return 'Plata';
    case LoyaltyLevel.GOLD:
      return 'Oro';
    case LoyaltyLevel.PLATINUM:
      return 'Platino';
    case LoyaltyLevel.DIAMOND:
      return 'Diamante';
    case LoyaltyLevel.BRONZE:
    default:
      return 'Bronce';
  }
}
