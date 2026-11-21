import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".next-dev/**",
      "node_modules/**",
      "out/**",
      "coverage/**",
      "src/design-system/theme/*.js",
      "src/design-system/theme/*.d.ts",
      "src/design-system/theme/*.css",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/features/**/*.{ts,tsx}", "src/app/(main)/**/*.{ts,tsx}", "src/app/(auth)/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@astryxdesign/core/Table",
              message: "Use DataTable from @/components/ds instead of importing Table directly in features.",
            },
            {
              name: "@astryxdesign/core/Dialog",
              message: "Use FormDialog / DetailDialog / ConfirmDialog from @/components/ds instead of importing Dialog directly.",
            },
            {
              name: "@astryxdesign/core/Drawer",
              message: "Use FormDrawer from @/components/ds instead of importing Drawer directly.",
            },
            {
              name: "@astryxdesign/core/AlertDialog",
              message: "Use ConfirmDialog from @/components/ds instead of importing AlertDialog directly.",
            },
            {
              name: "@astryxdesign/core/Pagination",
              message: "Use AppPagination / DataTable from @/components/ds instead of importing Pagination directly.",
            },
            {
              name: "@astryxdesign/core/Badge",
              message: "Use domain status badges from @/components/ds instead of raw Badge in features.",
            },
            {
              name: "@astryxdesign/core/StatusDot",
              message: "Use ActiveStatus / domain badges from @/components/ds instead of raw StatusDot in features.",
            },
            {
              name: "@astryxdesign/core/Toast",
              message: "Use useAppToast from @/components/ds instead of importing Toast directly.",
            },
          ],
          patterns: [
            {
              group: ["*.css", "**/*.css"],
              message: "Feature CSS files are forbidden. Use Astryx components, registries, and Tailwind v4 semantic tokens.",
            },
            {
              group: ["../../../*", "../../../../src/*"],
              message: "Use @/ path alias instead of deep relative imports.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "confirm",
          message: "Use ConfirmDialog from @/components/ds instead of window.confirm.",
        },
        {
          name: "alert",
          message: "Use useAppToast or ConfirmDialog from @/components/ds instead of window.alert.",
        },
      ],
    },
  },
];

export default eslintConfig;
