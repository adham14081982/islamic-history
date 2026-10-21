# -*- coding: utf-8 -*-
"""يبني ملف قسم علي بن أبي طالب من وحدات tmp/um_*.py"""
import json, os, sys, importlib

root = os.path.join(os.path.dirname(__file__), '..')
sys.path.insert(0, os.path.join(root, 'tmp'))

part = {
    "partId": "ali",
    "partN": "علي بن أبي طالب (٣٥–٤٠هـ)",
    "partIc": "🌿",
    "partLead": "خمس سنوات، أقصر الخلافات الراشدية وأشدها اختبارًا. بدأت بخلافةٍ مُرغَمة في زمن الفتنة، ومضت بين معركة الجمل وصفين والنهروان، وانتهت بسيفٍ مسمومٍ في صلاة الفجر. هذا القسم يتتبع عليًا من نسبه ونشأته، إلى مكانته عند النبي ﷺ، ثم تولّي الخلافة وموقفه من قتلة عثمان، وفتنته العظيمة، وأعماله في الفتوحات والحكم، ويُنهي بمؤامرة ابن ملجم واستشهاده وعام الجماعة.",
    "chapters": []
}

for mod in ['al_a', 'al_b', 'al_c']:
    m = importlib.import_module(mod)
    part["chapters"].extend(m.CH)

for c in part["chapters"]:
    n = len(c["p"])
    L = len(json.dumps(c, ensure_ascii=False))
    h2 = len(c.get("h2", []))
    tbl = c.get("tbl")
    print(f'{c["id"]:20} فقرات {n} · أقسام {h2} · بطاقات {len(c["key"])} · صفوف {len(tbl["rows"]) if tbl else 0} · حروف {L}')
    for i, x in enumerate(c["p"]):
        if len(x) < 330 or len(x) > 1200:
            print(f'   ! p{i+1} طول {len(x)}')
    for h in c.get("h2", []):
        for x in h["p"]:
            if len(x) < 250:
                print(f'   ! h2 [{h["t"]}] طول {len(x)}')

out = os.path.join(root, 'data', 'era', '04-rashidun', '04-ali.json')
with open(out, 'w', encoding='utf-8') as f:
    json.dump(part, f, ensure_ascii=False, indent=1)
print('كتب', out, os.path.getsize(out), 'بايت · فصول', len(part["chapters"]))
