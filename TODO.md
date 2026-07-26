# TVL History UTC Timezone Fix — Issue #77

## Implementation Steps

- [x] Step 1: Fix `getPoolHistory` seeding loop in `src/lib/soroban.ts` — replace local-timezone Date arithmetic with UTC millisecond arithmetic
- [x] Step 2: Fix `TvlChart.tsx` formatters — add explicit `timeZone: 'UTC'` to `toLocaleDateString` calls
- [x] Step 3: Update existing test expectations in `soroban.service.test.ts`
- [ ] Step 4: Add comprehensive timezone regression tests in `soroban.service.test.ts`
  - [ ] Test with mocked `America/Los_Angeles` timezone at 8 PM local (UTC next day)
  - [ ] Test verifying events at exact UTC day boundaries are not dropped
  - [ ] Test verifying TvlChart formatters use UTC

