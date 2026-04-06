import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function EmployeeDashboard() {
  const cookieStore = await cookies();
  const role = cookieStore.get('session_role')?.value;
  const username = cookieStore.get('session_user')?.value;

  if (role !== 'EMPLOYEE') {
    redirect('/login');
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/complaints?username=${username}`, { cache: 'no-store' });
  const data = await res.json();
  const complaints: any[] = data.complaints || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ margin: 0, textAlign: 'left' }}>Employee Tasks</h1>
        <form action="/api/auth/logout" method="POST">
           <button type="submit" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Logout</button>
        </form>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {complaints.map(c => (
          <div key={c.id} className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 600 }}>Ticket #{c.id}</span>
              <span style={{ 
                fontSize: '0.8rem',
                fontWeight: 700, 
                color: c.status === 'OPEN' ? '#fbbf24' : 'var(--success)',
                background: c.status === 'OPEN' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                padding: '4px 10px',
                borderRadius: '12px'
              }}>
                {c.status}
              </span>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', minHeight: '3rem' }}>
              {c.description}
            </p>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              <strong>Road:</strong> {c.road_type || 'Local'}
            </div>
            
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginBottom: '1rem' }}>
              GPS: {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
            </div>

            {c.original_image_url && (
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Original Complaint:</span>
                <img src={c.original_image_url} alt="Before" style={{ width: '100%', borderRadius: '8px', marginTop: '0.5rem', maxHeight: '150px', objectFit: 'cover' }} />
              </div>
            )}

            {c.status === 'OPEN' && (
              <Link href={`/employee/resolve/${c.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                 <button className="btn-primary" style={{ width: '100%', padding: '0.5rem' }}>Resolve Issue</button>
              </Link>
            )}

            {c.status === 'CLOSED' && (
              <>
                {c.closing_image_url && (
                  <div style={{ marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Resolution:</span>
                    <img src={c.closing_image_url} alt="After" style={{ width: '100%', borderRadius: '8px', marginTop: '0.5rem', maxHeight: '150px', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', fontSize: '0.85rem' }}>
                   <strong style={{ color: 'var(--success)' }}>AI Verified</strong> ✓
                </div>
              </>
            )}
          </div>
        ))}

        {complaints.length === 0 && (
          <p style={{ color: 'var(--text-secondary)' }}>No tickets found.</p>
        )}
      </div>
    </div>
  );
}
