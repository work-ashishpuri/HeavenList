import { PIPELINE_TASKS, type PipelineTask } from '#/lib/hf-api'

const TASK_LABELS: Record<PipelineTask, string> = {
  'text-generation': 'Text Generation',
  'text-classification': 'Text Classification',
  'image-classification': 'Image Classification',
  summarization: 'Summarization',
  'text-to-image': 'Text to Image',
}

interface Props {
  value: PipelineTask
  onChange: (task: PipelineTask) => void
}

export default function TaskDropdown({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PipelineTask)}
      className="cursor-pointer rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon)]"
    >
      {PIPELINE_TASKS.map((task) => (
        <option key={task} value={task}>
          {TASK_LABELS[task]}
        </option>
      ))}
    </select>
  )
}
