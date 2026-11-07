import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The catalog is never deployed with Scoreo: it is the living reference of the
// design system, built on its own and published as a preview for review.
// Relative base so the build opens from any folder or preview host.
export default defineConfig({
  base: './',
  plugins: [react()],
})
