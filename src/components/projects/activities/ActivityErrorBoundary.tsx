import React from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  onClose: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ActivityErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ActivityCard] Erro ao renderizar card:', error, info.componentStack);
  }

  handleClose = () => {
    this.setState({ hasError: false, error: null });
    this.props.onClose();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-y-0 right-0 w-full sm:max-w-[560px] bg-background border-l z-50 flex flex-col items-center justify-center gap-4 p-8">
          <p className="text-muted-foreground text-sm text-center">
            Ocorreu um erro ao abrir o card. Verifique o console e tente novamente.
          </p>
          <Button variant="outline" onClick={this.handleClose}>
            Fechar
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
