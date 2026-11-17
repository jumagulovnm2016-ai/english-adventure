// Схема файла сохранения компилируется, пример проходит, типичные порчи отклоняются.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, allowUnionTypes: true });
addFormats(ajv);
for (const f of readdirSync(join(ROOT, 'schemas'))) ajv.addSchema(JSON.parse(readFileSync(join(ROOT, 'schemas', f), 'utf8')));
const validate = ajv.getSchema('https://english-adventure.local/schemas/save.schema.json');
const sample = () => JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/save.example.json'), 'utf8'));

test('пример сохранения проходит схему', () => {
  assert.ok(validate(sample()), JSON.stringify(validate.errors, null, 2));
});
test('чужой файл отклоняется', () => {
  const s = sample(); s.format = 'something-else';
  assert.equal(validate(s), false);
});
test('лишние личные поля не принимаются (фамилия, возраст)', () => {
  const s = sample(); s.profile.surname = 'Иванова';
  assert.equal(validate(s), false);
  const s2 = sample(); s2.profile.age = 9;
  assert.equal(validate(s2), false);
});
test('неизвестный статус слова отклоняется', () => {
  const s = sample(); s.items['w.blue'].status = 'mastered';
  assert.equal(validate(s), false);
});
