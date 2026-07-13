const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();

const PORT = process.env.PORT || 3000;

// Middleware configuration
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve all static frontend UI pages out of the public folder
app.use(express.static(path.join(__dirname, "public")));

// ==========================================
// 📊 WORKSHOP IN-MEMORY DATA STORES
// ==========================================
const PODS = {};         // Format: { username: { highscore: 0, badges: [] } }
const ACL = {};          // Format: { username: { readAllowed: true, globalOptIn: true } }
let LEADERBOARD = [];    // Compiled high scores leaderboard cache
let GLOBAL_FEED = [];    // ActivityPub Live Federated Message Queue stream

// ==========================================
// 🔓 1. IDENTITY & REGISTRATION LAYER (Pure Data)
// ==========================================
app.post('/api/register', (req, res) => {
    const { username } = req.body;
    
    if (!username) {
        return res.status(400).json({ error: "Missing required username handle parameter." });
    }

    // Sanitize string to prevent malformed directory keys
    const safeId = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (!safeId) {
        return res.status(400).json({ error: "Invalid identity identifier provided." });
    }

    // Provision the isolated Multi-Tenant user pod mapping slots if empty
    if (!PODS[safeId]) {
        PODS[safeId] = { highscore: 0, badges: [] };
        ACL[safeId] = { readAllowed: true, globalOptIn: true }; // Default open rules
    }

    // Return raw, structured status objects. Let the frontend viewer handle routing navigation links.
    return res.status(201).json({
        success: true,
        webId: safeId,
        internId: safeId
    });
});

// ==========================================
// 🔒 2. SOVEREIGN SOLID POD ENDPOINTS
// ==========================================

// GET: Read data from an individual's private achievements vault (Enforces Sovereign ACL)
app.get("/pods/:username/achievements", (req, res) => {
    const { username } = req.params;

    // Enforce Sovereign Governance Check: Has user locked their storage door?
    if (ACL[username] && ACL[username].readAllowed === false) {
        return res.status(403).json({ error: "Access Denied: Sovereign Data Guard blocked this request." });
    }

    const userData = PODS[username] || { highscore: 0, badges: [] };
    
    // Express returns strict Semantic Web JSON-LD format matching ActivityStreams schemas
    return res.status(200).json({
        "@context": "https://w3.org",
        "owner": username,
        "highscore": userData.highscore,
        "items": userData.badges
    });
});

// GET: Fetch private explicit Access Control List matrix parameters for UI setup sync
app.get("/api/pod/:username/acl", (req, res) => {
    const { username } = req.params;
    const permissions = ACL[username] || { readAllowed: true, globalOptIn: true };
    return res.status(200).json(permissions);
});

// POST: Overwrite and update explicit Access Control Lists for the Pod
app.post("/api/pod/:username/acl", (req, res) => {
    const { username } = req.params;
    ACL[username] = {
        readAllowed: req.body.readAllowed === true,
        globalOptIn: req.body.globalOptIn === true
    };
    return res.sendStatus(200);
});

// ==========================================
// 🎮 3. PYGAME WORKSHOP BATCHING GATEWAY
// ==========================================

// POST: Accepts atomic session summary packages from Pygame client on death or pause menus
app.post("/api/game-event", (req, res) => {
    const authId = req.headers["x-intern-id"];
    const { count } = req.body; // Expects total asteroids destroyed during session boundary block

    if (!authId || !PODS[authId]) {
        return res.status(401).json({ error: "Unauthorized: Missing valid Client Identification Header." });
    }

    // Enforce Auditor Access check: can the server compute updates using the pod data footprint?
    if (ACL[authId] && ACL[authId].readAllowed === false) {
        return res.status(403).json({ error: "Sovereign Override: Local Pod configuration rejected update transaction calculation request." });
    }

    const scoreSession = Number(count) || 0;
    
    // Process calculation parameters to update sovereign record storage state
    if (scoreSession > PODS[authId].highscore) {
        PODS[authId].highscore = scoreSession;
    }

    // Evaluate Achievement Milestone Tier thresholds (Trigger badge unlock at 5 rocks cleared)
    if (scoreSession >= 5 && !PODS[authId].badges.includes("Asteroid Hunter")) {
        PODS[authId].badges.push("Asteroid Hunter");

        // Construct standardized ActivityPub envelope packet item payload
        const activityPayload = {
            "@context": "https://w3.org",
            "type": "Announce",
            "actor": authId,
            "summary": `🚀 [ActivityPub] Intern "${authId}" earned the 'Asteroid Hunter' badge with a score of ${scoreSession}!`
        };

        // Prepend to room global live feed tracking pool array stream
        GLOBAL_FEED.unshift(activityPayload);

        // Populate system global shared public leaderboard cache tracking grid array
        LEADERBOARD.push({ 
            username: authId, 
            score: scoreSession, 
            timestamp: new Date().toLocaleTimeString() 
        });
        LEADERBOARD.sort((a, b) => b.score - a.score);
    }

    // Echo current calculated server truths back to the caller (Pygame UI or Web Tools)
    return res.status(200).json({ 
        success: true, 
        verifiedHighScore: PODS[authId].highscore 
    });
});

// =======================================================
// 📡 4. ACTIVITYPUB PUBLIC OUTBOUND PIPELINE FEEDS
// =======================================================

// GET: Publicly accessible compiled view of the filtered ActivityPub live ticker feed
app.get("/api/global-feed", (req, res) => {
    // Dynamic Privacy Filter: Discard stream items if actor changed their ACL checkmarks to false
    const filteredFeed = GLOBAL_FEED.filter(act => {
        const id = act.actor;
        return ACL[id] ? ACL[id].globalOptIn !== false : true;
    });
    return res.status(200).json(filteredFeed);
});

// GET: Publicly accessible compiled view of the aggregated leaderboard standings
app.get("/api/global-leaderboard", (req, res) => {
    // Dynamic Filter: Enforce outbound opt-in privacy rules tracking logic before room presentation
    const filteredLeaderboard = LEADERBOARD.filter(entry => {
        return ACL[entry.username] ? ACL[entry.username].globalOptIn !== false : true;
    });
    return res.status(200).json(filteredLeaderboard.slice(0, 10));
});

// GET: Admin inspection utility to display raw database object conditions map to instructor terminal
app.get("/federated/inspect-pods", (req, res) => {
    return res.status(200).json({
        pods: PODS,
        accessControlLists: ACL
    });
});

// ==========================================
// 🏠 5. FALLBACK FRONTEND ROOT MAP
// ==========================================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the server infrastructure instance execution loop
app.listen(PORT, () => {
    console.log(`🚀 Server active on port ${PORT}`);
});
