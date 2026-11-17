// Проверяем, что валидатор действительно ловит типичные ошибки контента.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function runOn(mutate) {
  const dir = mkdtempSync(join(tmpdir(), 'ea-content-'));
  cpSync(join(ROOT, 'content'), dir, { recursive: true });
  const edit = (rel, fn) => { const p = join(dir, rel); const j = JSON.parse(readFileSync(p, 'utf8')); fn(j); writeFileSync(p, JSON.stringify(j)); };
  mutate?.(edit);
  const r = spawnSync(process.execPath, [join(ROOT, 'tools/validate-content.mjs')], { env: { ...process.env, CONTENT_DIR: dir }, encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  return { code: r.status, out: r.stdout + r.stderr };
}
const Q = 'quests/q.home.blue_cup.json';
const D = 'dialogues/d.home.mum_blue_cup_end.json';

test('исходный контент проходит', () => {
  const r = runOn();
  assert.equal(r.code, 0, r.out);
});

test('ссылка на несуществующее слово', () => {
  const r = runOn(e => e(Q, q => { q.introduces[1] = 'w.dragon'; }));
  assert.equal(r.code, 1); assert.match(r.out, /несуществующий w\.dragon/);
});

test('правильный предмет среди отвлекающих', () => {
  const r = runOn(e => e(Q, q => { q.steps[1].distractors.push('it.cup_blue'); }));
  assert.equal(r.code, 1); assert.match(r.out, /правильный предмет есть среди отвлекающих/);
});

test('переход на несуществующую реплику', () => {
  const r = runOn(e => e(D, d => { d.nodes.cake.next = 'nowhere'; }));
  assert.equal(r.code, 1); assert.match(r.out, /несуществующую реплику «nowhere»/);
});

test('недостижимая реплика', () => {
  const r = runOn(e => e(D, d => { d.nodes.orphan = { speaker: 'npc.mum', say: 'p.hello', next: 'end' }; }));
  assert.equal(r.code, 1); assert.match(r.out, /«orphan» недостижима/);
});

test('зацикленный диалог без выхода', () => {
  const r = runOn(e => e(D, d => { d.nodes.bye.next = 'praise'; d.nodes.bye_back.on_correct = 'bye'; d.nodes.bye_back.on_wrong = 'bye'; }));
  assert.equal(r.code, 1); assert.match(r.out, /нельзя дойти до конца/);
});

test('варианты ответа без правильного', () => {
  const r = runOn(e => e(D, d => { d.nodes.ask_colour.task.options = ['w.green', 'w.red']; }));
  assert.equal(r.code, 1); assert.match(r.out, /не содержат правильный ответ/);
});

test('ошибка схемы: неизвестная локация', () => {
  const r = runOn(e => e(Q, q => { q.location = 'moon'; }));
  assert.equal(r.code, 1); assert.match(r.out, /location/);
});

test('ссылка не того типа (фраза вместо предмета)', () => {
  const r = runOn(e => e(Q, q => { q.steps[3].item = 'it.hello'; }));
  assert.equal(r.code, 1); assert.match(r.out, /it\.hello/);
});

test('невыполнимый навык', () => {
  const r = runOn(e => e('can_do.json', c => { c.skills[2].rule.min_correct_items = 50; }));
  assert.equal(r.code, 1); assert.match(r.out, /невозможно подтвердить/);
});

test('цикл зависимостей квестов', () => {
  const r = runOn(e => e(Q, q => { q.requires = ['q.home.blue_cup']; }));
  assert.equal(r.code, 1); assert.match(r.out, /нет ни одного квеста без требований|цикл/);
});

test('слишком много новых слов в квесте (лимит 6)', () => {
  const r = runOn(e => e(Q, q => { q.introduces.push('w.ball'); }));
  assert.equal(r.code, 1); assert.match(r.out, /introduces/);
});
