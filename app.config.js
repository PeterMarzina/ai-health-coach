// app.config.js — leest app.json en voegt alleen voor de web-export een baseUrl toe.
// GitHub Pages host de app in een submap (/ai-health-coach), dus de web-build moet
// weten dat alle paden daar beginnen. Zonder EXPO_BASE_URL verandert er niets
// (Android/iOS builds en `expo start` werken zoals altijd).
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;
  if (!baseUrl) return config;
  return { ...config, experiments: { ...config.experiments, baseUrl } };
};
