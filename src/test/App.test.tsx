import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders the header with the title', () => {
    render(<App />);
    const headings = screen.getAllByText(/shorts studio/i);
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the Clipping card', () => {
    render(<App />);
    expect(screen.getAllByText(/clipping/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders feature cards', () => {
    render(<App />);
    expect(screen.getByText(/geração ia/i)).toBeInTheDocument();
  });

  it('renders the footer', () => {
    render(<App />);
    expect(screen.getByText(/criado com google gemini/i)).toBeInTheDocument();
  });
});
