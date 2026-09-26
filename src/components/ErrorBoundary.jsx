import { Component } from 'react'

// Catches errors thrown while rendering its children, so one broken section
// shows a fallback instead of unmounting the whole app.
// It does NOT catch errors in event handlers, async code (fetch/await) or
// setTimeout. Those still need try/catch or an error state.
//
// Usage:
//   <ErrorBoundary name="Stats" fallback={({ error, reset }) => ...}>
//     <Stats />
//   </ErrorBoundary>
// `fallback` is optional. Without it a default card with "Try again" is shown.
export default class ErrorBoundary extends Component {
  state = { error: null }

  // Render phase: switch to the fallback on the next render.
  static getDerivedStateFromError(error) {
    return { error }
  }

  // Commit phase: the place for side effects such as logging.
  componentDidCatch(error, info) {
    console.error(`[ErrorBoundary: ${this.props.name ?? 'section'}]`, error, info.componentStack)
  }

  // Clearing the error re-mounts the children, giving them a fresh start.
  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const { fallback, name = 'This section' } = this.props
    if (fallback) return fallback({ error, reset: this.reset })

    return (
      <div className="boundary" role="alert">
        <strong>{name} failed to load.</strong>
        <p className="muted small">The rest of the page still works.</p>
        <button className="ghost" onClick={this.reset}>Try again</button>
      </div>
    )
  }
}
