import { defineConfig } from 'vite';

// base './' — Vercel / GitHub Pages / itch.io 어디서든 무설정 호환 (GDD §3, ADR-0001)
export default defineConfig({
  base: './',
});
