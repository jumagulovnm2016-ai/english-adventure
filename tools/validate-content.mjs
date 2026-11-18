#!/usr/bin/env node
// Проверка учебного контента: схемы, ссылки между файлами, графы диалогов, зависимости квестов.
// Запуск: npm run validate-content [-- --assets]   (--assets: проверять наличие картинок и аудио)

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = process.env.CONTENT_DIR || join(ROOT, 'content');
const SCHEMAS = join(ROOT, 'schemas');
const CHECK_ASSETS = process.argv.includes('--assets');
const VOICES = ['us_f', 'us_m', 'uk_f', 'uk_m'];

const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`✗ ${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`! ${file}: ${msg}`);

// ---------- 1. Схемы ----------
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, allowUnionTypes: true });
addFormats(ajv);
for (const f of readdirSync(SCHEMAS)) ajv.addSchema(JSON.parse(readFileSync(join(SCHEMAS, f), 'utf8')));
const S = (name) => ajv.getSchema(`https://english-adventure.local/schemas/${name}.schema.json`);

function load(path, schemaName) {
  const rel = path.replace(ROOT + '/', '');
  let data;
  try { data = JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { err(rel, `не читается как JSON: ${e.message}`); return null; }
  const validate = S(schemaName);
  if (!validate(data)) {
    for (const e of validate.errors) err(rel, `${e.instancePath || '/'} ${e.message}${e.params?.allowedValues ? ' ' + JSON.stringify(e.params.allowedValues) : ''}`);
    return null;
  }
  return data;
}

const vocab   = load(join(CONTENT, 'vocabulary.json'), 'vocabulary');
const phrases = load(join(CONTENT, 'phrases.json'), 'phrases');
const items   = load(join(CONTENT, 'items.json'), 'items');
const npcs    = load(join(CONTENT, 'npcs.json'), 'npcs');
const canDo   = load(join(CONTENT, 'can_do.json'), 'can_do');
const dir = (d) => existsSync(join(CONTENT, d)) ? readdirSync(join(CONTENT, d)).filter(f => f.endsWith('.json')) : [];
const quests    = dir('quests').map(f => [`content/quests/${f}`, load(join(CONTENT, 'quests', f), 'quest')]).filter(x => x[1]);
const dialogues = dir('dialogues').map(f => [`content/dialogues/${f}`, load(join(CONTENT, 'dialogues', f), 'dialogue')]).filter(x => x[1]);

// ---------- 2. Индексы и уникальность ----------
const index = new Map(); // id -> {kind, data, file}
function register(kind, file, arr) {
  for (const x of arr ?? []) {
    if (index.has(x.id)) err(file, `повторяющийся id ${x.id}`);
    index.set(x.id, { kind, data: x, file });
  }
}
register('word', 'content/vocabulary.json', vocab?.words);
register('phrase', 'content/phrases.json', phrases?.phrases);
register('item', 'content/items.json', items?.items);
register('npc', 'content/npcs.json', npcs?.npcs);
register('cando', 'content/can_do.json', canDo?.skills);
for (const [file, q] of quests) register('quest', file, [q]);
for (const [file, d] of dialogues) register('dialogue', file, [d]);

// ---------- 3. Ссылки ----------
const ID_RE = /^(w|p|it|npc|q|d|cd)\.[a-z0-9_.]+$/;
const KIND_BY_PREFIX = { w: 'word', p: 'phrase', it: 'item', npc: 'npc', q: 'quest', d: 'dialogue', cd: 'cando' };
const used = new Set();
function walkRefs(file, node, selfId, path = '') {
  if (typeof node === 'string') {
    if (ID_RE.test(node) && node !== selfId) {
      used.add(node);
      const want = KIND_BY_PREFIX[node.split('.')[0]];
      const got = index.get(node);
      if (!got) err(file, `${path}: ссылка на несуществующий ${node}`);
      else if (got.kind !== want) err(file, `${path}: ${node} — это ${got.kind}, ожидался ${want}`);
    }
  } else if (Array.isArray(node)) node.forEach((v, i) => walkRefs(file, v, selfId, `${path}[${i}]`));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) {
    if (k === 'id' || k === 'image' || k === 'sprite') continue;
    walkRefs(file, v, selfId, `${path}/${k}`);
  }
}
for (const [id, { file, data, kind }] of index) if (kind !== 'word') walkRefs(file, data, id);
for (const w of vocab?.words ?? []) walkRefs('content/vocabulary.json', w.confusable ?? [], w.id, `/${w.id}/confusable`);

// ---------- 4. Слова и фразы ----------
for (const p of phrases?.phrases ?? []) {
  if (p.pieces) {
    const norm = (s) => s.toLowerCase().replace(/[^a-z' ]/g, '').replace(/\s+/g, ' ').trim();
    if (!norm(p.en).startsWith(norm(p.pieces.join(' ')))) err('content/phrases.json', `${p.id}: pieces «${p.pieces.join(' ')}» не совпадают с «${p.en}»`);
  }
  if (p.role === 'productive' && !p.accept) warn('content/phrases.json', `${p.id}: продуктивная фраза без accept — голосовой ответ будет сравниваться только с текстом`);
}
for (const w of vocab?.words ?? []) {
  for (const c of w.confusable ?? []) {
    const other = index.get(c)?.data;
    if (other && !(other.confusable ?? []).includes(w.id)) warn('content/vocabulary.json', `${w.id} путается с ${c}, но не наоборот (это допустимо, проверьте намеренно ли)`);
  }
}

// ---------- 5. Задания ----------
function checkTask(file, path, t) {
  if (t.options && !t.options.includes(t.target)) err(file, `${path}: options не содержат правильный ответ ${t.target}`);
  if (t.options) {
    const kinds = new Set(t.options.map(o => o.split('.')[0]));
    if (kinds.size > 1) err(file, `${path}: options смешивают слова и фразы`);
  }
  if ((t.allowed_types ?? []).includes('build_phrase')) {
    const p = index.get(t.target)?.data;
    if (!p?.pieces) err(file, `${path}: build_phrase для ${t.target}, но у фразы нет pieces`);
  }
  if ((t.allowed_types ?? []).includes('type_word') && !t.target.startsWith('w.')) err(file, `${path}: type_word возможен только для слова`);
}

// ---------- 6. Диалоги: граф ----------
for (const [file, d] of dialogues) {
  if (basename(file, '.json') !== d.id) err(file, `имя файла должно совпадать с id (${d.id}.json)`);
  const nodes = d.nodes;
  if (!nodes[d.start]) err(file, `start «${d.start}» не найден`);
  const nextOf = (n) => [n.next, n.on_correct, n.on_wrong].filter(Boolean);
  for (const [nid, n] of Object.entries(nodes)) {
    for (const t of nextOf(n)) if (t !== 'end' && !nodes[t]) err(file, `${nid}: переход на несуществующую реплику «${t}»`);
    if (n.task) checkTask(file, `nodes/${nid}/task`, n.task);
    if (n.speaker.startsWith('npc.') && n.speaker !== d.npc) warn(file, `${nid}: говорит ${n.speaker}, а диалог принадлежит ${d.npc}`);
  }
  // достижимость
  const seen = new Set(); const stack = [d.start];
  while (stack.length) { const id = stack.pop(); if (id === 'end' || seen.has(id) || !nodes[id]) continue; seen.add(id); stack.push(...nextOf(nodes[id])); }
  for (const nid of Object.keys(nodes)) if (!seen.has(nid)) err(file, `реплика «${nid}» недостижима`);
  // из каждой реплики можно дойти до end
  const canEnd = new Set(); let changed = true;
  while (changed) { changed = false; for (const [nid, n] of Object.entries(nodes)) if (!canEnd.has(nid) && nextOf(n).some(t => t === 'end' || canEnd.has(t))) { canEnd.add(nid); changed = true; } }
  for (const nid of Object.keys(nodes)) if (!canEnd.has(nid)) err(file, `из реплики «${nid}» нельзя дойти до конца — диалог зациклится`);
}

// ---------- 7. Квесты ----------
for (const [file, q] of quests) {
  if (basename(file, '.json') !== q.id) err(file, `имя файла должно совпадать с id (${q.id}.json)`);
  const stepIds = new Set();
  for (const [i, s] of q.steps.entries()) {
    if (stepIds.has(s.id)) err(file, `шаг ${s.id} повторяется`); stepIds.add(s.id);
    const p = `steps[${i}] ${s.id}`;
    if (s.type === 'find_item') {
      if (s.distractors.includes(s.target)) err(file, `${p}: правильный предмет есть среди отвлекающих`);
      const tw = new Set(index.get(s.target)?.data.words ?? []);
      for (const dId of s.distractors) {
        const dw = index.get(dId)?.data.words ?? [];
        if (dw.length && dw.every(w => tw.has(w)) && dw.length === tw.size) err(file, `${p}: ${dId} неотличим от ${s.target} по словам`);
      }
      const instr = index.get(s.instruction)?.data;
      if (instr && ![...tw].every(w => instr.words.includes(w))) warn(file, `${p}: инструкция ${s.instruction} упоминает не все слова предмета ${s.target}`);
    }
    if (s.type === 'task') checkTask(file, p, s.task);
    if (s.show && s.show.items.length > 8) err(file, `${p}: слишком много предметов для показа`);
    if (s.type === 'give_item') {
      const earlierFind = q.steps.slice(0, i).some(x => x.type === 'find_item' && x.target === s.item);
      const givenInDialogue = q.steps.slice(0, i).some(x => x.type === 'dialogue' &&
        Object.values(index.get(x.dialogue)?.data.nodes ?? {}).some(n => n.action?.type === 'give_player_item' && n.action.item === s.item));
      if (!earlierFind && !givenInDialogue) err(file, `${p}: отдаётся ${s.item}, но раньше в квесте его не находили и не получали`);
    }
  }
  if (q.steps.filter(s => s.type === 'review_slot').reduce((a, s) => a + s.count, 0) > Math.ceil(q.steps.length * 0.3) + 1)
    warn(file, 'много слотов повторения — правило «не больше ~30% сессии»');
}
// циклы зависимостей
const qmap = new Map(quests.map(([, q]) => [q.id, q]));
const visiting = new Set(), done = new Set();
function dfs(id, chain) {
  if (done.has(id)) return; if (visiting.has(id)) { err('content/quests', `цикл зависимостей: ${[...chain, id].join(' → ')}`); return; }
  visiting.add(id); for (const r of qmap.get(id)?.requires ?? []) dfs(r, [...chain, id]); visiting.delete(id); done.add(id);
}
for (const id of qmap.keys()) dfs(id, []);
// каждая локация должна иметь стартовый квест
const starters = quests.filter(([, q]) => q.requires.length === 0);
if (quests.length && !starters.length) err('content/quests', 'нет ни одного квеста без требований — игра не сможет начаться');

// ---------- 8. Навыки ----------
for (const s of canDo?.skills ?? []) {
  const r = s.rule;
  if (r.type === 'accuracy_after_delay' && r.min_correct_items > r.items.length) err('content/can_do.json', `${s.id}: min_correct_items (${r.min_correct_items}) больше числа элементов (${r.items.length}) — навык невозможно подтвердить`);
  if (r.type === 'uses_in_contexts' && r.min_distinct_contexts > r.min_successes) err('content/can_do.json', `${s.id}: контекстов больше, чем успехов`);
  if ((r.min_spoken ?? 0) > 0 && !r.kinds.includes('spoken')) err('content/can_do.json', `${s.id}: min_spoken > 0, но kinds не содержит spoken`);
}

// ---------- 9. Неиспользуемое ----------
for (const [id, { kind, file }] of index) {
  if (['word', 'phrase', 'item', 'npc', 'dialogue'].includes(kind) && !used.has(id)) warn(file, `${id} нигде не используется (ещё нет квеста?)`);
}

// ---------- 10. Ассеты ----------
if (CHECK_ASSETS) {
  for (const w of vocab?.words ?? []) if (!existsSync(join(ROOT, 'assets/images/words', w.image))) err('assets', `нет картинки ${w.image} для ${w.id}`);
  for (const [id, { kind }] of index) if (kind === 'word' || kind === 'phrase') {
    for (const v of VOICES) if (!existsSync(join(ROOT, 'assets/audio', v, `${id}.mp3`))) { err('assets', `нет аудио ${v}/${id}.mp3`); break; }
  }
}

// ---------- Итог ----------
const count = (k) => [...index.values()].filter(x => x.kind === k).length;
console.log(`Слов: ${count('word')}, фраз: ${count('phrase')}, предметов: ${count('item')}, NPC: ${count('npc')}, диалогов: ${count('dialogue')}, квестов: ${count('quest')}, навыков: ${count('cando')}`);
if (warnings.length) console.log(`\nПредупреждения (${warnings.length}):\n` + warnings.join('\n'));
if (errors.length) { console.log(`\nОшибки (${errors.length}):\n` + errors.join('\n')); process.exit(1); }
console.log('\n✓ Контент корректен' + (CHECK_ASSETS ? ' (с проверкой ассетов)' : ''));
