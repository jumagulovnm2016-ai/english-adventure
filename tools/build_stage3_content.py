# Генератор диалогов и квестов этапа 3 (улица, магазин, школа + квест мамы с яблоками).
# Диалоги описываются цепочкой шагов; ветки «ошибка» ведут через показ правильного ответа.
import json, os

def say(npc, phrase, ru=None, ru_s=None, action=None):
    n = {"speaker": npc, "say": phrase}
    if ru: n["ru_hint"] = {"junior": ru, **({"senior": ru_s} if ru_s else {})}
    if action: n["action"] = action
    return ("say", n)

def ask(target, ru, ru_s=None, options=None, allowed=None, picture=None, model=None, model_npc=None):
    t = {"type": "auto", "target": target}
    if picture: t["prompt"] = {"picture": picture}
    if options: t["options"] = options
    if allowed: t["allowed_types"] = allowed
    n = {"speaker": "player", "ru_hint": {"junior": ru, **({"senior": ru_s} if ru_s else {})}, "task": t}
    return ("ask", n, model, model_npc)

def dialogue(did, npc, steps):
    nodes, ids = {}, []
    for i, s in enumerate(steps):
        ids.append(f"n{i+1}")
    for i, s in enumerate(steps):
        nid = ids[i]
        nxt = ids[i + 1] if i + 1 < len(steps) else "end"
        if s[0] == "say":
            n = dict(s[1]); n["next"] = nxt; nodes[nid] = n
        else:
            _, n, model, model_npc = s
            n = dict(n); n["on_correct"] = nxt
            if model:
                mid = f"{nid}_model"
                nodes[mid] = {"speaker": model_npc or npc, "say": model, "next": nxt}
                n["on_wrong"] = mid
            else:
                n["on_wrong"] = nxt
            nodes[nid] = n
    # порядок ключей: основная цепочка, затем «показ ответа»
    d = {"schemaVersion": 1, "id": did, "npc": npc, "start": "n1", "nodes": nodes}
    with open(f"content/dialogues/{did}.json", "w") as f:
        json.dump(d, f, ensure_ascii=False, indent=2); f.write("\n")

def quest(qid, loc, order, title, intro, giver, requires, introduces, practices, steps, stars=3, decor=None):
    q = {"schemaVersion": 1, "id": qid, "location": loc, "order": order,
         "title": {"junior": title[0], "senior": title[1]}, "intro": {"junior": intro[0], "senior": intro[1]},
         "giver": giver, "requires": requires, "introduces": introduces, "practices": practices, "steps": steps,
         "rewards": {"stars": stars, **({"decor": decor} if decor else {})}}
    with open(f"content/quests/{qid}.json", "w") as f:
        json.dump(q, f, ensure_ascii=False, indent=2); f.write("\n")

hint = lambda j, s, sayp=None: {"ru": {"junior": j, "senior": s}, **({"say": sayp} if sayp else {})}
HELLO = lambda who: ask("p.hello", f"Поздоровайся {who}!", "Поздоровайся.")
BYE = lambda who: ask("p.goodbye", f"Попрощайся {who}!", "Попрощайся.")
GIVE = ask("p.here_you_are", "Протяни вещь. Что говорят, когда что-то дают?", "Что говорят, протягивая вещь?")
THANKS = ask("p.thank_you", "Скажи спасибо!", "Поблагодари.")

# ================= УЛИЦА =================
dialogue("d.street.ben_ducks", "npc.ben", [
    say("npc.ben", "p.hi_im_ben", "Мальчика зовут Бен.", "Это Бен.", {"type": "emote", "emote": "wave"}),
    HELLO("с Беном"),
    say("npc.ben", "p.look_ducks", "Бен показывает на пруд.", "Смотри на пруд."),
    say("npc.ben", "p.how_many_ducks", "Бен спрашивает: сколько?", "Вопрос про количество."),
    ask("w.five", "Посчитай уток на пруду!", "Сосчитай уток.", options=["w.four", "w.five", "w.six"], model="p.five_ducks"),
    say("npc.ben", "p.yes_well_done", None, None, {"type": "emote", "emote": "happy"}),
    say("npc.ben", "p.what_colour_is_it", "А какого цвета утки?", "Вопрос про цвет."),
    ask("w.yellow", "Какого цвета утки?", "Цвет уток?", options=["w.yellow", "w.orange", "w.white"], picture="it.duck", model="p.its_yellow"),
    say("npc.ben", "p.bye_see_you"),
    BYE("с Беном"),
])
quest("q.street.ducks", "street", 1, ("Утки в пруду", "Утиная перепись"),
      ("В парке мальчик Бен кормит уток. Подойди к нему!", "Бен в парке считает уток и, кажется, запутался. Поможешь?"),
      "npc.ben", ["q.home.dad_ball"], ["w.duck", "w.four", "w.five", "w.six", "w.yellow"], ["p.hello", "p.goodbye"],
      [{"id": "talk", "type": "dialogue", "dialogue": "d.street.ben_ducks", "show": {"items": ["it.duck"] * 5, "zone": "pond"}},
       {"id": "review", "type": "review_slot", "count": 1, "prefer_topics": ["colours", "numbers"]}])

dialogue("d.street.brown_cat_start", "npc.mrs_brown", [
    say("npc.mrs_brown", "p.hello_dear", "Это соседка, миссис Браун.", "Соседка, миссис Браун."),
    HELLO("с миссис Браун"),
    say("npc.mrs_brown", "p.my_cat_is_lost", "Кажется, у неё что-то случилось…", "Что-то случилось."),
    say("npc.mrs_brown", "p.find_my_cat", "Она о чём-то просит. Послушай ещё раз, если нужно.", "Просьба. Можно переслушать."),
])
dialogue("d.street.brown_cat_end", "npc.mrs_brown", [
    GIVE,
    say("npc.mrs_brown", "p.thank_you", None, None, {"type": "take_player_item", "item": "it.cat_black"}),
    say("npc.mrs_brown", "p.what_colour_is_it", "Какого цвета её кошка?", "Вопрос про цвет."),
    ask("w.black", "Какого цвета кошка?", "Цвет кошки?", options=["w.black", "w.white", "w.brown"], picture="it.cat_black"),
    say("npc.mrs_brown", "p.bye_dear", None, None, {"type": "emote", "emote": "happy"}),
    BYE("с миссис Браун"),
])
quest("q.street.lost_cat", "street", 2, ("Потерялась кошка", "Где кошка миссис Браун?"),
      ("У соседки, миссис Браун, что-то случилось. Подойди к ней!", "Соседка явно расстроена. Узнай, в чём дело."),
      "npc.mrs_brown", ["q.street.ducks"], ["w.cat", "w.dog", "w.black", "w.white"], ["w.find", "p.here_you_are"],
      [{"id": "talk_start", "type": "dialogue", "dialogue": "d.street.brown_cat_start"},
       {"id": "find_cat", "type": "find_item", "zone": "park", "instruction": "p.find_my_cat", "target": "it.cat_black",
        "distractors": ["it.cat_white", "it.dog_black", "it.dog_brown"],
        "hint": hint("Cat — кошка, black — чёрная. Нужна чёрная кошка!", "Два признака: cat и black. Чёрная собака — не то.", "p.find_my_cat")},
       {"id": "give_cat", "type": "give_item", "npc": "npc.mrs_brown", "item": "it.cat_black",
        "hint": hint("Отнеси кошку миссис Браун!", "Верни кошку хозяйке.")},
       {"id": "talk_end", "type": "dialogue", "dialogue": "d.street.brown_cat_end"}])

dialogue("d.street.ben_animals", "npc.ben", [
    say("npc.ben", "p.hi_again", None, None, {"type": "emote", "emote": "wave"}),
    HELLO("с Беном"),
    say("npc.ben", "p.whats_this", "Бен показывает на животное.", "Бен спрашивает, кто это."),
    ask("w.bird", "Кто это?", "Кто это?", options=["w.bird", "w.duck", "w.rabbit"], picture="it.bird_blue", model="p.its_a_bird"),
    say("npc.ben", "p.whats_this", "А это кто?", "А это?"),
    ask("w.rabbit", "Кто это?", "Кто это?", options=["w.rabbit", "w.cat", "w.frog"], picture="it.rabbit_white", model="p.its_a_rabbit"),
    say("npc.ben", "p.whats_this", "А это?", "И это?"),
    ask("w.frog", "Кто это?", "Кто это?", options=["w.frog", "w.bird", "w.dog"], picture="it.frog_green", model="p.its_a_frog"),
    say("npc.ben", "p.great_animals", None, None, {"type": "emote", "emote": "happy"}),
    say("npc.ben", "p.bye_see_you"),
    BYE("с Беном"),
])
quest("q.street.animals", "street", 3, ("Кто живёт в парке?", "Зоолог Бен"),
      ("Бен нашёл в парке разных зверей. Посмотри вместе с ним!", "Бен устроил тебе экзамен по животным. Справишься?"),
      "npc.ben", ["q.street.lost_cat"], ["w.bird", "w.rabbit", "w.frog"], ["w.duck", "w.cat"],
      [{"id": "talk", "type": "dialogue", "dialogue": "d.street.ben_animals",
        "show": {"items": ["it.bird_blue", "it.rabbit_white", "it.frog_green"], "zone": "meadow"}},
       {"id": "review", "type": "review_slot", "count": 2, "prefer_topics": ["animals", "colours"]}])

# ================= МАГАЗИН =================
dialogue("d.home.mum_apples_start", "npc.mum", [
    say("npc.mum", "p.hello_mum", None, None, {"type": "emote", "emote": "wave"}),
    HELLO("с мамой"),
    say("npc.mum", "p.buy_three_apples", "Мама просит сходить в магазин.", "Поручение от мамы."),
])
dialogue("d.shop.green_apples", "npc.mr_green", [
    say("npc.mr_green", "p.hello_can_i_help", "Это продавец, мистер Грин.", "Продавец, мистер Грин."),
    HELLO("с продавцом"),
    say("npc.mr_green", "p.hello_can_i_help", "Он спрашивает, что тебе нужно.", "Что тебе нужно?"),
    ask("p.three_apples_please", "Попроси три яблока!", "Попроси то, что просила мама.", model="p.three_apples_please", model_npc="npc.mr_green"),
    say("npc.mr_green", "p.here_you_are", "Он даёт тебе яблоки.", None, {"type": "give_player_item", "item": "it.apples_three"}),
    THANKS,
    say("npc.mr_green", "p.bye_see_you"),
    BYE("с мистером Грином"),
])
dialogue("d.home.mum_apples_end", "npc.mum", [
    GIVE,
    say("npc.mum", "p.thank_you", None, None, {"type": "take_player_item", "item": "it.apples_three"}),
    say("npc.mum", "p.how_many_apples", "Мама спрашивает, сколько яблок.", "Сколько?"),
    ask("w.three", "Сколько яблок?", "Сколько яблок?", options=["w.two", "w.three", "w.four"], picture="it.apples_three", model="p.three_apples"),
    say("npc.mum", "p.yes_well_done", None, None, {"type": "emote", "emote": "happy"}),
])
quest("q.shop.apples", "shop", 1, ("Яблоки для мамы", "Первая покупка"),
      ("Мама хочет испечь пирог, но дома нет яблок. Поговори с ней!", "Маме нужны продукты. Пора в магазин — сам."),
      "npc.mum", ["q.street.ducks"], ["w.apple", "w.three", "p.three_apples_please"], ["p.thank_you", "p.here_you_are"],
      [{"id": "talk_mum", "type": "dialogue", "dialogue": "d.home.mum_apples_start"},
       {"id": "go_shop", "type": "go_to", "zone": "shop_inside", "hint": hint("Иди в магазин — здание с надписью SHOP.", "В магазин: вывеска SHOP.")},
       {"id": "buy", "type": "dialogue", "dialogue": "d.shop.green_apples"},
       {"id": "give_mum", "type": "give_item", "npc": "npc.mum", "item": "it.apples_three", "hint": hint("Отнеси яблоки маме домой!", "Домой, к маме.")},
       {"id": "talk_end", "type": "dialogue", "dialogue": "d.home.mum_apples_end"}])

dialogue("d.shop.green_fruit_start", "npc.mr_green", [
    say("npc.mr_green", "p.hello_again", None, None, {"type": "emote", "emote": "wave"}),
    HELLO("с мистером Грином"),
    say("npc.mr_green", "p.find_banana", "Мистер Грин просит что-то найти на полке.", "Просьба. Можно переслушать."),
])
dialogue("d.shop.green_fruit_end", "npc.mr_green", [
    GIVE,
    say("npc.mr_green", "p.thank_you", None, None, {"type": "take_player_item", "item": "it.banana"}),
    say("npc.mr_green", "p.whats_this", "А что это?", "Что это?"),
    ask("w.orange_fruit", "Что это?", "Что это?", options=["w.orange_fruit", "w.apple", "w.banana"], picture="it.orange_fruit", model="p.its_an_orange"),
    say("npc.mr_green", "p.bye_see_you"),
    BYE("с мистером Грином"),
])
quest("q.shop.fruit", "shop", 2, ("Фрукты на полке", "Помощник продавца"),
      ("Мистеру Грину нужна помощь с фруктами.", "Продавцу некогда — помоги найти товар."),
      "npc.mr_green", ["q.shop.apples"], ["w.banana", "w.orange_fruit", "w.egg"], ["w.apple", "w.find"],
      [{"id": "talk_start", "type": "dialogue", "dialogue": "d.shop.green_fruit_start"},
       {"id": "find_banana", "type": "find_item", "zone": "shelves", "instruction": "p.find_banana", "target": "it.banana",
        "distractors": ["it.orange_fruit", "it.apple_red", "it.egg"],
        "hint": hint("Banana — это банан. Он жёлтый и длинный.", "Banana — банан.", "p.find_banana")},
       {"id": "give_banana", "type": "give_item", "npc": "npc.mr_green", "item": "it.banana", "hint": hint("Отнеси банан мистеру Грину!", "Отдай банан продавцу.")},
       {"id": "talk_end", "type": "dialogue", "dialogue": "d.shop.green_fruit_end"}])

dialogue("d.shop.green_breakfast_start", "npc.mr_green", [
    say("npc.mr_green", "p.hello_again", None, None, {"type": "emote", "emote": "wave"}),
    HELLO("с мистером Грином"),
    say("npc.mr_green", "p.find_milk", "Найди на полке то, что просят.", "Просьба. Можно переслушать."),
])
dialogue("d.shop.green_breakfast_mid", "npc.mr_green", [
    GIVE,
    say("npc.mr_green", "p.thank_you", None, None, {"type": "take_player_item", "item": "it.milk"}),
    say("npc.mr_green", "p.find_bread", "А теперь — ещё одно.", "Вторая просьба."),
])
dialogue("d.shop.green_breakfast_end", "npc.mr_green", [
    GIVE,
    say("npc.mr_green", "p.thank_you", None, None, {"type": "take_player_item", "item": "it.bread"}),
    say("npc.mr_green", "p.whats_this", "А это что?", "Что это?"),
    ask("w.egg", "Что это?", "Что это?", options=["w.egg", "w.milk", "w.bread"], picture="it.egg"),
    say("npc.mr_green", "p.bye_see_you", None, None, {"type": "emote", "emote": "happy"}),
    BYE("с мистером Грином"),
])
quest("q.shop.breakfast", "shop", 3, ("Завтрак", "Продукты к завтраку"),
      ("Мистер Грин собирает завтрак для покупателя. Помоги ему!", "Собери заказ: два продукта."),
      "npc.mr_green", ["q.shop.fruit"], ["w.milk", "w.bread"], ["w.egg", "p.here_you_are"],
      [{"id": "talk_start", "type": "dialogue", "dialogue": "d.shop.green_breakfast_start"},
       {"id": "find_milk", "type": "find_item", "zone": "shelves", "instruction": "p.find_milk", "target": "it.milk",
        "distractors": ["it.bread", "it.egg", "it.apple_red"], "hint": hint("Milk — это молоко.", "Milk — молоко.", "p.find_milk")},
       {"id": "give_milk", "type": "give_item", "npc": "npc.mr_green", "item": "it.milk", "hint": hint("Отнеси молоко мистеру Грину!", "Отдай молоко.")},
       {"id": "talk_mid", "type": "dialogue", "dialogue": "d.shop.green_breakfast_mid"},
       {"id": "find_bread", "type": "find_item", "zone": "shelves", "instruction": "p.find_bread", "target": "it.bread",
        "distractors": ["it.egg", "it.banana", "it.milk"], "hint": hint("Bread — это хлеб.", "Bread — хлеб.", "p.find_bread")},
       {"id": "give_bread", "type": "give_item", "npc": "npc.mr_green", "item": "it.bread", "hint": hint("Отнеси хлеб мистеру Грину!", "Отдай хлеб.")},
       {"id": "talk_end", "type": "dialogue", "dialogue": "d.shop.green_breakfast_end"}])

# ================= ШКОЛА =================
INSTR = ["p.stand_up", "p.sit_down", "p.open_your_book", "p.close_your_book"]
def instr(target):
    others = [x for x in INSTR if x != target][:2]
    return ask(target, "Что сказала учительница? Выбери картинку.", "Что попросила учительница?", options=[target] + others)
dialogue("d.school.lee_lesson", "npc.ms_lee", [
    say("npc.ms_lee", "p.good_morning_class", "Урок начинается!", "Начало урока."),
    ask("p.good_morning", "Ответь учительнице: «Доброе утро!»", "Поздоровайся с учительницей.", model="p.good_morning"),
    say("npc.ms_lee", "p.im_ms_lee", "Учительница представляется.", "Учительница представилась."),
    say("npc.ms_lee", "p.stand_up"), instr("p.stand_up"),
    say("npc.ms_lee", "p.sit_down"), instr("p.sit_down"),
    say("npc.ms_lee", "p.open_your_book"), instr("p.open_your_book"),
    say("npc.ms_lee", "p.close_your_book"), instr("p.close_your_book"),
    say("npc.ms_lee", "p.well_done_class", None, None, {"type": "emote", "emote": "happy"}),
])
quest("q.school.lesson", "school", 1, ("Первый урок", "Урок у мисс Ли"),
      ("Начинается урок английского! Подойди к учительнице.", "Урок английского. Учительница говорит только по-английски."),
      "npc.ms_lee", ["q.street.ducks"], ["p.good_morning", "p.stand_up", "p.sit_down", "p.open_your_book", "p.close_your_book"], [],
      [{"id": "lesson", "type": "dialogue", "dialogue": "d.school.lee_lesson"}])

dialogue("d.school.tom_start", "npc.tom", [
    say("npc.tom", "p.hi_im_tom", "Это одноклассник Том.", "Одноклассник Том.", {"type": "emote", "emote": "wave"}),
    HELLO("с Томом"),
    say("npc.tom", "p.whats_your_name", "Том спрашивает, как тебя зовут.", "Тебя спросили об имени."),
    ask("p.my_name_is", "Скажи: «Меня зовут …»", "Назови себя.", allowed=["listen_choose", "build_phrase"]),
    say("npc.tom", "p.cant_find_pencil", "У Тома пропала вещь. Послушай, какая.", "Что-то потерялось."),
])
dialogue("d.school.tom_end", "npc.tom", [
    GIVE,
    say("npc.tom", "p.thank_you", None, None, {"type": "take_player_item", "item": "it.pencil_red"}),
    say("npc.tom", "p.whats_this", "Том показывает на парту.", "Что это?"),
    ask("w.ruler", "Что это?", "Что это?", options=["w.ruler", "w.pen", "w.pencil"], picture="it.ruler_green"),
    say("npc.tom", "p.bye_see_you"),
    BYE("с Томом"),
])
quest("q.school.pencil", "school", 2, ("Карандаш Тома", "Пропажа в классе"),
      ("Однокласснику Тому нужна помощь. Подойди к нему!", "Том что-то ищет на партах. Помоги."),
      "npc.tom", ["q.school.lesson"], ["w.pencil", "w.pen", "w.ruler"], ["p.my_name_is", "w.red"],
      [{"id": "talk_start", "type": "dialogue", "dialogue": "d.school.tom_start"},
       {"id": "find_pencil", "type": "find_item", "zone": "desks", "instruction": "p.cant_find_pencil", "target": "it.pencil_red",
        "distractors": ["it.pen_red", "it.pencil_blue", "it.ruler_green"],
        "hint": hint("Pencil — карандаш, red — красный. Красная ручка — не то!", "Pencil и red. Ручка (pen) — не то.", "p.cant_find_pencil")},
       {"id": "give_pencil", "type": "give_item", "npc": "npc.tom", "item": "it.pencil_red", "hint": hint("Отдай карандаш Тому!", "Верни карандаш Тому.")},
       {"id": "talk_end", "type": "dialogue", "dialogue": "d.school.tom_end"}])

dialogue("d.school.lee_books_start", "npc.ms_lee", [
    say("npc.ms_lee", "p.good_morning_class", None, None, {"type": "emote", "emote": "wave"}),
    ask("p.good_morning", "Поздоровайся с учительницей!", "Поздоровайся."),
    say("npc.ms_lee", "p.look_books", "Учительница показывает на парты.", "Посмотри на парты."),
    say("npc.ms_lee", "p.how_many_books", "Учительница спрашивает: сколько?", "Сколько?"),
    ask("w.six", "Посчитай книги на партах!", "Сосчитай книги.", options=["w.five", "w.six", "w.seven"], model="p.six_books"),
    say("npc.ms_lee", "p.yes_well_done", None, None, {"type": "emote", "emote": "happy"}),
])
dialogue("d.school.lee_books_ask", "npc.ms_lee", [
    say("npc.ms_lee", "p.give_me_blue_book", "Учительница о чём-то просит. Послушай ещё раз, если нужно.", "Просьба. Можно переслушать."),
])
dialogue("d.school.lee_books_end", "npc.ms_lee", [
    GIVE,
    say("npc.ms_lee", "p.thank_you", None, None, {"type": "take_player_item", "item": "it.book_blue"}),
    say("npc.ms_lee", "p.goodbye_class", None, None, {"type": "emote", "emote": "happy"}),
    BYE("с учительницей"),
])
quest("q.school.books", "school", 3, ("Считаем книги", "Книжная задачка"),
      ("Мисс Ли приготовила новое задание!", "У мисс Ли задачка на счёт и внимательность."),
      "npc.ms_lee", ["q.school.pencil"], ["w.six", "w.seven", "w.give"], ["w.book", "w.blue", "p.good_morning"],
      [{"id": "count", "type": "dialogue", "dialogue": "d.school.lee_books_start", "show": {"items": ["it.book_green"] * 6, "zone": "desks"}},
       {"id": "ask", "type": "dialogue", "dialogue": "d.school.lee_books_ask"},
       {"id": "find_book", "type": "find_item", "zone": "desks", "instruction": "p.give_me_blue_book", "target": "it.book_blue",
        "distractors": ["it.book_red", "it.book_green", "it.book_yellow"],
        "hint": hint("Blue — синий, book — книга. Нужна синяя книга.", "Синяя книга — blue book.", "p.give_me_blue_book")},
       {"id": "give_book", "type": "give_item", "npc": "npc.ms_lee", "item": "it.book_blue", "hint": hint("Отдай книгу учительнице!", "Отдай книгу мисс Ли.")},
       {"id": "talk_end", "type": "dialogue", "dialogue": "d.school.lee_books_end"}])
print("ok")
