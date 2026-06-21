import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Discipulado',
  description: 'Sistema de gestão do ciclo de discipulado',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  )
}
