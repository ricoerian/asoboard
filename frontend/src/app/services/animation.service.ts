import { Injectable } from '@angular/core';
import Konva from 'konva';
import { AnimationConfig } from '../models/types';

@Injectable({
  providedIn: 'root',
})
export class AnimationService {
  private activeAnimations = new Map<string, Konva.Animation>();

  /**
   * Apply animation behavior to a Konva node
   */
  applyAnimation(node: Konva.Node, config: AnimationConfig): void {
    this.stopAnimation(node.id());

    if (config.behavior === 'none') return;

    const animation = this.createAnimation(node, config);
    if (animation) {
      this.activeAnimations.set(node.id(), animation);
      animation.start();
    }
  }

  /**
   * Stop animation for a specific node
   */
  stopAnimation(nodeId: string): void {
    const animation = this.activeAnimations.get(nodeId);
    if (animation) {
      animation.stop();
      this.activeAnimations.delete(nodeId);
    }
  }

  /**
   * Stop all active animations
   */
  stopAllAnimations(): void {
    this.activeAnimations.forEach((animation) => animation.stop());
    this.activeAnimations.clear();
  }

  private createAnimation(node: Konva.Node, config: AnimationConfig): Konva.Animation | null {
    switch (config.behavior) {
      case 'orbit':
        return this.createOrbitAnimation(node, config);
      case 'bounce':
        return this.createBounceAnimation(node, config);
      case 'pulse':
        return this.createPulseAnimation(node, config);
      case 'float':
        return this.createFloatAnimation(node, config);
      case 'spin':
        return this.createSpinAnimation(node, config);
      case 'shake':
        return this.createShakeAnimation(node, config);
      case 'fade':
        return this.createFadeAnimation(node, config);
      case 'scale':
        return this.createScaleAnimation(node, config);
      default:
        return null;
    }
  }

  private createOrbitAnimation(node: Konva.Node, config: AnimationConfig): Konva.Animation {
    const centerX = node.x();
    const centerY = node.y();
    const radius = config.radius || 50;
    const speed = config.speed || 1;

    return new Konva.Animation((frame) => {
      if (!frame) return;
      const angle = (frame.time / 1000) * speed;
      node.x(centerX + radius * Math.cos(angle));
      node.y(centerY + radius * Math.sin(angle));
    }, node.getLayer());
  }

  private createBounceAnimation(node: Konva.Node, config: AnimationConfig): Konva.Animation {
    const startY = node.y();
    const amplitude = config.amplitude || 30;
    const speed = config.speed || 1;

    return new Konva.Animation((frame) => {
      if (!frame) return;
      const time = (frame.time / 1000) * speed;
      const bounce = Math.abs(Math.sin(time * Math.PI)) * amplitude;
      node.y(startY - bounce);
    }, node.getLayer());
  }

  private createPulseAnimation(node: Konva.Node, config: AnimationConfig): Konva.Animation {
    const baseScaleX = node.scaleX();
    const baseScaleY = node.scaleY();
    const speed = config.speed || 1;

    return new Konva.Animation((frame) => {
      if (!frame) return;
      const time = (frame.time / 1000) * speed;
      const scale = 1 + Math.sin(time * Math.PI * 2) * 0.2;
      node.scaleX(baseScaleX * scale);
      node.scaleY(baseScaleY * scale);
    }, node.getLayer());
  }

  private createFloatAnimation(node: Konva.Node, config: AnimationConfig): Konva.Animation {
    const startY = node.y();
    const amplitude = config.amplitude || 15;
    const speed = config.speed || 1;

    return new Konva.Animation((frame) => {
      if (!frame) return;
      const time = (frame.time / 1000) * speed;
      node.y(startY + Math.sin(time * Math.PI) * amplitude);
    }, node.getLayer());
  }

  private createSpinAnimation(node: Konva.Node, config: AnimationConfig): Konva.Animation {
    const speed = config.speed || 1;

    return new Konva.Animation((frame) => {
      if (!frame) return;
      const rotation = ((frame.time / 1000) * 360 * speed) % 360;
      node.rotation(rotation);
    }, node.getLayer());
  }

  private createShakeAnimation(node: Konva.Node, config: AnimationConfig): Konva.Animation {
    const startX = node.x();
    const amplitude = config.amplitude || 5;
    const speed = config.speed || 8;

    return new Konva.Animation((frame) => {
      if (!frame) return;
      const offset = (Math.random() - 0.5) * amplitude * speed;
      node.x(startX + offset);
    }, node.getLayer());
  }

  private createFadeAnimation(node: Konva.Node, config: AnimationConfig): Konva.Animation {
    const speed = config.speed || 1;

    return new Konva.Animation((frame) => {
      if (!frame) return;
      const time = (frame.time / 1000) * speed;
      const opacity = (Math.sin(time * Math.PI * 2) + 1) / 2;
      node.opacity(opacity);
    }, node.getLayer());
  }

  private createScaleAnimation(node: Konva.Node, config: AnimationConfig): Konva.Animation {
    const baseScaleX = node.scaleX();
    const baseScaleY = node.scaleY();
    const speed = config.speed || 1;

    return new Konva.Animation((frame) => {
      if (!frame) return;
      const time = (frame.time / 1000) * speed;
      const scale = 0.5 + (Math.sin(time * Math.PI * 2) + 1) * 0.5;
      node.scaleX(baseScaleX * scale);
      node.scaleY(baseScaleY * scale);
    }, node.getLayer());
  }
}
