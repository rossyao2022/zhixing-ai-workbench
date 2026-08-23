import { Component, type ErrorInfo, type ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  failed: boolean;
};

export default class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("KuaKua AI render recovery", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="fatal-screen" data-testid="app-error-fallback">
        <section className="fatal-card">
          <span className="fatal-mark">夸</span>
          <small>KUAKUA AI · SAFE RECOVERY</small>
          <h1>页面刚刚没有完成加载</h1>
          <p>账号和学习记录仍然保留。重新载入后，平台会从安全状态继续恢复。</p>
          <button onClick={() => window.location.reload()}>重新载入</button>
        </section>
      </main>
    );
  }
}
