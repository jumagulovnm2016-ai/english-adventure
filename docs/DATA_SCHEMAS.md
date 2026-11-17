# Форматы данных

Все форматы описаны в `schemas/*.schema.json` (JSON Schema 2020-12). Этот документ объясняет их по-человечески.
Проверка контента: `npm run validate-content` (с ассетами: `npm run validate-content:assets`).

---

## 1. Идентификаторы

| Префикс | Что | Пример | Где лежит |
|---|---|---|---|
| `w.` | слово | `w.blue` | `content/vocabulary.json` |
| `p.` | фраза (любая английская реплика) | `p.find_the_blue_cup` | `content/phrases.json` |
| `it.` | предмет мира | `it.cup_blue` | `content/items.json` |
| `npc.` | персонаж | `npc.mum` | `content/npcs.json` |
| `q.<локация>.` | квест | `q.home.blue_cup` | `content/quests/<id>.json` |
| `d.<локация>.` | диалог | `d.home.mum_blue_cup_start` | `content/dialogues/<id>.json` |
| `cd.` | навык «умеет» | `cd.colours` | `content/can_do.json` |

Правила: только латиница в нижнем регистре, цифры и `_`; имя файла квеста/диалога = его id; **id никогда не переименовывать** после выпуска — на них ссылается сохранённый прогресс детей.

Локации: `home`, `street`, `shop`, `school`.

---

## 2. Словарь — `vocabulary.json`

```json
{ "id": "w.blue", "en": "blue", "ru": "синий", "topic": "colours", "pos": "adjective",
  "level": "preA1", "image": "blue.png",
  "accept": ["blue"], "confusable": ["w.green"] }
```

- `image` — путь от `assets/images/words/`.
- `accept` — что засчитывать при голосовом ответе и вводе (нижний регистр, без знаков). Сюда же добавляются частые ошибки распознавания, которые означают верный ответ: для `w.three` — `"free"`, `"tree"`.
- `confusable` — с чем путают; отсюда берутся отвлекающие варианты. Не обязательно взаимно.
- Аудио не указывается: оно находится по соглашению `assets/audio/<акцент>_<пол>/<id>.mp3` и `<id>.slow.mp3`.

## 3. Фразы — `phrases.json`

**Каждая английская реплика в игре — фраза из этого файла.** Так у любой реплики гарантированно есть озвучка (генерируется по id) и перевод.

```json
{ "id": "p.its_blue", "en": "It's blue.", "ru": "Она синяя.", "level": "preA1",
  "role": "productive", "words": ["w.blue"],
  "pieces": ["It's", "blue"], "accept": ["it's blue", "it is blue", "blue"],
  "why_ru": "It's = It is. В английском нельзя сказать «она синяя» без is." }
```

- `role`: `productive` — ребёнок должен уметь сказать сам; `receptive` — только понимать (реплики NPC).
- `words` — какие слова словаря в ней есть (для статистики и отбора повторения).
- `pieces` — куски для режима «собери фразу».
- `why_ru` — объяснение по кнопке «Почему так?» в старшем режиме.

## 4. Предметы — `items.json`, персонажи — `npcs.json`

```json
{ "id": "it.cup_blue", "words": ["w.blue", "w.cup"], "sprite": "cup_blue", "pickable": true }
{ "id": "npc.mum", "name_en": "Mum", "role_ru": "Мама героя", "name_ru": "мама", "ru_with": "с мамой", "ru_to": "маме",
  "location": "home", "gender": "f", "sprite": "mum" }
```

Предмет описывается словами — по ним валидатор проверяет, что отвлекающие предметы действительно отличаются от правильного. У NPC задан только пол голоса; акцент (US/UK) выбирает игрок. Падежные формы (`ru_with`, `ru_to`) нужны для целей в шапке: «Поговори с мамой», «Отнеси blue cup маме».

## 5. Задание (task)

Используется внутри диалогов и шагов квеста.

```json
{ "type": "auto", "target": "w.blue",
  "prompt": { "say": "p.what_colour_is_it" },
  "options": ["w.blue", "w.green", "w.red"],
  "allowed_types": ["listen_choose", "say_aloud", "type_word"] }
```

| `type` | Что делает ребёнок | Вид события |
|---|---|---|
| `listen_choose` | слушает и выбирает картинку/вариант | comprehension |
| `build_phrase` | собирает фразу из кусков | production |
| `say_aloud` | говорит вслух | spoken |
| `type_word` | пишет слово (только старший режим) | production |
| `auto` | режим выбирает игра по состоянию слова и возрасту | — |

Если `options` нет — варианты берутся из `confusable` и той же темы.

## 6. Диалог — `dialogues/<id>.json`

Граф реплик. Реплика — либо говорит персонаж (`say`), либо ждёт ответа игрока (`task`).

```json
"ask_colour": {
  "speaker": "npc.mum", "say": "p.what_colour_is_it",
  "ru_hint": { "junior": "Мама спрашивает, какого цвета чашка.", "senior": "Вопрос про цвет." },
  "task": { "type": "auto", "target": "w.blue" },
  "on_correct": "cake", "on_wrong": "model_answer"
}
```

- Реплика с `task` обязана иметь `on_correct` и `on_wrong`; без задания — `next`. Конец диалога — `"end"`.
- `on_wrong` срабатывает **после** всей лестницы помощи (2 попытки → подсказка спутника → правильный ответ звучит). Застрять нельзя.
- `action`: `give_player_item`, `take_player_item`, `emote`.
- Валидатор проверяет: все переходы существуют, все реплики достижимы, из любой реплики можно дойти до `end`.

## 7. Квест — `quests/<id>.json`

```json
{ "id": "q.home.blue_cup", "location": "home", "order": 1,
  "title": { "junior": "Синяя чашка для мамы", "senior": "Дело о синей чашке" },
  "intro": { "junior": "…", "senior": "…" },
  "giver": "npc.mum", "requires": [],
  "introduces": ["p.hello", "w.find", "w.blue", "w.cup", "p.thank_you", "p.goodbye"],
  "practices": [],
  "steps": [ … ], "rewards": { "stars": 3, "decor": ["it.decor_blue_lamp"] } }
```

- `introduces` — не больше 6 новых элементов на квест.
- Шаги:

| `type` | Обязательные поля | Смысл |
|---|---|---|
| `dialogue` | `dialogue` | запустить диалог |
| `go_to` | `location`, `zone` | дойти до зоны на карте |
| `find_item` | `instruction`, `target`, `distractors`, `hint`, `zone` | понять инструкцию и найти предмет среди похожих; `zone` — набор мест на карте (`kitchen`, `living`), куда раскладываются предметы |
| `give_item` | `npc`, `item` | отдать предмет |
| `task` | `task` | отдельное задание |
| `review_slot` | `count` (1–3) | место для повторения: слово подставит `ReviewPicker` |

`hint` — подсказка спутника: текст на русском для обоих режимов и (по желанию) фраза, которую он повторит по-английски.

## 8. Навыки — `can_do.json`

То, что видит родитель в отчёте «Что ребёнок уже умеет».

```json
{ "id": "cd.colours", "order": 3, "level": "preA1",
  "title_ru": "Знает основные цвета",
  "explain_ru": "Правильно определил 8 цветов из 10, когда они встретились снова — не раньше чем через 2 дня…",
  "rule": { "type": "accuracy_after_delay", "items": ["w.red", "…"], "kinds": ["comprehension", "production", "spoken"],
            "min_correct_items": 8, "min_days_since_first_seen": 2 } }
```

Типы правил:

| Тип | Подтверждён, когда… |
|---|---|
| `uses_in_contexts` | ≥ `min_successes` успехов по `items` нужного вида, в ≥ `min_distinct_contexts` разных квестах/диалогах, в ≥ `min_distinct_days` разных днях, из них ≥ `min_spoken` голосом |
| `accuracy_after_delay` | по ≥ `min_correct_items` разным элементам **последняя** попытка верна, и она была не раньше чем через `min_days_since_first_seen` дней после первой встречи |
| `streak` | ≥ `consecutive_correct` верных ответов подряд по `items`, в ≥ `min_distinct_contexts` разных контекстах |

Общие правила подсчёта:
- ответы с подсказкой (`hinted: true`) и `unsure` **не засчитываются**;
- «контекст» = id квеста или диалога; повторение в мире = `review.<локация>`; входная проверка не является контекстом для навыков;
- «день» — календарный день по часовому поясу устройства;
- если микрофон выключен, `min_spoken` не требуется, навык подтверждается с пометкой «без голоса».

## 9. Прогресс и журнал событий

Формат экспорта — `schemas/save.schema.json`, пример — `tests/fixtures/save.example.json`. Он же отражает хранилища IndexedDB (см. ARCHITECTURE.md §5).

Событие журнала:

```json
{ "t": "2026-11-20T14:45:00+06:00", "item": "w.blue", "kind": "comprehension", "mode": "find_item",
  "result": "wrong", "hinted": false, "chosen": "w.green", "context": "q.home.blue_cup" }
```

- `chosen` — что выбрали вместо верного: из этого строится учёт путаницы.
- В `find_item` событие пишется **по каждому слову предмета**: схватил красную чашку вместо синей → ошибка по `w.blue` (выбран `w.red`), но верно по `w.cup`. Схватил синюю тарелку → верно по `w.blue`, ошибка по `w.cup`.
- Статус навыков (`canDo`) — кэш; при изменении правил в контенте он пересчитывается из журнала. Поэтому журнал хранит «сырые» события, а не только итоги.
- В профиле только имя (до 20 символов). Фамилии, возраста, города схема не допускает.

---

## Как добавить…

**Слово:** запись в `vocabulary.json` → картинка в `assets/images/words/` → `npm run generate-audio` → `npm run validate-content:assets`.

**Квест:** файл `content/quests/q.<локация>.<имя>.json` + нужные диалоги в `content/dialogues/` + новые фразы в `phrases.json` → `npm run validate-content`. Объект-триггер с `questId` ставится на карту в Tiled (этап 1+).
