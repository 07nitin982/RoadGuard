# RoadGuard

A secure, intelligent, and highly automated web platform designed to streamline infrastructure reporting and verified maintenance for Indian roads. 

This application empowers citizens to seamlessly report highway defects (like potholes) and enforces a rigorous, AI-driven verification protocol to guarantee that assigned engineers genuinely repair the exact reported issue.

## 🚀 Key Features

### 1. Citizen Reporting & Strict Geographic Validation
*   **Nominatim OSM Engine**: Integrated straight into the OpenStreetMap API. When a citizen attempts to generate a complaint, the application reverse-geocodes their exact GPS coordinates.
*   **Haversine Distance Guard**: The system algorithmically guarantees the ticket is generated within ~30 meters of a recognized geographic road/highway segment. Submissions from remote/indoor areas are permanently blocked.
*   **Live Capture Enforcement**: Standard photo gallery uploads are disabled. Citizens use integrated WebRTC live video-streaming or strict native mobile camera APIs (`capture="environment"`) to physically snap the pothole in real-time.

### 2. Automated Assignment & SLA Tracking
Tickets are automatically categorized and routed based on the road sector, accompanied by strict Service Level Agreements (SLAs) dictating maximum resolution times:
*   **Local Roads:** 7-Day SLA (`employee_local`)
*   **State Highways:** 3-Day SLA (`employee_state`)
*   **National Highways:** 1-Day SLA (`employee_national`)

### 3. Employee Resolution & AI Media Verification
When an employee visits the repair site, they must undergo a strict evidence collection workflow using the built-in browser WebRTC pipeline:
*   **Spatial Verification**: The employee's current GPS location is checked dynamically against the original citizen's coordinates using Haversine distance math. They must be physically standing at the exact defect location.
*   **Multi-Asset Ingestion**: The employee is forced to capture **2 distinct photo angles** followed by a mandatory, timer-enforced **5-Second Video** of the repaired road.
*   **Google Gemini Vision AI**: The submitted media suite is analyzed by an advanced multimodal AI. It evaluates the geometry and context of the imagery to definitively assert that the reported pothole has been authentically repaired before algorithmically closing the ticket.

### 4. Admin Command Center
*   Administrators possess a comprehensive dashboard to audit both open and closed tickets.
*   **Real-time Metrics**: Displays dynamically formatted lifetimes of how long open tickets have been pending, and the complete elapsed time for closed resolutions.
*   **Override Protocols**: Contains an absolute `Force Close` authority logic which bypasses algorithmic and AI verifications if an edge case blocks automated resolution.

## 🛠 Tech Stack
*   **Frontend**: Next.js 16 (App Router), React 19, CSS Modules, WebRTC Media APIs
*   **Backend**: Node.js, Express.js
*   **Database**: SQLite (Async)
*   **External APIs**: OpenStreetMap (Nominatim), Google Gemini GenAI API

## ⚙️ How to Run
1. Navigate to the `backend/` directory, run `npm install`, and start the backend using `npm start` (Runs securely on Port 5000).
2. Navigate to the root directory, create a `.env.local` containing your `GEMINI_API_KEY`, and run `npm run dev`.
3. Open `http://localhost:3000` or your local LAN IP to test.
