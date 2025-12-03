import { Button, Result } from 'antd';
import type { ErrorInfo, ReactNode } from 'react';
import { Component as ReactComponent } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends ReactComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Result
          status="500"
          title="Có lỗi xảy ra"
          subTitle={
            this.state.error?.message ||
            'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.'
          }
          extra={
            <Button type="primary" onClick={this.handleReset}>
              Thử lại
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}
