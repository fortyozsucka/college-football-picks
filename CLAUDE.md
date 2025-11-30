# College Football Picks App - Cool Feature Ideas

## Current App Status
This is a college football picks app with:
- User authentication & invite-only registration
- Weekly picks system (5 picks max, 1 double-down required)
- Real-time leaderboard with detailed statistics
- Game management with CFB API integration
- Special game rules (Championship, Bowl, Playoff games)
- Mobile-optimized responsive design
- Email notifications system
- **🔔 Web Push Notifications system (ACTIVE!)**
- **💰 Side Bets System (ACTIVE!)** - Challenge friends with custom bets
- **🌙 Full Dark Mode Support (ACTIVE!)** - Seamless light/dark theme switching
- **⚙️ User Settings & Profiles (ACTIVE!)** - Notification preferences and Venmo integration
- **📊 Historical Analysis (ACTIVE!)** - Week-by-week performance tracking
- Admin panel for user/invite management

## 🎯 **Interactive Features**
- **Live Game Chat** - Real-time commenting during games with emoji reactions
- **Pick Confidence System** - Rank your 5 picks from 1-5 instead of just one double-down
- **Achievements & Badges** - "Perfect Week", "Underdog Specialist", "Clutch Performer" 
- **Trash Talk Board** - Weekly smack talk between players with moderation
- **Pick Streaks Tracker** - Highlight winning/losing streaks visually

## 📊 **Enhanced Analytics** 
- **Advanced Stats Dashboard** - Team performance against spreads, betting trends
- **Pick Heatmaps** - Visual map showing which teams/conferences you pick most
- **Predictive Analytics** - AI suggestions based on your picking patterns
- **Historical Performance** - Compare this season to previous seasons
- **Weekly Breakdown Charts** - Visual performance trends over time

## 🏆 **Gamification**
- **Multiple Leagues** - Create different groups (work, friends, family)
- **✅ Side Bets** - Mini-challenges between specific users (IMPLEMENTED!)
- **Season-Long Props** - Pick season winners, playoff teams, etc.
- **Weekly MVP** - Award best performer each week
- **Draft System** - Snake draft to pick your 5 teams for the season

## 📱 **User Experience** 
- **✅ Push Notifications** - Game start alerts, result updates, weekly summaries (IMPLEMENTED!)
- **✅ Dark Mode Theme** - Full dark mode with responsive text colors (IMPLEMENTED!)
- **Quick Pick Mode** - Swipe interface for rapid picking
- **Pick Templates** - Save favorite picking strategies
- **Voice Picks** - "Hey app, double down on Alabama"

## 🔮 **Advanced Features**
- **Live Odds Integration** - Show real-time betting lines from multiple sources
- **Weather Integration** - Show game conditions for outdoor games
- **Injury Reports** - Key player status updates
- **Expert Picks Comparison** - See how you stack up against ESPN analysts
- **Export Data** - Season recap PDFs, CSV downloads for analysis

## 🎪 **Social & Fun**
- **Photo Picks** - Upload game day photos with your picks
- **Lucky Charms** - Virtual good luck items players can "use"
- **Pick Explanations** - Optional reasoning for each pick
- **Rivalry Tracker** - Special scoring for rivalry games
- **Bowl Pick'em** - Separate bracket-style tournament for bowl season

## High Priority Next Steps (from ChakraPage.tsx)
1. **Automated Game Syncing** - Cron jobs for game updates and point calculation
2. **Production Security** - Rate limiting, CORS, input validation
3. **Performance Optimization** - Caching and database optimization
4. **User Experience Polish** - Loading states, error handling, confirmations

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run linting
- `npx prisma generate` - Generate Prisma client
- `npx prisma migrate deploy` - Deploy database migrations
- `node scripts/generate-vapid-keys.js` - Generate VAPID keys for push notifications

## Push Notifications Setup
1. **Generate VAPID Keys**: Run `node scripts/generate-vapid-keys.js`
2. **Add to Environment**: Copy keys to `.env` file
3. **Database Migration**: Run `npx prisma migrate deploy` in production
4. **Cron Jobs**: Set up `/api/cron/notifications` to run every 15 minutes
5. **Service Worker**: Automatically registered at `/sw.js`

### Notification Types Implemented
- 🏈 Game start reminders (30 min before)
- ⏰ Pick deadline warnings (2 hours before week starts)  
- 🎉 Game result notifications (win/loss alerts)
- 📊 Weekly recap summaries
- 🏆 Leaderboard position changes
- ⭐ Achievement notifications (perfect weeks)

### API Endpoints Added
- `POST /api/push/subscribe` - Subscribe to push notifications
- `DELETE /api/push/subscribe` - Unsubscribe from push notifications
- `GET/PUT /api/notifications/preferences` - Manage notification settings
- `POST /api/notifications/send` - Send manual notifications (admin)
- `GET /api/cron/notifications` - Automated notification cron job

## 💰 Side Bets System (IMPLEMENTED!)
A complete side betting system allowing users to create custom challenges with friends:

### Features Implemented
- **Custom Bet Creation** - Propose spread or over/under bets with custom lines
- **Bet Management** - Accept, cancel, or withdraw from bets before games start
- **Multiple Acceptors** - Allow multiple people to accept the same bet
- **Real-time Resolution** - Automatic bet resolution when games complete
- **Payment Tracking** - Track wins/losses and payment status with Venmo integration
- **Statistics** - Comprehensive side bet performance tracking
- **Smart Totals** - Total value excludes cancelled/unaccepted bets

### Side Bet API Endpoints
- `GET/POST /api/sidebets` - List and create side bets
- `GET/DELETE /api/sidebets/[id]` - Get/cancel specific side bet
- `POST/DELETE /api/sidebets/[id]/accept` - Accept/withdraw from side bet
- `POST /api/sidebets/[id]/paid` - Mark bet as paid
- `GET /api/users/[id]/sidebet-stats` - Get user side bet statistics
- `GET /api/sidebets/cleanup` - Clean up expired bets (cron job)

## 🌙 Dark Mode Support (IMPLEMENTED!)
Full dark mode theming with:
- **Responsive Colors** - All text adapts to light/dark themes
- **Gradient Headers** - Color-mode aware title gradients
- **Component Theming** - Cards, backgrounds, and borders adapt automatically
- **Accessibility** - Proper contrast ratios in both modes
- **System Detection** - Automatically follows system preference

## ⚙️ Enhanced User Experience (IMPLEMENTED!)
- **Settings Page** - Centralized user preferences and profile management
- **Notification Controls** - Granular control over push notification types
- **Profile Management** - Name and Venmo handle configuration
- **Historical Views** - Browse picks and performance by week
- **Mobile Optimization** - Fully responsive across all device sizes

## Tech Stack
- Next.js 14 with TypeScript
- Chakra UI for components
- Prisma with PostgreSQL
- Authentication with JWT
- Email with Resend
- Deployed on Railway