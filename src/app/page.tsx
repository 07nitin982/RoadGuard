'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Navigation, AlertTriangle, Camera } from 'lucide-react';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [roadType, setRoadType] = useState('Local');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [useCamera, setUseCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (useCamera && !originalImage) {
       // Secure Context Check
       if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError("Your browser blocked direct camera access because the site is not using HTTPS. Tap 'Native Camera' to use the mobile fallback.");
          setUseCamera(false);
          return;
       }

       const attachStream = (stream: MediaStream) => {
          if (videoRef.current) {
             videoRef.current.srcObject = stream;
             videoRef.current.play().catch(console.error);
          }
       };

       navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
       .then(attachStream)
       .catch(err => {
          // Fallback to any available camera if 'environment' (back camera) is unsupported (e.g., Desktop/Laptops)
          navigator.mediaDevices.getUserMedia({ video: true })
          .then(attachStream)
          .catch(err2 => {
             setError("Could not access any camera. Please check your system permissions or hardware.");
             setUseCamera(false);
          });
       });
    }

    // Cleanup function to stop tracks when closing camera or unmounting
    return () => {
       if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
       }
    };
  }, [useCamera, originalImage]);

  const startCamera = () => {
    setUseCamera(true);
    setOriginalImage(null);
    setError('');
  };

  const captureFrame = () => {
     if (videoRef.current && canvasRef.current) {
       const ctx = canvasRef.current.getContext('2d');
       if (ctx) {
         canvasRef.current.width = videoRef.current.videoWidth;
         canvasRef.current.height = videoRef.current.videoHeight;
         ctx.drawImage(videoRef.current, 0, 0);
         const dataUrl = canvasRef.current.toDataURL('image/jpeg');
         setOriginalImage(dataUrl);
         
         const stream = videoRef.current.srcObject as MediaStream;
         if (stream) stream.getTracks().forEach(track => track.stop());
         setUseCamera(false);
       }
     }
  };

  const getDistanceFromLatLonInM = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const at = Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * at * 1000; 
  };

  const getLocation = () => {
    setLocating(true);
    setError('');
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocating(false);
      },
      (err) => {
        setError('Failed to retrieve location. Please allow GPS access.');
        setLocating(false);
      }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !location || !originalImage) {
      setError('Description, GPS location, and an image of the problem are required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // OSM Reverse Geocoding Check
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18`;
      const geoRes = await fetch(nominatimUrl);
      const geoData = await geoRes.json();
      
      // OSM tags all drivable/walkable paths and roads under the class "highway"
      const isRoad = geoData.class === 'highway';
      
      if (!isRoad) {
         setError(`Location verification failed. Your GPS coordinates snapped to a '${geoData.class}' feature (like a building/amenity) instead of a recognized road. Tickets must be generated directly on the affected path.`);
         setSubmitting(false);
         return;
      }

      const distance = getDistanceFromLatLonInM(
        location.lat, 
        location.lng, 
        parseFloat(geoData.lat), 
        parseFloat(geoData.lon)
      );
      
      if (isNaN(distance) || distance > 30) {
         setError(`Location verification failed. You are ${isNaN(distance) ? 'an unknown distance' : Math.round(distance) + ' meters'} away from the nearest physical road. This system restricts reports to valid Indian road pathways only.`);
         setSubmitting(false);
         return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, road_type: roadType, lat: location.lat, lng: location.lng, original_image_url: originalImage })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit complaint');

      router.push(`/ticket/${data.id}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className={styles.hero}>
        <h1 className="page-title">RoadGuard Reporting System</h1>
        <p className={styles.subtitle}>
          Help us maintain safe roads. Snap a clear description and let your GPS do the rest. 
          Our crew will be dispatched to verify and resolve the problem.
        </p>
      </div>

      <div className="glass-card formContainer">
        <form className={styles.formContainer} onSubmit={handleSubmit}>
          
          <div>
            <label style={{ fontWeight: 600 }}>Problem Description</label>
            <textarea 
              rows={4} 
              placeholder="E.g., Large pothole on the right lane near exit 42..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontWeight: 600 }}>Road Type</label>
            <select 
              value={roadType} 
              onChange={(e) => setRoadType(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                marginTop: '0.5rem',
                marginBottom: '1rem',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <option value="Local">Local</option>
              <option value="State">State</option>
              <option value="National">National</option>
            </select>
          </div>

          <div>
            <label style={{ fontWeight: 600 }}>Location (GPS)</label>
            <div className={styles.gpsSection}>
              {location ? (
                <div className={styles.gpsActive}>
                  <MapPin size={20} />
                  <span>Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}</span>
                </div>
              ) : (
                <span className={styles.gpsText}>GPS location not captured yet</span>
              )}

              <button 
                type="button" 
                onClick={getLocation} 
                className="btn-primary" 
                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                disabled={locating}
              >
                {locating ? 'Locating...' : (
                  <>
                    <Navigation size={16} /> {location ? 'Update GPS' : 'Get Location'}
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontWeight: 600 }}>Problem Photo</label>
            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              {!useCamera && !originalImage ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <button type="button" onClick={startCamera} className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                    <Camera size={20} /> Open WebRTC Camera
                  </button>
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    NATIVE MOBILE CAMERA:
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    onChange={handleImageUpload} 
                    style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    * WebRTC requires HTTPS or localhost. If on a LAN IP, use the Native file option above to launch your phone's camera. Gallery uploads are disabled.
                  </span>
                </div>
              ) : null}

              {useCamera && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '8px', maxHeight: '300px', objectFit: 'cover' }} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <button type="button" onClick={captureFrame} className="btn-primary" style={{ background: 'var(--success)' }}>
                    📸 Capture Photo
                  </button>
                </div>
              )}

              {originalImage && !useCamera && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <img src={originalImage} alt="Preview" style={{ width: '100%', borderRadius: '12px', maxHeight: '250px', objectFit: 'cover' }} />
                  <button type="button" onClick={startCamera} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '8px' }}>
                    Retake Photo
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px' }}>
              <AlertTriangle size={18} /> {error}
            </div>
          )}

          <button 
            type="submit" 
            className={`btn-primary ${styles.submitBtn}`}
            disabled={submitting || !location || !description.trim() || !originalImage}
            style={{ 
               opacity: (submitting || !location || !description.trim() || !originalImage) ? 0.5 : 1,
               cursor: (submitting || !location || !description.trim() || !originalImage) ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? (
              <><span className={styles.loader}></span> Submitting...</>
            ) : (
              'Generate Ticket'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
