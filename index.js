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
    { id: "asteroid_hunter", name: "🏅 Asteroid Hunter", desc: "Destroy 5+ enemies in one session", points: 5, check: (pod, session) => session.enemies >= 5 },
    { id: "sharpshooter", name: "🔥 Sharpshooter", desc: "Destroy 15+ enemies in one session", points: 15, check: (pod, session) => session.enemies >= 15 },
    { id: "destroyer", name: "💥 Destroyer", desc: "Destroy 50+ enemies in one session", points: 50, check: (pod, session) => session.enemies >= 50 },
    { id: "dedicated", name: "🎮 Dedicated", desc: "Play 5+ games", points: 5, check: (pod) => pod.stats.games >= 5 },
    { id: "addict", name: "🕹️ Addict", desc: "Play 10+ games", points: 10, check: (pod) => pod.stats.games >= 10 },
    { id: "lives_here", name: "🏠 Lives Here", desc: "Play 20+ games", points: 20, check: (pod) => pod.stats.games >= 20 },
    { id: "respawn_rookie", name: "💀 Respawn Rookie", desc: "Die 5+ times", points: 5, check: (pod) => pod.stats.deaths >= 5 },
    { id: "respawn_veteran", name: "☠️ Respawn Veteran", desc: "Die 10+ times", points: 10, check: (pod) => pod.stats.deaths >= 10 },
    { id: "respawn_king", name: "👑 Respawn King", desc: "Die 20+ times", points: 20, check: (pod) => pod.stats.deaths >= 20 },
    { id: "centurion", name: "⭐ Centurion", desc: "Destroy 20+ lifetime enemies", points: 20, check: (pod) => pod.stats.enemies >= 20 },
    { id: "legend", name: "🌟 Legend", desc: "Destroy 50+ lifetime enemies", points: 50, check: (pod) => pod.stats.enemies >= 50 },
    { id: "supernova", name: "☀️ Supernova", desc: "Destroy 100+ lifetime enemies", points: 100, check: (pod) => pod.stats.enemies >= 100 },
    { id: "marathon_runner", name: "⏱️ Marathon Runner", desc: "Survive 120+ seconds in one session (advanced)", points: 120, check: (pod, session) => session.sessionLength >= 120 },
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
// 🎮 3. ACTIVITYPUB OUTBOX (POST & GET)
// ==========================================

// POST: Publish an activity to a user's outbox
// Accepts: GameSession (score data), Start (begin timer), End (stop timer)
app.post("/users/:username/outbox", (req, res) => {
    const { username } = req.params;
    const { type, enemies_destroyed, deaths, count } = req.body;

    if (!PODS[username]) {
        return res.status(404).json({ error: "User not found. Register first." });
    }

    if (ACL[username] && ACL[username].readAllowed === false) {
        return res.status(403).json({ error: "Sovereign Override: Your ACL permissions rejected this request." });
    }

    const pod = PODS[username];

    // --- Activity: Start (begin session timer) ---
    if (type === "Start") {
        SESSIONS[username] = Date.now();
        return res.status(200).json({ success: true, message: "Session started." });
    }

    // --- Activity: End (stop session timer, compute duration) ---
    if (type === "End") {
        let sessionLength = 0;
        if (SESSIONS[username]) {
            sessionLength = Math.floor((Date.now() - SESSIONS[username]) / 1000);
            delete SESSIONS[username];
        }

        if (sessionLength > pod.stats.longestSession) {
            pod.stats.longestSession = sessionLength;
        }

        const session = { enemies: 0, sessionLength };
        const newBadges = evaluateBadges(pod, session, username);

        return res.status(200).json({
            success: true,
            sessionLength,
            newBadges: newBadges.map(b => b.name)
        });
    }

    // --- Activity: GameSession (default — score submission) ---
    const enemies = Number(enemies_destroyed) || Number(count) || 0;
    const sessionDeaths = Number(deaths) || 0;

    pod.stats.games += 1;
    pod.stats.enemies += enemies;
    pod.stats.deaths += sessionDeaths;

    if (enemies > pod.highscore) {
        pod.highscore = enemies;
    }

    const session = { enemies, sessionLength: 0 };
    const newBadges = evaluateBadges(pod, session, username);

    // Calculate total badge points
    const totalPoints = pod.badges.reduce((sum, id) => {
        const def = BADGE_DEFINITIONS.find(b => b.id === id);
        return sum + (def ? def.points : 0);
    }, 0);

    // Update leaderboard (upsert)
    const existingEntry = LEADERBOARD.find(e => e.username === username);
    if (existingEntry) {
        existingEntry.score = totalPoints;
        existingEntry.timestamp = new Date().toLocaleTimeString();
    } else if (totalPoints > 0) {
        LEADERBOARD.push({
            username,
            score: totalPoints,
            timestamp: new Date().toLocaleTimeString()
        });
    }
    LEADERBOARD.sort((a, b) => b.score - a.score);

    return res.status(200).json({
        success: true,
        verifiedHighScore: pod.highscore,
        totalPoints,
        newBadges: newBadges.map(b => b.name),
        stats: pod.stats
    });
});

// Helper: evaluate badges and broadcast announcements
function evaluateBadges(pod, session, username) {
    const newBadges = [];
    for (const badge of BADGE_DEFINITIONS) {
        if (!pod.badges.includes(badge.id) && badge.check(pod, session)) {
            pod.badges.push(badge.id);
            newBadges.push(badge);
        }
    }
    for (const badge of newBadges) {
        GLOBAL_FEED.unshift({
            "@context": "https://www.w3.org/ns/activitystreams",
            "type": "Announce",
            "actor": username,
            "summary": `🚀 ${username} earned the '${badge.name}' badge!`
        });
    }
    return newBadges;
}

// GET: Personal outbox — returns a single user's ActivityPub activities
app.get("/users/:username/outbox", (req, res) => {
    const { username } = req.params;

    if (!PODS[username]) {
        return res.status(404).json({ error: "User not found." });
    }

    if (ACL[username] && ACL[username].globalOptIn === false) {
        return res.status(403).json({ error: "This user has opted out of public feeds." });
    }

    // Collect badge announcements for this user with descriptions
    const pod = PODS[username];
    const userBadges = pod.badges.map(id => {
        const def = BADGE_DEFINITIONS.find(b => b.id === id);
        return {
            "@context": "https://www.w3.org/ns/activitystreams",
            "type": "Announce",
            "actor": username,
            "summary": `🚀 ${username} earned the '${def ? def.name : id}' badge!`,
            "object": {
                "type": "Achievement",
                "name": def ? def.name : id,
                "description": def ? def.desc : ""
            }
        };
    });

    // Add score activity
    const leaderboardEntry = LEADERBOARD.find(e => e.username === username);
    const items = [...userBadges];
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
