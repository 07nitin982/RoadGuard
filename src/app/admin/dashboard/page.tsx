import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import Link from 'next/link';
import AdminTicketCard from './AdminTicketCard';

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = 'ALL' } = await searchParams;
  const cookieStore = await cookies();
  const role = cookieStore.get('session_role')?.value;

  if (role !== 'ADMIN') {
    redirect('/login');
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/complaints`, { cache: 'no-store' });
  const data = await res.json();
  const allComplaints: any[] = data.complaints || [];
  
  const complaints = allComplaints.filter(c => {
    if (filter === 'OPEN') return c.status === 'OPEN';
    if (filter === 'CLOSED') return c.status === 'CLOSED';
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 className="page-title" style={{ margin: 0, textAlign: 'left' }}>Admin Dashboard</h1>
        <form action="/api/auth/logout" method="POST">
           <button type="submit" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Logout</button>
        </form>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/admin/dashboard?filter=ALL" style={{ textDecoration: 'none' }}>
           <button className="btn-primary" style={{ background: filter === 'ALL' ? 'var(--accent)' : 'transparent', border: '1px solid var(--border)', color: filter === 'ALL' ? '#000' : 'var(--text-primary)' }}>All Tickets</button>
        </Link>
        <Link href="/admin/dashboard?filter=OPEN" style={{ textDecoration: 'none' }}>
           <button className="btn-primary" style={{ background: filter === 'OPEN' ? '#fbbf24' : 'transparent', border: '1px solid var(--border)', color: filter === 'OPEN' ? '#000' : 'var(--text-primary)' }}>Open</button>
        </Link>
        <Link href="/admin/dashboard?filter=CLOSED" style={{ textDecoration: 'none' }}>
           <button className="btn-primary" style={{ background: filter === 'CLOSED' ? 'var(--success)' : 'transparent', border: '1px solid var(--border)', color: filter === 'CLOSED' ? '#fff' : 'var(--text-primary)' }}>Closed</button>
        </Link>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {complaints.map(c => (
          <AdminTicketCard key={c.id} complaint={c} />
        ))}

        {complaints.length === 0 && (
          <p style={{ color: 'var(--text-secondary)' }}>No complaints recorded yet.</p>
        )}
      </div>
    </div>
  );
}
