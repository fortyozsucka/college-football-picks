# Email Notifications Setup

This application now includes comprehensive email notifications for game results, weekly summaries, and invitations.

## Email Service Provider

We use **Resend** (resend.com) as the email service provider because it's:
- Modern and reliable
- Has a generous free tier (3,000 emails/month)
- Easy to integrate and configure
- Provides excellent deliverability

## Setup Instructions

### 1. Create a Resend Account
1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### 2. Add Your Domain (Production Only)
1. In Resend dashboard, go to "Domains"
2. Add your domain (e.g., `yourdomain.com`)
3. Follow DNS setup instructions to verify domain ownership
4. Update the `fromEmail` in `/lib/email.ts` to use your verified domain

### 3. Get Your API Key
1. In Resend dashboard, go to "API Keys"
2. Create a new API key
3. Copy the API key (starts with `re_`)

### 4. Configure Environment Variables

#### Development (.env)
```bash
RESEND_API_KEY="re_your_actual_api_key_here"
```

#### Production (Railway/Vercel/etc.)
Add the environment variable in your deployment platform:
```bash
RESEND_API_KEY="re_your_actual_api_key_here"
```

## Email Types

### 1. Game Results Notifications
- **Trigger**: When points are calculated after games complete
- **Recipients**: All users who had picks for completed games
- **Content**: Individual game results, points earned, pick accuracy
- **Frequency**: After each batch of games completes

### 2. Weekly Summary Emails
- **Trigger**: Manual via API endpoint `/api/email/weekly-summary`
- **Recipients**: All users with picks for the active week
- **Content**: Weekly performance, ranking, completed games
- **Frequency**: Once per week (manually triggered)

### 3. Invitation Emails
- **Trigger**: When admin creates invite with email address
- **Recipients**: Specified email address
- **Content**: Invitation link, league information, how to join
- **Frequency**: Immediately when invite is created

## API Endpoints

### Test Email Templates
```bash
GET /api/email/test
```
Returns sample email content for all email types. Useful for testing templates.

### Send Weekly Summaries
```bash
POST /api/email/weekly-summary
```
Sends weekly summary emails to all users with picks in the active week.

### Point Calculation (Auto-sends Game Results)
```bash
POST /api/picks/calculate-points
```
Calculates points and automatically sends game result emails.

## Email Safety Features

### Development Mode
- When `RESEND_API_KEY` is not set or is `"re_demo_key_for_development"`
- Emails are logged to console instead of being sent
- No actual emails are delivered
- Useful for testing without sending real emails

### Production Mode
- When valid Resend API key is configured
- Emails are sent to real recipients
- Full email functionality is enabled

## Customization

### Email Templates
Edit templates in `/lib/email.ts`:
- `generateGameResultsEmail()` - Game results notifications
- `generateWeeklySummaryEmail()` - Weekly performance summaries  
- `generateInviteEmail()` - Invitation emails

### Styling
- All emails use inline CSS for maximum email client compatibility
- Color scheme matches the application's design
- Mobile-responsive design
- Dark mode friendly

## Monitoring

### Logs
All email sending attempts are logged with:
- Recipient email address
- Email subject
- Success/failure status
- Error details if failed

### Resend Dashboard
Monitor email delivery, bounces, and opens in the Resend dashboard.

## Troubleshooting

### Emails Not Sending
1. Check `RESEND_API_KEY` is set correctly
2. Verify API key is valid in Resend dashboard
3. Check server logs for error messages
4. Ensure domain is verified (production only)

### Emails Going to Spam
1. Set up SPF, DKIM, and DMARC records (Resend provides these)
2. Use verified domain for sender address
3. Avoid spam trigger words in subject lines
4. Monitor sender reputation in Resend dashboard

### Template Issues
1. Test templates using `/api/email/test` endpoint
2. Check HTML rendering in email clients
3. Verify all template variables are populated correctly

## Future Enhancements

Potential email features to add:
- User email preferences (opt-out options)
- Digest emails for multiple weeks
- Pick reminders before deadlines
- Achievement/milestone notifications
- League standings alerts