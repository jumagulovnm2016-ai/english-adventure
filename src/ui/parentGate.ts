// «Только для взрослых»: пример на умножение или PIN, если родитель его задал.
// Это барьер от случайного входа ребёнка, а не защита от взлома (см. RISKS).
import { $, Modal } from './dom';

/** Простое хеширование PIN, чтобы он не лежал в хранилище открытым текстом. */
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`ea-pin:${pin}`);
  try {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let h = 2166136261;
    for (const b of data) { h ^= b; h = Math.imul(h, 16777619) >>> 0; }
    return `f${h.toString(16)}`;
  }
}

let modal: Modal | null = null;
let failures = 0;
let lockedUntil = 0;

export function askAdult(getPinHash: () => Promise<string | undefined>): Promise<boolean> {
  modal ??= new Modal($('gate'));
  return new Promise((resolve) => {
    void (async () => {
      const pinHash = await getPinHash();
      const a = 3 + Math.floor(Math.random() * 7), b = 3 + Math.floor(Math.random() * 7);
      $('gate-question').textContent = pinHash ? 'Введите PIN (4 цифры).' : `Сколько будет ${a} × ${b}?`;
      const input = $('gate-input') as HTMLInputElement;
      input.value = '';
      input.type = pinHash ? 'password' : 'text';
      $('gate-error').textContent = '';
      let ok = false;
      const form = $('gate-form') as HTMLFormElement;
      form.onsubmit = async (e) => {
        e.preventDefault();
        if (Date.now() < lockedUntil) { $('gate-error').textContent = 'Подождите немного и попробуйте снова.'; return; }
        const v = input.value.trim();
        const right = pinHash ? (await hashPin(v)) === pinHash : Number(v) === a * b;
        if (right) { failures = 0; ok = true; modal!.close(); return; }
        failures++;
        input.value = '';
        if (failures >= 3) { lockedUntil = Date.now() + 30000; failures = 0; $('gate-error').textContent = 'Три неверных ответа. Подождите 30 секунд.'; }
        else $('gate-error').textContent = 'Неверно, попробуйте ещё раз.';
      };
      modal!.open(() => resolve(ok));
      input.focus();
    })();
  });
}
