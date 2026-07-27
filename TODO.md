# Leaderboard Global Rank Fix — TODO

- [x] Plan approved by user
- [x] Step 1: Add `getUserRank()` to `SorobanService` in `src/lib/soroban.ts`
- [x] Step 2: Update `useLeaderboard.ts` hook with async rank lookup + race condition guard
- [x] Step 3: Update `src/app/leaderboard/page.tsx` to use new `userRank` for banner
- [x] Step 4: Add tests for `getUserRank` in `src/lib/soroban.service.test.ts`
- [x] Step 5: Create `src/hooks/useLeaderboard.test.ts` for hook tests
- [ ] Step 6: Run tests and verify everything passes

