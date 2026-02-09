# Testing Guide - Healthy App

## Prerequisites

1. **PostgreSQL running**:
   ```bash
   docker compose up -d postgres
   ```

2. **Environment variables set** (`.env.local`):
   ```bash
   DATABASE_URL="postgresql://healthyapp:dev_password_change_in_prod@localhost:5432/healthyapp"
   USDA_API_KEY="your-api-key-here"  # Get from https://fdc.nal.usda.gov/api-key-signup.html
   ```

3. **Dev server running**:
   ```bash
   npm run dev
   ```

---

## Phase 1 Tests: Database Setup

### 1. Health Check Endpoint
```bash
curl http://localhost:3000/api/health | python3 -m json.tool
```

**Expected response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2026-02-09T..."
  }
}
```

### 2. Database Tables
```bash
docker exec -it healthy-app-postgres-1 psql -U healthyapp -d healthyapp -c "\dt"
```

**Expected output**: 5 tables (User, Meal, FoodItem, MealFoodItem, ProgressPhoto)

---

## Phase 2 Tests: USDA API Integration

### 1. Search for Chicken Breast
```bash
curl "http://localhost:3000/api/nutrition/search?query=chicken%20breast&limit=3" | python3 -m json.tool
```

**Expected response**:
```json
{
  "success": true,
  "data": {
    "query": "chicken breast",
    "foods": [
      {
        "fdcId": 171477,
        "description": "Chicken, broilers or fryers, breast, meat only, raw",
        "dataType": "SR Legacy",
        "brandOwner": null,
        "servingSize": 100,
        "servingSizeUnit": "g",
        "nutrition": {
          "calories": 120,
          "protein": 22.5,
          "carbs": 0,
          "fat": 2.6,
          "fiber": 0,
          "sugar": 0,
          "sodium": 63
        },
        "cached": false
      }
    ]
  },
  "meta": {
    "total": 1523,
    "count": 3
  }
}
```

### 2. Search for Banana (Test Caching)
```bash
# First search (fresh from API)
curl "http://localhost:3000/api/nutrition/search?query=banana&limit=2" | python3 -m json.tool

# Second search (should be cached)
curl "http://localhost:3000/api/nutrition/search?query=banana&limit=2" | python3 -m json.tool
```

**Check**: Second response should show `"cached": true`

### 3. Search with Invalid Query
```bash
curl "http://localhost:3000/api/nutrition/search" | python3 -m json.tool
```

**Expected response**:
```json
{
  "success": false,
  "error": "Validation error: Search query is required"
}
```

### 4. Test Without API Key
Remove `USDA_API_KEY` from `.env.local` temporarily and restart server:

```bash
curl "http://localhost:3000/api/nutrition/search?query=chicken" | python3 -m json.tool
```

**Expected response**:
```json
{
  "success": false,
  "error": "Failed to search and cache foods: USDA API key is required. Get a free key at https://fdc.nal.usda.gov/api-key-signup.html and add it to your .env.local file as USDA_API_KEY"
}
```

---

## Database Inspection

### Check Cached Foods
```bash
docker exec -it healthy-app-postgres-1 psql -U healthyapp -d healthyapp -c "SELECT fdcId, description, calories, protein FROM \"FoodItem\" LIMIT 5;"
```

### Count Total Cached Items
```bash
docker exec -it healthy-app-postgres-1 psql -U healthyapp -d healthyapp -c "SELECT COUNT(*) FROM \"FoodItem\";"
```

---

## Common Issues

### Port 3000 in Use
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Database Connection Error
```bash
# Check if postgres is running
docker compose ps

# Restart postgres
docker compose restart postgres

# Check logs
docker compose logs postgres
```

### USDA API Rate Limit
- Free tier: 1000 requests/hour
- If you hit the limit, cached results will still work
- Wait an hour or get a paid plan for higher limits

---

## Test Nutrition Calculator (Manual)

Open Node REPL:
```bash
node
```

```javascript
// Test serving size conversion
const { convertToGrams } = require('./src/lib/nutrition-calculator.ts');

// Should return 240 (1 cup = 240g)
console.log(convertToGrams(1, 'cup'));

// Should return 30 (1 oz = 28.35g, rounded)
console.log(convertToGrams(1, 'oz'));

// Should return 15 (1 tbsp = 15g)
console.log(convertToGrams(1, 'tablespoon'));
```

---

## Success Criteria

✅ Health check returns "healthy"
✅ Database has 5 tables
✅ USDA search returns food items with nutrition data
✅ Second search shows cached results
✅ Invalid queries return validation errors
✅ Missing API key shows helpful error message
✅ Foods are saved to FoodItem table

---

## Next Steps

After testing Phase 1 & 2:
- Review code in VS Code
- Read through implementation details
- When ready, continue with **Phase 3: OpenAI Vision API**

---

**Quick Commands Reference**:

```bash
# Start everything
docker compose up -d postgres && npm run dev

# Stop everything
docker compose down && pkill -f "next dev"

# View logs
docker compose logs -f postgres
tail -f /tmp/next-dev.log

# Database shell
docker exec -it healthy-app-postgres-1 psql -U healthyapp -d healthyapp

# Reset database (careful!)
docker compose down -v
docker compose up -d postgres
npx prisma migrate dev
```
