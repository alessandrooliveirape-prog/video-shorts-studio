import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import Header from '../components/Header';

describe('Header', () => {
  const defaultProps = {
    activeTab: 'clip' as const,
    onTabChange: vi.fn(),
    menuOpen: false,
    onMenuToggle: vi.fn(),
  };

  it('renders the logo and brand name', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText(/shorts studio/i)).toBeInTheDocument();
  });

  it('renders navigation tab buttons', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText(/clipping youtube/i)).toBeInTheDocument();
    expect(screen.getByText(/do zero/i)).toBeInTheDocument();
    expect(screen.getByText(/mesclar vídeos/i)).toBeInTheDocument();
  });

  it('renders the version badge', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText(/v1\.2\.0/i)).toBeInTheDocument();
  });
});
