'use client'

import { ThemeProvider } from 'next-themes'
import ThemeToggle from '@/components/ThemeToggle'
import { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeToggle />
      {children}
    </ThemeProvider>
  )
}
