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

/** События, которыми обмениваются сцены и интерфейс на этапе 1. */
export type GameEvents = {
  /** Игрок подошёл к предмету (или отошёл: itemId = null). */
  'nearby-item': { itemId: string | null };
  /** Игрок хочет рассмотреть предмет. */
  'inspect-item': { itemId: string };
  /** Карточка предмета закрыта — можно снова управлять героем. */
  'card-closed': Record<string, never>;
  /** Интерфейс перекрывает игру (карточка, настройки) — герой не должен ходить. */
  'input-blocked': { blocked: boolean };
};
