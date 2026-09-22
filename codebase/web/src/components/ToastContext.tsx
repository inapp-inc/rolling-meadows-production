import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { UiIcon } from './UiIcon';

export type ToastKind = 'success' | 'error' | 'warning';

type Toast = { id: number; message: string; kind: ToastKind; show: boolean };

type ToastApi = { showToast: (message: string, kind?: ToastKind) => void };

const ToastContext = createContext<ToastApi>({ showToast: () => undefined });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = nextId++;
    setToasts((current) => [...current, { id, message, kind, show: false }]);
    window.requestAnimationFrame(() => {
      setToasts((current) => current.map((t) => (t.id === id ? { ...t, show: true } : t)));
    });
    window.setTimeout(() => {
      setToasts((current) => current.map((t) => (t.id === id ? { ...t, show: false } : t)));
      window.setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }, 300);
    }, 3200);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.kind}${toast.show ? ' show' : ''}`}>
          {toast.kind === 'success' ? <UiIcon name="check" /> : null}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
