// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions draait op Deno (npm:-imports, Deno-globals): die code
    // controleer je met `deno check` / `deno lint`, niet met de Expo-config.
    ignores: ["dist/*", "supabase/functions/*"],
  }
]);
