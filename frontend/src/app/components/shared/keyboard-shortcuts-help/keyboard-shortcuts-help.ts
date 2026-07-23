import { TranslatePipe } from '@ngx-translate/core';
import { Component, inject, effect } from '@angular/core';

import {
  KeyboardShortcutsService,
  ShortcutDefinition,
} from '../../../services/keyboard-shortcuts.service';

interface ShortcutGroup {
  category: string;
  label: string;
  icon: string;
  shortcuts: ShortcutDefinition[];
}

@Component({
  selector: 'app-keyboard-shortcuts-help',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './keyboard-shortcuts-help.html',
  styleUrl: './keyboard-shortcuts-help.css',
})
export class KeyboardShortcutsHelpComponent {
  private shortcutsService = inject(KeyboardShortcutsService);
  show = this.shortcutsService.showHelp;

  groups: ShortcutGroup[] = [];

  constructor() {
    effect(() => {
      if (this.show()) {
        this.buildGroups();
      }
    });
  }

  private buildGroups() {
    const all = this.shortcutsService.getShortcuts();
    const map = new Map<string, ShortcutDefinition[]>();
    for (const s of all) {
      const list = map.get(s.category) || [];
      list.push(s);
      map.set(s.category, list);
    }

    const meta: Record<string, { label: string; icon: string }> = {
      general: { label: 'General', icon: 'fa-keyboard' },
      canvas: { label: 'Canvas', icon: 'fa-paintbrush' },
      tools: { label: 'Tools', icon: 'fa-wrench' },
      view: { label: 'View', icon: 'fa-magnifying-glass' },
      layer: { label: 'Layer', icon: 'fa-layer-group' },
    };

    this.groups = [];
    for (const [cat, items] of map) {
      const m = meta[cat] || { label: cat, icon: 'fa-circle' };
      this.groups.push({ category: cat, label: m.label, icon: m.icon, shortcuts: items });
    }
  }

  formatKey(shortcut: ShortcutDefinition): string {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push(isMac() ? 'Cmd' : 'Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');

    const keyMap: Record<string, string> = {
      z: 'Z',
      y: 'Y',
      s: 'S',
      b: 'B',
      e: 'E',
      t: 'T',
      r: 'R',
      c: 'C',
      l: 'L',
      a: 'A',
      h: 'H',
      p: 'P',
      delete: 'Del',
      backspace: 'Backspace',
      escape: 'Esc',
      '=': '+',
      '-': '-',
      '0': '0',
      '[': '[',
      ']': ']',
    };

    parts.push(keyMap[shortcut.key] || shortcut.key.toUpperCase());
    return parts.join(' + ');
  }

  close() {
    this.shortcutsService.showHelp.set(false);
  }
}

function isMac(): boolean {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}
