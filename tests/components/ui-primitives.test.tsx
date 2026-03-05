/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';

describe('Badge', () => {
  it('renders with default variant', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders with secondary variant', () => {
    render(<Badge variant="secondary">Sale</Badge>);
    expect(screen.getByText('Sale')).toBeInTheDocument();
  });

  it('renders with destructive variant', () => {
    render(<Badge variant="destructive">Error</Badge>);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders with outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>);
    expect(screen.getByText('Outline')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Badge className="custom-class">Test</Badge>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Type here..." />);
    expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument();
  });

  it('renders with type email', () => {
    render(<Input type="email" placeholder="email" />);
    expect(screen.getByPlaceholderText('email')).toHaveAttribute('type', 'email');
  });

  it('applies disabled state', () => {
    render(<Input disabled placeholder="disabled" />);
    expect(screen.getByPlaceholderText('disabled')).toBeDisabled();
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} placeholder="ref test" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});

describe('Label', () => {
  it('renders label text', () => {
    render(<Label>Email</Label>);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('associates with htmlFor', () => {
    render(<Label htmlFor="email-input">Email</Label>);
    expect(screen.getByText('Email')).toHaveAttribute('for', 'email-input');
  });
});

describe('FieldError', () => {
  it('renders error message', () => {
    render(<FieldError message="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('renders nothing when no message', () => {
    const { container } = render(<FieldError />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when message is empty string', () => {
    const { container } = render(<FieldError message="" />);
    expect(container.innerHTML).toBe('');
  });
});
