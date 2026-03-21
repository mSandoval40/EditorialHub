import { PurchaseStatus, RoleName } from '@prisma/client';

export const SOCIO_ACCOUNT_LABEL = 'Socio';

export const SOCIO_ADMINISTRATIVE_LABELS = {
  base: SOCIO_ACCOUNT_LABEL,
  reader: 'Socio lector',
  author: 'Socio autor',
  mixed: 'Socio mixto',
  editorial: 'Socio con actividad editorial',
} as const;

export type SocioAdministrativeLabel =
  (typeof SOCIO_ADMINISTRATIVE_LABELS)[keyof typeof SOCIO_ADMINISTRATIVE_LABELS];

type SocioDescriptorInput = {
  roleNames: RoleName[];
  createdWorkCount?: number;
  confirmedPurchaseCount?: number;
};

export function getDefaultSocioCapabilityRoleNames() {
  return [RoleName.BUYER, RoleName.AUTHOR] as const;
}

export function hasSocioPurchaseCapability(roleNames: RoleName[]) {
  return roleNames.includes(RoleName.BUYER);
}

export function hasSocioPublishingCapability(roleNames: RoleName[]) {
  return roleNames.includes(RoleName.AUTHOR);
}

export function hasSocioEditorialActivity(roleNames: RoleName[]) {
  return roleNames.includes(RoleName.ADMIN) || roleNames.includes(RoleName.ADMIN_02);
}

export function isConfirmedPurchaseStatus(status: string) {
  return status === PurchaseStatus.CONFIRMED;
}

export function buildSocioDescriptor(input: SocioDescriptorInput) {
  const createdWorkCount = input.createdWorkCount ?? 0;
  const confirmedPurchaseCount = input.confirmedPurchaseCount ?? 0;
  const hasWorks = createdWorkCount > 0;
  const hasConfirmedPurchases = confirmedPurchaseCount > 0;
  const hasEditorialActivity = hasSocioEditorialActivity(input.roleNames);

  const administrativeLabels: SocioAdministrativeLabel[] = [
    SOCIO_ADMINISTRATIVE_LABELS.base,
  ];

  if (hasConfirmedPurchases) {
    administrativeLabels.push(SOCIO_ADMINISTRATIVE_LABELS.reader);
  }

  if (hasWorks) {
    administrativeLabels.push(SOCIO_ADMINISTRATIVE_LABELS.author);
  }

  if (hasWorks && hasConfirmedPurchases) {
    administrativeLabels.push(SOCIO_ADMINISTRATIVE_LABELS.mixed);
  }

  if (hasEditorialActivity) {
    administrativeLabels.push(SOCIO_ADMINISTRATIVE_LABELS.editorial);
  }

  const uniqueLabels = Array.from(new Set(administrativeLabels));
  const primaryAdministrativeLabel = hasEditorialActivity
    ? SOCIO_ADMINISTRATIVE_LABELS.editorial
    : hasWorks && hasConfirmedPurchases
      ? SOCIO_ADMINISTRATIVE_LABELS.mixed
      : hasWorks
        ? SOCIO_ADMINISTRATIVE_LABELS.author
        : hasConfirmedPurchases
          ? SOCIO_ADMINISTRATIVE_LABELS.reader
          : SOCIO_ADMINISTRATIVE_LABELS.base;

  return {
    accountLabel: SOCIO_ACCOUNT_LABEL,
    primaryAdministrativeLabel,
    administrativeLabels: uniqueLabels,
    activity: {
      createdWorkCount,
      confirmedPurchaseCount,
      hasWorks,
      hasConfirmedPurchases,
      hasEditorialActivity,
    },
  };
}
