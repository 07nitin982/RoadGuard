'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminTicketCard({ complaint }: { complaint: any }) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);

  const handleAdminClose = async () => {
    if (!confirm('Are you sure you want to administratively close this ticket? This bypasses AI verification.')) return;
    
    setClosing(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/complaints/${complaint.id}/admin-close`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to close ticket');
      
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Error closing ticket');
      setClosing(false);
    }
  };

  const getDuration = (startStr: string, endStr?: string) => {
     if (!startStr) return '';
     const normalizeDate = (ds: string) => {
        let s = ds.includes('T') ? ds : ds.replace(' ', 'T');
        return s.endsWith('Z') ? s : s + 'Z';
     };
     
     const start = new Date(normalizeDate(startStr)).getTime();
     const end = endStr ? new Date(normalizeDate(endStr)).getTime() : Date.now();
     const diff = Math.abs(end - start);
     
     const days = Math.floor(diff / (1000 * 60 * 60 * 24));
     const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
     const minutes = Math.floor((diff / (1000 * 60)) % 60);
     
     const res = [];
     if (days > 0) res.push(`${days}d`);
     if (hours > 0) res.push(`${hours}h`);
     if (minutes > 0) res.push(`${minutes}m`);
     
     return res.length > 0 ? res.join(' ') : '< 1m';
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
        <span style={{ fontWeight: 600 }}>Ticket #{complaint.id}</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
           <span style={{ 
             fontSize: '0.8rem',
             fontWeight: 700, 
             color: complaint.status === 'OPEN' ? '#fbbf24' : 'var(--success)',
             background: complaint.status === 'OPEN' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(16, 185, 129, 0.1)',
             padding: '4px 10px',
             borderRadius: '12px'
           }}>
             {complaint.status}
           </span>
           {complaint.status === 'OPEN' && (
             <button 
               onClick={handleAdminClose} 
               disabled={closing}
               style={{ 
                 background: 'var(--danger)', 
                 color: 'white', 
                 border: 'none', 
                 padding: '4px 8px', 
                 borderRadius: '6px', 
                 cursor: closing ? 'not-allowed' : 'pointer',
                 fontSize: '0.75rem',
                 fontWeight: 600
               }}>
               {closing ? '...' : 'Force Close'}
             </button>
           )}
        </div>
      </div>
      
      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', minHeight: '3rem' }}>
        {complaint.description}
      </p>

      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <span><strong>Road:</strong> {complaint.road_type || 'Local'}</span>
        {complaint.status === 'OPEN' && complaint.assigned_to_username && (
           <span><strong>Assigned to:</strong> <span style={{ color: 'var(--accent)' }}>{complaint.assigned_to_username}</span></span>
        )}
      </div>

      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span>GPS: {complaint.lat.toFixed(4)}, {complaint.lng.toFixed(4)}</span>
        
        {complaint.status === 'OPEN' && complaint.created_at && (
           <span style={{ color: '#fbbf24', fontWeight: 600 }}>Open for: {getDuration(complaint.created_at)}</span>
        )}
        {complaint.status === 'CLOSED' && complaint.created_at && complaint.closed_at && (
           <span style={{ color: 'var(--success)', fontWeight: 600 }}>Resolved in: {getDuration(complaint.created_at, complaint.closed_at)}</span>
        )}
      </div>

      {complaint.original_image_url && (
        <div style={{ marginTop: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Original Complaint Image:</span>
          <img src={complaint.original_image_url} alt="Before" style={{ width: '100%', borderRadius: '8px', marginTop: '0.5rem', maxHeight: '150px', objectFit: 'cover' }} />
        </div>
      )}

      {complaint.status === 'CLOSED' && (
        <>
          {complaint.closing_image_url && (
            <div style={{ marginTop: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Resolution Detail:</span>
              <img src={complaint.closing_image_url.startsWith('[') ? JSON.parse(complaint.closing_image_url)[0] : complaint.closing_image_url} alt="After" style={{ width: '100%', borderRadius: '8px', marginTop: '0.5rem', maxHeight: '150px', objectFit: 'cover' }} />
            </div>
          )}
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', fontSize: '0.85rem' }}>
            <strong style={{ color: 'var(--success)' }}>Closure Notes:</strong> {complaint.ai_closure_notes}
          </div>
        </>
      )}
    </div>
  );
}
