import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Virtual Meetings — Gemini + Sanity',
  description: 'Spin up virtual meetings among personas to refine user stories and produce acceptance criteria.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="min-h-screen">
          <header className="sticky top-0 z-10 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur">
            <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
              <div className="font-semibold tracking-wide">Virtual Meetings</div>
              <nav className="space-x-3 text-sm text-gray-300">
                <a className="hover:underline" href="/">Home</a>
                <a className="hover:underline" href="/studio">Studio</a>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          <footer className="mx-auto max-w-5xl px-4 py-8 text-sm text-gray-400">Built with Next.js, Sanity & Gemini</footer>
        </div>
      </body>
    </html>
  )
}
