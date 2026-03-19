import { db } from '@/lib/db'

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-[#111118] border border-[#1e1e2e] rounded-lg p-4">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-[#9090a0] mt-1">{label}</div>
      {sub && <div className="text-xs text-[#555565] mt-0.5">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const taskCounts = db.prepare(`
    SELECT status, COUNT(*) as count FROM tasks GROUP BY status
  `).all() as { status: string; count: number }[]

  const contentCounts = db.prepare(`
    SELECT status, COUNT(*) as count FROM content_items GROUP BY status
  `).all() as { status: string; count: number }[]

  const ideaCount = (db.prepare('SELECT COUNT(*) as count FROM ideas').get() as any)?.count ?? 0
  const activityCount = (db.prepare(`SELECT COUNT(*) as count FROM agent_activity WHERE created_at > datetime('now', '-24 hours')`).get() as any)?.count ?? 0

  const toCount = (arr: { status: string; count: number }[], s: string) =>
    arr.find(x => x.status === s)?.count ?? 0

  const activeTasks = db.prepare(`
    SELECT * FROM tasks WHERE status IN ('ready','in_progress') ORDER BY updated_at DESC LIMIT 5
  `).all() as any[]

  const recentActivity = db.prepare(`
    SELECT * FROM agent_activity ORDER BY created_at DESC LIMIT 5
  `).all() as any[]

  const priorityColors: Record<string, string> = {
    urgent: 'text-red-400', high: 'text-orange-400',
    medium: 'text-yellow-400', low: 'text-[#6b6b80]',
  }

  const agentEmoji: Record<string, string> = { dex: '🎯', sage: '🌿' }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Active Tasks" value={toCount(taskCounts, 'in_progress') + toCount(taskCounts, 'ready')} sub="ready + in progress" />
        <StatCard label="Backlog" value={toCount(taskCounts, 'backlog')} />
        <StatCard label="Content Drafts" value={toCount(contentCounts, 'draft') + toCount(contentCounts, 'review')} sub="draft + review" />
        <StatCard label="Ideas" value={ideaCount} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Tasks */}
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-lg p-4">
          <h2 className="text-sm font-semibold text-[#9090a0] uppercase tracking-wider mb-3">Active Tasks</h2>
          {activeTasks.length === 0 ? (
            <p className="text-[#555565] text-sm">No active tasks</p>
          ) : (
            <ul className="space-y-2">
              {activeTasks.map((t: any) => (
                <li key={t.id} className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${priorityColors[t.priority] || ''}`}>●</span>
                  <span className="text-sm text-white truncate flex-1">{t.title}</span>
                  <span className="text-xs text-[#555565]">{t.status.replace('_', ' ')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-[#9090a0] uppercase tracking-wider">Agent Activity</h2>
            <span className="text-xs text-[#555565]">last 24h: {activityCount}</span>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-[#555565] text-sm">No recent activity</p>
          ) : (
            <ul className="space-y-2">
              {recentActivity.map((a: any) => (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <span>{agentEmoji[a.agent] || '🤖'}</span>
                  <span className="text-[#9090a0] truncate flex-1">{a.action}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
