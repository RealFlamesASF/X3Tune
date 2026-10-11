import { useSyncExternalStore } from 'react';
import type { AppNotification, NotificationKind } from '../types';

/**
 * NotificationSystem — tiny external store for toast notifications.
 * Usable from plain modules (`Notifications.success(...)`) and from React (`useNotifications()`).
 */
type Listener = () => void;

class NotificationStore {
  private items: AppNotification[] = [];
  private listeners = new Set<Listener>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.items;

  private emit() {
    this.listeners.forEach((l) => l());
  }

  push(kind: NotificationKind, title: string, message?: string, durationMs = 5000): string {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Keep at most 5 toasts on screen.
    this.items = [...this.items, { id, kind, title, message, durationMs }].slice(-5);
    this.emit();
    if (durationMs > 0) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), durationMs),
      );
    }
    return id;
  }

  dismiss(id: string) {
    const t = this.timers.get(id);
    if (t) clearTimeout(t);
    this.timers.delete(id);
    this.items = this.items.filter((n) => n.id !== id);
    this.emit();
  }

  success = (title: string, message?: string) => this.push('success', title, message);
  error = (title: string, message?: string) => this.push('error', title, message, 8000);
  warning = (title: string, message?: string) => this.push('warning', title, message, 7000);
  info = (title: string, message?: string) => this.push('info', title, message);
}

export const Notifications = new NotificationStore();

export function useNotifications(): AppNotification[] {
  return useSyncExternalStore(Notifications.subscribe, Notifications.getSnapshot);
}
