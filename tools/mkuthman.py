# -*- coding: utf-8 -*-
"""يبني ملف قسم عثمان بن عفان من وحدات tmp/um_*.py"""
import json, os, sys, importlib

root = os.path.join(os.path.dirname(__file__), '..')
sys.path.insert(0, os.path.join(root, 'tmp'))

part = {
    "partId": "uthman",
    "partN": "عثمان بن عفان (٢٣–٣٥هـ)",
    "partIc": "📖",
    "partLead": "اثنتا عشرة سنة، أطول من كل خلافة راشدية، بدأت بفتوحٍ في فارس وتركيا والشام وقبرص وإفريقية، ثم بنسخ المصحف الذي وحّد رسم الأمة إلى اليوم، وانتهت بحصارٍ في الدار وقتلٍ في جوف الليل. هذا القسم يتتبع عثمان من نسبه وحيائه وتضحيته، إلى بيعة الشورى والشبهة التي أُثيرت حولها، ثم الفتنة التي أودت بمقتله ونقد رواياتها، وينتهي بأعماله في النسخ والفتح والتنظيم.",
    "chapters": []
}

for mod in ['ut_a', 'ut_b', 'ut_c']:
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

out = os.path.join(root, 'data', 'era', '04-rashidun', '03-uthman.json')
with open(out, 'w', encoding='utf-8') as f:
    json.dump(part, f, ensure_ascii=False, indent=1)
print('كتب', out, os.path.getsize(out), 'بايت · فصول', len(part["chapters"]))
