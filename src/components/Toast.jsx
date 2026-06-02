// src/components/Toast.jsx
// Toast notification system to replace native alert() calls
import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle2 size={18} />,
  error: <XCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

function ToastItem({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 250);
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  return (
    <div className={`toast-item toast-${toast.type} ${exiting ? 'toast-exit' : ''}`}>
      <span className="shrink-0">{ICONS[toast.type] || ICONS.info}</span>
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => { setExiting(true); setTimeout(() => onRemove(toast.id), 250); }}
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity cursor-pointer bg-transparent border-none p-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

let _toastCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_toastCounter;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback({
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  }, [addToast]);

  // Make toast also accessible as a function
  const toastFn = useCallback((msg, type, dur) => addToast(msg, type || 'info', dur), [addToast]);
  toastFn.success = toast.success;
  toastFn.error = toast.error;
  toastFn.warning = toast.warning;
  toastFn.info = toast.info;

  return (
    <ToastContext.Provider value={toastFn}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback to alert if not inside provider
    const fallback = (msg) => alert(msg);
    fallback.success = fallback;
    fallback.error = fallback;
    fallback.warning = fallback;
    fallback.info = fallback;
    return fallback;
  }
  return ctx;
}
