import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';
export interface Toast { id: string; type: ToastType; message: string; duration: number; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  toasts = this._toasts.asReadonly();

  show(message: string, type: ToastType = 'info', duration = 3500) {
    const id = crypto.randomUUID();
    const t: Toast = { id, type, message, duration };
    this._toasts.update(list => [...list, t]);
    setTimeout(() => this.dismiss(id), duration);
  }
  success(m: string, d = 3500) { this.show(m, 'success', d); }
  error(m: string, d = 4500)   { this.show(m, 'error', d); }
  info(m: string, d = 3500)    { this.show(m, 'info', d); }
  dismiss(id: string)          { this._toasts.update(list => list.filter(t => t.id !== id)); }
  clear()                      { this._toasts.set([]); }
}
