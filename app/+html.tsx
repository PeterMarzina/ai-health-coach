// app/+html.tsx — HTML-root voor de web-build (alleen web, draait bij de static export).
// Zorgt dat de app op iPhone als "web-app" werkt: Safari → Deel → Zet op beginscherm
// opent hem daarna fullscreen met een eigen icoon, zonder adresbalk.
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Bij GitHub Pages staat de app in een submap; zie app.config.js.
const BASE = process.env.EXPO_BASE_URL ?? '';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="nl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <title>AI Health Coach</title>

        {/* iPhone: fullscreen vanaf het beginscherm */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Health Coach" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href={`${BASE}/apple-touch-icon.png`} />
        <link rel="manifest" href={`${BASE}/manifest.json`} />
        <meta name="theme-color" content="#0D0D0D" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'html, body { background-color: #0D0D0D; }' }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
