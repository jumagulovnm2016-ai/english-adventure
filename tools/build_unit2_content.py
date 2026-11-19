# Генератор контента юнита 2: площадка (действия, «I can…», погода) и зоопарк (звери, части тела, big/small/long).
# Запуск: python3 tools/build_unit2_content.py  — перезаписывает только записи юнита 2, остальное не трогает.
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from content_lib import say, ask, dialogue, quest, hint, HELLO, BYE, GIVE, THANKS

def load(p): return json.load(open(p, encoding='utf-8'))
def save(p, d):
    with open(p, 'w', encoding='utf-8') as f: json.dump(d, f, ensure_ascii=False, indent=2); f.write('\n')
def upsert(lst, new):
    ids = {x['id'] for x in new}
    return [x for x in lst if x['id'] not in ids] + new

# ================= СЛОВА =================
def W(id, en, ru, topic, pos, accept=None, conf=None):
    w = {"id": id, "en": en, "ru": ru, "topic": topic, "pos": pos, "level": "preA1", "image": f"{id[2:]}.png"}
    if accept: w["accept"] = accept
    if conf: w["confusable"] = conf
    return w

WORDS = [
    # площадка
    W("w.kite", "kite", "воздушный змей", "toys", "noun", ["kite", "a kite"]),
    W("w.bike", "bike", "велосипед", "toys", "noun", ["bike", "a bike", "bicycle"]),
    W("w.ice_cream", "ice cream", "мороженое", "food", "noun", ["ice cream", "an ice cream", "icecream"]),
    W("w.swing", "swing", "качели", "places", "noun", ["swing", "a swing", "swings"], ["w.slide"]),
    W("w.slide", "slide", "горка", "places", "noun", ["slide", "a slide"], ["w.swing"]),
    W("w.tree", "tree", "дерево", "places", "noun", ["tree", "a tree"], ["w.flower"]),
    W("w.flower", "flower", "цветок", "places", "noun", ["flower", "a flower"], ["w.tree"]),
    W("w.run", "run", "бегать", "actions", "verb", None, ["w.jump"]),
    W("w.jump", "jump", "прыгать", "actions", "verb", None, ["w.run"]),
    W("w.swim", "swim", "плавать", "actions", "verb", None, ["w.fly"]),
    W("w.fly", "fly", "летать", "actions", "verb", None, ["w.swim"]),
    W("w.climb", "climb", "лазать", "actions", "verb"),
    W("w.sing", "sing", "петь", "actions", "verb", None, ["w.dance"]),
    W("w.dance", "dance", "танцевать", "actions", "verb", None, ["w.sing"]),
    W("w.ride", "ride", "кататься", "actions", "verb", ["ride", "ride a bike"]),
    W("w.sunny", "sunny", "солнечно", "weather", "adjective", None, ["w.rainy"]),
    W("w.rainy", "rainy", "дождливо", "weather", "adjective", ["rainy", "raining"], ["w.sunny"]),
    W("w.hot", "hot", "жарко", "weather", "adjective", None, ["w.cold"]),
    W("w.cold", "cold", "холодно", "weather", "adjective", None, ["w.hot"]),
    # зоопарк
    W("w.lion", "lion", "лев", "animals", "noun", ["lion", "a lion"], ["w.tiger"]),
    W("w.tiger", "tiger", "тигр", "animals", "noun", ["tiger", "a tiger"], ["w.lion"]),
    W("w.elephant", "elephant", "слон", "animals", "noun", ["elephant", "an elephant"], ["w.hippo"]),
    W("w.monkey", "monkey", "обезьяна", "animals", "noun", ["monkey", "a monkey"]),
    W("w.giraffe", "giraffe", "жираф", "animals", "noun", ["giraffe", "a giraffe"], ["w.zebra"]),
    W("w.zebra", "zebra", "зебра", "animals", "noun", ["zebra", "a zebra"], ["w.giraffe"]),
    W("w.bear", "bear", "медведь", "animals", "noun", ["bear", "a bear"]),
    W("w.snake", "snake", "змея", "animals", "noun", ["snake", "a snake"], ["w.crocodile"]),
    W("w.penguin", "penguin", "пингвин", "animals", "noun", ["penguin", "a penguin"]),
    W("w.hippo", "hippo", "бегемот", "animals", "noun", ["hippo", "a hippo", "hippopotamus"], ["w.elephant"]),
    W("w.crocodile", "crocodile", "крокодил", "animals", "noun", ["crocodile", "a crocodile", "croc"], ["w.snake"]),
    W("w.parrot", "parrot", "попугай", "animals", "noun", ["parrot", "a parrot"]),
    W("w.head", "head", "голова", "body", "noun"),
    W("w.eyes", "eyes", "глаза", "body", "noun", ["eyes", "eye"], ["w.ears"]),
    W("w.ears", "ears", "уши", "body", "noun", ["ears", "ear"], ["w.eyes"]),
    W("w.nose", "nose", "нос", "body", "noun", None, ["w.mouth"]),
    W("w.mouth", "mouth", "рот", "body", "noun", None, ["w.nose"]),
    W("w.legs", "legs", "ноги", "body", "noun", ["legs", "leg"]),
    W("w.tail", "tail", "хвост", "body", "noun", None, ["w.neck"]),
    W("w.neck", "neck", "шея", "body", "noun", None, ["w.tail"]),
    W("w.big", "big", "большой", "describing", "adjective", None, ["w.small"]),
    W("w.small", "small", "маленький", "describing", "adjective", ["small", "little"], ["w.big"]),
    W("w.long", "long", "длинный", "describing", "adjective"),
]

# ================= ФРАЗЫ =================
def P(id, en, ru, role, words, pieces=None, accept=None, why=None):
    p = {"id": id, "en": en, "ru": ru, "level": "preA1", "role": role, "words": words}
    if pieces: p["pieces"] = pieces
    if accept: p["accept"] = accept
    if why: p["why_ru"] = why
    return p

ICAN = lambda verb, ru, role="receptive": P(f"p.i_can_{verb}", f"I can {verb}!", f"Я умею {ru}!", role, [f"w.{verb}"],
                                         ["I", "can", verb] if role == "productive" else None,
                                         [f"i can {verb}", verb] if role == "productive" else None,
                                         "Can — «умею, могу». После can действие без изменений: I can run, I can swim." if verb == "run" else None)
TOUCH = lambda part, ru: P(f"p.touch_your_{part}", f"Touch your {part}!", f"Дотронься до {ru}!", "receptive", [f"w.{part}"])
LOOK = lambda what, ru: P(f"p.look_{what}", f"Look at the {what.replace('_', ' ')}!", f"Посмотри на {ru}!", "receptive", [f"w.{what}"])
ITS_A = lambda what, art="a": P(f"p.its_{'an' if art == 'an' else 'a'}_{what}", f"It's {art} {what}.", "", "productive", [f"w.{what}"],
                                 ["It's", art, what], [f"it's {art} {what}", f"it is {art} {what}", f"{art} {what}", what])

PHRASES = [
    # площадка
    P("p.hi_im_mia", "Hi! I'm Mia.", "Привет! Я Мия.", "receptive", []),
    P("p.lets_play", "Let's play!", "Давай играть!", "receptive", []),
    ICAN("jump", "прыгать", "productive"), ICAN("run", "бегать", "productive"),
    ICAN("climb", "лазать"), ICAN("dance", "танцевать"), ICAN("sing", "петь"), ICAN("swim", "плавать"),
    P("p.can_you_jump", "Can you jump?", "А ты умеешь прыгать?", "receptive", ["w.jump"]),
    P("p.can_you_climb", "Can you climb?", "А ты умеешь лазать?", "receptive", ["w.climb"]),
    P("p.yes_i_can", "Yes, I can.", "Да, умею.", "productive", [], ["Yes,", "I", "can"], ["yes i can", "yes"],
      "Короткий ответ на вопрос с can: Yes, I can — да, умею. «Нет» — No, I can't."),
    P("p.find_my_kite", "Find my kite, please. It's red.", "Найди моего змея, пожалуйста. Он красный.", "receptive", ["w.find", "w.kite", "w.red", "w.please"]),
    P("p.look_it_can_fly", "Look! It can fly!", "Смотри! Он умеет летать!", "receptive", ["w.fly"]),
    P("p.find_my_bike", "Find my bike, please. It's blue.", "Найди мой велосипед, пожалуйста. Он синий.", "receptive", ["w.find", "w.bike", "w.blue", "w.please"]),
    P("p.lets_ride", "Let's ride a bike!", "Давай кататься на велосипеде!", "receptive", ["w.ride", "w.bike"]),
    P("p.its_sunny", "It's sunny.", "Солнечно.", "productive", ["w.sunny"], ["It's", "sunny"], ["it's sunny", "it is sunny", "sunny"]),
    P("p.oh_no_its_rainy", "Oh no! It's raining!", "Ой! Пошёл дождь!", "receptive", ["w.rainy"]),
    P("p.its_rainy", "It's rainy.", "Дождливо.", "productive", ["w.rainy"], ["It's", "rainy"], ["it's rainy", "it is rainy", "rainy", "it's raining"]),
    P("p.ice_cream_hello", "Hello! Ice cream?", "Привет! Мороженое?", "receptive", ["w.hello", "w.ice_cream"]),
    P("p.one_ice_cream_please", "One ice cream, please.", "Одно мороженое, пожалуйста.", "productive", ["w.one", "w.ice_cream", "w.please"],
      ["One", "ice cream,", "please"], ["one ice cream please", "one ice cream", "ice cream please"]),
    P("p.its_hot_today", "It's hot today!", "Сегодня жарко!", "receptive", ["w.hot"]),
    P("p.its_hot", "It's hot.", "Жарко.", "productive", ["w.hot"], ["It's", "hot"], ["it's hot", "it is hot", "hot"]),
    LOOK("slide", "горку"), LOOK("swing", "качели"), LOOK("tree", "дерево"), LOOK("flower", "цветок"),
    # зоопарк
    P("p.welcome_zoo", "Welcome to the zoo!", "Добро пожаловать в зоопарк!", "receptive", []),
    P("p.im_kate", "I'm Kate. I'm a zookeeper.", "Я Кейт. Я смотритель зоопарка.", "receptive", []),
    dict(ITS_A("lion"), ru="Это лев."), dict(ITS_A("elephant", "an"), ru="Это слон."), dict(ITS_A("monkey"), ru="Это обезьяна."),
    dict(ITS_A("tiger"), ru="Это тигр."),
    P("p.its_big", "It's big!", "Он большой!", "productive", ["w.big"], ["It's", "big"], ["it's big", "it is big", "big"]),
    P("p.its_small", "It's small.", "Он маленький.", "productive", ["w.small"], ["It's", "small"], ["it's small", "it is small", "small", "it's little"]),
    LOOK("elephant", "слона"), LOOK("penguin", "пингвина"), LOOK("giraffe", "жирафа"),
    P("p.is_it_big_or_small", "Is it big or small?", "Он большой или маленький?", "receptive", ["w.big", "w.small"]),
    P("p.it_has_a_long_neck", "It has a long neck.", "У него длинная шея.", "receptive", ["w.long", "w.neck"]),
    P("p.oh_no_monkey", "Oh no! Where is the monkey?", "Ой! Где же обезьянка?", "receptive", ["w.monkey"]),
    P("p.find_the_monkey", "Find the monkey, please.", "Найди обезьянку, пожалуйста.", "receptive", ["w.find", "w.monkey", "w.please"]),
    P("p.it_has_a_long_tail", "It has a long tail.", "У неё длинный хвост.", "receptive", ["w.long", "w.tail"]),
    P("p.hi_im_leo", "Hi! I'm Leo.", "Привет! Я Лео.", "receptive", []),
    TOUCH("head", "головы"), TOUCH("eyes", "глаз"), TOUCH("ears", "ушей"), TOUCH("nose", "носа"), TOUCH("mouth", "рта"), TOUCH("legs", "ног"),
    P("p.monkeys_hungry", "The monkeys are hungry.", "Обезьянки проголодались.", "receptive", ["w.monkey"]),
    P("p.give_me_three_bananas", "Give me three bananas, please.", "Дай мне три банана, пожалуйста.", "receptive", ["w.give", "w.three", "w.banana", "w.please"]),
    P("p.how_many_bananas", "How many bananas?", "Сколько бананов?", "receptive", ["w.banana"]),
    P("p.three_bananas", "Three bananas.", "Три банана.", "productive", ["w.three", "w.banana"], ["Three", "bananas"], ["three bananas", "three"]),
    P("p.it_has_big_ears", "Look! It has big ears.", "Смотри! У него большие уши.", "receptive", ["w.big", "w.ears"]),
]

# ================= ПРЕДМЕТЫ И ЖИТЕЛИ =================
def I(id, words, sprite, pickable=True):
    return {"id": id, "words": words, "sprite": sprite, "pickable": pickable}
ITEMS = [
    I("it.kite_red", ["w.red", "w.kite"], "kite_red"), I("it.kite_blue", ["w.blue", "w.kite"], "kite_blue"), I("it.kite_yellow", ["w.yellow", "w.kite"], "kite_yellow"),
    I("it.bike_red", ["w.red", "w.bike"], "bike_red"), I("it.bike_blue", ["w.blue", "w.bike"], "bike_blue"),
    I("it.ice_cream", ["w.ice_cream"], "ice_cream"), I("it.bananas_three", ["w.three", "w.banana"], "bananas_three"),
    I("it.monkey", ["w.monkey"], "monkey"), I("it.parrot", ["w.parrot"], "parrot"), I("it.penguin", ["w.penguin"], "penguin"), I("it.snake", ["w.snake"], "snake"),
] + [I(f"it.{k}", [f"w.{k}"], k, False) for k in ["lion", "tiger", "elephant", "giraffe", "zebra", "bear", "hippo", "crocodile"]]

NPCS = [
    {"id": "npc.mia", "name_en": "Mia", "role_ru": "Девочка на площадке", "name_ru": "Мия", "ru_with": "с Мией", "ru_to": "Мие", "location": "playground", "gender": "f", "sprite": "mia"},
    {"id": "npc.sam", "name_en": "Sam", "role_ru": "Продавец мороженого", "name_ru": "Сэм", "ru_with": "с Сэмом", "ru_to": "Сэму", "location": "playground", "gender": "m", "sprite": "sam"},
    {"id": "npc.kate", "name_en": "Kate", "role_ru": "Смотритель зоопарка", "name_ru": "Кейт", "ru_with": "с Кейт", "ru_to": "Кейт", "location": "zoo", "gender": "f", "sprite": "kate"},
    {"id": "npc.leo", "name_en": "Leo", "role_ru": "Мальчик в зоопарке", "name_ru": "Лео", "ru_with": "с Лео", "ru_to": "Лео", "location": "zoo", "gender": "m", "sprite": "leo"},
]

def skill(id, order, title, explain, rule):
    return {"id": id, "order": order, "level": "preA1", "title_ru": title, "explain_ru": explain, "rule": rule}
ALL3 = ["comprehension", "production", "spoken"]
SKILLS = [
    skill("cd.actions", 11, "Знает действия: бегать, прыгать, плавать…",
          "Узнал 6 из 8 действий (run, jump, swim, fly, climb, sing, dance, ride), когда они встретились снова — не раньше чем через 2 дня.",
          {"type": "accuracy_after_delay", "items": ["w.run", "w.jump", "w.swim", "w.fly", "w.climb", "w.sing", "w.dance", "w.ride"], "kinds": ALL3, "min_correct_items": 6, "min_days_since_first_seen": 2}),
    skill("cd.i_can", 12, "Может сказать, что умеет: «I can run», «Yes, I can»",
          "Сам ответил или составил фразу с can 2 раза в разных разговорах, в 2 разных дня.",
          {"type": "uses_in_contexts", "items": ["p.yes_i_can", "p.i_can_run"], "kinds": ["production", "spoken"], "min_successes": 2, "min_distinct_contexts": 2, "min_distinct_days": 2}),
    skill("cd.weather", 13, "Знает погоду: солнечно, дождливо, жарко, холодно",
          "Узнал 3 из 4 слов о погоде, когда они встретились снова — не раньше чем через 2 дня.",
          {"type": "accuracy_after_delay", "items": ["w.sunny", "w.rainy", "w.hot", "w.cold"], "kinds": ALL3, "min_correct_items": 3, "min_days_since_first_seen": 2}),
    skill("cd.zoo_animals", 14, "Знает зверей зоопарка",
          "Узнал 9 из 12 зверей зоопарка, когда они встретились снова — не раньше чем через 2 дня.",
          {"type": "accuracy_after_delay", "items": ["w.lion", "w.tiger", "w.elephant", "w.monkey", "w.giraffe", "w.zebra", "w.bear", "w.snake", "w.penguin", "w.hippo", "w.crocodile", "w.parrot"], "kinds": ALL3, "min_correct_items": 9, "min_days_since_first_seen": 2}),
    skill("cd.body", 15, "Знает части тела",
          "Правильно показал 5 из 6 частей тела (голова, глаза, уши, нос, рот, ноги), когда они встретились снова — не раньше чем через 2 дня.",
          {"type": "accuracy_after_delay", "items": ["p.touch_your_head", "p.touch_your_eyes", "p.touch_your_ears", "p.touch_your_nose", "p.touch_your_mouth", "p.touch_your_legs"], "kinds": ALL3, "min_correct_items": 5, "min_days_since_first_seen": 2}),
    skill("cd.describe", 16, "Может описать: большой, маленький, длинный",
          "Верно ответил про big, small и long, когда они встретились снова — не раньше чем через 2 дня.",
          {"type": "accuracy_after_delay", "items": ["w.big", "w.small", "w.long"], "kinds": ALL3, "min_correct_items": 3, "min_days_since_first_seen": 2}),
]

for path, key, new in [("content/vocabulary.json", "words", WORDS), ("content/phrases.json", "phrases", PHRASES),
                       ("content/items.json", "items", ITEMS), ("content/npcs.json", "npcs", NPCS), ("content/can_do.json", "skills", SKILLS)]:
    d = load(path); d[key] = upsert(d[key], new); save(path, d)

# ================= ПЛОЩАДКА =================
def pick(target, ru, ru_s, options, model=None, picture=None):
    return ask(target, ru, ru_s, options=options, model=model, picture=picture)

dialogue("d.play.mia_hello", "npc.mia", [
    say("npc.mia", "p.hi_im_mia", "Это девочка Мия.", "Это Мия.", {"type": "emote", "emote": "wave"}),
    HELLO("с Мией"),
    say("npc.mia", "p.whats_your_name", "Мия спрашивает, как тебя зовут.", "Вопрос об имени."),
    ask("p.my_name_is", "Скажи: «Меня зовут …»", "Назови себя.", allowed=["listen_choose", "build_phrase"]),
    say("npc.mia", "p.lets_play", "Мия зовёт играть!", "Приглашение поиграть."),
    say("npc.mia", "p.i_can_jump", "Смотри, что умеет Мия!", "Что она умеет?", {"type": "emote", "emote": "jump"}),
    pick("w.jump", "Что умеет Мия?", "Что она умеет?", ["w.jump", "w.run", "w.swim"], "p.i_can_jump"),
    say("npc.mia", "p.can_you_jump", "Мия спрашивает: а ты умеешь?", "Вопрос с can."),
    ask("p.yes_i_can", "Ответь: «Да, умею!»", "Ответь, что умеешь.", allowed=["listen_choose", "build_phrase"], model="p.yes_i_can"),
    say("npc.mia", "p.yes_well_done", None, None, {"type": "emote", "emote": "happy"}),
    say("npc.mia", "p.bye_see_you"),
    BYE("с Мией"),
])
quest("q.play.mia", "playground", 1, ("Новая подружка", "Знакомство на площадке"),
      ("На площадке девочка Мия. Подойди к ней — над ней «!»", "На площадке новая знакомая. Поговори с ней."),
      "npc.mia", ["q.street.animals"], ["w.jump", "p.i_can_jump", "p.yes_i_can"], ["p.hello", "p.my_name_is"],
      [{"id": "talk", "type": "dialogue", "dialogue": "d.play.mia_hello"},
       {"id": "review", "type": "review_slot", "count": 1, "prefer_topics": ["animals", "colours"]}])

dialogue("d.play.mia_actions", "npc.mia", [
    say("npc.mia", "p.hi_again", None, None, {"type": "emote", "emote": "wave"}),
    HELLO("с Мией"),
    say("npc.mia", "p.i_can_run", "Смотри на Мию!", "Что она умеет?", {"type": "emote", "emote": "run"}),
    pick("w.run", "Что умеет Мия?", "Что она делает?", ["w.run", "w.jump", "w.climb"], "p.i_can_run"),
    say("npc.mia", "p.i_can_climb", "Мия показывает на горку.", "Ещё одно умение."),
    pick("w.climb", "Что умеет Мия?", "Что она умеет?", ["w.climb", "w.swim", "w.run"], "p.i_can_climb"),
    say("npc.mia", "p.i_can_dance", "А теперь?", "А это?", {"type": "emote", "emote": "dance"}),
    pick("w.dance", "Что умеет Мия?", "Что она умеет?", ["w.dance", "w.sing", "w.jump"], "p.i_can_dance"),
    say("npc.mia", "p.i_can_sing", "Послушай!", "Ещё одно."),
    pick("w.sing", "Что умеет Мия?", "Что она умеет?", ["w.sing", "w.dance", "w.swim"], "p.i_can_sing"),
    say("npc.mia", "p.i_can_swim", "Мия показывает на пруд.", "Пруд рядом."),
    pick("w.swim", "Что умеет Мия?", "Что она умеет?", ["w.swim", "w.climb", "w.run"], "p.i_can_swim"),
    ask("p.i_can_run", "Скажи Мие: «Я умею бегать!»", "Скажи, что умеешь бегать.", allowed=["listen_choose", "build_phrase"], model="p.i_can_run"),
    say("npc.mia", "p.yes_well_done", None, None, {"type": "emote", "emote": "happy"}),
    BYE("с Мией"),
])
quest("q.play.actions", "playground", 2, ("Что умеет Мия?", "Мия показывает умения"),
      ("Мия хочет показать, что она умеет!", "Мия покажет пять умений. Узнаешь все?"),
      "npc.mia", ["q.play.mia"], ["w.run", "w.climb", "w.dance", "w.sing", "w.swim", "p.i_can_run"], ["w.jump"],
      [{"id": "talk", "type": "dialogue", "dialogue": "d.play.mia_actions"}])

dialogue("d.play.mia_kite_start", "npc.mia", [
    say("npc.mia", "p.hi_again", None, None, {"type": "emote", "emote": "wave"}),
    HELLO("с Мией"),
    say("npc.mia", "p.find_my_kite", "Мия о чём-то просит. Послушай ещё раз, если нужно.", "Просьба. Можно переслушать."),
])
dialogue("d.play.mia_kite_end", "npc.mia", [
    GIVE,
    say("npc.mia", "p.thank_you", None, None, {"type": "take_player_item", "item": "it.kite_red"}),
    say("npc.mia", "p.look_it_can_fly", "Мия запускает змея. Что он умеет?", "Что умеет змей?", {"type": "emote", "emote": "jump"}),
    pick("w.fly", "Что умеет змей?", "Что он делает?", ["w.fly", "w.swim", "w.climb"]),
    say("npc.mia", "p.yes_well_done", None, None, {"type": "emote", "emote": "happy"}),
    BYE("с Мией"),
])
quest("q.play.kite", "playground", 3, ("Воздушный змей", "Где змей Мии?"),
      ("Мия потеряла игрушку. Подойди к ней!", "У Мии пропажа. Помоги найти."),
      "npc.mia", ["q.play.actions"], ["w.kite", "w.fly"], ["w.red", "w.find", "p.here_you_are"],
      [{"id": "talk_start", "type": "dialogue", "dialogue": "d.play.mia_kite_start"},
       {"id": "find_kite", "type": "find_item", "zone": "field", "instruction": "p.find_my_kite", "target": "it.kite_red",
        "distractors": ["it.kite_blue", "it.kite_yellow", "it.bike_red"],
        "hint": hint("Kite — воздушный змей, red — красный. Нужен красный змей!", "Два признака: kite и red. Красный велосипед — не то.", "p.find_my_kite")},
       {"id": "give_kite", "type": "give_item", "npc": "npc.mia", "item": "it.kite_red", "hint": hint("Отнеси змея Мие!", "Верни змея Мие.")},
       {"id": "talk_end", "type": "dialogue", "dialogue": "d.play.mia_kite_end"}])

dialogue("d.play.sam_ice_cream", "npc.sam", [
    say("npc.sam", "p.ice_cream_hello", "Это Сэм, он продаёт мороженое.", "Продавец мороженого, Сэм.", {"type": "emote", "emote": "wave"}),
    HELLO("с Сэмом"),
    ask("p.one_ice_cream_please", "Попроси одно мороженое!", "Попроси одну порцию.", model="p.one_ice_cream_please", model_npc="npc.sam"),
    say("npc.sam", "p.here_you_are", "Сэм даёт тебе мороженое.", None, {"type": "give_player_item", "item": "it.ice_cream"}),
    THANKS,
    say("npc.sam", "p.what_colour_is_it", "Какого цвета мороженое?", "Вопрос про цвет."),
    pick("w.pink", "Какого цвета мороженое?", "Цвет мороженого?", ["w.pink", "w.brown", "w.white"], picture="it.ice_cream"),
    say("npc.sam", "p.its_hot_today", "Сэм говорит о погоде.", "Что сегодня с погодой?"),
    pick("w.hot", "Какая сегодня погода?", "Что сказал Сэм о погоде?", ["w.hot", "w.cold", "w.rainy"], "p.its_hot"),
    say("npc.sam", "p.bye_see_you", None, None, {"type": "emote", "emote": "happy"}),
    BYE("с Сэмом"),
])
quest("q.play.ice_cream", "playground", 4, ("Мороженое", "Купи мороженое сам"),
      ("У тележки с мороженым стоит Сэм. Подойди к нему!", "Купи мороженое по-английски."),
      "npc.sam", ["q.play.mia"], ["w.ice_cream", "w.hot", "w.cold", "p.one_ice_cream_please"], ["w.pink", "p.thank_you", "w.one"],
      [{"id": "talk", "type": "dialogue", "dialogue": "d.play.sam_ice_cream"}])

dialogue("d.play.mia_bike_start", "npc.mia", [
    say("npc.mia", "p.hi_again", None, None, {"type": "emote", "emote": "wave"}),
    HELLO("с Мией"),
    say("npc.mia", "p.its_sunny", "Мия радуется погоде.", "Какая погода?", {"type": "weather", "weather": "sun"}),
    pick("w.sunny", "Какая сегодня погода?", "Погода?", ["w.sunny", "w.rainy", "w.cold"], "p.its_sunny"),
    say("npc.mia", "p.lets_ride", "Мия хочет кататься.", "Что она предлагает?"),
    say("npc.mia", "p.find_my_bike", "Мия о чём-то просит. Послушай ещё раз, если нужно.", "Просьба. Можно переслушать."),
])
dialogue("d.play.mia_bike_end", "npc.mia", [
    GIVE,
    say("npc.mia", "p.thank_you", None, None, {"type": "take_player_item", "item": "it.bike_blue"}),
    say("npc.mia", "p.oh_no_its_rainy", "Ой! Что случилось с погодой?", "Погода поменялась.", {"type": "weather", "weather": "rain"}),
    pick("w.rainy", "Какая теперь погода?", "Погода?", ["w.rainy", "w.sunny", "w.hot"], "p.its_rainy"),
    say("npc.mia", "p.bye_see_you", "Дождь кончается!", None, {"type": "weather", "weather": "sun"}),
    BYE("с Мией"),
])
quest("q.play.bike", "playground", 5, ("Велосипед Мии", "Прогулка на велосипеде"),
      ("Мия хочет покататься. Поговори с ней!", "Мия собралась кататься. Помоги ей."),
      "npc.mia", ["q.play.kite"], ["w.bike", "w.ride", "w.sunny", "w.rainy"], ["w.blue", "w.find", "p.here_you_are"],
      [{"id": "talk_start", "type": "dialogue", "dialogue": "d.play.mia_bike_start"},
       {"id": "find_bike", "type": "find_item", "zone": "field", "instruction": "p.find_my_bike", "target": "it.bike_blue",
        "distractors": ["it.bike_red", "it.kite_blue", "it.ball_blue"],
        "hint": hint("Bike — велосипед, blue — синий. Синий змей — не то!", "Bike и blue. Синий змей и мяч — не то.", "p.find_my_bike")},
       {"id": "give_bike", "type": "give_item", "npc": "npc.mia", "item": "it.bike_blue", "hint": hint("Отдай велосипед Мие!", "Верни велосипед Мие.")},
       {"id": "talk_end", "type": "dialogue", "dialogue": "d.play.mia_bike_end"}])

dialogue("d.play.mia_park", "npc.mia", [
    say("npc.mia", "p.hi_again", None, None, {"type": "emote", "emote": "wave"}),
    HELLO("с Мией"),
    say("npc.mia", "p.look_slide", "Мия показывает на площадку. Куда смотреть?", "Куда она показывает?"),
    pick("w.slide", "На что показывает Мия?", "Что она назвала?", ["w.slide", "w.swing", "w.tree"]),
    say("npc.mia", "p.look_swing", "А теперь?", "А теперь?"),
    pick("w.swing", "На что показывает Мия?", "Что она назвала?", ["w.swing", "w.slide", "w.flower"]),
    say("npc.mia", "p.look_tree", "А это?", "А это?"),
    pick("w.tree", "На что показывает Мия?", "Что она назвала?", ["w.tree", "w.flower", "w.kite"]),
    say("npc.mia", "p.look_flower", "И последнее!", "Последнее."),
    pick("w.flower", "На что показывает Мия?", "Что она назвала?", ["w.flower", "w.tree", "w.swing"]),
    say("npc.mia", "p.can_you_climb", "Мия спрашивает: а ты умеешь?", "Вопрос с can."),
    ask("p.yes_i_can", "Ответь: «Да, умею!»", "Ответь, что умеешь.", allowed=["listen_choose", "build_phrase"], model="p.yes_i_can"),
    say("npc.mia", "p.lets_play", None, None, {"type": "emote", "emote": "dance"}),
    BYE("с Мией"),
])
quest("q.play.things", "playground", 6, ("Что есть на площадке?", "Экскурсия по площадке"),
      ("Мия покажет тебе площадку!", "Мия устроит экскурсию. Слушай внимательно."),
      "npc.mia", ["q.play.bike"], ["w.slide", "w.swing", "w.tree", "w.flower"], ["p.yes_i_can", "w.climb"],
      [{"id": "talk", "type": "dialogue", "dialogue": "d.play.mia_park"},
       {"id": "review", "type": "review_slot", "count": 2, "prefer_topics": ["actions", "weather"]}])

# ================= ЗООПАРК =================
WHAT = lambda npc, ru=None: say(npc, "p.whats_this", ru or "Кто это?", "Кто это?")
dialogue("d.zoo.kate_welcome", "npc.kate", [
    say("npc.kate", "p.welcome_zoo", "Это зоопарк!", "Зоопарк.", {"type": "emote", "emote": "wave"}),
    HELLO("с Кейт"),
    say("npc.kate", "p.im_kate", "Кейт рассказывает о себе.", "Кто она?"),
    WHAT("npc.kate", "Кейт показывает на вольер."),
    pick("w.lion", "Кто это?", "Кто это?", ["w.lion", "w.tiger", "w.cat"], "p.its_a_lion", "it.lion"),
    WHAT("npc.kate"),
    pick("w.elephant", "Кто это?", "Кто это?", ["w.elephant", "w.hippo", "w.bear"], "p.its_an_elephant", "it.elephant"),
    WHAT("npc.kate"),
    pick("w.monkey", "Кто это?", "Кто это?", ["w.monkey", "w.bear", "w.lion"], "p.its_a_monkey", "it.monkey"),
    say("npc.kate", "p.yes_well_done", None, None, {"type": "emote", "emote": "happy"}),
    BYE("с Кейт"),
])
quest("q.zoo.welcome", "zoo", 1, ("Добро пожаловать в зоопарк!", "Экскурсия по зоопарку"),
      ("В зоопарке тебя встречает Кейт. Подойди к ней!", "Смотритель Кейт покажет зоопарк."),
      "npc.kate", ["q.play.actions"], ["w.lion", "w.elephant", "w.monkey"], ["p.hello"],
      [{"id": "talk", "type": "dialogue", "dialogue": "d.zoo.kate_welcome"},
       {"id": "review", "type": "review_slot", "count": 1, "prefer_topics": ["actions", "animals"]}])

dialogue("d.zoo.kate_big", "npc.kate", [
    say("npc.kate", "p.hi_again", None, None, {"type": "emote", "emote": "wave"}),
    HELLO("с Кейт"),
    say("npc.kate", "p.look_elephant", "Кейт показывает на слона.", "Смотри на слона."),
    say("npc.kate", "p.is_it_big_or_small", "Кейт спрашивает про размер.", "Вопрос про размер."),
    pick("w.big", "Слон большой или маленький?", "Какой он?", ["w.big", "w.small"], "p.its_big", "it.elephant"),
    say("npc.kate", "p.look_penguin", "А теперь — пингвин.", "Пингвин."),
    say("npc.kate", "p.is_it_big_or_small"),
    pick("w.small", "Пингвин большой или маленький?", "Какой он?", ["w.small", "w.big"], "p.its_small", "it.penguin"),
    say("npc.kate", "p.look_giraffe", "Смотри на жирафа!", "Жираф."),
    say("npc.kate", "p.it_has_a_long_neck", "Что у жирафа длинное?", "Что длинное?"),
    pick("w.neck", "Что у жирафа длинное?", "Что длинное?", ["w.neck", "w.tail", "w.legs"], None, "it.giraffe"),
    say("npc.kate", "p.yes_well_done", None, None, {"type": "emote", "emote": "happy"}),
    BYE("с Кейт"),
])
quest("q.zoo.big_small", "zoo", 2, ("Большой и маленький", "Размеры зверей"),
      ("Кейт хочет показать тебе разных зверей!", "Кейт задаст вопросы про размер."),
      "npc.kate", ["q.zoo.welcome"], ["w.big", "w.small", "w.penguin", "w.giraffe", "w.neck", "w.long"], ["w.elephant"],
      [{"id": "talk", "type": "dialogue", "dialogue": "d.zoo.kate_big"}])

dialogue("d.zoo.kate_monkey_start", "npc.kate", [
    say("npc.kate", "p.oh_no_monkey", "Кейт встревожена!", "Что-то случилось.", {"type": "emote", "emote": "surprised"}),
    HELLO("с Кейт"),
    say("npc.kate", "p.find_the_monkey", "Кейт о чём-то просит. Послушай ещё раз, если нужно.", "Просьба. Можно переслушать."),
])
dialogue("d.zoo.kate_monkey_end", "npc.kate", [
    GIVE,
    say("npc.kate", "p.thank_you", None, None, {"type": "take_player_item", "item": "it.monkey"}),
    say("npc.kate", "p.it_has_a_long_tail", "Что у обезьянки длинное?", "Что длинное?"),
    pick("w.tail", "Что у обезьянки длинное?", "Что длинное?", ["w.tail", "w.neck", "w.ears"], None, "it.monkey"),
    WHAT("npc.kate", "Кейт показывает на птицу."),
    pick("w.parrot", "Кто это?", "Кто это?", ["w.parrot", "w.penguin", "w.snake"], None, "it.parrot"),
    say("npc.kate", "p.bye_see_you", None, None, {"type": "emote", "emote": "happy"}),
    BYE("с Кейт"),
])
quest("q.zoo.monkey", "zoo", 3, ("Сбежала обезьянка", "Побег из вольера"),
      ("У Кейт что-то случилось. Подойди к ней!", "В зоопарке переполох. Узнай у Кейт."),
      "npc.kate", ["q.zoo.big_small"], ["w.tail", "w.parrot"], ["w.monkey", "w.long", "w.find", "p.here_you_are"],
      [{"id": "talk_start", "type": "dialogue", "dialogue": "d.zoo.kate_monkey_start"},
       {"id": "find_monkey", "type": "find_item", "zone": "zoo_paths", "instruction": "p.find_the_monkey", "target": "it.monkey",
        "distractors": ["it.parrot", "it.penguin", "it.snake"],
        "hint": hint("Monkey — обезьянка. Она коричневая, с длинным хвостом.", "Monkey — обезьяна.", "p.find_the_monkey")},
       {"id": "give_monkey", "type": "give_item", "npc": "npc.kate", "item": "it.monkey", "hint": hint("Отнеси обезьянку Кейт!", "Верни обезьянку Кейт.")},
       {"id": "talk_end", "type": "dialogue", "dialogue": "d.zoo.kate_monkey_end"}])

TOUCHES = ["p.touch_your_head", "p.touch_your_nose", "p.touch_your_ears", "p.touch_your_eyes", "p.touch_your_mouth", "p.touch_your_legs"]
def touch(target):
    others = [x for x in TOUCHES if x != target]
    return ask(target, "Что сказал Лео? Выбери картинку.", "Что попросил Лео?", options=[target] + others[:2])
dialogue("d.zoo.leo_touch", "npc.leo", [
    say("npc.leo", "p.hi_im_leo", "Это мальчик Лео.", "Это Лео.", {"type": "emote", "emote": "wave"}),
    HELLO("с Лео"),
    say("npc.leo", "p.lets_play", "Лео предлагает игру: он говорит, а ты показываешь!", "Игра: слушай и показывай."),
    *[x for t in TOUCHES for x in (say("npc.leo", t), touch(t))],
    say("npc.leo", "p.yes_well_done", None, None, {"type": "emote", "emote": "dance"}),
    BYE("с Лео"),
])
quest("q.zoo.leo_body", "zoo", 4, ("Игра с Лео", "Слушай и показывай"),
      ("Мальчик Лео хочет поиграть. Подойди к нему!", "Лео придумал игру на внимательность."),
      "npc.leo", ["q.zoo.welcome"], TOUCHES, ["p.lets_play"],
      [{"id": "talk", "type": "dialogue", "dialogue": "d.zoo.leo_touch"}])

dialogue("d.zoo.leo_animals", "npc.leo", [
    say("npc.leo", "p.hi_again", None, None, {"type": "emote", "emote": "wave"}),
    HELLO("с Лео"),
    WHAT("npc.leo", "Лео показывает на зверя."), pick("w.tiger", "Кто это?", "Кто это?", ["w.tiger", "w.lion", "w.cat"], "p.its_a_tiger", "it.tiger"),
    WHAT("npc.leo"), pick("w.zebra", "Кто это?", "Кто это?", ["w.zebra", "w.giraffe", "w.dog"], None, "it.zebra"),
    WHAT("npc.leo"), pick("w.bear", "Кто это?", "Кто это?", ["w.bear", "w.dog", "w.monkey"], None, "it.bear"),
    WHAT("npc.leo"), pick("w.hippo", "Кто это?", "Кто это?", ["w.hippo", "w.elephant", "w.frog"], None, "it.hippo"),
    WHAT("npc.leo"), pick("w.crocodile", "Кто это?", "Кто это?", ["w.crocodile", "w.snake", "w.frog"], None, "it.crocodile"),
    WHAT("npc.leo"), pick("w.snake", "Кто это?", "Кто это?", ["w.snake", "w.crocodile", "w.bird"], None, "it.snake"),
    say("npc.leo", "p.great_animals", None, None, {"type": "emote", "emote": "happy"}),
    BYE("с Лео"),
])
quest("q.zoo.leo_animals", "zoo", 5, ("Кто живёт в зоопарке?", "Знаток зверей"),
      ("Лео знает всех зверей. А ты?", "Лео проверит, знаешь ли ты зверей."),
      "npc.leo", ["q.zoo.leo_body"], ["w.tiger", "w.zebra", "w.bear", "w.hippo", "w.crocodile", "w.snake"], ["w.lion", "w.elephant"],
      [{"id": "talk", "type": "dialogue", "dialogue": "d.zoo.leo_animals"},
       {"id": "review", "type": "review_slot", "count": 2, "prefer_topics": ["animals", "body"]}])

dialogue("d.zoo.kate_bananas_start", "npc.kate", [
    say("npc.kate", "p.hi_again", None, None, {"type": "emote", "emote": "wave"}),
    HELLO("с Кейт"),
    say("npc.kate", "p.monkeys_hungry", "Кейт рассказывает про обезьянок.", "Что с обезьянками?"),
    say("npc.kate", "p.give_me_three_bananas", "Кейт о чём-то просит. Послушай ещё раз, если нужно.", "Просьба. Можно переслушать."),
])
dialogue("d.zoo.kate_bananas_end", "npc.kate", [
    GIVE,
    say("npc.kate", "p.thank_you", None, None, {"type": "take_player_item", "item": "it.bananas_three"}),
    say("npc.kate", "p.how_many_bananas", "Кейт спрашивает: сколько?", "Сколько?"),
    pick("w.three", "Сколько бананов?", "Сколько?", ["w.two", "w.three", "w.four"], "p.three_bananas", "it.bananas_three"),
    say("npc.kate", "p.it_has_big_ears", "Кейт показывает на слона.", "Смотри на слона."),
    pick("w.ears", "Что у слона большое?", "Что большое?", ["w.ears", "w.eyes", "w.nose"], None, "it.elephant"),
    say("npc.kate", "p.bye_see_you", None, None, {"type": "emote", "emote": "happy"}),
    BYE("с Кейт"),
])
quest("q.zoo.bananas", "zoo", 6, ("Обед для обезьянок", "Покорми обезьянок"),
      ("Кейт нужна помощь с обедом для зверей!", "Помоги Кейт накормить обезьянок."),
      "npc.kate", ["q.zoo.monkey", "q.zoo.leo_animals"], ["w.ears"], ["w.three", "w.banana", "w.big", "p.here_you_are"],
      [{"id": "talk_start", "type": "dialogue", "dialogue": "d.zoo.kate_bananas_start"},
       {"id": "find_bananas", "type": "find_item", "zone": "zoo_paths", "instruction": "p.give_me_three_bananas", "target": "it.bananas_three",
        "distractors": ["it.apples_three", "it.banana", "it.orange_fruit"],
        "hint": hint("Three bananas — три банана. Один банан — мало!", "Три банана: three bananas.", "p.give_me_three_bananas")},
       {"id": "give_bananas", "type": "give_item", "npc": "npc.kate", "item": "it.bananas_three", "hint": hint("Отнеси бананы Кейт!", "Отдай бананы Кейт.")},
       {"id": "talk_end", "type": "dialogue", "dialogue": "d.zoo.kate_bananas_end"}], stars=3)
print("ok")
