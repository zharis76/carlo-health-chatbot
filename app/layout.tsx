import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Health Assistant — Powered by Carlo Ethics.ai',
  description: 'AI health chatbot with compliance monitoring by Carlo Ethics.ai',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
