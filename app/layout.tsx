// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Virtual Meetings",
  description: "AI-powered meeting assistant with Sanity + Gemini",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen flex flex-col">
        {/* Top Navigation */}
        <header className="bg-gray-900 border-b border-gray-800">
          <nav className="max-w-6xl mx-auto flex items-center gap-6 p-4 text-sm font-medium">
            <Link
              href="/"
              className="hover:text-white text-gray-300 transition-colors"
            >
              Meetings
            </Link>
            <Link
              href="/discovery-proposal"
              className="hover:text-white text-gray-300 transition-colors"
            >
              Discovery Proposals
            </Link>
            <Link
              href="/studio"
              className="hover:text-white text-gray-300 transition-colors"
            >
              Studio
            </Link>
            <Link
              href="/docs"
              className="hover:text-white text-gray-300 transition-colors"
            >
              Documents
            </Link>
          </nav>
        </header>

        {/* Page Content */}
        <main className="flex-1 max-w-6xl mx-auto w-full p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 border-t border-gray-800 text-gray-400 text-xs p-4 text-center">
          Virtual Meetings © {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
