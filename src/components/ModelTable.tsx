import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  type ExpandedState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import {
  fetchModelCard,
  fetchSpacesCount,
  getLicense,
  getModelSize,
  type HFModel,
} from '#/lib/hf-api'

const columnHelper = createColumnHelper<HFModel>()
const compactFmt = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

function formatProvider(key: string): string {
  return key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function ProviderBadge({ mapping }: { mapping: HFModel['inferenceProviderMapping'] }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const live = mapping ? mapping.filter((e) => e.status === 'live') : []

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node
      if (!btnRef.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  if (live.length === 0) return <span className="text-[var(--sea-ink-soft)] opacity-40">—</span>

  const label = live.length === 1 ? formatProvider(live[0].provider) : `${live.length} providers`

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation()
          if (!open && btnRef.current) {
            const r = btnRef.current.getBoundingClientRect()
            setPos({ top: r.bottom + 6, left: r.left })
          }
          setOpen((o) => !o)
        }}
        className="inline-flex items-center rounded-full border border-[var(--palm)]/25 bg-[var(--palm)]/10 px-2 py-0.5 text-xs font-medium text-[var(--palm)] transition-colors hover:bg-[var(--palm)]/20"
      >
        {label}
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
            className="island-shell min-w-[160px] overflow-hidden rounded-xl py-1 shadow-lg"
          >
            {live.map((e) => (
              <div key={e.provider} className="px-3 py-1.5 text-xs text-[var(--sea-ink)]">
                {formatProvider(e.provider)}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}

// ── Lazy cells ──────────────────────────────────────────────────────────────

function SpacesCell({ modelId }: { modelId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['spaces', modelId],
    queryFn: () => fetchSpacesCount(modelId),
    staleTime: 10 * 60 * 1000,
  })
  if (isLoading) return <Spinner />
  if (isError) return <span className="text-[var(--sea-ink-soft)] opacity-40">—</span>
  return <span className="tabular-nums">{data === 100 ? '100+' : (data ?? 0)}</span>
}

function ModelCardExpanded({ model }: { model: HFModel }) {
  const { data: readme, isLoading, isError } = useQuery({
    queryKey: ['card', model.id],
    queryFn: () => fetchModelCard(model.id),
    staleTime: Infinity,
    retry: false,
  })

  const parsed = useMemo(() => {
    if (!readme) return null
    const text = readme.replace(/^---[\s\S]*?---\n+/, '')
    const paras = text.split(/\n{2,}/)
    const desc =
      paras
        .find((p) => {
          const t = p.trim()
          return (
            t.length >= 40 &&
            !t.startsWith('#') &&
            !t.startsWith('```') &&
            !t.startsWith('|') &&
            !t.startsWith('<')
          )
        })
        ?.trim()
        .slice(0, 400) ?? null
    const codeMatch = text.match(/```(?:\w+)?\n([\s\S]*?)```/)
    const code = codeMatch ? codeMatch[1].trim().slice(0, 600) : null
    return { desc, code }
  }, [readme])

  const languages = model.cardData?.language?.slice(0, 5) ?? []
  const datasets = model.cardData?.datasets?.slice(0, 3) ?? []
  const hasMetadata = languages.length > 0 || datasets.length > 0
  const hasContent = parsed?.desc || parsed?.code

  return (
    <div className="border-t border-[var(--line)] bg-[var(--surface)] px-6 py-4">
      {hasMetadata && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {languages.map((lang) => (
            <span
              key={lang}
              className="rounded border border-[var(--chip-line)] bg-[var(--chip-bg)] px-1.5 py-0.5 text-xs text-[var(--sea-ink-soft)]"
            >
              {lang}
            </span>
          ))}
          {datasets.map((ds) => (
            <span
              key={ds}
              className="rounded border border-[var(--lagoon)]/20 bg-[var(--lagoon)]/10 px-1.5 py-0.5 text-xs text-[var(--lagoon-deep)]"
            >
              {ds}
            </span>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-[var(--sea-ink-soft)]">
          <Spinner />
          Loading model card…
        </div>
      )}

      {parsed?.desc && (
        <p className="mb-3 max-w-3xl text-sm leading-relaxed text-[var(--sea-ink-soft)]">
          {parsed.desc}
        </p>
      )}

      {parsed?.code && (
        <pre className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-xs">
          <code>{parsed.code}</code>
        </pre>
      )}

      {isError && (
        <p className="text-xs italic text-[var(--sea-ink-soft)]">Could not load model card.</p>
      )}
      {!isLoading && !isError && !hasContent && !hasMetadata && (
        <p className="text-xs italic text-[var(--sea-ink-soft)]">No model card available.</p>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--lagoon)] border-t-transparent" />
  )
}

function HeaderTooltip({ label, tip }: { label: string; tip: string }) {
  const iconRef = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  return (
    <>
      {label}
      <span
        ref={iconRef}
        className="cursor-default text-[10px] text-[var(--sea-ink-soft)] opacity-50 hover:opacity-100"
        onMouseEnter={() => {
          if (iconRef.current) {
            const r = iconRef.current.getBoundingClientRect()
            setPos({ top: r.bottom + 6, left: r.left + r.width / 2 })
          }
        }}
        onMouseLeave={() => setPos(null)}
      >
        ⓘ
      </span>
      {pos &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              transform: 'translateX(-50%)',
              zIndex: 9999,
              pointerEvents: 'none',
            }}
            className="max-w-[220px] rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-2.5 py-1.5 text-[10px] font-normal normal-case tracking-normal text-[var(--sea-ink)] shadow-md"
          >
            {tip}
          </div>,
          document.body,
        )}
    </>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  data: HFModel[]
  pinned: HFModel[]
  onPin: (model: HFModel) => void
  onUnpin: (model: HFModel) => void
}

export default function ModelTable({ data, pinned, onPin, onUnpin }: Props) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const columns = useMemo(
    () => [
      // Expand toggle
      columnHelper.display({
        id: 'expand',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <button
            onClick={row.getToggleExpandedHandler()}
            aria-label={row.getIsExpanded() ? 'Collapse row' : 'Expand row'}
            aria-expanded={row.getIsExpanded()}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--chip-bg)] text-sm text-[var(--sea-ink-soft)] transition hover:border-[var(--lagoon)] hover:text-[var(--sea-ink)]"
          >
            {row.getIsExpanded() ? '▾' : '▸'}
          </button>
        ),
      }),

      columnHelper.accessor('id', {
        header: 'Model ID',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-[var(--lagoon-deep)]">{getValue()}</span>
        ),
      }),

      columnHelper.accessor('pipeline_tag', {
        header: 'Task',
        cell: ({ getValue }) => (
          <span className="inline-flex items-center rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-2 py-0.5 text-xs font-medium text-[var(--sea-ink-soft)]">
            {getValue() ?? '—'}
          </span>
        ),
      }),

      columnHelper.accessor('downloadsAllTime', {
        id: 'downloads',
        header: () => <HeaderTooltip label="Downloads" tip="All-time total downloads" />,
        cell: ({ getValue }) => (
          <span className="tabular-nums">{getValue()?.toLocaleString() ?? '—'}</span>
        ),
      }),

      // Feature 1 — Download Momentum (sortable by monthly downloads)
      columnHelper.accessor('downloads', {
        id: 'momentum',
        header: () => <HeaderTooltip label="Momentum" tip="Downloads in the last 30 days, and what % of lifetime downloads they represent" />,
        cell: ({ getValue, row }) => {
          const monthly = getValue()
          const allTime = row.original.downloadsAllTime
          const pct =
            allTime && allTime >= 1000 && monthly > 0
              ? Math.round((monthly / allTime) * 100)
              : null
          return (
            <div className="leading-tight">
              <div className="tabular-nums text-sm">
                {monthly ? compactFmt.format(monthly) : '—'}
              </div>
              <div className="mt-0.5 text-[10px] font-semibold text-[var(--palm)]">
                {pct !== null && pct >= 1 ? `↑${pct}%` : <span className="opacity-40">—</span>}
              </div>
            </div>
          )
        },
      }),

      columnHelper.accessor('likes', {
        header: () => <HeaderTooltip label="Likes" tip="Users who liked this model on HuggingFace" />,
        cell: ({ getValue }) => (
          <span className="tabular-nums">{getValue()?.toLocaleString() ?? '—'}</span>
        ),
      }),

      columnHelper.accessor('lastModified', {
        header: 'Last Updated',
        cell: ({ getValue }) => {
          const val = getValue()
          if (!val) return '—'
          return new Date(val).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        },
      }),

      columnHelper.accessor('tags', {
        id: 'license',
        header: 'License',
        cell: ({ getValue }) => (
          <span className="text-[var(--sea-ink-soft)]">{getLicense(getValue())}</span>
        ),
      }),

      // Feature 2 — Model Size
      columnHelper.display({
        id: 'size',
        header: () => <HeaderTooltip label="Size" tip="Total model weight files. Hover a cell for estimated VRAM" />,
        enableSorting: false,
        cell: ({ row }) => {
          const gb = getModelSize(row.original.safetensors, row.original.siblings)
          if (gb === null)
            return <span className="text-[var(--sea-ink-soft)] opacity-40">—</span>
          return (
            <span
              className="tabular-nums text-[var(--sea-ink-soft)]"
              title={`~${(gb * 1.2).toFixed(1)} GB VRAM to run`}
            >
              {gb.toFixed(1)} GB
            </span>
          )
        },
      }),

      // Feature 3 — Inference API Status
      columnHelper.display({
        id: 'api',
        header: () => <HeaderTooltip label="API" tip="Hosted inference providers — click a badge to see names" />,
        enableSorting: false,
        cell: ({ row }) => (
          <ProviderBadge mapping={row.original.inferenceProviderMapping} />
        ),
      }),

      columnHelper.display({
        id: 'spaces',
        header: () => <HeaderTooltip label="Spaces" tip="Live HuggingFace apps built on this model. Capped at 100+" />,
        enableSorting: false,
        cell: ({ row }) => <SpacesCell modelId={row.original.id} />,
      }),

      columnHelper.display({
        id: 'pin',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const model = row.original
          const isPinned = pinned.some((p) => p.id === model.id)
          const disabled = !isPinned && pinned.length >= 3
          return (
            <button
              onClick={(e) => {
                e.stopPropagation()
                isPinned ? onUnpin(model) : onPin(model)
              }}
              disabled={disabled}
              title={disabled ? 'Unpin a model to add another' : undefined}
              className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${
                isPinned
                  ? 'border-[var(--lagoon)] bg-[var(--lagoon)]/10 text-[var(--lagoon-deep)]'
                  : disabled
                    ? 'cursor-not-allowed border-[var(--line)] text-[var(--sea-ink-soft)] opacity-40'
                    : 'border-[var(--line)] text-[var(--sea-ink-soft)] hover:border-[var(--lagoon)] hover:text-[var(--lagoon-deep)]'
              }`}
            >
              {isPinned ? 'Pinned' : 'Pin'}
            </button>
          )
        },
      }),
    ],
    [pinned, onPin, onUnpin],
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
  })

  const colSpan = table.getVisibleLeafColumns().length

  return (
    <div className="island-shell overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)]">
              {table.getFlatHeaders().map((header) => {
                const canSort = header.column.getCanSort()
                const sorted = header.column.getIsSorted()
                const icon = sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '⇅'
                return (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    tabIndex={canSort ? 0 : undefined}
                    aria-sort={
                      canSort
                        ? sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : 'none'
                        : undefined
                    }
                    onKeyDown={
                      canSort
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              header.column.toggleSorting()
                            }
                          }
                        : undefined
                    }
                    className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)] ${
                      canSort
                        ? 'cursor-pointer select-none hover:text-[var(--sea-ink)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lagoon)]'
                        : ''
                    }`}
                  >
                    {header.isPlaceholder ? null : (
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className={sorted ? 'text-[var(--lagoon)]' : 'opacity-40'}>
                            {icon}
                          </span>
                        )}
                      </span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <tr className="border-b border-[var(--line)] transition-colors last:border-0 hover:bg-[var(--surface)]">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="whitespace-nowrap px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && (
                  <tr>
                    <td colSpan={colSpan} className="p-0">
                      <ModelCardExpanded model={row.original} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-[var(--sea-ink-soft)]">
          No models match your search.
        </div>
      )}
    </div>
  )
}
