import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Discipulado',
    short_name: 'Discipulado',
    description: 'Sistema de gestão do ciclo de discipulado',
    start_url: '/painel',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#171B2E',
    theme_color: '#171B2E',
    lang: 'pt-BR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
