# Automated Betting Lines Sync Setup

This guide shows you how to set up fully automated betting lines synchronization for your college football picks app.

## 🎯 The Problem Solved

When you switch to a new week, games exist but betting lines show as "Even" because spreads haven't been synced from the CFB API yet. This automation ensures:

- ✅ All active weeks have current betting lines
- ✅ Lines refresh automatically before game days
- ✅ New weeks get proper spreads immediately
- ✅ No more manual sync required

## 🔧 Technical Setup

### New API Endpoint Created: `/api/cron/sync-betting-lines`

This endpoint:
- Finds all currently active weeks
- Syncs betting lines for each week automatically
- Uses respectful delays between API calls
- Provides detailed logging and error handling
- Requires authentication with `CRON_SECRET`

### Usage Examples

```bash
# Manual test (requires CRON_SECRET)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -X POST https://your-domain.com/api/cron/sync-betting-lines

# Response example
{
  "message": "Automated betting lines sync completed",
  "timestamp": "2025-09-09T22:00:00.000Z",
  "summary": {
    "activeWeeks": 2,
    "successful": 2,
    "failed": 0,
    "totalGamesUpdated": 97
  },
  "details": [
    {
      "week": 2,
      "season": 2025, 
      "success": true,
      "result": {"gamesUpdated": 50, "totalGames": 83}
    },
    {
      "week": 3,
      "season": 2025,
      "success": true, 
      "result": {"gamesUpdated": 47, "totalGames": 70}
    }
  ]
}
```

## 📅 Recommended Cron Schedule

### Option A: Conservative Approach
```
# Sync betting lines twice daily during football season
0 6,18 * * * (6 AM and 6 PM daily)
```

### Option B: Aggressive Approach  
```
# Sync betting lines every 6 hours during football season
0 */6 * * * (Every 6 hours)
```

### Option C: Game Day Focus
```
# Daily sync + extra on game days
0 6 * * * (Daily at 6 AM)
0 9,15 * * 6,0 (Saturday/Sunday at 9 AM and 3 PM)
```

## 🌐 External Cron Service Setup

### Using cron-job.org (Recommended)

1. **Sign up** at https://cron-job.org/
2. **Create a new cron job**:
   - **Title**: `College Football Betting Lines Sync`
   - **URL**: `https://your-domain.com/api/cron/sync-betting-lines`
   - **Method**: POST
   - **Schedule**: `0 6,18 * * *` (twice daily)
   - **Headers**: 
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     Content-Type: application/json
     ```

3. **Enable notifications** for failures
4. **Test the job** manually first

### Using GitHub Actions (Alternative)

Create `.github/workflows/sync-betting-lines.yml`:

```yaml
name: Sync Betting Lines
on:
  schedule:
    # Run at 6 AM and 6 PM UTC daily during football season
    - cron: '0 6,18 * 8-12,1 *'
    - cron: '0 6,18 * * 6,0' # Extra on weekends
  workflow_dispatch: # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync Betting Lines
        run: |
          curl -f -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
               -X POST ${{ secrets.APP_URL }}/api/cron/sync-betting-lines
```

## 🎮 Integration with Existing Cron Jobs

Your existing cron jobs work perfectly together:

### Current Setup:
- **Game Sync** (`/api/cron/sync-games`): Updates scores, creates new games
- **Notifications** (`/api/cron/notifications`): Sends push notifications

### Enhanced Setup:
- **Game Sync**: Keep as-is for live scores during games
- **Betting Lines Sync**: New job for ensuring spreads are current
- **Notifications**: Keep as-is

### Recommended Combined Schedule:

```bash
# 1. Betting Lines Sync (ensures spreads are current)
0 6,18 * * * → /api/cron/sync-betting-lines

# 2. Live Game Sync (during active games)  
*/15 * * * * → /api/cron/sync-games

# 3. Notifications (alerts and summaries)
*/15 * * * * → /api/cron/notifications
```

## 🔍 Monitoring & Debugging

### Success Indicators
- ✅ Response status 200
- ✅ `"successful": > 0` in summary
- ✅ `"totalGamesUpdated": > 0` 
- ✅ No games showing "Even" when they shouldn't

### Common Issues & Solutions

**Issue**: "No active weeks found"
```bash
# Check which weeks are active
curl https://your-domain.com/api/weeks
# Activate week if needed via admin panel
```

**Issue**: "Outside football season"
```bash
# The job automatically skips during off-season (Feb-July)
# This is expected behavior
```

**Issue**: Some betting lines still missing
```bash
# Some games may genuinely not have betting lines yet
# CFB API doesn't have lines for all games immediately
# This is normal for newer/smaller games
```

### Debug Commands

```bash
# Test the new endpoint manually
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -X POST http://localhost:3001/api/cron/sync-betting-lines

# Check specific week data
curl "http://localhost:3001/api/games?week=3&season=2025"

# Verify active weeks
curl http://localhost:3001/api/weeks
```

## 🚀 Deployment Steps

1. **Deploy the new API endpoint**
   ```bash
   git add app/api/cron/sync-betting-lines/
   git commit -m "Add automated betting lines sync"
   git push
   ```

2. **Set up external cron job** (choose one):
   - cron-job.org (easiest)
   - GitHub Actions (if using GitHub)
   - Your hosting platform's cron (Railway, Vercel, etc.)

3. **Test the automation**
   ```bash
   # Wait for next scheduled run, or trigger manually
   curl -H "Authorization: Bearer $CRON_SECRET" \
        -X POST https://your-domain.com/api/cron/sync-betting-lines
   ```

4. **Monitor for a few days**
   - Check cron service logs
   - Verify games show proper spreads
   - Adjust frequency if needed

## 🎉 Expected Results

After setup, you'll have:

- ✅ **Automatic Updates**: Betting lines sync without manual intervention
- ✅ **Always Current**: New weeks have proper spreads immediately  
- ✅ **Reliable**: Runs even when you're not monitoring the app
- ✅ **Smart**: Only runs during football season
- ✅ **Respectful**: Includes delays between API calls
- ✅ **Monitored**: Clear success/failure reporting

## 📊 Advanced Optimization

### Dynamic Scheduling
You could enhance this further by:
- More frequent syncs on Mondays (new week setup)
- Extra syncs on Fridays (lines often change)  
- Reduced frequency for completed weeks
- Game day morning "final line" sync

### Smart Caching
Future enhancements could include:
- Only sync weeks with games in next 7 days
- Skip syncing if lines haven't changed
- Prioritize syncing for weeks with user picks

---

🎯 **Your betting lines will now stay current automatically!** No more "Even" odds when switching weeks.