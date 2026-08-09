import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:4000',
      '/dashboard': 'http://localhost:4000',
      '/bookings': 'http://localhost:4000',
      '/jobs': 'http://localhost:4000',
      '/customers': 'http://localhost:4000',
      '/villages': 'http://localhost:4000',
      '/machines': 'http://localhost:4000',
      '/machine-types': 'http://localhost:4000',
      '/drivers': 'http://localhost:4000',
      '/employees': 'http://localhost:4000',
      '/invoices': 'http://localhost:4000',
      '/payments': 'http://localhost:4000',
      '/expenses': 'http://localhost:4000',
      '/pricing-methods': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
    },
  },
})
