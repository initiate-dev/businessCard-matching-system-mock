import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages ではサイトが /<リポジトリ名>/ の下に置かれるので、ビルド時に BASE_PATH で渡す。
  // ローカル（npm run dev）や Cloudflare Pages では '/' のまま。
  base: process.env.BASE_PATH || '/',
})
