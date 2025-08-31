# External Cron Service Setup

This guide shows how to set up reliable external cron services for automated game syncing, live score updates, and leaderboard management.

## Recommended Services

### 1. **cron-job.org** (Free & Reliable)
- **URL**: https://cron-job.org/
- **Free Plan**: 50 jobs, 1 minute intervals
- **Perfect for**: College football picks automation

### 2. **EasyCron** (Free Tier Available)  
- **URL**: https://www.easycron.com/
- **Free Plan**: 20 jobs, 1-hour minimum interval
- **Good for**: Basic automation

### 3. **UptimeRobot** (Free Monitors)
- **URL**: https://uptimerobot.com/
- **Free Plan**: HTTP monitoring every 5 minutes
- **Hack**: Use monitor webhooks as cron jobs

## Required Cron Jobs

### 🔴 **Live Score Updates** (During Game Season)
- **Frequency**: Every 15 minutes
- **Cron**: `*/15 * * * *`
- **URL**: `https://squadtriangle.com/api/games/live-sync`
- **Method**: POST
- **Purpose**: Updates live scores, triggers point calculation

### 🆕 **Game Initialization** (Weekly)
- **Frequency**: Monday 2:00 AM EST
- **Cron**: `0 7 * * 1` (UTC, accounting for EST)
- **URL**: `https://squadtriangle.com/api/games/sync`
- **Method**: POST
- **Purpose**: Sets up new week's games and spreads

### 📊 **Leaderboard Refresh** (Optional)
- **Frequency**: Every 30 minutes during games
- **Cron**: `*/30 * * * *`  
- **URL**: `https://squadtriangle.com/api/leaderboard`
- **Method**: GET
- **Purpose**: Keeps leaderboard data fresh (cached)

## Setup Instructions for cron-job.org

### Step 1: Create Account
1. Go to https://cron-job.org/
2. Sign up for free account
3. Verify email address

### Step 2: Add Live Score Sync Job
1. Click **"Create cronjob"**
2. **Title**: `College Football Live Scores`
3. **Address**: `https://squadtriangle.com/api/games/live-sync`
4. **Execution**: `*/15 * * * *` (Every 15 minutes)
5. **Request method**: POST
6. **Save settings**: ON
7. Click **"Create"**

### Step 3: Add Game Initialization Job
1. Click **"Create cronjob"**
2. **Title**: `Weekly Game Initialization`
3. **Address**: `https://squadtriangle.com/api/games/sync`
4. **Execution**: `0 7 * * 1` (Monday 7 AM UTC = 2 AM EST)
5. **Request method**: POST
6. **Save settings**: ON
7. Click **"Create"**

### Step 4: Add Leaderboard Refresh (Optional)
1. Click **"Create cronjob"**
2. **Title**: `Leaderboard Refresh`
3. **Address**: `https://squadtriangle.com/api/leaderboard`
4. **Execution**: `*/30 * * * *` (Every 30 minutes)
5. **Request method**: GET
6. **Save settings**: ON
7. Click **"Create"**

## Seasonal Scheduling

### 🏈 **Game Season (August - January)**
- **Live Score Sync**: Every 15 minutes
- **Game Initialization**: Weekly on Monday
- **Leaderboard Refresh**: Every 30 minutes

### 🏖️ **Off Season (February - July)**
- **Disable live score sync** (no active games)
- **Keep game initialization** (for occasional updates)
- **Disable leaderboard refresh** (no activity)

## Monitoring & Alerts

### Success Indicators
- **Live Sync**: Returns `{"gamesUpdated": X, "scoreUpdates": Y}`
- **Game Initialization**: Returns `{"gamesCreated": X, "totalGames": Y}`
- **No 500 errors** in cron service logs

### Failure Alerts
Most cron services offer email alerts on failure. Enable these for:
- **HTTP errors** (500, 404, etc.)
- **Timeout errors** (requests taking too long)
- **Connection failures**

### Manual Testing URLs
Test these in your browser or with curl:

```bash
# Live score sync
curl -X POST https://squadtriangle.com/api/games/live-sync

# Game initialization  
curl -X POST https://squadtriangle.com/api/games/sync

# Leaderboard refresh
curl https://squadtriangle.com/api/leaderboard
```

## Advanced Configuration

### Custom Headers (if needed)
Some endpoints might require custom headers:
```
Content-Type: application/json
User-Agent: CronJob-CollegeFootball/1.0
```

### Authentication (if added later)
If you add API authentication:
```
Authorization: Bearer your-api-key
```

### Webhook Notifications (optional)
Get notified of successful operations:
- **Slack webhook** for score updates
- **Discord webhook** for game completions
- **Email notifications** for critical events

## Troubleshooting

### Common Issues
1. **Timezone confusion**: Use UTC times, account for EST/EDT
2. **Rate limiting**: Don't set intervals too aggressive  
3. **API failures**: Check endpoint responses manually
4. **Seasonal conflicts**: Disable off-season jobs

### Debug Steps
1. Check cron service logs
2. Test endpoints manually with curl
3. Check your app logs in Railway
4. Verify database updates directly

## Cost Considerations

### Free Tier Limits
- **cron-job.org**: 50 jobs, perfect for this use case
- **EasyCron**: 20 jobs, might need basic paid plan  
- **UptimeRobot**: 50 monitors, creative alternative

### Upgrade Scenarios
You'll need paid plans if you add:
- More frequent updates (< 1 minute intervals)
- More sophisticated error handling
- SMS/phone notifications
- API rate limiting bypass

## Success Metrics

### When It's Working
- ✅ Live scores update during games
- ✅ Points calculate when games end  
- ✅ New weeks appear Monday mornings
- ✅ Users receive email notifications
- ✅ Leaderboard stays current

### Monitoring Dashboard
Create a simple status page showing:
- Last successful live sync time
- Games currently updating
- Recent point calculations
- System health status

---

**Next Steps**: 
1. Set up cron-job.org account
2. Configure the 3 jobs listed above
3. Test during next game day
4. Monitor logs for first week
5. Adjust timing/frequency as needed

Your college football picks will be fully automated! 🚀