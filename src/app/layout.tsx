import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AlertaComunal - Gestión de Emergencias',
  description: 'Plataforma municipal para gestión de emergencias comunales',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
