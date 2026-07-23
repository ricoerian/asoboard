import { Injectable, OnDestroy } from '@angular/core';
import { signal } from '@angular/core';

export interface ShortcutDefinition {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
  alt?: boolean;
  description: string;
  category: 'canvas' | 'tools' | 'view' | 'general';
  action: () => void;
  allowInInput?: boolean;
}

@Injectable({ providedIn: 'root' })
export class KeyboardShortcutsService implements OnDestroy {
  showHelp = signal(false);
  private shortcuts: ShortcutDefinition[] = [];
  private boundHandler: (e: KeyboardEvent) => void;
  private active = false;

  constructor() {
    this.boundHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
  }

  activate() {
    if (this.active) return;
    this.active = true;
    document.addEventListener('keydown', this.boundHandler);
  }

  deactivate() {
    this.active = false;
    document.removeEventListener('keydown', this.boundHandler);
  }

  register(shortcuts: ShortcutDefinition[]) {
    this.shortcuts = shortcuts;
  }

  clear() {
    this.shortcuts = [];
  }

  getShortcuts(): ShortcutDefinition[] {
    return [...this.shortcuts];
  }

  toggleHelp() {
    this.showHelp.update((v) => !v);
  }

  private isInputFocused(): boolean {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === '?' && !this.isInputFocused()) {
      e.preventDefault();
      this.toggleHelp();
      return;
    }

    if (this.showHelp() && e.key === 'Escape') {
      e.preventDefault();
      this.showHelp.set(false);
      return;
    }

    for (const shortcut of this.shortcuts) {
      if (this.matchesShortcut(e, shortcut)) {
        if (!shortcut.allowInInput && this.isInputFocused()) continue;
        e.preventDefault();
        e.stopPropagation();
        shortcut.action();
        return;
      }
    }
  }

  private matchesShortcut(e: KeyboardEvent, shortcut: ShortcutDefinition): boolean {
    const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
    const ctrlMatch = !!shortcut.ctrl === (e.ctrlKey || e.metaKey);
    const shiftMatch = !!shortcut.shift === e.shiftKey;
    const altMatch = !!shortcut.alt === e.altKey;
    return keyMatch && ctrlMatch && shiftMatch && altMatch;
  }

  ngOnDestroy() {
    this.deactivate();
  }
}
