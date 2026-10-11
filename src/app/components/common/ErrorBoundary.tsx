import React from 'react';

/** Keeps one broken module from turning the whole app white; shows the error and a retry button. */
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode; resetKey?: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) { return { error }; }

  componentDidCatch(error: Error) { console.error('Module crashed:', error); }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="m-4 p-5 rounded-2xl border border-red-200 bg-red-50 text-red-800">
        <p className="font-semibold mb-1">Fitur ini mengalami error</p>
        <p className="text-sm mb-3 break-words">{this.state.error.message}</p>
        <button onClick={() => this.setState({ error: null })}
          className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">Coba lagi</button>
      </div>
    );
  }
}
