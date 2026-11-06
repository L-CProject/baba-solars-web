import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State { error: Error | null }

/** Catches render errors anywhere in the tree and offers a reload. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="grid min-h-dvh place-items-center bg-canvas p-6 text-center">
        <div className="max-w-md">
          <h1 className="text-3xl">This page stopped working</h1>
          <p className="mt-3 text-muted">An unexpected error occurred. Reload the page; if it keeps happening, call us directly.</p>
          <button onClick={() => window.location.reload()} className="mt-6 h-11 rounded-field bg-primary px-5 font-semibold text-snow-50">Reload page</button>
        </div>
      </div>
    )
  }
}
