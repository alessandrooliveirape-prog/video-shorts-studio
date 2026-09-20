import {render, screen, fireEvent, waitFor, act} from '@testing-library/react';
import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import ConcatStudio from '../components/ConcatStudio';

describe('ConcatStudio', () => {
  const defaultProps = {
    onConcatComplete: vi.fn(),
    onProcessingChange: vi.fn(),
  };

  it('renders the title and description', () => {
    render(<ConcatStudio {...defaultProps} />);
    expect(screen.getByText(/mesclador de vídeos/i)).toBeInTheDocument();
    expect(screen.getByText(/faça upload de seus clipes/i)).toBeInTheDocument();
  });

  it('renders the upload drop zone', () => {
    render(<ConcatStudio {...defaultProps} />);
    expect(screen.getByText(/arraste seus vídeos aqui/i)).toBeInTheDocument();
    expect(screen.getByText(/ou clique para selecionar do computador/i)).toBeInTheDocument();
  });

  it('renders a hidden file input', () => {
    render(<ConcatStudio {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveClass('hidden');
  });

  it('shows merge button disabled with no videos', () => {
    render(<ConcatStudio {...defaultProps} />);
    const mergeButton = screen.queryByText(/mesclar/i);
    expect(mergeButton).not.toBeInTheDocument();
  });

  it('does not show merge hint in initial state (no videos yet)', () => {
    render(<ConcatStudio {...defaultProps} />);
    expect(screen.queryByText(/faça upload de pelo menos 2 vídeos prontos/i)).not.toBeInTheDocument();
  });

  it('renders audio settings section', () => {
    render(<ConcatStudio {...defaultProps} />);
    expect(screen.queryByText(/música de fundo/i)).not.toBeInTheDocument();
  });

  it('renders title input field (hidden before videos)', () => {
    render(<ConcatStudio {...defaultProps} />);
    expect(screen.queryByPlaceholderText(/insira um título/i)).not.toBeInTheDocument();
  });

  it('shows upload area with drag state styling', () => {
    render(<ConcatStudio {...defaultProps} />);
    const dropZone = screen.getByText(/arraste seus vídeos aqui/i).closest('div');
    expect(dropZone).toBeInTheDocument();
  });

  it('does not show error screen in initial state', () => {
    render(<ConcatStudio {...defaultProps} />);
    expect(screen.queryByText(/falha ao mesclar vídeos/i)).not.toBeInTheDocument();
  });

  it('does not show success screen in initial state', () => {
    render(<ConcatStudio {...defaultProps} />);
    expect(screen.queryByText(/short mesclado com sucesso/i)).not.toBeInTheDocument();
  });

  it('does not show processing state in initial state', () => {
    render(<ConcatStudio {...defaultProps} />);
    expect(screen.queryByText(/criando seu short/i)).not.toBeInTheDocument();
  });

  it('accepts multiple files for upload', () => {
    render(<ConcatStudio {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute('multiple');
  });

  it('accepts video files only', () => {
    render(<ConcatStudio {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute('accept', 'video/*');
  });

  it('renders correctly with onProcessingChange callback', () => {
    const onProcessingChange = vi.fn();
    render(<ConcatStudio {...defaultProps} onProcessingChange={onProcessingChange} />);
    expect(screen.getByText(/mesclador de vídeos/i)).toBeInTheDocument();
  });

  describe('state transitions', () => {
    let mockXHRInstances: any[];

    class MockXMLHttpRequest {
      upload = {addEventListener: vi.fn()};
      readyState = 4;
      status = 200;
      responseText = '';
      open = vi.fn();
      send = vi.fn();
      onreadystatechange: (() => void) | null = null;

      constructor() {
        mockXHRInstances.push(this);
      }

      triggerSuccess(savedName: string) {
        this.responseText = JSON.stringify({
          success: true,
          fileId: `file-${Math.random().toString(36).slice(2, 8)}`,
          savedName,
          duration: 15,
          fileSize: 5 * 1024 * 1024,
        });
        if (this.onreadystatechange) {
          this.onreadystatechange();
        }
      }
    }

    beforeEach(() => {
      mockXHRInstances = [];
      vi.stubGlobal('XMLHttpRequest', MockXMLHttpRequest);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    const simulateUpload = async (savedName: string) => {
      const fileInput = document.querySelector('input[type="file"]')!;
      const file = new File(['test'], 'my_video.mp4', {type: 'video/mp4'});

      await act(async () => {
        fireEvent.change(fileInput, {target: {files: [file]}});
      });

      const xhr = mockXHRInstances[mockXHRInstances.length - 1];
      if (xhr) {
        await act(async () => {
          xhr.triggerSuccess(savedName);
        });
      }
    };

    it('shows upload progress and merge button when videos are uploaded', async () => {
      render(<ConcatStudio {...defaultProps} />);

      await simulateUpload('video1.mp4');
      await simulateUpload('video2.mp4');

      await waitFor(() => {
        expect(screen.getByText(/lista de vídeos/i)).toBeInTheDocument();
      });

      const fileLabels = screen.getAllByText(/my_video\.mp4/i);
      expect(fileLabels.length).toBe(2);

      await waitFor(() => {
        expect(screen.getByText(/mesclar 2 vídeos/i)).toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText(/insira um título/i)).toBeInTheDocument();
      expect(screen.getByText(/música de fundo/i)).toBeInTheDocument();
    });

    it('completes full merge flow and shows success screen', async () => {
      const onConcatComplete = vi.fn();
      const onProcessingChange = vi.fn();

      render(
        <ConcatStudio
          {...defaultProps}
          onConcatComplete={onConcatComplete}
          onProcessingChange={onProcessingChange}
        />
      );

      await simulateUpload('video1.mp4');
      await simulateUpload('video2.mp4');

      await waitFor(() => {
        expect(screen.getByText(/mesclar 2 vídeos/i)).toBeInTheDocument();
      });

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({success: true, jobId: 'concat-test123'}),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'done',
            progress: 100,
            outputPath: '/outputs/concat-test123/final.mp4',
          }),
        });

      vi.stubGlobal('fetch', fetchMock);

      const mergeButton = screen.getByText(/mesclar 2 vídeos/i).closest('button')!;
      await act(async () => { mergeButton.click(); });

      await waitFor(() => {
        expect(screen.getByText(/short mesclado com sucesso/i)).toBeInTheDocument();
      }, {timeout: 8000});

      expect(screen.getByText(/baixar vídeo/i)).toBeInTheDocument();
      expect(screen.getByText(/publicar/i)).toBeInTheDocument();
      expect(onProcessingChange).toHaveBeenCalledWith(false);
      expect(onConcatComplete).toHaveBeenCalled();
    }, 15000);

    it('shows error screen when concat API fails', async () => {
      const onProcessingChange = vi.fn();

      render(
        <ConcatStudio
          {...defaultProps}
          onProcessingChange={onProcessingChange}
        />
      );

      await simulateUpload('video1.mp4');
      await simulateUpload('video2.mp4');

      await waitFor(() => {
        expect(screen.getByText(/mesclar 2 vídeos/i)).toBeInTheDocument();
      });

      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      vi.stubGlobal('fetch', fetchMock);

      const mergeButton = screen.getByText(/mesclar 2 vídeos/i).closest('button')!;
      await act(async () => { mergeButton.click(); });

      await waitFor(() => {
        expect(screen.getByText(/falha ao mesclar vídeos/i)).toBeInTheDocument();
      }, {timeout: 5000});

      expect(screen.getByText(/tentar novamente/i)).toBeInTheDocument();
      expect(onProcessingChange).toHaveBeenCalledWith(false);
    });

    it('shows error screen when status polling returns error', async () => {
      render(<ConcatStudio {...defaultProps} />);

      await simulateUpload('video1.mp4');
      await simulateUpload('video2.mp4');

      await waitFor(() => {
        expect(screen.getByText(/mesclar 2 vídeos/i)).toBeInTheDocument();
      });

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({success: true, jobId: 'concat-err456'}),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'error',
            progress: 0,
            error: 'Falha na concatenação dos vídeos',
          }),
        });

      vi.stubGlobal('fetch', fetchMock);

      const mergeButton = screen.getByText(/mesclar 2 vídeos/i).closest('button')!;
      await act(async () => { mergeButton.click(); });

      await waitFor(() => {
        expect(screen.getByText(/falha ao mesclar vídeos/i)).toBeInTheDocument();
      }, {timeout: 8000});
    }, 15000);
  });
});
