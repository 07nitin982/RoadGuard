'use client';

import { useState, useRef, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Video, CheckCircle, AlertTriangle, MapPin, StopCircle } from 'lucide-react';

export default function ResolvePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [photos, setPhotos] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBase64, setVideoBase64] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalDesc, setOriginalDesc] = useState('');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(5);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/complaints/${id}`)
      .then(r => r.json())
      .then(d => {
         if (d.complaint) {
            setOriginalImage(d.complaint.original_image_url);
            setOriginalDesc(d.complaint.description);
         }
      })
      .catch(console.error);
      
    // Capture Geolocation
    if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition((position) => {
         setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
       }, (err) => {
         setError('Geolocation access is required to resolve tickets. Please allow location access.');
       }, { enableHighAccuracy: true });
    } else {
       setError('Geolocation is not supported by your browser.');
    }
  }, [id]);
  
  // Initialize camera stream
  useEffect(() => {
    if (photos.length === 2 && videoBase64) return;
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: true })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Video play error", e));
        }
      })
      .catch(err => {
         // Fallback to video only if audio fails
         navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
         .then(stream => {
            streamRef.current = stream;
            if (videoRef.current) {
               videoRef.current.srcObject = stream;
               videoRef.current.play();
            }
         }).catch(() => {
            setError('Camera access denied or unavailable. You MUST use a live camera.');
         });
      });

    return () => {
       if (streamRef.current) {
           streamRef.current.getTracks().forEach(track => track.stop());
       }
    };
  }, [photos, videoBase64]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context && videoRef.current.videoWidth) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setPhotos(prev => [...prev, dataUrl]);
      }
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    
    try {
      // Use constrained mimetype
      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm; codecs=vp8' });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        
        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
           setVideoBase64(reader.result as string);
        };
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTimeLeft(5);
      
      const timer = setInterval(() => {
         setRecordingTimeLeft(prev => {
            if (prev <= 1) {
               clearInterval(timer);
               if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                  mediaRecorderRef.current.stop();
                  setIsRecording(false);
               }
               return 0;
            }
            return prev - 1;
         });
      }, 1000);
      
    } catch(err) {
      console.error(err);
      setError('Video recording failed.');
    }
  };

  const submitResolution = async () => {
    if (photos.length < 2 || !videoBase64 || !location) return;
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/complaints/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           images: photos,
           video: videoBase64,
           lat: location.lat,
           lng: location.lng
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Server error');
      }

      setSuccess('AI Approved! Media verified and issue resolved.');
      setTimeout(() => {
         router.push('/employee/dashboard');
      }, 3000);

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const resetCapture = () => {
    setPhotos([]);
    setVideoBase64(null);
    setVideoUrl(null);
    setError('');
  };

  return (
    <div className="flex-center" style={{ minHeight: '60vh', flexDirection: 'column' }}>
       <h1 className="page-title" style={{ fontSize: '1.8rem' }}>Resolve Ticket #{id}</h1>
       <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', textAlign: 'center' }}>
         Take 2 photos from different angles + a short 5s video. AI will verify the pothole is visible & location matches accurately.
       </p>
       
       <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          {location ? (
             <span style={{ fontSize: '0.85rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={16} /> Location Captured (GPS Ready)</span>
          ) : (
             <span style={{ fontSize: '0.85rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertTriangle size={16} /> Acquiring GPS...</span>
          )}
       </div>

       {originalImage && (
         <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', width: '100%', maxWidth: '500px' }}>
           <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Original Issue:</span>
           <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>{originalDesc}</p>
           <img src={originalImage} alt="Original Complaint" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }} />
         </div>
       )}

       <div className="glass-card ai-verify-frame" style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
         
         {(!videoBase64 || photos.length < 2) ? (
           <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', background: 'black' }}>
             <video 
               ref={videoRef} 
               autoPlay 
               playsInline 
               muted
               style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', display: 'block' }}
             />
             <canvas ref={canvasRef} style={{ display: 'none' }} />
             
             {!error && !!location && (
               <div style={{ position: 'absolute', bottom: '20px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                 {photos.length < 2 && (
                    <button onClick={capturePhoto} className="btn-primary" style={{ borderRadius: '30px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <Camera size={20} /> Photo {photos.length + 1} / 2
                    </button>
                 )}
                 {photos.length === 2 && !videoBase64 && !isRecording && (
                    <button onClick={startRecording} className="btn-primary" style={{ borderRadius: '30px', background: 'var(--danger)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <Video size={20} /> Record 5s Video
                    </button>
                 )}
                 {isRecording && (
                    <button disabled className="btn-primary" style={{ borderRadius: '30px', background: 'rgba(239, 68, 68, 0.5)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <StopCircle size={20} /> Recording... {recordingTimeLeft}s
                    </button>
                 )}
               </div>
             )}
           </div>
         ) : (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <div style={{ display: 'flex', gap: '0.5rem' }}>
                {photos.map((p, i) => (
                   <img key={i} src={p} alt={`Angle ${i+1}`} style={{ flex: 1, width: '50%', borderRadius: '8px', maxHeight: '150px', objectFit: 'cover' }} />
                ))}
             </div>
             {videoUrl && (
                <video src={videoUrl} controls style={{ width: '100%', maxHeight: '200px', borderRadius: '8px' }} />
             )}
             
             <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
               <button className="btn-primary" style={{ flex: 1, background: 'var(--text-secondary)' }} onClick={resetCapture}>Retake All</button>
               <button className="btn-success" style={{ flex: 2 }} onClick={submitResolution} disabled={loading || !location}>
                 {loading ? 'AI Verifying...' : 'Submit Evidence'}
               </button>
             </div>
           </div>
         )}

         {error && (
            <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem' }}>
              <AlertTriangle size={18} /> {error}
            </div>
         )}

          {success && (
            <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '8px' }}>
              <CheckCircle size={18} /> {success}
            </div>
         )}
       </div>
    </div>
  );
}
