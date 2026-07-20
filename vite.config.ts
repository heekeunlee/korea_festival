import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 프로젝트 페이지로 배포되므로 저장소 이름을 base 로 둔다.
export default defineConfig({
  plugins: [react()],
  base: '/korea_festival/',
  publicDir: 'data',
});
