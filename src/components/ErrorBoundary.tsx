import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] flex flex-col items-center justify-center gap-4 p-8">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="text-lg font-medium text-foreground">
            {this.props.fallbackMessage || 'Une erreur est survenue'}
          </p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {this.state.error?.message}
          </p>
          <Button variant="outline" onClick={() => this.setState({ hasError: false, error: null })}>
            Réessayer
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
