import { expect, test } from 'bun:test';
import { SCALES, scaleValues } from './estimates';

test('scales match the backend (boards.Scales)', () => {
  expect(SCALES.map((s) => s.value)).toEqual(['none', 'fibonacci', 'tshirt', 'powers', 'linear']);
  expect(scaleValues('fibonacci')).toEqual(['1', '2', '3', '5', '8', '13', '21']);
  expect(scaleValues('tshirt')).toEqual(['XS', 'S', 'M', 'L', 'XL']);
  expect(scaleValues('none')).toEqual([]);
  expect(scaleValues(undefined)).toEqual([]);
});
