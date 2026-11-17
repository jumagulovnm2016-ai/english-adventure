// Единый источник времени. В тестах подменяется, чтобы «перематывать» дни.
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

export function fixedClock(start: Date): Clock & { advance(ms: number): void; set(d: Date): void } {
  let t = start.getTime();
  return {
    now: () => new Date(t),
    advance(ms) { t += ms; },
    set(d) { t = d.getTime(); },
  };
}
