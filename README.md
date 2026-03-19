# Mission Control

Local productivity dashboard for the Tyler + Dex (AI) team.

## Run

```bash
npm run dev
# → http://localhost:3333
```

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | / | Stats + active tasks + recent agent activity |
| Tasks | /tasks | Task table with inline status cycling |
| Pipeline | /pipeline | Content Kanban (Draft→Review→Approved→Published) |
| Ideas | /ideas | Fast-capture idea vault (Enter to save) |
| Agent Feed | /feed | Live SSE stream of Dex/Sage activity |

## API Key

Stored in `.env.local` as `MISSION_CONTROL_API_KEY`. Used by Dex (the AI agent) to call the API programmatically.

## API Reference (for Dex)

All programmatic calls require the header `x-api-key: <MISSION_CONTROL_API_KEY>`.

### Create a task
```bash
curl -X POST http://localhost:3333/api/tasks \
  -H "Content-Type: application/json" \
  -H "x-api-key: <key>" \
  -d '{"title": "Research soil carbon papers", "priority": "high", "created_by": "dex", "tags": ["research", "regen-ag"]}'
```

### Update task status
```bash
curl -X PATCH http://localhost:3333/api/tasks/<id> \
  -H "Content-Type: application/json" \
  -H "x-api-key: <key>" \
  -d '{"status": "in_progress"}'
```

### Create a content draft
```bash
curl -X POST http://localhost:3333/api/content \
  -H "Content-Type: application/json" \
  -H "x-api-key: <key>" \
  -d '{"title": "Why Agroforestry Works", "body_markdown": "# Draft\n\n...", "created_by": "dex"}'
```

### Capture an idea
```bash
curl -X POST http://localhost:3333/api/ideas \
  -H "Content-Type: application/json" \
  -H "x-api-key: <key>" \
  -d '{"title": "Cross-post permaculture content to Substack", "source": "dex"}'
```

### Log agent activity
```bash
curl -X POST http://localhost:3333/api/agent-activity \
  -H "Content-Type: application/json" \
  -H "x-api-key: <key>" \
  -d '{"agent": "dex", "action": "Researched soil carbon sequestration", "action_type": "research.completed", "payload": {"query": "soil carbon"}}'
```

## Database

SQLite at `~/.local/share/mission-control/db.sqlite`. Tables: `tasks`, `content_items`, `ideas`, `agent_activity`.
