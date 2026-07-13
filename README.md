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

# Update these constants to target your server
SERVER_URL = "http://localhost:3000"
GAMERTAG = "YOUR_GAMERTAG"

def sync_session_summary_to_pod(asteroids_cleared):
    """Dispatches batch summary metrics to your Solid Pod on death or pause."""
    url = f"{SERVER_URL}/api/game-event"
    headers = {
        "X-Intern-ID": GAMERTAG,
        "Content-Type": "application/json"
    }
    payload = {
        "count": int(asteroids_cleared)
    }
    
    print(f"📡 Syncing score to The Last Arcade...")
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=2.0)
        
        if response.status_code == 200:
            server_data = response.json()
            print(f"✅ Sync complete! High Score: {server_data.get('verifiedHighScore')}")
        elif response.status_code == 403:
            print("⚠️ Blocked: Your ACL permissions rejected the update.")
        else:
            print(f"❌ Server error: status {response.status_code}")
            
    except requests.RequestException:
        print("⚠️ Network timeout — falling back to local tracking.")
```

### 🎯 Hooking into Game Events

Invoke the sync routine at game boundary conditions:

#### Option A: On Death
```python
if player_lives <= 0 and game_state == "RUNNING":
    game_state = "GAME_OVER"
    sync_session_summary_to_pod(asteroids_destroyed)
```

#### Option B: On Pause
```python
if event.type == pygame.KEYDOWN:
    if event.key == pygame.K_p:
        if game_state == "RUNNING":
            game_state = "PAUSED"
            sync_session_summary_to_pod(asteroids_destroyed)
        elif game_state == "PAUSED":
            game_state = "RUNNING"
```

---

## ⚡ Step 3: Experiencing Data Sovereignty

Once you earn a score of **5 or higher**, check the live leaderboard at `/global-leaderboard.html`. Your achievement is verified and broadcasted via **ActivityPub** to the community feed.

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
