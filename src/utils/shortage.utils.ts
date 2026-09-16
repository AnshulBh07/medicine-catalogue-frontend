import type { ShortageUnit } from '../types/models';

export const SHORTAGE_UNITS: Array<{ label: string; value: ShortageUnit }> = [
  { label: 'Pack', value: 'PACK' },
  { label: 'Strip', value: 'STRIP' },
  { label: 'Box', value: 'BOX' },
  { label: 'Piece', value: 'PIECE' },
  { label: 'Bottle', value: 'BOTTLE' },
  { label: 'Crate', value: 'CRATE' },
];

export function formatShortageUnit(quantity: number, unit?: ShortageUnit | string | null): string {
  const normalized = (unit || 'PACK').toUpperCase();
  const isSingular = quantity === 1;

  switch (normalized) {
    case 'PACK':
      return isSingular ? 'pack' : 'packs';
    case 'STRIP':
      return isSingular ? 'strip' : 'strips';
    case 'BOX':
      return isSingular ? 'box' : 'boxes';
    case 'PIECE':
      return isSingular ? 'piece' : 'pieces';
    case 'BOTTLE':
      return isSingular ? 'bottle' : 'bottles';
    case 'CRATE':
      return isSingular ? 'crate' : 'crates';
    default:
      return isSingular ? normalized.toLowerCase() : `${normalized.toLowerCase()}s`;
  }
}

export function formatShortageQuantity(
  quantity: number,
  unit?: ShortageUnit | string | null,
): string {
  return `${quantity} ${formatShortageUnit(quantity, unit)}`;
}
