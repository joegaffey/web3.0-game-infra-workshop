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
const PODS = {};         // Format: { username: { highscore: 0, badges: [], stats: { games: 0, deaths: 0, enemies: 0, longestSession: 0 } } }
const ACL = {};          // Format: { username: { readAllowed: true, globalOptIn: true } }
const SESSIONS = {};     // Format: { username: startTimestamp } — for advanced session tracking
let LEADERBOARD = [];    // Compiled high scores leaderboard cache
let GLOBAL_FEED = [];    // ActivityPub Live Federated Message Queue stream

// Badge definitions
const BADGE_DEFINITIONS = [
    { id: "asteroid_hunter", name: "🏅 Asteroid Hunter", desc: "Destroy 5+ enemies in one session", check: (pod, session) => session.enemies >= 5 },
    { id: "sharpshooter", name: "🔥 Sharpshooter", desc: "Destroy 15+ enemies in one session", check: (pod, session) => session.enemies >= 15 },
    { id: "dedicated", name: "🎮 Dedicated", desc: "Play 10+ games", check: (pod) => pod.stats.games >= 10 },
    { id: "respawn_king", name: "💀 Respawn King", desc: "Die 20+ times", check: (pod) => pod.stats.deaths >= 20 },
    { id: "centurion", name: "⭐ Centurion", desc: "Destroy 100+ lifetime enemies", check: (pod) => pod.stats.enemies >= 100 },
    { id: "marathon_runner", name: "⏱️ Marathon Runner", desc: "Survive 120+ seconds in one session (advanced)", check: (pod, session) => session.sessionLength >= 120 },
];

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
        PODS[safeId] = { highscore: 0, badges: [], stats: { games: 0, deaths: 0, enemies: 0, longestSession: 0 } };
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
    const { enemies_destroyed, deaths, count } = req.body;

    if (!authId || !PODS[authId]) {
        return res.status(401).json({ error: "Unauthorized: Missing valid Client Identification Header." });
    }

    // Enforce Auditor Access check: can the server compute updates using the pod data footprint?
    if (ACL[authId] && ACL[authId].readAllowed === false) {
        return res.status(403).json({ error: "Sovereign Override: Local Pod configuration rejected update transaction calculation request." });
    }

    // Support both legacy { count } and new { enemies_destroyed, deaths } payload
    const enemies = Number(enemies_destroyed) || Number(count) || 0;
    const sessionDeaths = Number(deaths) || 0;

    const pod = PODS[authId];

    // Update cumulative stats
    pod.stats.games += 1;
    pod.stats.enemies += enemies;
    pod.stats.deaths += sessionDeaths;

    // Update high score
    if (enemies > pod.highscore) {
        pod.highscore = enemies;
    }

    // Session context for badge checks
    const session = { enemies, sessionLength: 0 };

    // Evaluate all badge definitions
    const newBadges = [];
    for (const badge of BADGE_DEFINITIONS) {
        if (!pod.badges.includes(badge.id) && badge.check(pod, session)) {
            pod.badges.push(badge.id);
            newBadges.push(badge);
        }
    }

    // Broadcast new badges to ActivityPub feed
    for (const badge of newBadges) {
        GLOBAL_FEED.unshift({
            "@context": "https://w3.org",
            "type": "Announce",
            "actor": authId,
            "summary": `🚀 ${authId} earned the '${badge.name}' badge!`
        });
    }

    // Update leaderboard (upsert — update existing entry or add new one)
    const existingEntry = LEADERBOARD.find(e => e.username === authId);
    if (existingEntry) {
        existingEntry.score = pod.highscore;
        existingEntry.timestamp = new Date().toLocaleTimeString();
    } else if (pod.highscore > 0) {
        LEADERBOARD.push({
            username: authId,
            score: pod.highscore,
            timestamp: new Date().toLocaleTimeString()
        });
    }
    LEADERBOARD.sort((a, b) => b.score - a.score);

    // Echo current state back to the caller
    return res.status(200).json({ 
        success: true, 
        verifiedHighScore: pod.highscore,
        newBadges: newBadges.map(b => b.name),
        stats: pod.stats
    });
});

// =======================================================
// ⏱️ 4. ADVANCED: SERVER-TRACKED SESSION LENGTH
// =======================================================

// POST: Signal game session start (advanced exercise)
app.post("/api/game-start", (req, res) => {
    const authId = req.headers["x-intern-id"];

    if (!authId || !PODS[authId]) {
        return res.status(401).json({ error: "Unauthorized: Missing valid Client Identification Header." });
    }

    SESSIONS[authId] = Date.now();
    return res.status(200).json({ success: true, message: "Session started." });
});

// POST: Signal game session end — computes session length server-side (advanced exercise)
app.post("/api/game-end", (req, res) => {
    const authId = req.headers["x-intern-id"];

    if (!authId || !PODS[authId]) {
        return res.status(401).json({ error: "Unauthorized: Missing valid Client Identification Header." });
    }

    let sessionLength = 0;
    if (SESSIONS[authId]) {
        sessionLength = Math.floor((Date.now() - SESSIONS[authId]) / 1000);
        delete SESSIONS[authId];
    }

    // Update longest session stat
    if (sessionLength > PODS[authId].stats.longestSession) {
        PODS[authId].stats.longestSession = sessionLength;
    }

    // Check for Marathon Runner badge
    const session = { enemies: 0, sessionLength };
    const newBadges = [];
    for (const badge of BADGE_DEFINITIONS) {
        if (!PODS[authId].badges.includes(badge.id) && badge.check(PODS[authId], session)) {
            PODS[authId].badges.push(badge.id);
            newBadges.push(badge);
        }
    }

    for (const badge of newBadges) {
        GLOBAL_FEED.unshift({
            "@context": "https://w3.org",
            "type": "Announce",
            "actor": authId,
            "summary": `🚀 ${authId} earned the '${badge.name}' badge!`
        });
    }

    return res.status(200).json({
        success: true,
        sessionLength,
        newBadges: newBadges.map(b => b.name)
    });
});

// =======================================================
// 📡 5. ACTIVITYPUB OUTBOX
// =======================================================

// GET: Personal outbox — returns a single user's ActivityPub activities
app.get("/users/:username/outbox", (req, res) => {
    const { username } = req.params;

    if (!PODS[username]) {
        return res.status(404).json({ error: "User not found." });
    }

    if (ACL[username] && ACL[username].globalOptIn === false) {
        return res.status(403).json({ error: "This user has opted out of public feeds." });
    }

    // Collect badge announcements for this user
    const userFeed = GLOBAL_FEED.filter(act => act.actor === username);

    // Add score activity
    const leaderboardEntry = LEADERBOARD.find(e => e.username === username);
    const items = [...userFeed];
    if (leaderboardEntry) {
        items.push({
            "@context": "https://www.w3.org/ns/activitystreams",
            "type": "Update",
            "actor": username,
            "object": {
                "type": "GameScore",
                "score": leaderboardEntry.score,
                "published": leaderboardEntry.timestamp
            }
        });
    }

    return res.status(200).json({
        "@context": "https://www.w3.org/ns/activitystreams",
        "type": "OrderedCollection",
        "id": `/users/${username}/outbox`,
        "attributedTo": username,
        "totalItems": items.length,
        "orderedItems": items
    });
});

// GET: Federated outbox — returns an ActivityPub OrderedCollection
// Filter with ?filter=badges (announcements) or ?filter=scores (leaderboard)
app.get("/outbox", (req, res) => {
    const filter = req.query.filter;

    if (filter === "scores") {
        // Leaderboard as ActivityPub OrderedCollection
        const filteredLeaderboard = LEADERBOARD.filter(entry => {
            return ACL[entry.username] ? ACL[entry.username].globalOptIn !== false : true;
        });

        const items = filteredLeaderboard.map(entry => ({
            "@context": "https://www.w3.org/ns/activitystreams",
            "type": "Update",
            "actor": entry.username,
            "object": {
                "type": "GameScore",
                "score": entry.score,
                "published": entry.timestamp
            }
        }));

        return res.status(200).json({
            "@context": "https://www.w3.org/ns/activitystreams",
            "type": "OrderedCollection",
            "totalItems": items.length,
            "orderedItems": items
        });
    }

    // Default: badge announcements
    const filteredFeed = GLOBAL_FEED.filter(act => {
        const id = act.actor;
        return ACL[id] ? ACL[id].globalOptIn !== false : true;
    });

    return res.status(200).json({
        "@context": "https://www.w3.org/ns/activitystreams",
        "type": "OrderedCollection",
        "totalItems": filteredFeed.length,
        "orderedItems": filteredFeed
    });
});

// GET: Admin inspection utility to display raw database object conditions map to instructor terminal
app.get("/federated/inspect-pods", (req, res) => {
    return res.status(200).json({
        pods: PODS,
        accessControlLists: ACL
    });
});

// ==========================================
// 🏠 6. FALLBACK FRONTEND ROOT MAP
// ==========================================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the server infrastructure instance execution loop
app.listen(PORT, () => {
    console.log(`🚀 Server active on port ${PORT}`);
});
