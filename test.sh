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
RESULT=$(curl -s -X POST "$BASE_URL/api/game-event" \
  -H "X-Intern-ID: $USER" \
  -H "Content-Type: application/json" \
  -d '{"enemies_destroyed": 3, "deaths": 1}')
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'verifiedHighScore' "High score not returned"
echo "$RESULT" | grep -q 'Asteroid Hunter' && fail "Should NOT earn badge at score 3"

# 3. 🏅 Asteroid Hunter — 5+ enemies in one session
echo -e "\n=== BADGE: Asteroid Hunter (7 enemies) ==="
RESULT=$(curl -s -X POST "$BASE_URL/api/game-event" \
  -H "X-Intern-ID: $USER" \
  -H "Content-Type: application/json" \
  -d '{"enemies_destroyed": 7, "deaths": 1}')
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'Asteroid Hunter' "Asteroid Hunter badge not earned"

# 4. 🔥 Sharpshooter — 15+ enemies in one session
echo -e "\n=== BADGE: Sharpshooter (16 enemies) ==="
RESULT=$(curl -s -X POST "$BASE_URL/api/game-event" \
  -H "X-Intern-ID: $USER" \
  -H "Content-Type: application/json" \
  -d '{"enemies_destroyed": 16, "deaths": 1}')
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'Sharpshooter' "Sharpshooter badge not earned"

# 5. 🎮 Dedicated — 10+ games played (we've played 3 so far, need 7 more)
echo -e "\n=== BADGE: Dedicated (playing more games) ==="
for i in $(seq 1 6); do
  curl -s -X POST "$BASE_URL/api/game-event" \
    -H "X-Intern-ID: $USER" \
    -H "Content-Type: application/json" \
    -d '{"enemies_destroyed": 2, "deaths": 1}' > /dev/null
done
# Game 10 should trigger it
RESULT=$(curl -s -X POST "$BASE_URL/api/game-event" \
  -H "X-Intern-ID: $USER" \
  -H "Content-Type: application/json" \
  -d '{"enemies_destroyed": 2, "deaths": 1}')
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'Dedicated' "Dedicated badge not earned at 10 games"

# 6. 💀 Respawn King — 20+ deaths (we have 10 so far, need 10 more)
echo -e "\n=== BADGE: Respawn King (dying more times) ==="
for i in $(seq 1 9); do
  curl -s -X POST "$BASE_URL/api/game-event" \
    -H "X-Intern-ID: $USER" \
    -H "Content-Type: application/json" \
    -d '{"enemies_destroyed": 1, "deaths": 1}' > /dev/null
done
# Death 20 should trigger it
RESULT=$(curl -s -X POST "$BASE_URL/api/game-event" \
  -H "X-Intern-ID: $USER" \
  -H "Content-Type: application/json" \
  -d '{"enemies_destroyed": 1, "deaths": 1}')
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'Respawn King' "Respawn King badge not earned at 20 deaths"

# 7. ⭐ Centurion — 100+ lifetime enemies (tally so far and send remainder)
echo -e "\n=== BADGE: Centurion (pushing lifetime enemies past 100) ==="
RESULT=$(curl -s -X POST "$BASE_URL/api/game-event" \
  -H "X-Intern-ID: $USER" \
  -H "Content-Type: application/json" \
  -d '{"enemies_destroyed": 60, "deaths": 0}')
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'Centurion' "Centurion badge not earned"

# 8. ⏱️ Marathon Runner — 120+ seconds (advanced: game-start / game-end)
echo -e "\n=== BADGE: Marathon Runner (advanced session tracking) ==="
curl -s -X POST "$BASE_URL/api/game-start" \
  -H "X-Intern-ID: $USER" > /dev/null
# Simulate 121 seconds by manipulating — we'll just test the endpoint works
# In real usage the server tracks elapsed time; here we test the API contract
RESULT=$(curl -s -X POST "$BASE_URL/api/game-end" \
  -H "X-Intern-ID: $USER")
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'sessionLength' "Session length not returned from game-end"

# 9. Check all achievements
echo -e "\n=== ALL ACHIEVEMENTS ==="
RESULT=$(curl -s "$BASE_URL/pods/$USER/achievements")
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'asteroid_hunter' "Missing asteroid_hunter badge"
check "$RESULT" 'sharpshooter' "Missing sharpshooter badge"
check "$RESULT" 'dedicated' "Missing dedicated badge"
check "$RESULT" 'respawn_king' "Missing respawn_king badge"
check "$RESULT" 'centurion' "Missing centurion badge"

# 10. Check leaderboard
echo -e "\n=== LEADERBOARD ==="
RESULT=$(curl -s "$BASE_URL/api/global-leaderboard")
echo "$RESULT" | python3 -m json.tool
check "$RESULT" "$USER" "User not on leaderboard"

# 11. Check ActivityPub feed
echo -e "\n=== GLOBAL FEED ==="
RESULT=$(curl -s "$BASE_URL/api/global-feed")
echo "$RESULT" | python3 -m json.tool
check "$RESULT" 'Announce' "ActivityPub announce missing"

# 12. ACL sovereignty test
echo -e "\n=== SET ACL (block all) ==="
curl -s -X POST "$BASE_URL/api/pod/$USER/acl" \
  -H "Content-Type: application/json" \
  -d '{"readAllowed": false, "globalOptIn": false}'
echo ""

echo -e "\n=== GAME EVENT AFTER ACL BLOCK (expect 403) ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/game-event" \
  -H "X-Intern-ID: $USER" \
  -H "Content-Type: application/json" \
  -d '{"enemies_destroyed": 10, "deaths": 1}')
echo "HTTP $HTTP_CODE"
[ "$HTTP_CODE" = "403" ] || fail "Expected 403, got $HTTP_CODE"

echo -e "\n=== LEADERBOARD AFTER OPT-OUT ==="
RESULT=$(curl -s "$BASE_URL/api/global-leaderboard")
echo "$RESULT" | python3 -m json.tool
echo "$RESULT" | grep -q "$USER" && fail "User should be filtered from leaderboard"

# 13. Restore ACL permissions
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
