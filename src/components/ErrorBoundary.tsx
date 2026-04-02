import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-lg font-semibold text-[var(--sea-ink)]">Something went wrong</p>
          <p className="max-w-md text-sm text-[var(--sea-ink-soft)]">
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] transition hover:border-[var(--lagoon)] hover:text-[var(--lagoon-deep)]"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
