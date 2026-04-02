import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchModels, type PipelineTask, type HFModel } from '#/lib/hf-api'
import ModelTable from '#/components/ModelTable'
import TaskDropdown from '#/components/TaskDropdown'
import ComparisonPanel from '#/components/ComparisonPanel'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const [task, setTask] = useState<PipelineTask>('text-generation')
  const [search, setSearch] = useState('')
  const [pinned, setPinned] = useState<HFModel[]>([])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['models', task],
    queryFn: () => fetchModels(task),
    staleTime: 5 * 60 * 1000,
  })

  const filtered = (data ?? []).filter((m) =>
    m.id.toLowerCase().includes(search.toLowerCase()),
  )

  function pin(model: HFModel) {
    if (pinned.length >= 3 || pinned.some((p) => p.id === model.id)) return
    setPinned((prev) => [...prev, model])
  }

  function unpin(model: HFModel) {
    setPinned((prev) => prev.filter((p) => p.id !== model.id))
  }

  return (
    <main
      className="page-wrap py-8"
      style={{ paddingBottom: pinned.length > 0 ? '22rem' : '2rem' }}
    >
      <div className="mb-6">
        <h1 className="display-title m-0 text-3xl font-bold text-[var(--sea-ink)]">
          Heavenlist
        </h1>
        <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
          Browse and compare HuggingFace models
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <TaskDropdown value={task} onChange={setTask} />
        <input
          type="search"
          placeholder="Search models…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--sea-ink)] outline-none placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon)]"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-sm text-[var(--sea-ink-soft)]">
          Loading models…
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          <span>Failed to load models from HuggingFace.</span>
          <button
            onClick={() => void refetch()}
            className="ml-auto shrink-0 rounded-lg border border-red-400/40 px-3 py-1 text-xs font-semibold transition hover:bg-red-500/10"
          >
            Retry
          </button>
        </div>
      )}

      {data && <ModelTable data={filtered} pinned={pinned} onPin={pin} onUnpin={unpin} />}

      <ComparisonPanel pinned={pinned} onUnpin={unpin} />
    </main>
  )
}
