# Team Composition — Phase 2 Vision
_Generated from full team war room meeting, 2026-03-18_

## Current Team
| Agent | Role |
|-------|------|
| Dex | Coordinator/Router |
| Sage (main) | General research + synthesis |
| Sage-Deep | Empirical depth, citations, narrow analysis |
| Sage-Wide | Cross-domain synthesis, strategic framing |
| Sage-Devil | Adversarial review, risk, stress-testing |
| Sage-Build | Project lead, GitHub-native |
| Muse | Creative writing, voice |

## Proposed Additions (priority order)

### 1. Architect ⭐ Add first
- Designs before anyone builds — owns data models, API contracts, component boundaries
- Never writes code, only specs. "Here's the interface. Build it how you want. Don't violate this."
- Prevents building the wrong thing correctly
- **Immediate unlock:** Better app builds

### 2. Editor ⭐ Add second
- Muse generates, Editor makes it publishable. Different cognitive modes — never combine.
- Structural editing, voice consistency, audience calibration
- The question nobody currently asks: "would a real person care about this?"
- **Immediate unlock:** Publishable content, not just generated content

### 3. Ghost — The Specificity Hunter
- Every abstraction, Ghost demands a body for it
- "The farm has a rhythm" → Ghost: *What time did you wake up? What did your boots sound like on frozen ground?*
- Critical for farm life YouTube — city people watch because it's concrete. Philosophy = they leave.
- **Add when:** Content pipeline is active

### 4. Crow — The Unconvinced Reader
- Not adversarial (Sage-Devil attacks arguments) — Crow attacks *interest level*
- Represents the person who isn't already in Tyler's world, who clicked by accident
- Crow's only question: "why would I keep reading?" 12-second attention span, no patience for setup
- **Add when:** Content pipeline is active

### 5. Archivist — Institutional Memory
- Runs nightly: indexes outputs, tags by topic, surfaces reuse opportunities
- "You researched this six months ago, here's what you found"
- Cross-pollinates content research → app insights and vice versa
- **Add when:** Content library is large enough to justify it

## Org Structure (Studio Model)

```
                    DEX (coordinator)
                   /        |        \
          CONTENT TRACK   BUILD TRACK   SHARED
         /      |              |         |    \
   Research  Muse+        Architect  Sage-  Archivist
   (Deep)    Editor       (design)   Devil  (memory)
             Ghost                 (stress
             Crow                   test)
                          Builder
                         (spawned)
                              |
                             QA
                           (spawned)
```

## Key Insight — Studio Model vs Assistant Model
- **Current:** Tyler asks, agents respond
- **Target:** Tyler sets the brief, agents self-organize to execute, Dex coordinates, Tyler reviews
- Build in **productive tension**: Architect vs Builder arguing trade-offs = healthy. Editor vs Muse arguing what to cut = healthy.
- Let agents specialize on projects — don't rotate. An Editor who works on Tyler's entire regen ag series learns his voice.

## On Stakes and Feedback Loops
AI teams produce without consequence = without pressure = optimizing completeness over impact.
Fix: feed real audience response back to the team. When content fails in public, name it explicitly in the next session. Build taste through feedback, not just instructions.

## What Makes Content Resonate (Muse's framework)
1. A point of view the author would defend in an argument — a *position*, not a "perspective"
2. One moment of genuine surprise — a turn or reframe the reader couldn't have gotten elsewhere
3. Sounds like one person, not a committee
4. Makes the reader feel something specific — *seen*, *called out*, or *like they finally have words for something*
