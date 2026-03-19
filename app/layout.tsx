import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mission Control',
  description: 'Human + AI productivity hub',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0f] text-[#e2e2e8] min-h-screen`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto pt-12 md:pt-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
