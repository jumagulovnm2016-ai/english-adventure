import type { AgeText } from '../content/types';
export type AgeMode = 'junior' | 'senior';
export const ageText = (t: AgeText | undefined, mode: AgeMode): string | undefined => (t ? (mode === 'senior' ? t.senior ?? t.junior : t.junior) : undefined);
