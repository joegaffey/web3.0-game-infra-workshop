# 🛰️ Web 3.0 Infra Workshop
### Mastering Solid Data Pods, ActivityPub, and Agentic Data Flows via Pygame

Welcome to the Web 3.0 Infrastructure Workshop! This repository contains a decentralized multi-page state management platform designed to teach the structural evolution of network paradigms. 

By upgrading your pyGame game to interact with cloud-hosted personal storage infrastructure, you will experience firsthand how decoupled semantic web architectures replace traditional centralized database profiling.

---

## 🗺️ Architectural Paradigm Shift

* **Web 1.0 (The Read-Only Pipe):** Local, siloed physics loop. High scores live and die statically on your individual machine's storage space.
* **Web 2.0 (The Read-Write Attention Economy):** Monolithic harvesting. Applications collect, aggregate, and monetize your interactions within a closed database sandbox (e.g., Firebase, AWS RDS).
* **Web 3.0 (The Sovereign Intention Economy):** Absolute decoupling. The game engine is a stateless viewer. You retain absolute ownership of profile attributes and verified gaming trophy records inside your private personal data store (**Solid Pod**), managed by user-governed parameters (**Access Control Lists**).

---

## 📂 Repository File System Topology

```text
telco-workshop/
├── server.js               # Express Multi-Tenant Pod Engine & ActivityPub Router
├── package.json            # Deployment Package Configurations
└── public/                 # Stateless Frontend Semantic View Layers
    ├── index.html          # Decentralized Identity (WebID) Provisioner
    ├── acl.html            # Sovereign Boundary Governance Panel (Access Control Lists)
    ├── view-achievements.html # Private Verified Asset Trophy Vault Inspector
    └── global-leaderboard.html # Federated Room Ticker Feed (Projector Dashboard)
```

---

## 🚀 Step 1: Provision Your Cloud Data Footprint

1. Navigate to the workshop terminal platform: `https://YOUR_CODESANDBOX_URL/`
2. Enter your unique workspace handle identifier (e.g., `intern_01`) to provision your container structures.
3. Your server instance initializes two sovereign objects in memory:
   * **Telemetry Store:** Tracks score records.
   * **Achievements Ledger:** Holds cryptographic badge tokens.

---

## 🎮 Step 2: Upgrading the Pygame Client Infrastructure

Instead of spamming real-time network packets inside the 60 FPS physics thread loop—which introduces micro-stutter frame lag—we bundle, serialize, and emit data payloads strictly at session boundary conditions (**On Death** or **On Pause**).

### 🛠️ Python Tasks: Hooking Sockets to the Cloud Pod

Drop this clean, sequential communication framework into the initialization phase of your local Python source code:

```python
import requests

# 1. Update these constants to target your live cloud environment node
SANDBOX_URL = "https://YOUR_CODESANDBOX_INSTANCE_SUBDOMAIN.csb.app"
INTERN_HANDLE = "YOUR_REGISTERED_HANDLE_ID"

def sync_session_summary_to_pod(asteroids_cleared):
    """Dispatches atomic batch summary metrics up to the Solid Pod on death or pause."""
    url = f"{SANDBOX_URL}/api/game-event"
    headers = {
        "X-Intern-ID": INTERN_HANDLE,
        "Content-Type": "application/json"
    }
    payload = {
        "count": int(asteroids_cleared)
    }
    
    print(f"📡 Dispatched batch ledger payload down the network wire...")
    try:
        # Blocking execution is perfectly fine here because the action loop is frozen
        response = requests.post(url, json=payload, headers=headers, timeout=2.0)
        
        if response.status_code == 200:
            server_data = response.json()
            print(f"✅ Pod Synchronization Complete!")
            print(f"🔒 Verified Server-Side High Score Record: {server_data.get('verifiedHighScore')}")
        elif response.status_code == 403:
            print("⚠️ Sovereign Override Block: Server update calculation was rejected by your custom Pod ACL rules.")
        else:
            print(f"❌ Connection Dropped: Server emitted status code {response.status_code}")
            
    except requests.RequestException:
        print("⚠️ Network Timeout: Client falling back to local data isolation edge tracking.")
```

### 🎯 Hooking into Game Boundary Physics

Locate your health processing conditional flags or user keyboard polling loops to invoke the sync routine precisely at boundary frames.

#### Option A: Trigger Execution On Death
```python
# Inside your game over status calculation boundary code:
if player_lives <= 0 and game_current_state == "RUNNING":
    game_current_state = "GAME_OVER"
    
    # Execute batch network commit event on death thread loop freeze
    sync_session_summary_to_pod(asteroids_destroyed_counter)
```

#### Option B: Trigger Execution On Pause
```python
# Inside your keyboard input event management loops:
if event.type == pygame.KEYDOWN:
    if event.key == pygame.K_p: # Key mapped to Pause event boundaries
        if game_current_state == "RUNNING":
            game_current_state = "PAUSED"
            
            # Sync ongoing progress to your private workspace checkpoint
            sync_session_summary_to_pod(asteroids_destroyed_counter)
            
        elif game_current_state == "PAUSED":
            game_current_state = "RUNNING"
```

---

## ⚡ Step 3: Experiencing Absolute Data Sovereignty

Once you have successfully earned a score of **5 or higher**, monitor the room projector display dashboard at `/global-leaderboard.html`. Your achievement is verified by the central auditor and broadcasted via **ActivityPub** across the live stream.

### 🛡️ Execute the Data Governance Override Lab:
1. Open your browser and access your security perimeter workspace dashboard panel: `https://YOUR_CODESANDBOX_URL/acl.html?id=YOUR_ID`
2. **Uncheck** both configuration checkmarks to block telemetry visibility and opt out of public global federation.
3. Click **Update Sovereign Authorization Boundaries**.
4. Rerun your local Python executable game loop and achieve another high score.
5. **Observe:** Your terminal will output an explicit `403 Forbidden` verification fault warning. Your application loop continues to execute flawlessly at full speed locally on your device, but the central analytics server is completely blind to your behavior because **you** successfully exercised structural control over your data footprint. 
