import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/complaints/${id}`, { cache: 'no-store' });
  if (!res.ok) {
    notFound();
  }
  const data = await res.json();
  const ticket = data.complaint;
  
  let resolutionImages: string[] = [];
  try {
     if (ticket?.closing_image_url && ticket.closing_image_url.startsWith('[')) {
       resolutionImages = JSON.parse(ticket.closing_image_url);
     } else if (ticket?.closing_image_url) {
       resolutionImages = [ticket.closing_image_url];
     }
  } catch(e) {}

  if (!ticket) {
    notFound();
  }

  function getTimeSince(dateStr: string) {
     // SQLite returns timestamps like '2026-04-06 12:00:00' without a timezone.
     // Appending 'Z' forces JS to parse it as UTC, preventing timezone offsets from messing up the math.
     const normalizedStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
     const zStr = normalizedStr.endsWith('Z') ? normalizedStr : normalizedStr + 'Z';
     const diff = Math.abs(Date.now() - new Date(zStr).getTime()); // Use Math.abs to prevent negative numbers
     
     const days = Math.floor(diff / (1000 * 60 * 60 * 24));
     const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
     const minutes = Math.floor((diff / (1000 * 60)) % 60);
     
     if (days > 0) return `${days} day(s) ${hours} hr(s) ago`;
     if (hours > 0) return `${hours} hour(s) ${minutes} min(s) ago`;
     return `${minutes} minute(s) ago`;
  }

  return (
    <div className="flex-center" style={{ minHeight: '60vh', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <CheckCircle size={64} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
        <h1 className="page-title" style={{ marginBottom: '1rem', fontSize: '2rem' }}>Ticket Generated!</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Your complaint has been registered and our team has been notified.</p>
      </div>

      <div className="glass-card" style={{ width: '100%', maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Ticket ID</span>
          <span style={{ fontWeight: 700, color: 'var(--accent)' }}>#{ticket.id}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Status</span>
          <span style={{ 
            fontWeight: 700, 
            color: ticket.status === 'OPEN' ? '#fbbf24' : 'var(--success)',
            background: ticket.status === 'OPEN' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            padding: '4px 12px',
            borderRadius: '20px'
          }}>
            {ticket.status}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Road Type</span>
          <span style={{ fontWeight: 600 }}>{ticket.road_type || 'Local'}</span>
        </div>
        
        {ticket.status === 'OPEN' && ticket.created_at && (
           <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
             <span style={{ color: 'var(--text-secondary)' }}>Time since issued</span>
             <span style={{ fontWeight: 600 }}>{getTimeSince(ticket.created_at)}</span>
           </div>
        )}

        {ticket.status === 'CLOSED' && (
           <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
             <span style={{ color: 'var(--text-secondary)' }}>Resolved By</span>
             <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, color: 'var(--success)' }}>{ticket.assigned_to_username || `Emp #${ticket.assigned_to || 'Unknown'}`}</div>
                {ticket.closed_at && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                     {new Date(ticket.closed_at).toLocaleString()}
                  </div>
                )}
             </div>
           </div>
        )}
        
        {ticket.assigned_to && ticket.status !== 'CLOSED' && (
           <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
             <span style={{ color: 'var(--text-secondary)' }}>Assigned Employee</span>
             <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{ticket.assigned_to_username || `ID: ${ticket.assigned_to}`}</span>
           </div>
        )}
        
        {ticket.due_by && (
           <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
             <span style={{ color: 'var(--text-secondary)' }}>Target Resolution Date (SLA)</span>
             <span style={{ fontWeight: 600, color: new Date(ticket.due_by) < new Date() && ticket.status !== 'CLOSED' ? 'var(--danger)' : 'var(--text)' }}>
               {new Date(ticket.due_by).toLocaleDateString()}
             </span>
           </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Description</span>
          <p style={{ lineHeight: 1.5 }}>{ticket.description}</p>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Recorded GPS Location</span>
          <code style={{ color: 'var(--accent)' }}>Lat: {ticket.lat.toFixed(6)}, Lng: {ticket.lng.toFixed(6)}</code>
        </div>

        {ticket.original_image_url && (
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Original Complaint Image</span>
            <img src={ticket.original_image_url} alt="Before" style={{ width: '100%', borderRadius: '8px', maxHeight: '250px', objectFit: 'cover' }} />
          </div>
        )}

        {ticket.status === 'CLOSED' && resolutionImages.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
             <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>AI Verified Resolution Photos</span>
             <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {resolutionImages.map((img, i) => (
                   <img key={i} src={img} alt={`Angle ${i+1}`} style={{ flex: 1, width: '50%', borderRadius: '8px', maxHeight: '150px', objectFit: 'cover' }} />
                ))}
             </div>
             
             {ticket.closing_video_url && (
                <div style={{ marginBottom: '0.5rem' }}>
                   <video src={ticket.closing_video_url} controls style={{ width: '100%', borderRadius: '8px', maxHeight: '200px' }} />
                </div>
             )}
             
             {ticket.resolution_lat && ticket.resolution_lng && (
                <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginBottom: '0.5rem' }}>
                   GPS Verified: {ticket.resolution_lat.toFixed(6)}, {ticket.resolution_lng.toFixed(6)}
                </div>
             )}

             {ticket.ai_closure_notes && (
               <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', fontSize: '0.85rem' }}>
                 <strong style={{ color: 'var(--success)' }}>AI Evaluator:</strong> {ticket.ai_closure_notes}
               </div>
             )}
          </div>
        )}
      </div>

      <Link href="/">
        <button className="btn-primary">Report Another Issue</button>
      </Link>
    </div>
  );
}
