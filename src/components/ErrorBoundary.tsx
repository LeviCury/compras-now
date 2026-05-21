import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card-padded max-w-lg text-center space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
            <AlertTriangle className="h-7 w-7 text-red-600" />
          </div>
          <h1 className="text-xl font-bold">Algo deu errado no painel</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {this.state.error.message}
          </p>
          <pre
            className="text-left text-xs p-3 rounded-lg overflow-auto max-h-48"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
          >
            {this.state.error.stack ?? ''}
          </pre>
          <button onClick={this.reset} className="btn-primary">
            <RefreshCw className="h-4 w-4" /> Recarregar painel
          </button>
        </div>
      </div>
    );
  }
}
