import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.ts", "**/*.tsx"],
    parser: "@typescript-eslint/parser",
    rules: {
      // Fix for shadcn/ui empty interface compatibility
      // Reference: https://github.com/shadcn-ui/ui/issues/167
      "@typescript-eslint/no-empty-interface": [
        "error",
        {
          allowSingleExtends: true,
        },
      ],
      // Allow unused vars that start with underscore
      "@typescript-eslint/no-unused-vars": [
        "warn", 
        { 
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        }
      ],
    },
  },
];

export default eslintConfig;
