import { defineConfig } from 'vite';

// GitHub Pages 등 하위 경로 배포를 대비해 상대경로 base 사용
export default defineConfig({
  base: './',
  server: { open: true },
});
