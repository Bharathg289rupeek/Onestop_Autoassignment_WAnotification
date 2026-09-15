# Lead Assignment System v2 — Railway + PostgreSQL

## What Changed from v1

| v1 (Cloud Functions + Sheets) | v2 (Railway + PostgreSQL) |
|---|---|
| 3 separate Cloud Functions | Single Express server |
| Google Sheets as DB | PostgreSQL |
| Agent table: branch_id + priority only | Agent table: branch_id, city, pincode, priority, city_identifier, pincode_identifier |
| Assignment always by branch_id | Assignment always by pincode, round robin |
| No CSV upload | CSV upload replaces all agents |
| Cloud Scheduler | Railway cron or external cron |

---

## Assignment Logic — Pincode Only, Round Robin

Assignment is driven by **pincode and nothing else**. `branch_id` and `city` are
still stored on the lead and the agent for reference, but they no longer affect
who gets the lead.

### The rules

1. **No pincode on the lead → do not assign.**
2. **No assignable agent in that pincode → do not assign.**
3. Otherwise, pick the next agent in that pincode's **round-robin rotation**.

An agent is *assignable* for a pincode when all three hold:

| Condition | Column |
|---|---|
| Pincode matches the lead (whitespace-trimmed) | `pincode` |
| Agent opted in to pincode assignment | `pincode_identifier = 'assign'` |
| Agent is active | `is_active = true` |

### How the rotation works

Each agent carries `last_assigned_at` and `assign_count`. The next lead goes to
the **least-recently-assigned** assignable agent in the pincode; ties break on
`assign_count`, then `priority`, then `id`.

- Load spreads evenly instead of always hitting the P1 agent.
- A newly added agent has `last_assigned_at = NULL`, so they sort first and join
  the rotation immediately.
- Deactivating an agent or flipping them to `dont assign` drops them out with no
  other change needed.
- `priority` is now only a tiebreaker, not the selector.

Claims are serialised per pincode with a Postgres transaction-scoped advisory
lock, so a burst of simultaneous webhooks for the same pincode is queued rather
than double-booking one agent or being wrongly reported as "no agent".

### Unassigned leads are still recorded

A lead that cannot be assigned is **saved anyway** with a status explaining why,
so it shows up in the dashboard instead of vanishing into the logs:

| Situation | `lead_status` | Response `reason` |
|---|---|---|
| Lead had no pincode | `Unassigned - No Pincode` | `NO_PINCODE` |
| Nobody assignable in that pincode | `Unassigned - No Agent In Pincode` | `NO_AGENT_IN_PINCODE` |

These rows get `whatsapp_p0_status = 'Skipped'` and `activity_checked = true`, so
the reassignment cron leaves them alone. The webhook returns HTTP **200** with
`data.assigned = false` (it previously returned 422 and stored nothing) — a lead
that simply has no agent is not a caller error, and returning 200 stops upstream
systems from retrying it forever.

### Reassignment

Unchanged in timing, but it now stays **inside the same pincode**: after
`REASSIGN_DELAY_MINUTES` with no call activity, the lead moves to the next agent
in that pincode's rotation, skipping the current one. If that pincode has only
one assignable agent, there is no backup and the lead is marked
`No Backup Agent`.

### Example

Agents:

| email | pincode | priority | pin_id | active |
|---|---|---|---|---|
| a@x.com | 560001 | 1 | assign | yes |
| b@x.com | 560001 | 2 | assign | yes |
| d@x.com | 560001 | 1 | dont assign | yes |
| f@x.com | 570001 | 1 | assign | yes |

Incoming leads:

| lead pincode | result |
|---|---|
| 560001 | a@x.com |
| 560001 | b@x.com |
| 560001 | a@x.com (rotation wraps; `d` never participates) |
| 570001 | f@x.com |
| *(blank)* | **not assigned** — `NO_PINCODE` |
| 999999 | **not assigned** — `NO_AGENT_IN_PINCODE` |

### Note on `lead_source_config`

The `assign_by` setting (`branch_id` / `city` / `pincode`) is **no longer used
for matching** — every source now assigns by pincode. The table and its
dashboard tab are kept so existing rows remain visible.

### Forced assignment

Passing `assigned_agent` (an agent email) in the webhook payload still bypasses
the rotation and assigns directly to that agent.

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
  "loan_type": "2",
  "lead_source": "chakra",
  "pincode": "574224",
  "branch_id": "BR001",
  "city": "bangalore"
}
```

Required: `phone`, `name`, `loan_amount`, `loan_type`. **`branch_id` is no longer
required.** `pincode` is what decides assignment — without it the lead is
recorded but never assigned.

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
