# Postseason Games Setup Guide

## Problem
The production app was only showing Army-Navy game because the game sync was hardcoded to fetch only `seasonType=regular` games from the CFB API.

## Solution Implemented

### 1. Updated CFB API Client (`lib/cfb-api.ts`)
- Added `seasonType` parameter to `getGames()` and `getLines()` methods
- Added `getPostseasonGames()` method to fetch ALL postseason games
- Added `getPostseasonLines()` method to fetch ALL postseason betting lines

### 2. Updated Game Sync Route (`app/api/games/sync/route.ts`)
- Added `postseason` query parameter support
- Automatically includes postseason games for weeks 14+
- Fetches both regular and postseason games when requested

### 3. Created Admin Endpoint (`app/api/admin/sync-postseason/route.ts`)
- Easy-to-use admin endpoint for syncing postseason games
- Optional auto-activation of weeks with postseason games
- Provides summary of synced games and affected weeks

### 4. Created Helper Script (`scripts/sync-postseason.js`)
- Command-line tool for syncing postseason games
- Can be run locally or in production

## How to Fix Production Right Now

### Option 1: Using the Admin Endpoint (Recommended)

1. **Deploy the code to production:**
   ```bash
   git add .
   git commit -m "Add postseason game support"
   git push
   ```

2. **After deployment, call the admin endpoint:**
   - Log in to the app as an admin
   - Open browser console and run:
   ```javascript
   fetch('/api/admin/sync-postseason', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       season: 2024,
       autoActivate: true
     })
   }).then(r => r.json()).then(console.log)
   ```

3. **Verify games are loaded:**
   - Go to the admin panel
   - Check that postseason weeks are now active
   - Verify bowl games, Army-Navy, and playoff games are visible

### Option 2: Using Direct API Call

1. **Deploy the code first**

2. **Call the game sync endpoint with postseason flag:**
   ```bash
   curl -X POST "https://your-production-url.com/api/games/sync?season=2024&week=16&postseason=true"
   ```

3. **Manually activate the weeks in admin panel:**
   - Log in as admin
   - Go to week management
   - Activate week 16+ for postseason games

### Option 3: Using the Helper Script (if you have server access)

```bash
# On production server
node scripts/sync-postseason.js 2024
```

Then activate the weeks in the admin panel.

## What Gets Imported

When you sync postseason games, the following are imported:

- **Bowl Games** (GameType: BOWL)
  - All bowl games including CFP bowl games
  - Users must pick ALL bowl games
  - All picks are mandatory double-downs
  - Worth +2 for wins, -1 for losses/pushes

- **Army-Navy Game** (GameType: ARMY_NAVY)
  - Special tradition game
  - Mandatory double-down
  - Worth +2 for win, -1 for loss/push

- **Playoff Games** (GameType: PLAYOFF)
  - College Football Playoff games
  - National Championship game
  - Mandatory double-downs
  - Worth +2 for win, -1 for loss/push

- **Conference Championships** (GameType: CHAMPIONSHIP)
  - Already handled for weeks 14-15
  - All picks are mandatory double-downs
  - Worth +2 for win, -1 for loss/push

## Week Numbers for 2024-2025 Postseason

Based on typical CFB calendar:
- **Week 15**: Conference Championships (early December)
- **Week 16**: Army-Navy + some bowl games (mid-December)
- **Week 17**: More bowl games (late December)
- **Week 18**: CFP First Round + bowl games (late December)
- **Week 19**: CFP Quarterfinals + bowl games (early January)
- **Week 20**: CFP Semifinals + final bowl games (early January)
- **Week 21**: National Championship (mid-January)

## Testing Locally

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Sync postseason games:**
   ```bash
   node scripts/sync-postseason.js 2024
   ```

3. **Or use the API endpoint:**
   ```bash
   curl -X POST "http://localhost:3000/api/admin/sync-postseason" \
     -H "Content-Type: application/json" \
     -d '{"season": 2024, "autoActivate": true}'
   ```

4. **Check the admin panel to verify games loaded**

## Important Notes

1. **Postseason games don't have a specific "week" in the traditional sense**
   - The CFB API assigns them to sequential weeks
   - Week 16+ typically contains postseason games

2. **The sync automatically classifies games by type**
   - Uses game notes/names to identify bowl games
   - Detects Army-Navy by team names
   - Identifies playoff games by keywords

3. **Bowl game rules are already displayed on the home page**
   - Users can see the rules clearly
   - All bowl picks are mandatory double-downs
   - Users must pick ALL bowl games (no 5-game limit)

4. **For future seasons:**
   - Run the postseason sync after bowl game matchups are announced
   - Typically happens after conference championships
   - Can re-sync to update spreads as they change

## Troubleshooting

### No games showing up after sync
- Check that you synced for the correct season (2024 for current season)
- Verify the weeks are activated in admin panel
- Check database for games with `gameType` of BOWL, PLAYOFF, or ARMY_NAVY

### Spreads missing
- Betting lines for postseason games may not be available immediately
- Re-run sync after bowl game matchups are finalized
- Can use the live sync cron job to update lines automatically

### Games not appearing for users
- Ensure weeks are activated in admin panel
- Check that user has permissions to view picks page
- Verify games have future start times

## API Endpoints Reference

### Sync with Postseason
```
POST /api/games/sync?season=2024&week=16&postseason=true
```

### Admin Postseason Sync
```
POST /api/admin/sync-postseason
Body: { "season": 2024, "autoActivate": true }
```

### Activate a Week
```
POST /api/weeks
Body: { "week": 16, "season": 2024, "isActive": true }
```

## Support

If you encounter issues:
1. Check the Railway logs for sync errors
2. Verify CFB API key is valid and has credits
3. Check that database connection is working
4. Confirm admin permissions are set correctly
