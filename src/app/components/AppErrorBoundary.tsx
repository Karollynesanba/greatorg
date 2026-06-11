import React from "react";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[Init] Global error boundary captured a render failure", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fff,#f6f7fb)] px-6 text-slate-900">
          <div className="max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Falha na inicialização</p>
            <h1 className="mt-3 text-2xl font-semibold">Não foi possível carregar a aplicação.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Um erro inesperado interrompeu a renderização. A aplicação registrou o problema no console para
              diagnóstico e você pode tentar recarregar a página.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="rounded-full bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(this.state.error?.stack || this.state.error?.message || "");
                }}
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Copiar erro
              </button>
            </div>
            <pre className="mt-6 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-xs text-slate-100">
              {this.state.error.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
