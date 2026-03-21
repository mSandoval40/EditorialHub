import { LoyaltyLevel, PurchaseStatus, WorkStatus } from "@prisma/client";
import { closePrisma, createPrisma } from "./shared.mjs";

const LOYALTY_RULES = [
  { level: LoyaltyLevel.BRONZE, minPoints: 0, ratePercent: 10.0 },
  { level: LoyaltyLevel.SILVER, minPoints: 150, ratePercent: 8.0 },
  { level: LoyaltyLevel.GOLD, minPoints: 400, ratePercent: 6.0 },
  { level: LoyaltyLevel.PLATINUM, minPoints: 600, ratePercent: 4.0 },
];

function calculateAuthorLoyaltyPoints(metrics) {
  let points = 0;

  points += Math.max(metrics.publishedWorksCount, 0) * 5;
  points += Math.max(metrics.confirmedSalesCount, 0) * 10;

  if (metrics.hasCompletePublicProfile) {
    points += 5;
  }

  return points;
}

function buildAuthorLoyaltySnapshot(metrics) {
  const points = calculateAuthorLoyaltyPoints(metrics);
  const isManualDiamond = metrics.manualLevel === LoyaltyLevel.DIAMOND;

  if (isManualDiamond) {
    return {
      level: LoyaltyLevel.DIAMOND,
      points,
      currentRatePercent: "2.00",
    };
  }

  const currentRule =
    [...LOYALTY_RULES].reverse().find((rule) => points >= rule.minPoints) ??
    LOYALTY_RULES[0];

  return {
    level: currentRule.level,
    points,
    currentRatePercent: currentRule.ratePercent.toFixed(2),
  };
}

async function main() {
  const { prisma, pool } = createPrisma();

  try {
    const authorProfiles = await prisma.authorProfile.findMany({
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        works: {
          select: {
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const updates = [];

    for (const profile of authorProfiles) {
      const confirmedSalesCount = await prisma.purchaseItem.count({
        where: {
          work: {
            authorProfileId: profile.id,
          },
          purchase: {
            status: PurchaseStatus.CONFIRMED,
          },
        },
      });

      const snapshot = buildAuthorLoyaltySnapshot({
        publishedWorksCount: Array.isArray(profile.works)
          ? profile.works.filter((work) => work.status === WorkStatus.PUBLISHED).length
          : 0,
        confirmedSalesCount,
        hasCompletePublicProfile: Boolean(
          profile.bio?.trim() && profile.user?.profile?.avatarUrl,
        ),
        manualLevel: profile.loyaltyManualLevel ?? null,
      });

      const nextRate = snapshot.currentRatePercent;
      const currentRate = profile.royaltyRatePercent?.toString?.() ?? "0.00";

      if (currentRate !== nextRate) {
        updates.push({
          id: profile.id,
          email: profile.user.email,
          fromRate: currentRate,
          toRate: nextRate,
          level: snapshot.level,
          points: snapshot.points,
        });

        await prisma.authorProfile.update({
          where: { id: profile.id },
          data: {
            royaltyRatePercent: nextRate,
          },
        });
      }
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          reviewedProfiles: authorProfiles.length,
          updatedProfiles: updates.length,
          updates,
        },
        null,
        2,
      ),
    );
  } finally {
    await closePrisma(prisma, pool);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
