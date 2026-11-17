// Маленькая типизированная шина событий между игровым слоем и интерфейсом/ядром.
type Handler<T> = (payload: T) => void;

export class EventBus<Events extends Record<string, unknown>> {
  private handlers = new Map<keyof Events, Set<Handler<never>>>();

  on<K extends keyof Events>(type: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) { set = new Set(); this.handlers.set(type, set); }
    set.add(handler as Handler<never>);
    return () => set!.delete(handler as Handler<never>);
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    for (const h of this.handlers.get(type) ?? []) (h as Handler<Events[K]>)(payload);
  }
}

export type TargetKind = 'item' | 'npc' | 'pick';

/** События между сценой, интерфейсом и квестовым контроллером. */
export type GameEvents = {
  /** Рядом с героем цель взаимодействия (или null). item — рассмотреть, npc — поговорить, pick — взять. */
  'nearby-target': { kind: TargetKind; id: string } | null;
  /** Игрок хочет взаимодействовать с целью (клавиша, кнопка или касание). */
  'interact': { kind: TargetKind; id: string };
  /** Интерфейс перекрывает игру — герой не должен ходить. */
  'input-blocked': { blocked: boolean };
};
