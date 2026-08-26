import { defineConfig, minimalPreset as preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...preset,
    apple: {
      ...preset.apple,
      padding: 0.20,
      resizeOptions: { background: '#011627', fit: 'contain' },
    },
    maskable: {
      ...preset.maskable,
      padding: 0.30,
      resizeOptions: { background: '#011627', fit: 'contain' },
    },
    transparent: {
      ...preset.transparent,
      padding: 0.20,
    }
  },
  images: ['public/favicon.svg']
})
