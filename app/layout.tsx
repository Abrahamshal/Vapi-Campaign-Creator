import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vapi Campaign Builder',
  description: 'Create Vapi campaigns easily by uploading your lead list',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}