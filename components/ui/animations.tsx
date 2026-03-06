import { ReactNode } from 'react';

interface FadeInProps {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeIn({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  className = '',
}: FadeInProps) {
  void direction;
  void delay;
  void duration;

  return (
    <div className={className}>
      {children}
    </div>
  );
}

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerContainer({
  children,
  className = '',
  staggerDelay = 0.1,
}: StaggerContainerProps) {
  void staggerDelay;
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export function StaggerItem({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export function FloatingElement({
  children,
  className = '',
  duration = 3,
  distance = 15,
}: {
  children: ReactNode;
  className?: string;
  duration?: number;
  distance?: number;
}) {
  void duration;
  void distance;
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export function ScaleOnHover({
  children,
  className = '',
  scale = 1.05,
}: {
  children: ReactNode;
  className?: string;
  scale?: number;
}) {
  void scale;
  return (
    <div className={className}>
      {children}
    </div>
  );
}
