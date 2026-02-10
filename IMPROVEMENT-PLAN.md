# AI Performance Improvement Plan

## Current Baseline Metrics (v1.0)

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Overall Score** | 35.1% | 60%+ | 🔴 Needs Major Improvement |
| **F1 Score (Food Detection)** | 23.8% | 50%+ | 🔴 Critical - Top Priority |
| **Quantity Accuracy** | ~35% | 60%+ | 🔴 Needs Improvement |
| **Calorie Accuracy** | 51.2% | 75%+ | 🟠 Moderate - Needs Work |
| **Protein Accuracy** | ~60% | 75%+ | 🟡 Good - Minor tweaks |

---

## Problem Analysis

### 🔴 Critical Issue #1: Over-Detection (F1 Score: 23.8%)

**Evidence from Evaluation**:
- AI detected 5-9 items when ground truth had 2-4 items
- Example: Scrambled eggs → AI detected 5 items, ground truth had 3
- Example: Chicken salad → AI detected 8 items (greens, carrots, onions, cranberries, walnuts, feta, orange juice, orange slices), ground truth had 4 main components

**Root Causes**:
1. Prompt encourages identifying "all visible items"
2. No guidance on focusing on main components
3. Lists garnishes and minor items
4. Doesn't prioritize nutritionally significant foods

**Impact**: Low precision (many false positives) → Poor F1 score

---

### 🔴 Critical Issue #2: Quantity Overestimation (35% accuracy)

**Evidence**:
- AI detected 8 pancakes when ground truth was 3 (2.7x overestimate)
- Consistently overestimates portions by 2-3x

**Root Causes**:
1. Lacks reference size examples in prompt
2. No calibration for standard serving sizes
3. Doesn't account for camera angle/perspective

**Impact**: Poor quantity accuracy → Poor calorie estimates

---

### 🟠 Moderate Issue #3: Missing Main Proteins

**Evidence**:
- Grilled chicken salad → AI missed the chicken entirely
- Detected garnishes but not the protein

**Root Cause**: No prioritization of protein sources

**Impact**: Low recall → Poor F1 score

---

## Improvement Strategy (EUR Loop)

### Phase 1: Prompt Engineering (Quick Wins) 🎯

**Priority**: HIGH
**Effort**: LOW
**Expected Impact**: +15-20% overall score

#### 1.1 Create Improved Prompt (v2.0)

**Changes**:
- ✅ Add "Focus on main components (2-5 items)" instruction
- ✅ Provide examples of GOOD vs BAD detection
- ✅ Add standard serving size references
- ✅ Prioritize: protein → carbs → vegetables → condiments
- ✅ Skip tiny garnishes unless substantial
- ✅ Add checklist before responding
- ✅ Emphasize realistic quantities (not overestimation)

**File**: `src/lib/claude-vision-client.ts` → Update `FOOD_IDENTIFICATION_PROMPT`

**Implementation**:
```typescript
// See: src/lib/prompts/food-identification-v2.ts
```

#### 1.2 Add Few-Shot Examples

Add 3-5 example image→response pairs in the prompt to show desired behavior.

**Expected Improvement**:
- F1 Score: 23.8% → 40-45%
- Quantity Accuracy: 35% → 50-55%
- Overall Score: 35.1% → 50-55%

---

### Phase 2: Post-Processing Filters (Medium Win) 🔧

**Priority**: HIGH
**Effort**: MEDIUM
**Expected Impact**: +5-10% overall score

#### 2.1 Confidence Threshold Filter

Filter out low-confidence detections:

```typescript
// src/lib/evaluation/post-processing.ts
export function filterLowConfidenceFoods(
  foods: DetectedFood[],
  threshold = 0.7
): DetectedFood[] {
  return foods.filter(food => food.confidence >= threshold);
}
```

#### 2.2 Duplicate Detection

Combine similar/duplicate items:

```typescript
export function deduplicateFoods(foods: DetectedFood[]): DetectedFood[] {
  // Use fuzzy string matching to detect duplicates
  // e.g., "mixed greens" + "lettuce" → "mixed greens"
}
```

#### 2.3 Quantity Calibration

Apply learned correction factors:

```typescript
export function calibrateQuantities(
  foods: DetectedFood[],
  calibrationFactors: Record<string, number>
): DetectedFood[] {
  // Apply historical correction (e.g., reduce pancake count by 0.6x)
}
```

**Expected Improvement**:
- F1 Score: +5-8%
- Quantity Accuracy: +10-15%

---

### Phase 3: Model Experimentation (High Impact) 🚀

**Priority**: MEDIUM
**Effort**: LOW
**Expected Impact**: +10-15% overall score

#### 3.1 Test Claude Opus 4.6

**Rationale**: More capable model, better reasoning

**Implementation**:
```typescript
// In .env.local
CLAUDE_MODEL="claude-opus-4-20250514"
```

**Cost**: ~3x more expensive (~$0.06/image vs ~$0.02)

#### 3.2 A/B Test Different Models

Run parallel evaluations:
- Sonnet 4.5 (current)
- Opus 4.6
- Haiku 4.5 (for speed comparison)

Compare results and choose best performer.

**Expected Improvement**: +10-15% with Opus

---

### Phase 4: Prompt Versioning & Testing (Systematic) 📊

**Priority**: HIGH
**Effort**: MEDIUM
**Expected Impact**: Continuous improvement

#### 4.1 Create Prompt Registry

```typescript
// src/lib/prompts/registry.ts
export const PROMPT_VERSIONS = {
  'v1.0': FOOD_IDENTIFICATION_PROMPT_V1,
  'v2.0': FOOD_IDENTIFICATION_PROMPT_V2,
  'v2.1': FOOD_IDENTIFICATION_PROMPT_V2_1,
  // ... more versions
};
```

#### 4.2 Automated A/B Testing

```bash
# Test multiple prompts
npx tsx scripts/evaluate-prompts.ts --prompts v1.0,v2.0,v2.1
```

#### 4.3 Track Prompt Performance

Store prompt version in evaluation runs:
```typescript
await prisma.evaluationRun.create({
  data: {
    modelVersion: 'claude-sonnet-4-20250514',
    promptVersion: '2.0',  // ← Track this!
    // ...
  }
});
```

---

### Phase 5: Advanced Techniques (Long-term) 🔬

**Priority**: LOW
**Effort**: HIGH
**Expected Impact**: +20-30% overall score

#### 5.1 Two-Stage Detection

1. **Stage 1**: Detect all items
2. **Stage 2**: Filter and prioritize with second AI call

```typescript
// Ask Claude: "Which of these items are the main nutritional components?"
```

#### 5.2 Vision + Text Hybrid

Allow users to confirm/edit AI results:
- Show detected foods
- User removes false positives
- User adds missing items
- Save corrections for learning

#### 5.3 Fine-tuning (Advanced)

- Collect 100+ labeled examples
- Fine-tune model on food detection task
- Requires more resources and time

---

## Implementation Roadmap

### Week 1: Quick Wins (Phases 1-2)

**Day 1-2**: Prompt Engineering
- [ ] Write improved prompt v2.0
- [ ] Add few-shot examples
- [ ] Test manually on 3-5 images
- [ ] Deploy to production

**Day 3-4**: Post-Processing
- [ ] Implement confidence filter
- [ ] Implement duplicate detection
- [ ] Run evaluation with filters
- [ ] Compare before/after metrics

**Day 5**: First EUR Cycle
- [ ] Run full evaluation with v2.0
- [ ] Generate report
- [ ] Analyze improvements
- [ ] Identify remaining issues

**Expected**: 35% → 50%+ overall score

### Week 2: Model Testing (Phase 3)

**Day 1-2**: Model Comparison
- [ ] Test Opus 4.6
- [ ] Test Haiku 4.5 (speed)
- [ ] Run A/B comparison
- [ ] Analyze cost vs accuracy

**Day 3-4**: Optimization
- [ ] Choose best model/prompt combo
- [ ] Fine-tune parameters
- [ ] Optimize for cost/performance

**Day 5**: Second EUR Cycle
- [ ] Full evaluation
- [ ] Generate report
- [ ] Document learnings

**Expected**: 50% → 60%+ overall score

### Week 3-4: Systematic Testing (Phase 4)

- [ ] Build prompt registry
- [ ] Create automated testing framework
- [ ] Run 5+ prompt variations
- [ ] Select best performer
- [ ] Deploy to production

**Expected**: 60% → 70%+ overall score

---

## Success Metrics

### Tier 1 (Minimum Viable)
- [ ] Overall Score > 50%
- [ ] F1 Score > 40%
- [ ] Calorie Accuracy > 65%

### Tier 2 (Production Ready)
- [ ] Overall Score > 60%
- [ ] F1 Score > 50%
- [ ] Calorie Accuracy > 75%
- [ ] Quantity Accuracy > 60%

### Tier 3 (Excellent)
- [ ] Overall Score > 70%
- [ ] F1 Score > 60%
- [ ] Calorie Accuracy > 80%
- [ ] All metrics > 60%

---

## Monitoring & Iteration

### Daily
- Monitor evaluation runs
- Track metric trends
- Log AI failures

### Weekly
- Run full evaluation
- Generate comparison report
- Adjust prompts based on failures

### Monthly
- Comprehensive analysis
- Cost optimization review
- User feedback integration

---

## Cost Analysis

### Current Costs (v1.0)
- Model: Sonnet 4.5 (~$0.02/image)
- Daily evals: 10 images = $0.20
- Monthly: ~$6

### Projected Costs (v2.0 with Opus)
- Model: Opus 4.6 (~$0.06/image)
- Daily evals: 10 images = $0.60
- Monthly: ~$18

### ROI Calculation
- Accuracy improvement: +25-30%
- Cost increase: 3x
- **Value**: Better UX, fewer user corrections, higher retention

**Decision**: Worth the cost if Opus shows >15% improvement

---

## Quick Start Commands

### 1. Update Prompt (Phase 1)
```bash
# Edit the prompt file
code src/lib/claude-vision-client.ts

# Test with single image
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://..."}'

# Run full evaluation
curl -X POST http://localhost:3000/api/evaluation/run

# Generate report
DATABASE_URL="..." npx tsx scripts/generate-evaluation-report.ts
```

### 2. Test Different Model (Phase 3)
```bash
# Update .env.local
echo 'CLAUDE_MODEL="claude-opus-4-20250514"' >> .env.local

# Restart server and run evaluation
```

### 3. Compare Results
```bash
# Generate comparison chart
npx tsx scripts/compare-evaluations.ts run1 run2
```

---

## Expected Timeline

| Phase | Duration | Effort | Impact | Status |
|-------|----------|--------|--------|--------|
| **Phase 1** | 2-3 days | 8 hours | +15-20% | 🎯 Start Here |
| **Phase 2** | 2-3 days | 12 hours | +5-10% | Next |
| **Phase 3** | 2-3 days | 4 hours | +10-15% | Quick Win |
| **Phase 4** | 1 week | 20 hours | +5-10% | Systematic |
| **Phase 5** | 2-4 weeks | 40+ hours | +20-30% | Long-term |

**Fastest Path to 60%+**: Phase 1 + Phase 3 (1 week, <15 hours)

---

## Next Steps

1. ✅ Review this improvement plan
2. 🎯 **START HERE**: Implement improved prompt v2.0
3. Run evaluation and generate report
4. Compare before/after metrics
5. Iterate based on results

**Ready to start?** Let's implement Phase 1 together! 🚀
