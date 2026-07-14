#!/bin/bash
# End-to-end test for the Web 3.0 Game Infra Workshop server
# Requires: server running on localhost:3000

BASE_URL="http://localhost:3000"
USER="${1:-test_user}"
PASS=0

fail() { echo "❌ FAIL: $1"; PASS=1; }
check() { echo "$1" | grep -q "$2" || fail "$3"; }

# 1. Register a user
echo "=== REGISTER ==="
RESULT=$(curl -s -X POST "$BASE_URL/api/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USER\"}")
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'success' "Registration failed"

# 2. Game event (score < 5, no badge)
echo -e "\n=== GAME EVENT (3 enemies, died) ==="
RESULT=$(curl -s -X POST "$BASE_URL/users/$USER/outbox" \
  -H "Content-Type: application/json" \
  -d '{"enemies_destroyed": 3, "deaths": 1}')
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'verifiedHighScore' "High score not returned"
echo "$RESULT" | grep -q 'Asteroid Hunter' && fail "Should NOT earn badge at score 3"

# 3. 🏅 Asteroid Hunter — 5+ enemies in one session
echo -e "\n=== BADGE: Asteroid Hunter (7 enemies) ==="
RESULT=$(curl -s -X POST "$BASE_URL/users/$USER/outbox" \
  -H "Content-Type: application/json" \
  -d '{"enemies_destroyed": 7, "deaths": 1}')
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'Asteroid Hunter' "Asteroid Hunter badge not earned"

# 4. 🔥 Sharpshooter — 15+ enemies in one session
echo -e "\n=== BADGE: Sharpshooter (16 enemies) ==="
RESULT=$(curl -s -X POST "$BASE_URL/users/$USER/outbox" \
  -H "Content-Type: application/json" \
  -d '{"enemies_destroyed": 16, "deaths": 1}')
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'Sharpshooter' "Sharpshooter badge not earned"

# 5. 🎮 Dedicated — 5+ games played (we've played 3 so far, need 2 more)
echo -e "\n=== BADGE: Dedicated (5 games) ==="
RESULT=$(curl -s -X POST "$BASE_URL/users/$USER/outbox" \
  -H "Content-Type: application/json" \
  -d '{"enemies_destroyed": 2, "deaths": 1}')
# Game 4 — not yet
RESULT=$(curl -s -X POST "$BASE_URL/users/$USER/outbox" \
  -H "Content-Type: application/json" \
  -d '{"enemies_destroyed": 2, "deaths": 1}')
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'Dedicated' "Dedicated badge not earned at 5 games"

# 6. 💀 Respawn Rookie — 5+ deaths (we have 5 deaths so far from 5 games × 1 death)
echo -e "\n=== BADGE: Respawn Rookie (5 deaths) ==="
check "$RESULT" 'Respawn Rookie' "Respawn Rookie badge not earned at 5 deaths"

# 7. ⭐ Centurion — 20+ lifetime enemies (we have 3+7+16+2+2 = 30, already past 20)
echo -e "\n=== BADGE: Centurion (20+ lifetime enemies) ==="
RESULT=$(curl -s "$BASE_URL/users/$USER/outbox")
check "$RESULT" 'Centurion' "Centurion badge not earned"

# 8. More games to trigger higher tiers
echo -e "\n=== BADGES: Higher tiers ==="
for i in $(seq 1 4); do
  curl -s -X POST "$BASE_URL/users/$USER/outbox" \
    -H "Content-Type: application/json" \
    -d '{"enemies_destroyed": 3, "deaths": 2}' > /dev/null
done
RESULT=$(curl -s -X POST "$BASE_URL/users/$USER/outbox" \
  -H "Content-Type: application/json" \
  -d '{"enemies_destroyed": 3, "deaths": 2}')
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'Addict' "Addict badge not earned at 10+ games"

# 9. Push to 20 games and 50+ lifetime enemies
echo -e "\n=== BADGES: Tier 3 ==="
for i in $(seq 1 9); do
  curl -s -X POST "$BASE_URL/users/$USER/outbox" \
    -H "Content-Type: application/json" \
    -d '{"enemies_destroyed": 3, "deaths": 1}' > /dev/null
done
RESULT=$(curl -s -X POST "$BASE_URL/users/$USER/outbox" \
  -H "Content-Type: application/json" \
  -d '{"enemies_destroyed": 3, "deaths": 1}')
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'Lives Here' "Lives Here badge not earned at 20 games"

# 10. ⏱️ Marathon Runner — 120+ seconds (advanced: outbox Start/End)
echo -e "\n=== BADGE: Marathon Runner (advanced session tracking) ==="
curl -s -X POST "$BASE_URL/users/$USER/outbox" \
  -H "Content-Type: application/json" \
  -d '{"type": "Start"}' > /dev/null
# In real usage the server tracks elapsed time; here we test the API contract
RESULT=$(curl -s -X POST "$BASE_URL/users/$USER/outbox" \
  -H "Content-Type: application/json" \
  -d '{"type": "End"}')
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'sessionLength' "Session length not returned from End activity"

# 11. Check all achievements via personal outbox
echo -e "\n=== PERSONAL OUTBOX ==="
RESULT=$(curl -s "$BASE_URL/users/$USER/outbox")
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'Asteroid Hunter' "Missing Asteroid Hunter badge"
check "$RESULT" 'Sharpshooter' "Missing Sharpshooter badge"
check "$RESULT" 'Dedicated' "Missing Dedicated badge"
check "$RESULT" 'Addict' "Missing Addict badge"
check "$RESULT" 'Lives Here' "Missing Lives Here badge"
check "$RESULT" 'Respawn Rookie' "Missing Respawn Rookie badge"
check "$RESULT" 'Respawn Veteran' "Missing Respawn Veteran badge"
check "$RESULT" 'Respawn King' "Missing Respawn King badge"
check "$RESULT" 'Centurion' "Missing Centurion badge"
check "$RESULT" 'Legend' "Missing Legend badge"
check "$RESULT" 'GameScore' "Missing score activity"

# 12. Check leaderboard
echo -e "\n=== LEADERBOARD ==="
RESULT=$(curl -s "$BASE_URL/outbox?filter=scores")
echo "$RESULT" | python3 -m json.tool
check "$RESULT" "$USER" "User not on leaderboard"

# 13. Check ActivityPub feed
echo -e "\n=== GLOBAL FEED ==="
RESULT=$(curl -s "$BASE_URL/outbox?filter=badges")
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'Announce' "ActivityPub announce missing"

# 14. ACL sovereignty test
echo -e "\n=== SET ACL (block all) ==="
curl -s -X POST "$BASE_URL/api/pod/$USER/acl" \
  -H "Content-Type: application/json" \
  -d '{"readAllowed": false, "globalOptIn": false}'
echo ""

echo -e "\n=== GAME EVENT AFTER ACL BLOCK (expect 403) ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/users/$USER/outbox" \
  -H "Content-Type: application/json" \
  -d '{"enemies_destroyed": 10, "deaths": 1}')
echo "HTTP $HTTP_CODE"
[ "$HTTP_CODE" = "403" ] || fail "Expected 403, got $HTTP_CODE"

echo -e "\n=== LEADERBOARD AFTER OPT-OUT ==="
RESULT=$(curl -s "$BASE_URL/outbox?filter=scores")
echo "$RESULT" | python3 -m json.tool
echo "$RESULT" | grep -q "$USER" && fail "User should be filtered from leaderboard"

# 15. Restore ACL permissions
echo -e "\n=== RESTORE ACL (grant all) ==="
curl -s -X POST "$BASE_URL/api/pod/$USER/acl" \
  -H "Content-Type: application/json" \
  -d '{"readAllowed": true, "globalOptIn": true}'
echo ""

# Summary
echo ""
if [ $PASS -eq 0 ]; then
  echo "✅ All tests passed!"
else
  echo "❌ Some tests failed."
  exit 1
fi
