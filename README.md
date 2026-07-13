# 🕹️ The Last Arcade
### Indie Gaming Community — Web 3.0 Infra Workshop

Welcome to The Last Arcade! This repository contains a decentralized gaming platform designed to teach the structural evolution of network paradigms through hands-on Pygame integration.

By upgrading your Pygame game to interact with a cloud-hosted personal storage infrastructure, you will experience firsthand how decoupled semantic web architectures replace traditional centralized database profiling.

---

## 🗺️ Architectural Paradigm Shift

* **Web 1.0 (The Read-Only Pipe):** Local, siloed physics loop. High scores live and die statically on your individual machine's storage space.
* **Web 2.0 (The Read-Write Attention Economy):** Monolithic harvesting. Applications collect, aggregate, and monetize your interactions within a closed database sandbox (e.g., Firebase, AWS RDS).
* **Web 3.0 (The Sovereign Intention Economy):** Absolute decoupling. The game engine is a stateless viewer. You retain absolute ownership of profile attributes and verified gaming trophy records inside your private personal data store (**Solid Pod**), managed by user-governed parameters (**Access Control Lists**).

---

## 📂 Repository Structure

```text
web3.0-game-infra-workshop/
├── index.js                # Express server — Pod engine & ActivityPub router
├── package.json            # Node.js project config
├── test.sh                 # End-to-end test script
├── .gitignore              # Git exclusions
└── public/                 # Frontend pages
    ├── index.html          # Workshop portal & hub
    ├── register.html       # Player registration (gamertag provisioning)
    ├── acl.html            # Permissions manager (Access Control Lists)
    ├── view-achievements.html  # Personal achievements & badges
    └── global-leaderboard.html # Live leaderboard & ActivityPub feed
```

---

## 🚀 Step 1: Start the Server

1. Install dependencies and start the server:
   ```bash
   npm install
   npm start
   ```
2. Navigate to the workshop portal: `http://localhost:3000/`
3. Pick a gamertag (e.g., `void_runner`, `pixel_ninja`, `neon_ghost`) to provision your player pod.
4. Your server instance initializes two objects in memory:
   * **Score Store:** Tracks your high score.
   * **Achievements Ledger:** Holds unlocked badges.

---

## 🎮 Step 2: Upgrading the Pygame Client

Instead of spamming real-time network packets inside the 60 FPS physics loop—which introduces micro-stutter frame lag—we bundle, serialize, and emit data payloads strictly at session boundary conditions (**On Death** or **On Pause**).

### 🛠️ Python Integration

Drop this into your local Python game code:

```python
import requests

# === CONFIGURATION ===
SERVER_URL = "http://localhost:3000"
GAMERTAG = "YOUR_GAMERTAG"

def save_progress(payload):
    """Sends your game session data as JSON-LD to your Solid Pod."""
    linked_data = {"@context": "https://schema.org", "@type": "GameSession", **payload}
    try:
        response = requests.post(
            f"{SERVER_URL}/api/game-event",
            json=linked_data,
            headers={"X-Intern-ID": GAMERTAG},
            timeout=2.0
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Saved! High Score: {data.get('verifiedHighScore')}")
        elif response.status_code == 403:
            print("⚠️ Blocked by your ACL permissions.")
        else:
            print(f"❌ Server error: {response.status_code}")
    except requests.RequestException:
        print("⚠️ Network timeout.")
```

The function wraps your data in a [JSON-LD](https://json-ld.org/) envelope before sending — this adds `@context` and `@type` fields that make the data self-describing. Any Semantic Web-compatible service can understand what this data represents without needing custom documentation.

What gets sent to the server:
```json
{
  "@context": "https://schema.org",
  "@type": "GameSession",
  "enemies_destroyed": 7,
  "deaths": 1
}
```

| Field | Type | Description |
|-------|------|-------------|
| `@context` | string | Vocabulary source — declares the data format standard |
| `@type` | string | What this data represents |
| `enemies_destroyed` | number | Enemies destroyed this session |
| `deaths` | number | Number of times the player died this session |

The server tracks cumulative stats across sessions and awards badges:

| Badge | Condition |
|-------|-----------|
| 🏅 Asteroid Hunter | 5+ enemies in one session |
| 🔥 Sharpshooter | 15+ enemies in one session |
| 🎮 Dedicated | 10+ total games played |
| 💀 Respawn King | 20+ total deaths |
| ⭐ Centurion | 100+ lifetime enemies destroyed |

### 🎯 Hooking into Game Events

Call `save_progress()` at game boundary conditions with your session data:

#### On Death
```python
if player_lives <= 0 and game_state == "RUNNING":
    game_state = "GAME_OVER"
    save_progress({"enemies_destroyed": asteroids_destroyed, "deaths": 1})
```

#### On Pause
```python
if event.type == pygame.KEYDOWN:
    if event.key == pygame.K_p:
        if game_state == "RUNNING":
            game_state = "PAUSED"
            save_progress({"enemies_destroyed": asteroids_destroyed, "deaths": 0})
        elif game_state == "PAUSED":
            game_state = "RUNNING"
```

---

## ⚡ Step 3: Experiencing Data Sovereignty

Once you earn a score of **5 or higher**, check the live leaderboard at `/global-leaderboard.html`. Your achievement is verified and broadcasted via **ActivityPub** to the community feed.

### 📡 ActivityPub Feeds

The server exposes a single federated **outbox** endpoint that returns standardised [ActivityPub](https://www.w3.org/TR/activitypub/) `OrderedCollection` objects. The leaderboard and activity feed pages are just visual presentations of this data:

| URL | Filter | What it returns |
|-----|--------|-----------------|
| `/outbox?filter=badges` | Badge announcements | `Announce` activities for earned badges |
| `/outbox?filter=scores` | Leaderboard | `Update` activities with player scores |
| `/outbox` | All activity | Default: badge announcements |

Try opening these URLs directly in your browser to see the raw JSON-LD. This is what a federated service would consume — no custom API documentation needed, because the data describes itself.

### 🛡️ The Data Governance Lab:
1. Open your permissions page: `http://localhost:3000/acl.html?id=YOUR_GAMERTAG`
2. **Uncheck** both options to block server visibility and opt out of the public leaderboard.
3. Click **Update Sovereign Authorization Boundaries**.
4. Play your game again and earn another high score.
5. **Observe:** Your terminal shows a `403 Forbidden` response. Your game still runs fine locally, but the server can't see or store your data — because **you** control your data footprint.

---

## 🧪 Testing

Run the end-to-end test script (server must be running):

```bash
bash test.sh              # defaults to "test_user"
bash test.sh neon_ghost   # test with a specific gamertag
```

---

## 🚀 Advanced: Server-Tracked Session Length

For a bonus challenge, the server supports tracking how long you survive using start/end signals. This unlocks the **⏱️ Marathon Runner** badge (survive 120+ seconds).

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/game-start` | POST | Starts a session timer on the server |
| `/api/game-end` | POST | Stops the timer and returns `sessionLength` in seconds |

Both require the `X-Intern-ID` header. The server calculates the elapsed time — if it's 120+ seconds, you earn the badge.
