import { Component } from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log error to console in development only
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/feed';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-dark-card rounded-2xl p-8 border border-gray-800">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">
                Something went wrong
              </h1>

              <p className="text-gray-400 mb-6">
                The app encountered an unexpected error. This has been noted and we're working on a fix.
              </p>

              {import.meta.env.DEV && this.state.error && (
                <div className="bg-dark-bg rounded-lg p-4 mb-6 text-left overflow-auto max-h-32">
                  <code className="text-xs text-red-400">
                    {this.state.error.toString()}
                  </code>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-dark-bg text-white rounded-xl hover:bg-gray-800 transition-colors"
                >
                  <Home className="w-5 h-5" />
                  Go Home
                </button>

                <button
                  onClick={this.handleReload}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neon-blue text-white rounded-xl hover:bg-neon-blue/80 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  Reload
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
