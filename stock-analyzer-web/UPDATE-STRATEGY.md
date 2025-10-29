# Stock Data Update Strategy

## API Rate Limits (Free Tier)

### Finnhub Free Tier
- **Rate Limit:** 60 calls/minute, 30 calls/second
- **Daily Data:** ❌ NOT available on free tier (requires paid plan)
- **Company Overview:** ✅ Available (profile2 endpoint)
- **Quote Data:** ✅ Available (real-time quote)
- **Financial Statements:** ✅ Available (financials-reported endpoint)

### Alpha Vantage Free Tier
- **Rate Limit:** 5 calls/minute, 25 calls/day (strict)
- **Daily Data:** ✅ Available (TIME_SERIES_DAILY)
- **Company Overview:** ✅ Available (OVERVIEW)
- **Income Statements:** ✅ Available (INCOME_STATEMENT)

## Update Strategy

### Priority System

**Priority 1: Currently Displayed Stock (Immediate)**
- Update when user explicitly loads a stock
- Use whatever API calls needed
- Budget: Unlimited (user-initiated)

**Priority 2: Visible Holdings (High)**
- Stocks currently shown on chart
- Individual stocks from hedge fund holdings
- Active sector/subsector constituents
- Budget: Up to 50 calls/day

**Priority 3: Loaded but Hidden (Medium)**
- Stocks loaded but not currently visible
- Update once per day during off-hours
- Budget: Up to 20 calls/day

**Priority 4: All Loaded Stocks (Low)**
- Background updates for all stocks in database
- Update once per week
- Budget: Remaining calls

### Update Frequency by Data Type

**Daily Price Data (Most Important)**
- Update: Once per trading day after market close (4:30 PM ET)
- API: Alpha Vantage (primary for historical), Finnhub quote (for latest price only)
- Strategy: Incremental updates - only fetch missing days, not full history

**Company Overview**
- Update: Once per quarter after earnings
- API: Finnhub (primary), Alpha Vantage (backup)
- Strategy: Cache for 90 days

**Income Statements**
- Update: Once per quarter after earnings
- API: Finnhub (primary), Alpha Vantage (backup)
- Strategy: Only fetch if new quarterly data available

## Implementation Phases

### Phase 1: Smart Incremental Updates (Immediate)
- Track last update timestamp for each stock
- Only fetch data newer than last update
- Save API calls by not refetching entire history

### Phase 2: Batch Update Queue (Near-term)
- Queue system for pending updates
- Process queue with rate limit awareness
- Prioritize by: displayed > active > loaded
- Spread updates throughout the day

### Phase 3: Scheduled Background Updates (Future)
- Daily job: Update all Priority 1-2 stocks after market close
- Weekly job: Update all Priority 3-4 stocks
- Quarterly job: Refresh company fundamentals

### Phase 4: User Controls (Future)
- Manual "Refresh" button per stock
- "Update All Visible" button
- Progress indicator showing update status
- Setting to enable/disable auto-updates

## Rate Limit Management

### Finnhub Strategy
- **Quote API:** Use for latest price only (lightweight, 60/min)
- **Profile:** Use for company overview (lightweight, 60/min)
- **Financials:** Use for income statements (medium weight, 60/min)
- **Candles:** NOT AVAILABLE on free tier

### Alpha Vantage Strategy (Critical - Only 5/min, 25/day)
- **Reserve for daily price data only** (most important)
- Use compact format when possible (last 100 days)
- Only use full format for new stocks
- Track daily quota carefully
- Spread across 24 hours: ~1 call per hour

### Fallback Chain
1. Try database first (always)
2. Try Finnhub (if applicable endpoint)
3. Fall back to Alpha Vantage (preserve quota)
4. Fail gracefully with user notification

## Cost-Benefit Analysis

### What to Update Most Frequently
✅ **Daily price data** - Core functionality, Alpha Vantage
✅ **Latest quote** - Real-time context, Finnhub
✅ **Visible stocks** - Active user focus

### What to Update Less Frequently
⚠️ **Hidden stocks** - Lower priority
⚠️ **Company overview** - Changes quarterly
⚠️ **Income statements** - Changes quarterly

### What NOT to Update
❌ **Full historical refetch** - Wasteful, data doesn't change
❌ **Intraday data** - Not critical for this use case
❌ **Stocks never viewed** - Zero user value

## Implementation Details

### Database Schema Addition
```sql
CREATE TABLE IF NOT EXISTS update_tracking (
    symbol TEXT PRIMARY KEY,
    last_daily_update DATETIME,
    last_overview_update DATETIME,
    last_financials_update DATETIME,
    update_priority INTEGER DEFAULT 3,
    failed_attempts INTEGER DEFAULT 0,
    last_error TEXT
);
```

### Update Queue Structure
```javascript
{
    symbol: 'AAPL',
    updateType: 'daily' | 'overview' | 'financials',
    priority: 1-4,
    scheduledTime: Date,
    retryCount: 0,
    maxRetries: 3
}
```

### Rate Limiter Enhancement
- Track daily quotas in addition to per-minute
- Persist quota usage to database/localStorage
- Reset quotas at appropriate times
- Warn user when approaching limits

## User Experience

### Visual Indicators
- 🔴 Red dot: Data stale (>24 hours old)
- 🟡 Yellow dot: Update in progress
- 🟢 Green dot: Data fresh (<4 hours old)
- 📅 Show last update timestamp on hover

### Update Controls
- **Auto Update Toggle:** Enable/disable automatic updates
- **Update Now Button:** Force immediate update (deducts from quota)
- **Update Schedule:** Choose update times (market close, overnight, etc.)
- **Quota Display:** Show remaining API calls for the day

### Notifications
- Toast when updates complete
- Warning when approaching rate limits
- Error messages with retry options
- Success summary: "Updated 15 stocks"

## Best Practices

1. **Always check database first** - Most requests should hit cache
2. **Batch updates intelligently** - Group by priority, time
3. **Respect rate limits strictly** - Better slow than blocked
4. **Track failures** - Exponential backoff for problem stocks
5. **User feedback** - Always show what's happening
6. **Fail gracefully** - Continue with partial updates
7. **Quota awareness** - Warn before exhausting limits

## Example Daily Schedule

**6:00 AM:** Check for new quarterly earnings (5 calls max)
**4:30 PM:** Update Priority 1-2 stocks (20 Alpha Vantage calls)
**6:00 PM:** Update Priority 3 stocks (5 Alpha Vantage calls)
**11:00 PM:** Background updates if quota remains

**Total:** ~25 Alpha Vantage calls/day (at limit)
**Total:** ~500 Finnhub calls/day (well under limit)
