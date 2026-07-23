import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class ModalComponent {
  @Input() title = '';
  @Input() icon = '';
  @Input() color: 'sky' | 'pink' | 'green' | 'orange' | 'yellow' = 'sky';
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  @Input() showCancel = true;
  @Input() confirmDisabled = false;
  @Input() confirmIcon = '';

  @Output() modalClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  get borderColorClass() {
    return {
      'border-sky-300/50 shadow-sky-200/50': this.color === 'sky',
      'border-pink-300/50 shadow-pink-200/50': this.color === 'pink',
      'border-green-300/50 shadow-green-200/50': this.color === 'green',
      'border-orange-300/50 shadow-orange-200/50': this.color === 'orange',
      'border-yellow-300/50 shadow-yellow-200/50': this.color === 'yellow',
    };
  }

  get iconColorClass() {
    return {
      'text-sky-400': this.color === 'sky',
      'text-pink-400': this.color === 'pink',
      'text-green-400': this.color === 'green',
      'text-orange-400': this.color === 'orange',
      'text-yellow-500': this.color === 'yellow',
    };
  }

  get confirmButtonClass() {
    return {
      'bg-sky-500 hover:bg-sky-400 shadow-sky-300/50': this.color === 'sky',
      'bg-pink-500 hover:bg-pink-400 shadow-pink-300/50': this.color === 'pink',
      'bg-green-500 hover:bg-green-400 shadow-green-300/50': this.color === 'green',
      'bg-orange-500 hover:bg-orange-400 shadow-orange-300/50': this.color === 'orange',
      'bg-yellow-500 hover:bg-yellow-400 shadow-yellow-300/50': this.color === 'yellow',
    };
  }
}
