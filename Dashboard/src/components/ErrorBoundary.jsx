import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center text-slate-400">
          <h2 className="text-xl font-bold text-rose-500 mb-2">Something went wrong</h2>
          <p>An error occurred in this section. Please refresh the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
export default ErrorBoundary;