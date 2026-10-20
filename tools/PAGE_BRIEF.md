# Brief: writing one era page (JSON)

You write ONE JSON file per era into `C:\MyProject\islamic history\data\pages\`.

## The file is a single JSON object

```json
{
  "id": "rashidun",
  "file": "rashidun.html",
  "order": 4,
  "n": "ARABIC ERA TITLE",
  "ic": "⚔️",
  "c": "#8B1A3A",
  "period": "632م – 661م",
  "dur": "29 سنة",
  "intro": "3 to 4 Arabic sentences. What this era was, when, why it matters. Plain modern Arabic, readable, no filler.",
  "events": [
    { "y": "632م", "t": "SHORT EVENT TITLE",
      "d": "ONE Arabic paragraph, 200 to 420 characters. What happened, who, why, how. Concrete names and numbers.",
      "r": "ONE Arabic sentence: the result or consequence of this event." }
  ],
  "people": [ { "n": "FULL NAME", "r": "one short line: role and why they matter (max 110 chars)" } ],
  "timeline": [ { "y": "14هـ", "e": "short label, max 55 chars" } ],
  "outcomes": [ "ONE sentence: lasting impact of the era on later history." ],
  "sources": [ { "a": "AUTHOR NAME", "t": "BOOK TITLE", "n": "optional note" } ]
}
```

## Hard counts (the validator enforces these)

- `events` : 7 to 10 items, in chronological order
- `people` : 5 to 7 items
- `timeline` : 7 to 10 items
- `outcomes` : 4 to 6 items
- `sources` : 3 to 4 items
- `intro` : at least 150 characters
- each event `d` : 180 to 900 characters, ends with `.` or `،` or `؛`
- `timeline.e` : max 70 characters

## Hard rules

1. **Pure Arabic in every text field.** No Latin letters anywhere except the keys and the `id`/`file` values. No Chinese, Japanese or Korean characters. No U+FFFD replacement character.
2. **Facts must be right.** Real names, real dates, real places. If you are unsure of a date, omit the event rather than guess.
3. **Concise.** This is a short encyclopedia, not a book. One paragraph per event. No repetition between events.
4. **No copying.** Write fresh summary prose. Old books are for verifying facts only.
5. Numbers may be Latin digits (`632م`, `14هـ`) — the build tool converts them to Arabic-Indic automatically.

## Authoritative sources to cite in `sources`

Use only real, verifiable books. Good options:

- ابن هشام، السيرة النبوية
- ابن سعد، الطبقات الكبرى
- ابن الأثير، الكامل في التاريخ
- ابن كثير، البداية والنهاية
- الطبري، تاريخ الرسل والملوك
- ابن خلدون، تاريخ ابن خلدون (العبر)
- المسعودي، مروج الذهب ومعادن الجوهر
- البلاذري، أنساب الأشراف
- ابن عساكر، تاريخ دمشق
- ابن حجر العسقلاني، الإصابة في تمييز الصحابة
- المقريزي، الخطط المقريزية
- إسحاق بنDetect.uid, عمر، تاريخ republished مكة والمدى  ← ignore this line

Modern academic (only when the era is modern):
- ألبرت هوراني، تاريخ الشعوب العربية
- فيليب خوري هتي، تاريخ العرب
- آن لافلاو، خرائط العالم العربي الحديث

## Validate before you finish (mandatory)

```
cd "C:\MyProject\islamic history"
node tools\checkpage.js <your-file-name>
```

It must print `✔ لا توجد مشاكل`. If it reports problems, fix them with targeted edits and run again until clean. Do not stop before that.