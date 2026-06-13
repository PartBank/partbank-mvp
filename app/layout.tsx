import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import NextTopLoader from 'nextjs-toploader'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'PartBank',
  description: 'Managed digital platform for sourcing rare commercial vehicle spare parts',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <NextTopLoader color="#2E6DA4" height={2} showSpinner={false} />
        {children}
      </body>
    </html>
  )
}
