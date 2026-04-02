import { getLicense, type HFModel } from '#/lib/hf-api'

interface Props {
  pinned: HFModel[]
  onUnpin: (model: HFModel) => void
}

export default function ComparisonPanel({ pinned, onUnpin }: Props) {
  const gridClass =
    pinned.length === 1 ? 'grid-cols-1' : pinned.length === 2 ? 'grid-cols-2' : 'grid-cols-3'

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out ${
        pinned.length > 0 ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="border-t border-[var(--line)] bg-[var(--header-bg)] px-4 py-4 shadow-[0_-8px_32px_rgba(23,58,64,0.12)] backdrop-blur-lg">
        <div className="page-wrap">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
            Comparing {pinned.length}/3
          </p>
          <div className={`grid gap-3 ${gridClass}`}>
            {pinned.map((model) => (
              <div
                key={model.id}
                className="relative rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3"
              >
                <button
                  onClick={() => onUnpin(model)}
                  aria-label={`Remove ${model.id} from comparison`}
                  className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-sm text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
                >
                  ×
                </button>
                <p className="mb-2 truncate pr-6 font-mono text-xs text-[var(--lagoon-deep)]">
                  {model.id}
                </p>
                <dl className="space-y-1 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--sea-ink-soft)]">Task</dt>
                    <dd className="font-medium text-[var(--sea-ink)]">{model.pipeline_tag ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--sea-ink-soft)]">Downloads</dt>
                    <dd className="tabular-nums font-medium text-[var(--sea-ink)]">
                      {model.downloads?.toLocaleString() ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--sea-ink-soft)]">Likes</dt>
                    <dd className="tabular-nums font-medium text-[var(--sea-ink)]">
                      {model.likes?.toLocaleString() ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--sea-ink-soft)]">License</dt>
                    <dd className="font-medium text-[var(--sea-ink)]">{getLicense(model.tags)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
