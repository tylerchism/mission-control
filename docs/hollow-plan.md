# PROJECT HOLLOW — Build & Launch Plan
_Session 3 output. Generated 2026-03-18._

---

## SUMMARY

~12 hours of focused Claude Code work across 2 sessions. One week of shadow mode. Tyler calls cutover.

---

## BUILD SEQUENCE

Order matters. MessageQueue must exist before APScheduler cron testing — crons firing into an unqueued conversation corrupt state. SQLite persistence must exist before compaction is built.

| # | Component | Effort | Depends On |
|---|---|---|---|
| 1 | Repo scaffold — `~/git/hollow/`, config, .env, directory structure | 30 min | — |
| 2 | `PersistentConversationHistory` — SQLite-backed session store | 2-3 hrs | #1 |
| 3 | `MessageQueue` — sequential per-chat processing, typing keepalive | 1 hr | #1 |
| 4 | `APScheduler` cron system — replaces heartbeat loop, loads `crons.json` | 2 hrs | #3 |
| 5 | `bin/hail` — agent delegation CLI (`hail canopy "task"`) | 45 min | #1 |
| 6 | `bin/mc` — Mission Control CLI (`mc tasks list`, `mc tasks create`) | 1 hr | #1 |
| 7 | `bin/xsearch` — xAI search CLI | 30 min | #1 |
| 8 | Tarn identity files + systemd service + `.env` with new bot token | 1 hr | #1 |
| 9 | Compaction — triggered at 500k chars, Haiku summary, SQLite tombstone | 2 hrs | #2 |
| 10 | `crons.json` — migrate all OpenClaw crons to Hollow format | 1 hr | #4 |

**Total: ~12 hours.** Items 5-7 and 8 can run in parallel with 4 and 9 respectively.

**The one underestimated component:** Compaction (#9). second_brain does truncation (drop oldest), not compaction (summarize oldest). Compaction requires: trigger logic, summary generation via claude_code_sdk, SQLite tombstoning, re-insertion of summary block, edge case handling (compaction mid-tool-use chain). Treat this as 2 hours, not 30 minutes. Test it explicitly before shadow mode.

---

## BUILD APPROACH: ONE SESSION OR MULTIPLE?

**Two scoped Claude Code sessions, not one marathon.**

Session A — Core runtime (items 1-4): Get a working Tarn that can receive a message, persist the conversation, process crons, and respond. No tools yet. Goal: Tarn talks.

Session B — Tools + identity + launch prep (items 5-10): Add bin/ CLIs, identity files, service file, crons.json, compaction. Goal: Tarn is feature-complete and ready for shadow mode.

Why two: Claude Code does better with a clear, scoped goal than an open-ended 12-hour session. The natural boundary (runtime vs. tools) makes a clean handoff. Also — if Session A reveals something unexpected in second_brain's architecture, Session B's prompt can be updated before it starts.

**Both sessions reference `~/git/mission-control/docs/hollow-spec.md` as the source of truth.**

---

## VERIFY BEFORE BUILDING

Before starting Session A, verify:
- [ ] Port 18800 is available: `lsof -ti :18800` (should return nothing)
- [ ] Tyler has created new Telegram bot via BotFather — need token
- [ ] `~/git/hollow/` directory doesn't exist yet (clean start)

---

## SHADOW MODE MECHANICS

Shadow mode = both systems running in parallel. Tyler uses both bots intentionally.

**The cron double-fire problem must be resolved explicitly:**

Option chosen: **Disable all OpenClaw crons when Hollow crons activate.** Both systems running crons simultaneously means Tyler gets two morning briefs, two task executor runs, ideas get double-processed. Not acceptable.

Procedure on Hollow cron activation:
1. Verify all 5 crons are running correctly in Hollow
2. Run `openclaw cron list` and note all job IDs
3. Disable them one by one (or pause via `openclaw gateway stop` if that's cleaner)
4. Document: "OpenClaw crons disabled on [date], Hollow crons active"

**Mission Control conflict mitigation:**

During shadow mode Tyler should route MC operations to ONE system. Recommendation: use Tarn for all new MC interactions (it's the test, so test it). OpenClaw/Dex can read MC but shouldn't create or update during shadow. This won't be perfect — it's a discipline, not an enforcement. Accept some noise.

**Memory gap — communicate explicitly to Tyler:**

Tarn has no memory before its launch date. This is expected and intentional (Tyler chose fresh start). For the first 7 days, Tarn will not know history from before it launched. This manifests as: Tyler references last week, Tarn asks for context. Not broken — just young. Resolves naturally as Tarn accumulates its own memory.

**Latency benchmark — do this on day 1 of shadow mode:**

Sage-Devil identified response latency as the one thing that could kill adoption. `claude_code_sdk` spins up a subprocess per call — startup overhead is real and unmeasured. On day 1 of shadow mode, send the same 5 short messages to both bots and time them. If Hollow consistently takes >2x OpenClaw on short messages, investigate and fix before cutover. If latency is acceptable, document it and move on.

---

## CUTOVER PROCEDURE

**Pre-conditions for cutover:**
- [ ] 7 days shadow mode minimum
- [ ] Latency benchmark: acceptable (<2x OpenClaw on short messages)
- [ ] All 5 crons running correctly in Hollow
- [ ] Tyler says "ship it"

**Day of cutover:**
1. Hollow crons already running (OpenClaw crons already disabled)
2. Tyler starts using Tarn as primary — just uses the new bot contact
3. OpenClaw stays installed and running — Dex bot stays active as fallback
4. No need to stop OpenClaw — just ignore it

**The cutover is behavioral, not technical.** There's no switch to flip. Tyler just uses Tarn.

---

## ROLLBACK PLAN

**Define rollback triggers before cutover, not during a 11pm incident:**
- Tarn fails to respond to 3 consecutive messages within 60 seconds
- Tarn takes a clearly wrong autonomous action
- Tyler explicitly requests rollback

**Rollback procedure (under 5 minutes):**
1. `systemctl stop hollow-tarn`
2. OpenClaw/Dex is already running — no restart needed
3. Tyler switches back to old bot contact in Telegram
4. Done

**What rollback does NOT recover:**
- Memory Tarn wrote during primary period (stays in Hollow's store)
- MC tasks Tarn created/modified (stay modified)
- Autonomous actions already taken

**Keep OpenClaw installed until Tarn has been primary for 30 days without incident.**

---

## SPECIALIST AGENT MIGRATION

The Sage variants (sage-deep, sage-wide, sage-devil, sage-build, muse) stay on `second_brain` during the entire Hollow build and shadow period. They're working. Don't touch working things.

**Post-cutover migration (after 30 days Tarn stable):**
1. Each specialist gets a hollow instance, one at a time
2. Test via `hail` after migration
3. Decommission old second_brain service for that variant
4. Do not migrate all at once

**New names (Canopy/Tap/Briar/Forge/Spring):** Rename at migration time, not at Tarn cutover. Renaming at cutover adds cognitive load to an already significant change. Keep calling them Sage-Deep etc. until their hollow migration.

---

## WHAT HAPPENS TO THE OLD TEAM

After 30 days Tarn stable + all specialists migrated to Hollow:

| System | Status |
|--------|--------|
| OpenClaw | Keep installed as emergency fallback. Disable autostart. Document "last known good" date. |
| Dex (OpenClaw agent) | Dormant. Bot stays registered with Telegram but unused. |
| `second_brain` service | Keep running until all specialists migrated off. Then stop service, archive repo. |

Nothing gets deleted. Archive, not decommission.

---

## MISSION CONTROL TASKS TO CREATE

Load these into MC as the build begins:

1. `[HOLLOW] Repo scaffold + config` — ready
2. `[HOLLOW] PersistentConversationHistory (SQLite)` — ready
3. `[HOLLOW] MessageQueue` — ready
4. `[HOLLOW] APScheduler cron system` — ready, depends on #3
5. `[HOLLOW] bin/hail + bin/mc + bin/xsearch` — ready
6. `[HOLLOW] Tarn identity files + systemd service` — ready, blocked on Telegram bot token
7. `[HOLLOW] Compaction` — ready, depends on #2
8. `[HOLLOW] crons.json migration` — ready, depends on #4
9. `[HOLLOW] Shadow mode setup + latency benchmark` — blocked on #1-8
10. `[HOLLOW] Cutover` — blocked on shadow mode pass
