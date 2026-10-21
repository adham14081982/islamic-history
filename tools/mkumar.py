# -*- coding: utf-8 -*-
"""يبني ملف قسم عمر بن الخطاب من وحدات tmp/um_*.py"""
import json, os, sys, importlib

root = os.path.join(os.path.dirname(__file__), '..')
sys.path.insert(0, os.path.join(root, 'tmp'))

part = {
    "partId": "umar",
    "partN": "عمر بن الخطاب (١٣–٢٣هـ)",
    "partIc": "⚖️",
    "partLead": "عشر سنين حوّلت دولة المدينة إلى إمبراطورية تمتد من خراسان إلى برقة، وحوّلت الخليفة إلى موظفٍ يحاسبه الناس على كل درهم. هذا القسم يتتبع عمر من نسبه وشدّته في الجاهلية، إلى إسلامه الذي أعزّ الله به المسلمين، إلى موافقته القرآن، ثم بيعته وخطبته، وفتوحه على ثلاث جبهات، ونظامه في الولاية والقضاء وبيت المال، وينتهي بخنجرٍ في المسجد أنهى حياة أعدل من حكم.",
    "chapters": []
}

for mod in ['um_a', 'um_b', 'um_c']:
    m = importlib.import_module(mod)
    part["chapters"].extend(m.CH)

for c in part["chapters"]:
    n = len(c["p"])
    L = len(json.dumps(c, ensure_ascii=False))
    h2 = len(c.get("h2", []))
    print(f'{c["id"]:20} فقرات {n} · أقسام {h2} · بطاقات {len(c["key"])} · صفوف {len(c["tbl"]["rows"])} · حروف {L}')
    for i, x in enumerate(c["p"]):
        if len(x) < 330 or len(x) > 1200:
            print(f'   ! p{i+1} طول {len(x)}')
    for h in c.get("h2", []):
        for x in h["p"]:
            if len(x) < 250:
                print(f'   ! h2 [{h["t"]}] طول {len(x)}')

out = os.path.join(root, 'data', 'era', '04-rashidun', '02-umar.json')
with open(out, 'w', encoding='utf-8') as f:
    json.dump(part, f, ensure_ascii=False, indent=1)
print('كتب', out, os.path.getsize(out), 'بايت · فصول', len(part["chapters"]))
