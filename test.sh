#!/bin/bash
# End-to-end test for the Web 3.0 Game Infra Workshop server
# Requires: server running on localhost:3000

BASE_URL="http://localhost:3000"
USER="test_user"
PASS=0

fail() { echo "❌ FAIL: $1"; PASS=1; }

# 1. Register a user
echo "=== REGISTER ==="
RESULT=$(curl -s -X POST "$BASE_URL/api/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USER\"}")
echo "$RESULT" | python3 -m json.tool
echo "$RESULT" | grep -q '"success": true' || fail "Registration failed"

# 2. Game event (score < 5, no badge)
echo -e "\n=== GAME EVENT (score 3) ==="
RESULT=$(curl -s -X POST "$BASE_URL/api/game-event" \
  -H "X-Intern-ID: $USER" \
  -H "Content-Type: application/json" \
  -d '{"count": 3}')
echo "$RESULT" | python3 -m json.tool
echo "$RESULT" | grep -q '"verifiedHighScore": 3' || fail "High score should be 3"

# 3. Game event (score >= 5, should earn badge)
echo -e "\n=== GAME EVENT (score 7) ==="
RESULT=$(curl -s -X POST "$BASE_URL/api/game-event" \
  -H "X-Intern-ID: $USER" \
  -H "Content-Type: application/json" \
  -d '{"count": 7}')
echo "$RESULT" | python3 -m json.tool
echo "$RESULT" | grep -q '"verifiedHighScore": 7' || fail "High score should be 7"

# 4. Check achievements
echo -e "\n=== ACHIEVEMENTS ==="
RESULT=$(curl -s "$BASE_URL/pods/$USER/achievements")
echo "$RESULT" | python3 -m json.tool
echo "$RESULT" | grep -q '"Asteroid Hunter"' || fail "Badge not found"
echo "$RESULT" | grep -q '"highscore": 7' || fail "Highscore mismatch in achievements"

# 5. Check leaderboard
echo -e "\n=== LEADERBOARD ==="
RESULT=$(curl -s "$BASE_URL/api/global-leaderboard")
echo "$RESULT" | python3 -m json.tool
echo "$RESULT" | grep -q "$USER" || fail "User not on leaderboard"

# 6. Check ActivityPub feed
echo -e "\n=== GLOBAL FEED ==="
RESULT=$(curl -s "$BASE_URL/api/global-feed")
echo "$RESULT" | python3 -m json.tool
echo "$RESULT" | grep -q '"type": "Announce"' || fail "ActivityPub announce missing"

# 7. Block access via ACL
echo -e "\n=== SET ACL (block all) ==="
curl -s -X POST "$BASE_URL/api/pod/$USER/acl" \
  -H "Content-Type: application/json" \
  -d '{"readAllowed": false, "globalOptIn": false}'
echo ""

# 8. Game event after ACL block (should 403)
echo -e "\n=== GAME EVENT AFTER ACL BLOCK (expect 403) ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/game-event" \
  -H "X-Intern-ID: $USER" \
  -H "Content-Type: application/json" \
  -d '{"count": 10}')
echo "HTTP $HTTP_CODE"
[ "$HTTP_CODE" = "403" ] || fail "Expected 403, got $HTTP_CODE"

# 9. Leaderboard should be empty (user opted out)
echo -e "\n=== LEADERBOARD AFTER OPT-OUT ==="
RESULT=$(curl -s "$BASE_URL/api/global-leaderboard")
echo "$RESULT" | python3 -m json.tool
echo "$RESULT" | grep -q "$USER" && fail "User should be filtered from leaderboard"

# Summary
echo ""
if [ $PASS -eq 0 ]; then
  echo "✅ All tests passed!"
else
  echo "❌ Some tests failed."
  exit 1
fi
