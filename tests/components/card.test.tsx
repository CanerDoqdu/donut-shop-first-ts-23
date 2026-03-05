/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

describe('Card', () => {
  it('renders card with content', () => {
    render(
      <Card>
        <CardContent>Hello</CardContent>
      </Card>
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders full card structure', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('applies custom className to Card', () => {
    const { container } = render(<Card className="my-custom">Content</Card>);
    expect(container.firstChild).toHaveClass('my-custom');
  });

  it('renders CardTitle as h3', () => {
    render(<CardTitle>Heading</CardTitle>);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Heading');
  });
});
