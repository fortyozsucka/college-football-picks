# 🤖 Automated Sync Setup Guide

This guide shows you how to set up automated live score syncing for your College Football Picks application.

## 🎯 Overview

The system provides **3 sync frequencies** based on timing:
- **🏈 Game Day Live (Sat/Sun 9 AM - 11 PM)**: Every 10 minutes
- **📅 Weekdays**: Every 4 hours  
- **🛠️ Daily Maintenance**: Once at noon

## 🚀 Setup Instructions

### 1. Environment Variables

Add this to your `.env.local` file:

```bash
# Cron job security token (generate a random string)
CRON_SECRET=your-super-secret-cron-token-here

# Your existing CFB API key (Tier 1)
CFB_API_KEY=your-cfb-api-key-here

# App URL (auto-detected in production)
NEXTAUTH_URL=http://localhost:3001
```

### 2. Deploy to Vercel

The `vercel.json` file is already configured with the cron schedules:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-games",
      "schedule": "*/10 * * * 6,0"
    },
    {
      "path": "/api/cron/sync-games", 
      "schedule": "0 */4 * * 1,2,3,4,5"
    },
    {
      "path": "/api/cron/sync-games",
      "schedule": "0 12 * * *"
    }
  ]
}
```

### 3. Deploy Commands

```bash
# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel dashboard
vercel env add CRON_SECRET
vercel env add CFB_API_KEY
```

## 📊 Monitoring & Control

### Check Sync Status
```bash
curl https://your-app.vercel.app/api/cron/manual-schedule
```

### Manual Trigger (for testing)
```bash
curl -X POST https://your-app.vercel.app/api/cron/sync-games \
  -H "Authorization: Bearer your-cron-secret"
```

### Pause Automation
```bash
curl -X POST https://your-app.vercel.app/api/cron/manual-schedule \
  -H "Content-Type: application/json" \
  -d '{"action": "pause_automation"}'
```

### Resume Automation  
```bash
curl -X POST https://your-app.vercel.app/api/cron/manual-schedule \
  -H "Content-Type: application/json" \
  -d '{"action": "resume_automation"}'
```

## 🕐 Schedule Breakdown

| Time | Frequency | Purpose |
|------|-----------|---------|
| **Saturday/Sunday 9 AM - 11 PM** | Every 10 minutes | Live game updates |
| **Monday-Friday** | Every 4 hours | Maintenance syncing |
| **Every day at noon** | Once daily | Baseline sync |

## 🔐 Security Features

- ✅ **CRON_SECRET** prevents unauthorized access
- ✅ **Season detection** - skips syncing in off-season
- ✅ **Smart scheduling** - more frequent on game days
- ✅ **Error handling** with detailed logging

## 📈 What Gets Synced

Each automated sync will:
1. 🎮 Fetch latest games from CFB API
2. 📊 Update scores for in-progress/completed games  
3. 📈 Calculate points for completed games
4. 🔄 Check for automatic week progression
5. 📧 Send notifications (if configured)

## 🛠️ Alternative Setup Methods

### Option 1: GitHub Actions (Free)
Create `.github/workflows/sync.yml`:

```yaml
name: Sync Game Scores
on:
  schedule:
    - cron: '*/10 * * * 6,0'  # Every 10 min on weekends
    - cron: '0 */4 * * 1-5'   # Every 4 hours on weekdays

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Sync
        run: |
          curl -X POST ${{ secrets.SYNC_URL }} \\
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Option 2: Cron Service (Cron-job.org)
1. Go to [cron-job.org](https://cron-job.org)
2. Create account and add jobs:
   - **URL**: `https://your-app.vercel.app/api/cron/sync-games`
   - **Schedule**: `*/10 * * * 6,0` (weekends)
   - **Headers**: `Authorization: Bearer your-cron-secret`

### Option 3: EasyCron (Paid)
Similar setup to cron-job.org with more reliability.

## 🐛 Troubleshooting

### Check Vercel Function Logs
```bash
vercel logs --follow
```

### Test Endpoint Manually
```bash
curl -X POST http://localhost:3001/api/cron/sync-games \
  -H "Authorization: Bearer your-cron-secret"
```

### Common Issues:
- **401 Unauthorized**: Check `CRON_SECRET` environment variable
- **500 Error**: Check CFB API key and database connection
- **No updates**: Verify football season dates and game availability

## 🎉 Success Indicators

You'll know it's working when you see:
- ✅ Live scores updating during games
- ✅ Automatic point calculations after games end
- ✅ Week progression happening automatically
- ✅ Logs showing successful sync operations

## 📞 Support

If you need help:
1. Check Vercel function logs
2. Test the endpoints manually
3. Verify environment variables are set
4. Check CFB API rate limits

---

**🚀 You're all set!** Your app will now automatically sync live scores during football season with smart scheduling based on game days.