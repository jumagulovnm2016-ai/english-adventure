# Общие помощники генераторов контента: диалоги и квесты описываются цепочкой шагов.
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

