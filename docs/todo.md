# zxy3 — TODO

---

## Clean up stale branches

**Priority:** Low  
**When:** Next maintenance window with no active PRs

The repo has accumulated ~106 remote branches and ~147 local branches from iterative development work. Most are merged or abandoned.

### What to do

1. Review and delete stale remote branches:
```bash
# Preview which remote branches are merged into main
git fetch --prune
git branch -r --merged origin/main | grep -v "origin/main"

# Delete a specific remote branch
git push origin --delete <branch-name>

# Or use gh CLI to batch-close
gh api repos/adamaslan/zxy3/branches --paginate -q '.[].name' | \
  while read b; do
    merged=$(git branch -r --merged origin/main | grep "origin/$b")
    [ -n "$merged" ] && echo "DELETE: $b"
  done
```

2. Clean up local tracking refs for deleted remote branches:
```bash
git fetch --prune
git branch -vv | grep ': gone]' | awk '{print $1}'  # preview
git branch -vv | grep ': gone]' | awk '{print $1}' | xargs git branch -d
```

3. Branches to keep regardless (active or reference):
   - `main` (production)
   - Any `feat/*` branch with an open PR
   - `social-pr-autopilot` related branches if still in progress

### Known branch families that are likely safe to delete
- `db-magic1` through `db-magic6`, `db-magic-a1`, `db-magic-a2`
- `docs1` through `docs9`, `docs8a`
- `ai-reno` through `ai-reno4`
- `cypress` through `cypress4`
- `test`, `test2`, `test3`, `test4`, `test5`
- `auth1`, `auth2`, `auth3`
- `curr1`, `curr2`
- `3js`, `Amp`, `Amph2`, `about`, `april`, `atone`, `css24`, `text`, `up1`

### Why not doing this now
Deleting 100+ branches is irreversible. Doing it during active feature work risks accidentally removing a branch someone is referencing. Defer until a quiet period and do it branch-by-branch or in reviewed batches.
