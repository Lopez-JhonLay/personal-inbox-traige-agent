import type { EmailFilters as Filters } from '../types/api'
import { analysisLabels, analysisStatuses } from '../utils/emailStatus'

export const categories = [
  'Work',
  'Personal',
  'Finance',
  'Meetings',
  'Notifications',
  'Promotions',
  'Newsletters',
  'Other',
]
export const priorities = ['High', 'Medium', 'Low']
export const sorts = ['received_desc', 'received_asc', 'priority_desc'] as const

export function EmailFilters({
  value,
  onChange,
  onClear,
}: {
  value: Filters
  onChange: (key: string, value: string) => void
  onClear: () => void
}) {
  const filtered = !!(
    value.priority ||
    value.category ||
    value.reply_needed ||
    value.has_pending_action ||
    value.analysis_status
  )
  const selectClass =
    'min-h-11 w-full min-w-0 rounded-control border border-line bg-paper px-2 text-sm text-ink'
  return (
    <section
      aria-label="Filter emails"
      className="mb-4 rounded-panel border border-line bg-surface p-3"
    >
      <div className="grid grid-cols-2 items-end gap-3 md:flex md:flex-wrap">
        <label className="grid min-w-0 gap-1 text-xs text-muted">
          Priority
          <select
            className={selectClass}
            value={value.priority ?? ''}
            onChange={(e) => onChange('priority', e.target.value)}
          >
            <option value="">All priorities</option>
            {priorities.map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-xs text-muted">
          Category
          <select
            className={selectClass}
            value={value.category ?? ''}
            onChange={(e) => onChange('category', e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-xs text-muted">
          Analysis status
          <select
            className={selectClass}
            value={value.analysis_status ?? ''}
            onChange={(e) => onChange('analysis_status', e.target.value)}
          >
            <option value="">All statuses</option>
            {analysisStatuses.map((status) => (
              <option key={status} value={status}>
                {analysisLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-xs text-muted">
          Sort
          <select
            className={selectClass}
            value={value.sort}
            onChange={(e) => onChange('sort', e.target.value)}
          >
            <option value="priority_desc">Highest priority first</option>
            <option value="received_desc">Newest first</option>
            <option value="received_asc">Oldest first</option>
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-ink"
            checked={value.reply_needed === true}
            onChange={(e) =>
              onChange('reply_needed', e.target.checked ? 'true' : '')
            }
          />
          Needs reply
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-ink"
            checked={value.has_pending_action === true}
            onChange={(e) =>
              onChange('has_pending_action', e.target.checked ? 'true' : '')
            }
          />
          Has pending actions
        </label>
        <button
          type="button"
          disabled={!filtered}
          onClick={onClear}
          className="min-h-11 rounded-control px-3 text-sm font-semibold underline underline-offset-4 disabled:cursor-default disabled:text-muted disabled:no-underline md:ml-auto"
        >
          Clear filters
        </button>
      </div>
    </section>
  )
}
