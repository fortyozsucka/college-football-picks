# Debug Production Betting Lines Sync Issue

## Issue
Betting lines not updating for Week 4 in production, even though collegefootballdata.com API has the correct data.

## Root Cause Analysis
The betting lines sync **is working correctly** in the code. The issue is likely one of these:

### 1. Week 4 Not Active in Production Database
The cron job only syncs betting lines for weeks marked as `isActive: true`.

**Check production database:**
```sql
SELECT week, season, isActive FROM "Week" WHERE week = 4 AND season = 2024;
```

**Fix if needed:**
```sql
UPDATE "Week" SET "isActive" = true WHERE week = 4 AND season = 2024;
```

### 2. Missing/Incorrect Environment Variables
**Check these in production:**
- `CFB_API_KEY` - Required for collegefootballdata.com API
- `CRON_SECRET` - Required for cron job authentication
- `NEXTAUTH_URL` - Required for internal API calls

### 3. Cron Job Not Scheduled
The betting lines sync endpoint is: `/api/cron/sync-betting-lines`

**Manual test in production:**
```bash
curl -X GET "https://your-domain.com/api/cron/sync-betting-lines" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 4. CFB API Rate Limiting
Check if you're hitting rate limits on the collegefootballdata.com API.

## How the Sync Works

1. **Cron Job** (`/api/cron/sync-betting-lines`) runs on schedule
2. **Finds Active Weeks** - Only syncs weeks where `isActive: true`
3. **Calls Games Sync** - For each active week, calls `/api/games/sync`
4. **Fetches Data** - Gets games and betting lines from CFB API
5. **Applies Lines** - Uses preferred provider order: DraftKings > ESPN Bet > Bovada

## Fix Steps

1. **Check Week 4 Status:**
   ```sql
   SELECT * FROM "Week" WHERE week = 4 AND season = 2024;
   ```

2. **Activate Week 4 if needed:**
   ```sql
   INSERT INTO "Week" (week, season, "isActive")
   VALUES (4, 2024, true)
   ON CONFLICT (week, season)
   DO UPDATE SET "isActive" = true;
   ```

3. **Test sync manually:**
   ```bash
   curl -X POST "https://your-domain.com/api/games/sync?week=4&season=2024"
   ```

4. **Run full cron job:**
   ```bash
   curl -X GET "https://your-domain.com/api/cron/sync-betting-lines" \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

## Expected Results
When working correctly, you should see:
- `Fetched 101 betting lines from CFB API` (for week 4)
- `Using spread X from DraftKings` messages for each game
- `54 games updated` or similar

## API Endpoints to Check
- `/api/games/sync?week=4&season=2024` - Manual sync for week 4
- `/api/cron/sync-betting-lines` - Automated sync for all active weeks
- `/api/weeks` - Check which weeks exist and are active