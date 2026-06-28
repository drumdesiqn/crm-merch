import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // React 19 discourages setState in effects, but the app still relies on client-side
      // data fetching with useEffect. Disabling until the app migrates to Server Components
      // or React Query/SWR for data fetching.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
