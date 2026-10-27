/* حارس مجلد www: يمنع دخول أي ملف توثيق/تقرير/مصدر إلى النسخة المبنية.
   يُستدعى من tools/build-release.sh قبل المزامنة وبعدها.
   الاستخدام: node tools/guard-www.js [--fix]
     بدون --fix : يفحص ويخرج بالرمز 1 عند وجود ملف ممنوع.
     مع   --fix : يحذف الملفات الممنوعة ثم يفحص. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'mobile', 'app', 'www');
const fix = process.argv.includes('--fix');

/* امتدادات لا تُشحن أبدًا */
const BAD_EXT = new Set(['.md', '.markdown', '.txt', '.log', '.zip', '.psd', '.xcf', '.map']);
/* أنماط أسماء تدل على تقرير/توثيق داخلي (عربي وإنجليزي) */
const BAD_NAME = [
  /تقرير/i, /تقرير-/, /مراجعة/i, /توصيات/i,
  /report/i, /fix-?plan/i, /audit/i, /brief/i, /readme/i,
  /changelog/i, /license/i, /notes?/i, /plan/i, /guide/i,
  /^\./,            /* ملفات مخفية: .git .DS_Store … */
];

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

if (!fs.existsSync(www)) {
  console.log('حارس www: المجلد غير موجود — تخطّي');
  process.exit(0);
}

const files = walk(www, []);
const bad = [];
for (const f of files) {
  const rel = path.relative(www, f).replace(/\\/g, '/');
  const ext = path.extname(f).toLowerCase();
  const base = path.basename(f);
  if (BAD_EXT.has(ext)) { bad.push([rel, 'امتداد ممنوع ' + ext]); continue; }
  /* لا نفحص مجلد assets/img (أسماء صور قد تحتوي كلمات) */
  const inAssetsImg = rel.startsWith('assets/img/');
  if (!inAssetsImg) {
    for (const re of BAD_NAME) {
      if (re.test(base)) { bad.push([rel, 'اسم يدل على توثيق/تقرير']); break; }
    }
  }
}

if (bad.length) {
  if (fix) {
    for (const [rel] of bad) {
      try { fs.unlinkSync(path.join(www, rel)); } catch (e) { }
    }
    console.log('حارس www: حُذف ' + bad.length + ' ملفًا ممنوعًا من النسخة المبنية:');
    bad.forEach(([rel, why]) => console.log('   − ' + rel + '  (' + why + ')'));
    process.exit(0);
  }
  console.error('✗ حارس www: ملفات ممنوعة داخل النسخة المبنية (' + bad.length + '):');
  bad.forEach(([rel, why]) => console.error('   • ' + rel + '  ← ' + why));
  console.error('  احذفها أو نفّذ: node tools/guard-www.js --fix');
  process.exit(1);
}

console.log('حارس www: نظيف (' + files.length + ' ملفًا، لا توثيق ولا تقارير)');
