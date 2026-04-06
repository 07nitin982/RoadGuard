const express = require('express');
const cors = require('cors');
const { getDb } = require('./db');
const { GoogleGenAI } = require('@google/genai');

require('dotenv').config({ path: '../.env.local' });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- Auth Routes ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE username = ? AND password_hash = ?', [username, password]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Returning user info. In a real app we'd use JWTs, 
    // but we emulate the previous simple behavior
    return res.json({ role: user.role, success: true });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Complaints Routes ---
app.post('/api/complaints', async (req, res) => {
  try {
    const { description, road_type, lat, lng, original_image_url } = req.body;

    if (!description || !road_type || lat === undefined || lng === undefined || !original_image_url) {
      return res.status(400).json({ error: 'Missing required fields including image' });
    }

    const db = await getDb();
    
    // Auto assignment logic
    const employee = await db.get('SELECT employee_id FROM employee_assignments WHERE road_type = ? LIMIT 1', [road_type]);
    const assigned_to = employee ? employee.employee_id : null;
    const assigned_at = assigned_to ? new Date().toISOString() : null;
    
    let days = 7;
    if (road_type === 'State') days = 3;
    if (road_type === 'National') days = 1;
    const due_by = new Date();
    due_by.setDate(due_by.getDate() + days);
    const due_by_str = due_by.toISOString();

    const result = await db.run(
      'INSERT INTO complaints (description, road_type, lat, lng, original_image_url, assigned_to, assigned_at, due_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [description, road_type, lat, lng, original_image_url, assigned_to, assigned_at, due_by_str]
    );

    return res.status(201).json({ id: result.lastID, success: true });
  } catch (error) {
    console.error('Create Complaint Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/complaints', async (req, res) => {
  try {
    const { username } = req.query;
    const db = await getDb();
    
    let complaints;
    if (username) {
      complaints = await db.all(`
        SELECT c.*, u.username as assigned_to_username 
        FROM complaints c 
        LEFT JOIN users u ON c.assigned_to = u.id 
        WHERE u.username = ?
        ORDER BY c.created_at DESC
      `, [username]);
    } else {
      complaints = await db.all(`
        SELECT c.*, u.username as assigned_to_username 
        FROM complaints c 
        LEFT JOIN users u ON c.assigned_to = u.id 
        ORDER BY c.created_at DESC
      `);
    }
    
    return res.json({ complaints });
  } catch (error) {
    console.error('Fetch Complaints Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/complaints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const complaint = await db.get(`
      SELECT c.*, u.username as assigned_to_username 
      FROM complaints c
      LEFT JOIN users u ON c.assigned_to = u.id
      WHERE c.id = ?
    `, [id]);

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    return res.json({ complaint });
  } catch (error) {
    console.error('Fetch Complaint Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Helper for parsing base64 data URLs
function parseImageData(dataUrl) {
  const match = dataUrl.match(/^data:((image|video)\/\w+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64Data: match[3] };
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);
  var dLon = deg2rad(lon2-lon1);
  var a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ;
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c; // Distance in km
  return d;
}
function deg2rad(deg) { return deg * (Math.PI/180); }

app.post('/api/complaints/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { images, video, lat, lng } = req.body; 

    if (!images || !Array.isArray(images) || images.length < 2) {
      return res.status(400).json({ error: 'At least 2 images from different angles are required' });
    }
    if (!video) {
       return res.status(400).json({ error: 'Video evidence is required' });
    }
    if (lat === undefined || lng === undefined) {
       return res.status(400).json({ error: 'GPS coordinates are required' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const db = await getDb();
    const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [id]);

    if (!complaint) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // GPS validation limit < 10 meters
    const distanceKm = getDistanceFromLatLonInKm(complaint.lat, complaint.lng, lat, lng);
    const distanceMeters = distanceKm * 1000;
    if (distanceMeters > 10) {
       return res.status(400).json({ error: `Location verification failed. You are ${distanceMeters.toFixed(1)} meters away from the reported pothole. Must be within 10 meters.` });
    }

    const beforeImageParsed = complaint.original_image_url ? parseImageData(complaint.original_image_url) : null;
    const videoParsed = parseImageData(video);

    let parts = [];
    if (beforeImageParsed) {
      parts.push({ inlineData: { data: beforeImageParsed.base64Data, mimeType: beforeImageParsed.mimeType } });
    }
    
    // Add multiple images
    for (const img of images) {
       const parsed = parseImageData(img);
       if (parsed) {
         parts.push({ inlineData: { data: parsed.base64Data, mimeType: parsed.mimeType } });
       }
    }
    
    if (videoParsed) {
       parts.push({ inlineData: { data: videoParsed.base64Data, mimeType: videoParsed.mimeType } });
    }

    let prompt = `This is a highway pothole/issue resolution check. The original complaint description was: "${complaint.description}".\n\nI have provided several media files.\nThe FIRST image is the 'BEFORE' picture when the complaint was filed.\nThe subsequent images and video are the 'AFTER' evidence taken right now by the employee from different angles.\n\nPlease strictly verify:\n1. Does the AFTER media appear to be taken at the SAME location as the BEFORE image? (Check background, markings, surroundings)\n2. Look closely at the AFTER media. Is a pothole-like depression ACTUALLY visible and correctly patched? If the employee just took a photo of a clean road surface, or if the original depression is missing entirely from the view (i.e. they took a photo of the road near the pothole but not the pothole itself), you MUST FAIL this.\n3. Does the AFTER media clearly demonstrate that the original problem has been fixed?\n\nPlease answer ONLY in JSON format like this: {"approved": true, "reason": "Brief explanation"}`;
    parts.unshift({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: parts }]
    });

    const textOutput = response.text || '';
    let result;
    try {
      const cleanJson = textOutput.replace(/```json|```/g, '').trim();
      result = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed parsing AI output", textOutput);
      return res.status(500).json({ error: 'AI failed to analyze the images clearly' });
    }

    if (!result.approved) {
      return res.status(400).json({ error: `AI Rejected: ${result.reason}` });
    }

    const closing_images_json = JSON.stringify(images);

    const closedAt = new Date().toISOString();

    // Update status to CLOSED
    await db.run(
      'UPDATE complaints SET status = ?, ai_closure_notes = ?, closing_image_url = ?, closing_video_url = ?, resolution_lat = ?, resolution_lng = ?, closed_at = ? WHERE id = ?',
      ['CLOSED', result.reason, closing_images_json, video, lat, lng, closedAt, id]
    );

    return res.json({ success: true, reason: result.reason });

  } catch (error) {
    console.error('Resolve Error:', error);
    return res.status(500).json({ error: 'Verification failed. Make sure GEMINI_API_KEY is set.' });
  }
});

app.post('/api/complaints/:id/admin-close', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    
    const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [id]);
    if (!complaint) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const closedAt = new Date().toISOString();

    await db.run(
      'UPDATE complaints SET status = ?, ai_closure_notes = ?, closed_at = ? WHERE id = ?',
      ['CLOSED', 'System Override: Ticket administratively closed by Admin', closedAt, id]
    );

    return res.json({ success: true, reason: 'Manually closed by Admin' });
  } catch (error) {
    console.error('Admin Close Error:', error);
    return res.status(500).json({ error: 'Failed to close ticket' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend Express Server running on port ${PORT}`);
});
