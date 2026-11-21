import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");

const ALLOWED_CSS_FILES = new Set([
  path.normalize(path.join(SRC_DIR, "styles", "globals.css")),
  path.normalize(path.join(SRC_DIR, "design-system", "theme", "deoca.css")),
]);

const COLOR_LITERAL_RE = /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/;
const HARDCODED_TW_COLOR_RE =
  /\b(?:dark:)?(?:bg|text|border|ring|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-\d{2,3}(?:\/\d{1,3})?|\b(?!-(?:subtle|ring|vivid)\b)(?:\/\d{1,3})?)/;
const RAW_HTML_TABLE_OR_DIALOG_RE = /<(?:table|dialog)\b/;
const WINDOW_DIALOG_RE = /\bwindow\.(?:confirm|alert)\s*\(/;
const LEGACY_IMPORT_RE = /from\s+["'](?:\.\.\/){3,}src\//;

const violations = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    if (entry.name.endsWith(".css")) {
      if (!ALLOWED_CSS_FILES.has(path.normalize(full))) {
        violations.push(`${rel}: Feature/component .css files are forbidden outside src/styles/globals.css and built theme CSS.`);
      }
      continue;
    }

    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    // Theme definitions and built artifacts are the single source of truth for color literals
    if (rel.startsWith("src/design-system/theme/")) continue;

    const content = fs.readFileSync(full, "utf8");
    const lines = content.split(/\r?\n/);

    const isFeatureOrPage =
      rel.startsWith("src/features/") ||
      rel.startsWith("src/app/(main)/") ||
      rel.startsWith("src/app/(auth)/");

    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      if (line.includes("ds-allow:")) return;

      if (LEGACY_IMPORT_RE.test(line)) {
        violations.push(`${rel}:${lineNo}: Use @/ path alias instead of deep relative imports.`);
      }

      if (WINDOW_DIALOG_RE.test(line)) {
        violations.push(`${rel}:${lineNo}: Use ConfirmDialog / useAppToast from @/components/ds instead of window.confirm/alert.`);
      }

      if (isFeatureOrPage) {
        if (RAW_HTML_TABLE_OR_DIALOG_RE.test(line)) {
          violations.push(`${rel}:${lineNo}: Raw <table> or <dialog> is forbidden in features/pages. Use DataTable / FormDialog / DetailDialog / ConfirmDialog from @/components/ds.`);
        }
        if (COLOR_LITERAL_RE.test(line)) {
          violations.push(`${rel}:${lineNo}: Hardcoded color literal (#hex/rgb/hsl) is forbidden in features/pages. Use Astryx theme tokens or registries.`);
        }
        if (HARDCODED_TW_COLOR_RE.test(line)) {
          violations.push(`${rel}:${lineNo}: Hardcoded Tailwind palette color class is forbidden in features/pages. Use semantic token classes mapped from Astryx theme.`);
        }
      }
    });
  }
}

walk(SRC_DIR);

if (violations.length > 0) {
  console.error(`\n[audit:ds] FAILED with ${violations.length} violation(s):\n`);
  for (const v of violations) console.error(`  - ${v}`);
  console.error("");
  process.exit(1);
}

console.log("[audit:ds] PASSED — 0 design-system violations.");
