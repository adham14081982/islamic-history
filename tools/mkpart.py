# -*- coding: utf-8 -*-
"""يبني ملف قسم من وحدات الفصول في tmp/"""
import json, os, sys, importlib

root = os.path.join(os.path.dirname(__file__), '..')
sys.path.insert(0, os.path.join(root, 'tmp'))

part = {
    "partId": "abu-bakr",
    "partN": "أبو بكر الصديق (١١–١٣هـ)",
    "partIc": "🕊️",
    "partLead": "سنتان وثلاثة أشهر فقط جلسها أبو بكر على كرسي الخلافة، لكنها كانت كافية لإنقاذ الأمة من ارتداد يعصف بها، وفتح الطريق أمام أكبر حركة فتح في التاريخ. هذا القسم يتتبع الرجل من نسبه وصفاته، إلى إيمانه وتضحيته، إلى بيعته وبيانه، ثم جيش أسامة وقضاء المرتدين وجمع القرآن، وينتهي بفتوح الفرس والروم ووفاته وهو يستخلف عمر.",
    "chapters": []
}

for mod in ['ab_a', 'ab_b', 'ab_c']:
    m = importlib.import_module(mod)
    part["chapters"].extend(m.CH)

# تحقق سريع
for c in part["chapters"]:
    n = len(c["p"])
    L = len(json.dumps(c, ensure_ascii=False))
    h2 = len(c.get("h2", []))
    print(f'{c["id"]:24} فقرات {n} · أقسام {h2} · بطاقات {len(c["key"])} · صفوف {len(c["tbl"]["rows"])} · حروف {L}')

out = os.path.join(root, 'data', 'era', '04-rashidun', '01-abu-bakr.json')
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, 'w', encoding='utf-8') as f:
    json.dump(part, f, ensure_ascii=False, indent=1)
print('كتب', out, os.path.getsize(out), 'بايت · فصول', len(part["chapters"]))
