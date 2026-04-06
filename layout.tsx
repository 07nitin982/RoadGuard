import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RoadGuard System',
  description: 'AI-Powered Road Verification',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <nav style={{ padding: '1rem 2rem', background: 'var(--card-bg)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent)' }}>RoadGuard</div>
          <div>
            <a href="/" style={{ marginRight: '1rem' }}>Home</a>
            <a href="/login" style={{ color: 'var(--text-secondary)' }}>Staff Login</a>
          </div>
        </nav>
        <main className="layout-container">
          {children}
        </main>
      </body>
    </html>
  )
}
