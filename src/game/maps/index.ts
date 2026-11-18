import type { Location } from '../../content/types';
import type { MapDef } from './types';
import { HOME } from './home';
import { STREET } from './street';
import { SHOP } from './shop';
import { SCHOOL } from './school';

export const MAPS: Record<Location, MapDef> = { home: HOME, street: STREET, shop: SHOP, school: SCHOOL };

/** В какой локации находится набор мест (zone) — для шагов «найди» в других локациях. */
export function locationOfSpots(zone: string): Location | null {
  for (const m of Object.values(MAPS)) if (m.spots[zone]) return m.id;
  return null;
}
export function locationOfZone(zone: string): Location | null {
  for (const m of Object.values(MAPS)) if (m.zones[zone]) return m.id;
  return null;
}
