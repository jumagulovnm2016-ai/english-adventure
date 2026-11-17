// Проход по графу диалога.
import type { DialogueDef, DialogueNode } from '../content/types';

export class DialogueRunner {
  private nodeId: string | 'end';
  constructor(readonly def: DialogueDef) { this.nodeId = def.start; }

  get ended() { return this.nodeId === 'end'; }
  get currentId() { return this.nodeId; }
  current(): DialogueNode | null { return this.nodeId === 'end' ? null : this.def.nodes[this.nodeId]; }

  /** Перейти дальше. Для реплики с заданием нужен итог: correct или wrong. */
  advance(branch?: 'correct' | 'wrong') {
    const n = this.current();
    if (!n) return;
    if (n.task) {
      if (!branch) throw new Error(`Реплика ${this.nodeId}: нужен итог задания`);
      this.nodeId = (branch === 'correct' ? n.on_correct : n.on_wrong)!;
    } else {
      this.nodeId = n.next!;
    }
    if (this.nodeId !== 'end' && !this.def.nodes[this.nodeId]) throw new Error(`Диалог ${this.def.id}: нет реплики ${this.nodeId}`);
  }
}
