'use client';

import { useState, useCallback, ReactNode } from 'react';
import { DialogType } from '@/lib/types';

interface DialogOptions {
  title: string;
  message: string;
  type: DialogType;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirm?: boolean;
}

interface DialogState extends DialogOptions {
  visible: boolean;
  resolve?: (v: boolean) => void;
}

// SVG icons for each dialog type
function DialogIcon({ type }: { type: DialogType }) {
  if (type === 'success')
    return (
      <div className="dialog-icon dialog-icon-success">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
    );
  if (type === 'warning')
    return (
      <div className="dialog-icon dialog-icon-warning">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-yellow)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
    );
  return (
    <div className="dialog-icon dialog-icon-danger">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>
  );
}

// Hook to use dialog imperatively
let _showDialog: ((opts: DialogOptions) => Promise<boolean>) | null = null;

export function useDialog() {
  return {
    alert: (title: string, message: string, type: DialogType = 'success') =>
      _showDialog?.({ title, message, type, isConfirm: false, confirmLabel: 'Entendido' }) ?? Promise.resolve(true),
    confirm: (title: string, message: string, type: DialogType = 'warning') =>
      _showDialog?.({ title, message, type, isConfirm: true, confirmLabel: 'Sim, Confirmar', cancelLabel: 'Cancelar' }) ?? Promise.resolve(false),
  };
}

// Provider that renders the dialog and registers the imperative handle
export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>({ visible: false, title: '', message: '', type: 'success' });

  const showDialog = useCallback((opts: DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({ ...opts, visible: true, resolve });
    });
  }, []);

  // Register globally
  _showDialog = showDialog;

  const close = (result: boolean) => {
    dialog.resolve?.(result);
    setDialog((d) => ({ ...d, visible: false }));
  };

  if (!dialog.visible) return <>{children}</>;

  return (
    <>
      {children}
      <div className="dialog-backdrop" onClick={() => close(false)}>
        <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
          <div className="dialog-header">
            <DialogIcon type={dialog.type} />
            <div className="dialog-text">
              <div className="dialog-title">{dialog.title}</div>
              <div className="dialog-message" dangerouslySetInnerHTML={{ __html: dialog.message }} />
            </div>
          </div>
          <div className="dialog-actions">
            {dialog.isConfirm && (
              <button className="btn btn-outline dialog-btn" style={{ borderRadius: 'var(--border-radius-sm)' }} onClick={() => close(false)}>
                {dialog.cancelLabel ?? 'Cancelar'}
              </button>
            )}
            <button
              className={`btn dialog-btn ${dialog.type === 'danger' ? 'btn-secondary' : 'btn-primary'}`}
              style={{ borderRadius: 'var(--border-radius-sm)', boxShadow: 'none', backgroundColor: dialog.type === 'success' ? 'var(--color-secondary)' : dialog.type === 'warning' ? 'var(--color-yellow)' : 'var(--color-error)' }}
              onClick={() => close(true)}
            >
              {dialog.confirmLabel ?? 'OK'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
