# Deploy to Render.com

Complete guide to deploy your Healthy App to Render using Docker.

---

## 🚀 Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub**: Push your code to GitHub
3. **Anthropic API Key**: Get from [console.anthropic.com](https://console.anthropic.com)

---

## 📋 Quick Deploy (3 Steps)

### Step 1: Push Code to GitHub

```bash
# Make sure all changes are committed
git add -A
git commit -m "feat: prepare for Render deployment"
git push origin main
```

### Step 2: Connect to Render

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Select repository: `lycanlancelot/McCoach`
5. Path: `healthy-app`
6. Render will auto-detect `render.yaml`

### Step 3: Add API Keys

1. After blueprint deploys, go to **healthy-app** service
2. Click **"Environment"** tab
3. Add `ANTHROPIC_API_KEY`:
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-...` (your key)
4. Click **"Save Changes"**
5. Service will auto-redeploy

**Done!** 🎉 Your app is live!

---

## 🔧 Configuration Details

### What Gets Deployed

| Resource | Type | Plan | Cost |
|----------|------|------|------|
| **healthy-app** | Web Service (Docker) | Starter | $7/mo |
| **healthy-app-db** | PostgreSQL | Free | $0/mo |

**Total**: ~$7/month

### Architecture

```
Internet → Render Load Balancer → Docker Container (Next.js) → PostgreSQL
```

---

## 🌍 Environment Variables

### Required

| Variable | Value | Set By |
|----------|-------|--------|
| `DATABASE_URL` | `postgresql://...` | Auto (Render) |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Manual (You) |

### Optional

| Variable | Value | Default |
|----------|-------|---------|
| `USDA_API_KEY` | Your USDA key | Empty |
| `CLAUDE_MODEL` | Model name | `claude-sonnet-4-20250514` |
| `NODE_ENV` | Environment | `production` |

### How to Add/Update

1. Go to your service in Render Dashboard
2. Click **"Environment"** tab
3. Add or edit variables
4. Click **"Save Changes"** (triggers redeploy)

---

## 🗄️ Database Setup

### Automatic Migration

Migrations run automatically on each deploy via `render-build` script:

```json
{
  "scripts": {
    "render-build": "npx prisma generate && npx prisma migrate deploy && npm run build"
  }
}
```

### Manual Database Access

**Via Render Dashboard**:
1. Go to **healthy-app-db**
2. Click **"Connect"** → **"External Connection"**
3. Copy connection string
4. Use with `psql`:

```bash
psql "postgresql://..."
```

**Via Prisma Studio** (local):
```bash
# Set DATABASE_URL from Render
export DATABASE_URL="postgresql://..."

# Open Prisma Studio
npm run db:studio
```

---

## 📦 Dockerfile Explained

Our `Dockerfile` uses multi-stage builds:

```dockerfile
FROM node:22-alpine AS base
# ↓
FROM base AS deps          # Install dependencies
# ↓
FROM base AS builder       # Build Next.js
# ↓
FROM base AS runner        # Production image
```

**Benefits**:
- Small image size (~150MB)
- Fast builds (layer caching)
- Secure (runs as non-root user)

---

## 🔄 Deployment Workflow

### Automatic Deploys

Every push to `main` triggers:

1. **Build**: Docker image built
2. **Migrate**: `render-build` runs migrations
3. **Deploy**: New container starts
4. **Health Check**: `/api/health` verified
5. **Live**: Traffic switched to new version

### Manual Deploy

```bash
# Option 1: Push to GitHub
git push origin main

# Option 2: Manual deploy in Dashboard
# Go to service → Click "Manual Deploy" → Select branch
```

---

## 🧪 Testing Before Deploy

### Local Docker Test

```bash
# Build production image
docker build -t healthy-app .

# Run with environment
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  healthy-app

# Test
curl http://localhost:3000/api/health
```

### Check Build Logs

After deploy in Render:
1. Go to your service
2. Click **"Logs"** tab
3. Check for errors

---

## 🔍 Monitoring & Debugging

### Health Check

Render automatically pings `/api/health` every 30 seconds.

**Check manually**:
```bash
curl https://your-app.onrender.com/api/health
```

**Expected response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2026-02-10T..."
  }
}
```

### View Logs

```bash
# Real-time logs in Dashboard
# Or use Render CLI
render logs -f healthy-app
```

### Common Issues

**Issue**: `ANTHROPIC_API_KEY not found`
- **Fix**: Add key in Environment tab

**Issue**: Database connection fails
- **Fix**: Check DATABASE_URL is set correctly
- Verify database service is running

**Issue**: Build fails
- **Fix**: Check build logs
- Run `npm run render-build` locally first

---

## 💰 Cost Optimization

### Free Tier Option

```yaml
services:
  - type: web
    plan: free  # Free but sleeps after 15min inactivity
```

**Limitations**:
- Spins down after 15min inactivity
- 750 hours/month
- Slower cold starts

### Paid Options

| Plan | RAM | CPU | Cost |
|------|-----|-----|------|
| **Starter** | 512MB | 0.5 | $7/mo |
| **Standard** | 2GB | 1.0 | $25/mo |
| **Pro** | 4GB | 2.0 | $85/mo |

**Recommendation**: Start with **Starter** ($7/mo)

### Database Plans

| Plan | Storage | Connections | Cost |
|------|---------|-------------|------|
| **Free** | 1GB | 97 | $0/mo |
| **Starter** | 10GB | 250 | $7/mo |
| **Standard** | 25GB | 500 | $20/mo |

**Recommendation**: **Free** for dev, **Starter** for production

---

## 🔐 Security

### Environment Variables

- ✅ Stored encrypted at rest
- ✅ Only accessible by your services
- ✅ Not logged or exposed

### Database

- ✅ Encrypted connections (TLS)
- ✅ Automatic backups (paid plans)
- ✅ Isolated per project

### Best Practices

```bash
# ✅ DO: Use environment variables
ANTHROPIC_API_KEY=sk-ant-...

# ❌ DON'T: Hardcode secrets
const apiKey = "sk-ant-abc123"
```

---

## 📈 Scaling

### Horizontal Scaling

Render automatically scales your app:

```yaml
services:
  - type: web
    plan: standard
    autoDeploy: true
    scaling:
      minInstances: 1
      maxInstances: 10
```

### Database Scaling

Upgrade plan in Dashboard:
1. Go to **healthy-app-db**
2. Click **"Settings"**
3. Change **"Plan"**
4. Confirm (no downtime)

---

## 🔄 Update Deployment

### Change Configuration

Edit `render.yaml`:

```yaml
services:
  - type: web
    plan: standard  # Upgraded from starter
    region: frankfurt  # Changed region
```

Push changes:
```bash
git add render.yaml
git commit -m "chore: upgrade to standard plan"
git push origin main
```

### Update Dependencies

```bash
# Update packages
npm update

# Commit
git add package*.json
git commit -m "chore: update dependencies"
git push origin main
```

---

## 🧹 Troubleshooting

### Reset Database

**⚠️ WARNING: This deletes all data!**

```bash
# Method 1: Via Render Dashboard
# 1. Go to healthy-app-db
# 2. Settings → Delete Database
# 3. Recreate from blueprint

# Method 2: Drop and recreate tables
export DATABASE_URL="postgresql://..."
npx prisma migrate reset
```

### Force Rebuild

```bash
# Clear build cache
# Dashboard → Service → Settings → Advanced → Clear build cache
# Then: Manual Deploy → Deploy latest commit
```

### Check Service Status

```bash
# Install Render CLI
npm install -g @render/cli

# Login
render login

# Check status
render services list
render logs healthy-app
```

---

## 📞 Support

- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Render Community**: [community.render.com](https://community.render.com)
- **Status Page**: [status.render.com](https://status.render.com)

---

## ✅ Deployment Checklist

Before deploying:

- [ ] All code committed and pushed to GitHub
- [ ] `render.yaml` configured correctly
- [ ] Dockerfile exists and builds locally
- [ ] Environment variables documented
- [ ] Database migrations tested locally
- [ ] Health check endpoint works
- [ ] Got Anthropic API key ready

After deploying:

- [ ] Service shows "Live" status
- [ ] Health check passes
- [ ] Database connected
- [ ] Can upload and analyze meals
- [ ] All API endpoints work
- [ ] No errors in logs

---

## 🎉 You're Live!

Your app is now deployed at:
```
https://healthy-app-[random].onrender.com
```

**Next steps**:
1. Test the analyze page: `/analyze`
2. Set up custom domain (optional)
3. Monitor logs and metrics
4. Share with users!

---

**Need help?** Check logs first, then consult Render docs or open an issue.

**Happy deploying!** 🚀
