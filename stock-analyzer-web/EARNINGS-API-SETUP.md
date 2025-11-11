# Earnings Data API Setup Guide

This document explains how to configure earnings data APIs for the Stock Analyzer application.

## Overview

The application now supports **three earnings data providers** with automatic fallback:

1. **EODHD** (Primary - Most comprehensive)
2. **API Ninjas** (Secondary - Good free tier)
3. **Financial Modeling Prep** (Tertiary - Backup option)

## Why Multiple Providers?

- **Reliability**: If one API is down or rate-limited, the system automatically tries the next
- **Data Coverage**: Different APIs may have better data for different stocks
- **Cost Optimization**: Use free tiers efficiently by spreading load across providers

## API Provider Details

### 1. EODHD (Recommended Primary)

**Website**: https://eodhd.com/
**Registration**: https://eodhd.com/register
**Pricing**: Free tier available (no credit card required)

**Features**:
- Report date and fiscal period end date
- Actual EPS vs Estimate
- Surprise percentage
- Before/After market timing
- 5+ years of historical data
- Global coverage

**Free Tier Limits**:
- API calls per day (check current limits on their website)
- No credit card required for signup

**API Key Location**: After registration, find your API token in the dashboard

**Environment Variable**:
```bash
export EODHD_API_KEY="your_api_token_here"
```

### 2. API Ninjas (Recommended Secondary)

**Website**: https://api-ninjas.com/
**Registration**: https://api-ninjas.com/register
**Pricing**: Free tier available

**Features**:
- Earnings announcement dates
- Actual EPS vs Estimated EPS
- Actual Revenue vs Estimated Revenue
- Simple, fast API

**Free Tier Limits**:
- 10,000 requests per month (check current limits)

**API Key Location**: Dashboard after registration

**Environment Variable**:
```bash
export API_NINJAS_KEY="your_api_key_here"
```

### 3. Financial Modeling Prep (Backup)

**Website**: https://financialmodelingprep.com/
**Registration**: https://site.financialmodelingprep.com/register
**Pricing**: Free tier available

**Features**:
- Historical earnings calendar
- EPS actual vs estimated
- Fiscal quarter and year data
- Up to 100 records per request

**Free Tier Limits**:
- 250 requests per day (check current limits)

**API Key Location**: Dashboard after registration

**Environment Variable**:
```bash
export FMP_API_KEY="your_api_key_here"
```

## Setup Instructions

### Step 1: Register for API Keys

Choose at least one provider (EODHD recommended):

1. Visit the provider's website
2. Create a free account (no credit card required for most)
3. Copy your API key/token from the dashboard

### Step 2: Configure Environment Variables

Add the API keys to your `~/keys.sh` file:

```bash
# Add to ~/keys.sh
export EODHD_API_KEY="your_eodhd_api_token"
export API_NINJAS_KEY="your_api_ninjas_key"
export FMP_API_KEY="your_fmp_api_key"
```

Then reload:
```bash
source ~/keys.sh
```

### Step 3: Test the Configuration

Test earnings fetching for a stock:

```bash
cd /home/junior/src/fibonacci/stock-analyzer-web
node fetch-earnings.js NVDA
```

Expected output:
```
Fetching earnings data for NVDA...
  Trying EODHD for NVDA...
✓ Successfully fetched 20 earnings records from EODHD
✓ Saved earnings data to database for NVDA

=== Summary ===
  Total: 20
  Beats: 15
  Misses: 3
  Meets: 2
  Avg Surprise: 5.23%

  First: 2020-01-31 (Q4 2020)
  Last: 2025-10-31 (Q3 2025)
```

### Step 4: Restart the Server

Restart the web server to pick up the new environment variables:

```bash
lsof -ti:7070 | xargs -r kill -9
node server.js &
```

## How It Works

### Automatic Fallback

When you click on a stock in the autocomplete:

1. System checks if earnings data exists in database
2. If not, tries EODHD API first
3. If EODHD fails, tries API Ninjas
4. If API Ninjas fails, tries Financial Modeling Prep
5. First successful response is saved to database
6. Purple highlight appears in sidebar/autocomplete

### Manual Fetching

You can manually fetch earnings for any stock:

```bash
# Fetch and save to database
node fetch-earnings.js TSLA

# Fetch multiple stocks
node fetch-earnings.js AAPL
node fetch-earnings.js NVDA
node fetch-earnings.js MSFT
```

## Data Schema

The earnings data is transformed to a consistent format:

```javascript
{
  period: "2025-09-30",        // Fiscal period end date
  quarter: 4,                   // Quarter number (1-4)
  year: 2025,                   // Year
  actual: 1.85,                 // Actual EPS reported
  estimate: 1.73,               // Analyst consensus estimate
  surprise: 0.12,               // Difference (actual - estimate)
  surprisePercent: 6.9,         // Surprise as percentage
  reportDate: "2025-10-30"      // Date earnings were announced
}
```

## API Comparison

| Feature | EODHD | API Ninjas | FMP |
|---------|-------|------------|-----|
| Free Tier | Yes | Yes | Yes |
| Historical Data | 5+ years | Limited | 5+ years |
| Report Date | ✓ | ✓ | ✓ |
| Fiscal Period | ✓ | ~ | ✓ |
| Before/After Market | ✓ | ✗ | ✗ |
| Revenue Data | ✗ | ✓ | ✗ |
| Requests/Day | Good | 333/day | 250/day |
| Global Coverage | ✓ | ✓ | ✓ |

## Troubleshooting

### "All providers failed"

- Check that at least one API key is configured
- Verify API keys are valid (test on provider's website)
- Check rate limits haven't been exceeded
- Ensure `~/keys.sh` has been sourced: `source ~/keys.sh`

### "No earnings data available"

- Stock may not have earnings data in the API
- Try a different stock symbol
- Verify stock symbol is correct (must be exact ticker)

### Purple highlight not showing

- Earnings data must be successfully fetched and saved
- Reload the page after fetching earnings
- Check browser console for errors
- Verify data in database: `curl "http://localhost:7070/api/get-earnings?symbol=NVDA"`

## Recommended Setup

For best results, configure at least EODHD:

```bash
# Minimal setup (EODHD only)
export EODHD_API_KEY="your_token"

# Recommended setup (EODHD + API Ninjas for fallback)
export EODHD_API_KEY="your_token"
export API_NINJAS_KEY="your_key"

# Maximum reliability (all three)
export EODHD_API_KEY="your_token"
export API_NINJAS_KEY="your_key"
export FMP_API_KEY="your_key"
```

## Next Steps

After setup:

1. Test with NVDA: `node fetch-earnings.js NVDA`
2. Restart server
3. Open web app and search for NVDA
4. NVDA should show purple highlight (has earnings data)
5. Click NVDA to view earnings chart and table

## Support

If you encounter issues:
- Check the server logs for detailed error messages
- Test API keys directly with curl
- Verify environment variables are set: `echo $EODHD_API_KEY`
