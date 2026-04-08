# Lead Assignment System v2 — Railway + PostgreSQL

## What Changed from v1

| v1 (Cloud Functions + Sheets) | v2 (Railway + PostgreSQL) |
|---|---|
| 3 separate Cloud Functions | Single Express server |
| Google Sheets as DB | PostgreSQL |
| Agent table: branch_id + priority only | Agent table: branch_id, city, pincode, priority, city_identifier, pincode_identifier |
| Assignment always by branch_id | Assignment configurable per lead_source |
| No CSV upload | CSV upload replaces all agents |
| Cloud Scheduler | Railway cron or external cron |

---

## Assignment Logic

Each **lead_source** can be configured (via dashboard) to assign leads differently:

| Mode | Matching | Filtering | Ordering |
|---|---|---|---|
| `branch_id` (default) | Agent's `branch_id` = Lead's `branch_id` | All active agents | Lowest `priority` first |
| `city` | Agent's `city` = Lead's `city` | Only `city_identifier = 'assign'` | Lowest `priority` first |
| `pincode` | Agent's `pincode` = Lead's `pincode` | Only `pincode_identifier = 'assign'` | Lowest `priority` first |

**Reassignment** uses the same mode but picks the next-higher priority number agent.

### Example

Agents table:

| branch_id | email | name | priority | city | pincode | city_id | pin_id |
|---|---|---|---|---|---|---|---|
| BR001 | bharath@rupeek.com | Dhruv | 1 | bangalore | 574224 | assign | assign |
| BR001 | ganesh@rupeek.com | Bharath | 2 | bangalore | 574224 | assign | dont assign |
| BR001 | backup@rupeek.com | Backup | 3 | bangalore | 574224 | dont assign | dont assign |

Source config:

| lead_source | assign_by |
|---|---|
| chakra | branch_id |
| website | city |
| partner | pincode |

Results:
- **chakra lead** (branch_id=BR001): Dhruv(P1) → Bharath(P2) → Backup(P3)
- **website lead** (city=bangalore): Dhruv(P1) → Bharath(P2). Backup skipped (city_id=dont assign)
- **partner lead** (pincode=574224): Dhruv(P1) only. Others skipped (pin_id=dont assign)

---

## Setup Guide — GitHub + Railway (Step by Step)

### Prerequisites

- [Node.js 18+](https://nodejs.org/) installed
- [Git](https://git-scm.com/) installed
- [GitHub account](https://github.com)
- [Railway account](https://railway.app) (free tier works)

---

### Step 1: Unzip and Initialize Git

```bash
# Unzip the project
unzip lead-assignment-system-v2.zip
cd lead-system

# Initialize git repo
git init
git add .
git commit -m "Initial commit: lead assignment system v2"
```

### Step 2: Create GitHub Repository

```bash
# Create repo on GitHub (via browser or CLI)
# Go to https://github.com/new and create a new repo (e.g. "lead-assignment-system")
# Then push:

git remote add origin https://github.com/YOUR_USERNAME/lead-assignment-system.git
git branch -M main
git push -u origin main
```

Or using GitHub CLI:
```bash
gh repo create lead-assignment-system --private --source=. --remote=origin --push
```

### Step 3: Create Railway Project

1. Go to [https://railway.app/new](https://railway.app/new)
2. Click **"Deploy from GitHub Repo"**
3. Connect your GitHub account if not already connected
4. Select your **lead-assignment-system** repo
5. Railway will detect Node.js and start deploying

### Step 4: Add PostgreSQL Database

1. In Railway dashboard, click **"+ New"** (top right in your project)
2. Select **"Database"** → **"PostgreSQL"**
3. Railway auto-creates the database and sets `DATABASE_URL` env variable
4. The app will auto-redeploy with database connected

### Step 5: Set Environment Variables

In Railway dashboard → your service → **Variables** tab. Click **"New Variable"** for each:

```
ONESTOP_JWT=your_jwt_token_here
GUPSHUP_API_KEY=your_gupshup_api_key
GUPSHUP_APP_NAME=your_gupshup_app_name
GUPSHUP_SOURCE_NUMBER=917834811114
GUPSHUP_TEMPLATE_ID=22a5b3ed-fee2-4c13-baa0-3e653d3aafec
GUPSHUP_REASSIGN_TEMPLATE_ID=your_reassign_template_id
LEAD_CTA_BASE_URL=https://leadfusion.rupeek.com
REASSIGN_DELAY_MINUTES=10
```

> **Note:** `DATABASE_URL` and `PORT` are set automatically by Railway. Don't add them manually.

### Step 6: Verify Deployment

1. In Railway dashboard, click **"Settings"** → look for **"Public Networking"**
2. Click **"Generate Domain"** to get a public URL like `lead-assignment-system-production.up.railway.app`
3. Visit that URL — you should see the dashboard
4. Test health: `https://YOUR_URL/health`

### Step 7: Upload Agent Data

1. Open dashboard in browser
2. Go to **Agents** tab
3. Click **"Upload CSV"**
4. Upload your agents CSV file

**CSV format:**
```csv
branch_id,agent_email,agent_name,agent_phone,city,pincode,priority,city_identifier,pincode_identifier
BR001,bharath.3647@rupeek.com,Dhruv,9380720423,bangalore,574224,1,assign,assign
BR001,ganesh.shivaji@rupeek.com,Bharath,9380720423,bangalore,574224,2,assign,dont assign
BR001,bharath.3647@rupeek.com,Backup Agent,9380720423,bangalore,574224,3,dont assign,dont assign
```

> **Every CSV upload replaces ALL existing agents.** This is by design — the CSV is the single source of truth.

### Step 8: Configure Lead Sources

1. Go to **Source Config** tab
2. Click **"+ Add Source Config"**
3. Enter source name (e.g. `chakra`) and select assignment mode
4. Repeat for each lead source

### Step 9: Set Up Reassignment Cron

**Option A — Railway Cron Service:**

1. In Railway project, click **"+ New"** → **"Empty Service"**
2. Name it `reassignment-cron`
3. In settings, set **Schedule** to `*/5 * * * *`
4. Set the start command:
   ```
   curl -X POST https://YOUR_APP_URL/api/check-reassignment
   ```

**Option B — cron-job.org (free):**

1. Go to [https://cron-job.org](https://cron-job.org)
2. Create account → "Create Cron Job"
3. URL: `https://YOUR_RAILWAY_URL/api/check-reassignment`
4. Method: `POST`
5. Schedule: every 5 minutes
6. Save

**Option C — GitHub Actions:**

Create `.github/workflows/cron.yml`:
```yaml
name: Reassignment Check
on:
  schedule:
    - cron: '*/5 * * * *'
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST ${{ secrets.APP_URL }}/api/check-reassignment
```

### Step 10: Point Webhook

Update your Chakra/other webhook endpoint to:
```
POST https://YOUR_RAILWAY_URL/api/receive-lead
```

Payload:
```json
{
  "phone": "9876543210",
  "name": "Customer Name",
  "loan_amount": 500000,
  "branch_id": "BR001",
  "loan_type": "2",
  "lead_source": "chakra",
  "city": "bangalore",
  "pincode": "574224"
}
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/receive-lead` | Webhook — receive and assign lead |
| `POST` | `/api/check-reassignment` | Cron — check and reassign inactive |
| `GET` | `/api/stats` | Dashboard stats + all leads |
| `GET` | `/api/logs` | Recent activity logs |
| `GET` | `/api/agents` | List all agents |
| `POST` | `/api/agents` | Add single agent |
| `PUT` | `/api/agents/:id` | Update agent |
| `DELETE` | `/api/agents/:id` | Delete agent |
| `POST` | `/api/agents/upload-csv` | Upload CSV (replaces all agents) |
| `GET` | `/api/agents/download-csv` | Download agents as CSV |
| `GET` | `/api/source-config` | List source configs |
| `POST` | `/api/source-config` | Add/update source config |
| `DELETE` | `/api/source-config/:id` | Delete source config |
| `GET` | `/` | Dashboard UI |
| `GET` | `/health` | Health check |

---

## File Structure

```
lead-system/
├── index.js              # Express server + all routes
├── config.js             # Environment config
├── dashboard.js          # Dashboard HTML (inline)
├── package.json
├── .env.example
├── .gitignore
├── db/
│   ├── index.js          # PG pool + init
│   └── schema.sql        # Table definitions
├── services/
│   ├── database.js       # All DB queries
│   ├── onestop.js        # Onestop API
│   └── whatsapp.js       # Gupshup WhatsApp
└── utils/
    └── helpers.js         # Lead ID generator + CSV parser
```

---

## Future Deployments

After initial setup, any push to `main` auto-deploys on Railway:

```bash
# Make changes...
git add .
git commit -m "description of change"
git push
```

Railway watches the repo and redeploys automatically.
