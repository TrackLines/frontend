// How a board estimates tickets; mirrors boards.Scales in the backend.
export type EstimateScale = 'none' | 'fibonacci' | 'tshirt' | 'powers' | 'linear';

export const SCALES: { value: EstimateScale; label: string; values: string[] }[] = [
  { value: 'none', label: 'No estimates', values: [] },
  { value: 'fibonacci', label: 'Fibonacci', values: ['1', '2', '3', '5', '8', '13', '21'] },
  { value: 'tshirt', label: 'T-shirt sizes', values: ['XS', 'S', 'M', 'L', 'XL'] },
  { value: 'powers', label: 'Powers of two', values: ['1', '2', '4', '8', '16'] },
  { value: 'linear', label: '1 to 5', values: ['1', '2', '3', '4', '5'] },
];

export const scaleValues = (scale?: EstimateScale | null) => SCALES.find((s) => s.value === scale)?.values ?? [];

// points turns an estimate into a number to add up: t-shirt sizes map like the backend's
// (boards.tshirtPoints), numbers are themselves; unestimated counts 0.
const TSHIRT_POINTS: Record<string, number> = { XS: 1, S: 2, M: 3, L: 5, XL: 8 };
export function points(estimate?: string | null): number {
  if (!estimate) return 0;
  return TSHIRT_POINTS[estimate] ?? (Number(estimate) || 0);
}
