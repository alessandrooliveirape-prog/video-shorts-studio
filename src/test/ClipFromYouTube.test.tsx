import {render, screen, fireEvent, waitFor, act} from '@testing-library/react';
import {describe, expect, it, vi, afterEach} from 'vitest';
import ClipFromYouTube from '../components/ClipFromYouTube';

describe('ClipFromYouTube', () => {
  const defaultProps = {
    onClipComplete: vi.fn(),
    onCaptionsChange: vi.fn(),
    onProcessingChange: vi.fn(),
  };

  it('renders the title and description', () => {
    render(<ClipFromYouTube {...defaultProps} />);
    expect(screen.getByText(/clipping do youtube/i)).toBeInTheDocument();
    expect(screen.getByText(/extraia os melhores momentos para shorts virais/i)).toBeInTheDocument();
  });

  it('renders the URL input field', () => {
    render(<ClipFromYouTube {...defaultProps} />);
    const input = screen.getByPlaceholderText(/https:\/\/youtube.com\/watch/);
    expect(input).toBeInTheDocument();
  });

  it('renders the extract button', () => {
    render(<ClipFromYouTube {...defaultProps} />);
    expect(screen.getByText(/extrair short/i)).toBeInTheDocument();
  });

  it('shows URL validation error for invalid URLs', () => {
    render(<ClipFromYouTube {...defaultProps} />);
    const input = screen.getByPlaceholderText(/https:\/\/youtube.com\/watch/);
    fireEvent.change(input, {target: {value: 'invalid-url'}});
    expect(screen.getByText(/insira uma url válida do youtube/i)).toBeInTheDocument();
  });

  it('disables extract button when URL is empty', () => {
    render(<ClipFromYouTube {...defaultProps} />);
    const button = screen.getByText(/extrair short/i).closest('button');
    expect(button).toBeDisabled();
  });

  it('enables extract button with a valid YouTube URL', () => {
    render(<ClipFromYouTube {...defaultProps} />);
    const input = screen.getByPlaceholderText(/https:\/\/youtube.com\/watch/);
    fireEvent.change(input, {target: {value: 'https://youtube.com/watch?v=dQw4w9WgXcQ'}});
    const button = screen.getByText(/extrair short/i).closest('button');
    expect(button).not.toBeDisabled();
  });

  it('does not show URL error when input is empty', () => {
    render(<ClipFromYouTube {...defaultProps} />);
    expect(screen.queryByText(/insira uma url válida do youtube/i)).not.toBeInTheDocument();
  });

  it('renders audio effect selector', () => {
    render(<ClipFromYouTube {...defaultProps} />);
    expect(screen.getByText(/mixagem de áudio/i)).toBeInTheDocument();
  });

  it('toggles audio options dropdown on click', () => {
    render(<ClipFromYouTube {...defaultProps} />);
    const audioButton = screen.getByText(/mixagem de áudio/i);
    fireEvent.click(audioButton);
    const originalLabels = screen.getAllByText(/Áudio Original/i);
    expect(originalLabels.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Trending Upbeat/i)).toBeInTheDocument();
    expect(screen.getByText(/Cinematic/i)).toBeInTheDocument();
    expect(screen.getByText(/Lo-Fi Beats/i)).toBeInTheDocument();
    expect(screen.getByText(/EDM Drop/i)).toBeInTheDocument();
    expect(screen.getByText(/Viral Audio/i)).toBeInTheDocument();
  });

  it('renders the audio effect with default "original" selected', () => {
    render(<ClipFromYouTube {...defaultProps} />);
    expect(screen.getByText(/Áudio Original/i)).toBeInTheDocument();
  });

  it('does not show download button in initial idle state', () => {
    render(<ClipFromYouTube {...defaultProps} />);
    expect(screen.queryByText(/download do short/i)).not.toBeInTheDocument();
  });

  it('does not show retry button in initial idle state', () => {
    render(<ClipFromYouTube {...defaultProps} />);
    expect(screen.queryByText(/tentar novamente/i)).not.toBeInTheDocument();
  });

  it('does not show cancel button in initial idle state', () => {
    render(<ClipFromYouTube {...defaultProps} />);
    expect(screen.queryByText(/cancelar processamento/i)).not.toBeInTheDocument();
  });

  it('handles YouTube Shorts URLs as valid', () => {
    render(<ClipFromYouTube {...defaultProps} />);
    const input = screen.getByPlaceholderText(/https:\/\/youtube.com\/watch/);
    fireEvent.change(input, {target: {value: 'https://youtube.com/shorts/abc123'}});
    expect(screen.queryByText(/insira uma url válida do youtube/i)).not.toBeInTheDocument();
  });

  it('handles youtu.be short URLs as valid', () => {
    render(<ClipFromYouTube {...defaultProps} />);
    const input = screen.getByPlaceholderText(/https:\/\/youtube.com\/watch/);
    fireEvent.change(input, {target: {value: 'https://youtu.be/dQw4w9WgXcQ'}});
    expect(screen.queryByText(/insira uma url válida do youtube/i)).not.toBeInTheDocument();
  });

  it('enables extract button when valid URL is provided', () => {
    render(<ClipFromYouTube {...defaultProps} />);
    const input = screen.getByPlaceholderText(/https:\/\/youtube.com\/watch/);
    fireEvent.change(input, {target: {value: 'https://youtube.com/watch?v=dQw4w9WgXcQ'}});
    const button = screen.getByText(/extrair short/i).closest('button');
    expect(button).not.toBeDisabled();
  });

  describe('state transitions', () => {
    const MOCK_SEGMENTS = [
      {start: 0, end: 15, viralHook: 'Hook 1', caption: 'Caption 1'},
      {start: 15, end: 30, viralHook: 'Hook 2', caption: 'Caption 2'},
    ];

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('completes full extract flow and shows download/publish on done', async () => {
      const onClipComplete = vi.fn();
      const onCaptionsChange = vi.fn();
      const onProcessingChange = vi.fn();

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            jobId: 'clip-test123',
            segments: MOCK_SEGMENTS,
          }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'done',
            progress: 100,
            outputPath: '/outputs/clip-test123/final.mp4',
          }),
        });

      vi.stubGlobal('fetch', fetchMock);

      render(
        <ClipFromYouTube
          {...defaultProps}
          onClipComplete={onClipComplete}
          onCaptionsChange={onCaptionsChange}
          onProcessingChange={onProcessingChange}
        />
      );

      const input = screen.getByPlaceholderText(/https:\/\/youtube.com\/watch/);
      fireEvent.change(input, {target: {value: 'https://youtube.com/watch?v=dQw4w9WgXcQ'}});
      const button = screen.getByText(/extrair short/i).closest('button')!;
      await act(async () => { button.click(); });

      await waitFor(() => {
        expect(screen.getByText(/download do short/i)).toBeInTheDocument();
      }, {timeout: 8000});

      expect(screen.getByText(/publicar shorts/i)).toBeInTheDocument();
      expect(screen.getByText(/novo clip/i)).toBeInTheDocument();
      expect(onProcessingChange).toHaveBeenCalledWith(false);
      expect(onClipComplete).toHaveBeenCalledWith(MOCK_SEGMENTS);
      expect(onCaptionsChange).toHaveBeenCalledWith(
        MOCK_SEGMENTS.map((s) => s.caption || s.viralHook)
      );
    }, 15000);

    it('shows error state when extract API fails', async () => {
      const onProcessingChange = vi.fn();

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({detail: 'Falha ao baixar vídeo: erro de URL'}),
      });

      vi.stubGlobal('fetch', fetchMock);

      render(
        <ClipFromYouTube
          {...defaultProps}
          onProcessingChange={onProcessingChange}
        />
      );

      const input = screen.getByPlaceholderText(/https:\/\/youtube.com\/watch/);
      fireEvent.change(input, {target: {value: 'https://youtube.com/watch?v=dQw4w9WgXcQ'}});
      const button = screen.getByText(/extrair short/i).closest('button')!;
      await act(async () => { button.click(); });

      await waitFor(() => {
        expect(screen.getByText(/tentar novamente/i)).toBeInTheDocument();
      }, {timeout: 5000});

      expect(onProcessingChange).toHaveBeenCalledWith(false);
    }, 10000);

    it('shows error state when polling returns error', async () => {
      const onProcessingChange = vi.fn();

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            jobId: 'clip-err456',
            segments: MOCK_SEGMENTS,
          }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'error',
            progress: 0,
            error: 'Erro no processamento do vídeo',
          }),
        });

      vi.stubGlobal('fetch', fetchMock);

      render(
        <ClipFromYouTube
          {...defaultProps}
          onProcessingChange={onProcessingChange}
        />
      );

      const input = screen.getByPlaceholderText(/https:\/\/youtube.com\/watch/);
      fireEvent.change(input, {target: {value: 'https://youtube.com/watch?v=dQw4w9WgXcQ'}});
      const button = screen.getByText(/extrair short/i).closest('button')!;
      await act(async () => { button.click(); });

      await waitFor(() => {
        expect(screen.getByText(/tentar novamente/i)).toBeInTheDocument();
      }, {timeout: 12000});

      expect(onProcessingChange).toHaveBeenCalledWith(false);
    }, 15000);

    it('calls onProcessingChange(true) when extraction starts', async () => {
      const onProcessingChange = vi.fn();
      const fetchMock = vi.fn().mockReturnValue(new Promise(() => {}));
      vi.stubGlobal('fetch', fetchMock);

      render(
        <ClipFromYouTube
          {...defaultProps}
          onProcessingChange={onProcessingChange}
        />
      );

      const input = screen.getByPlaceholderText(/https:\/\/youtube.com\/watch/);
      fireEvent.change(input, {target: {value: 'https://youtube.com/watch?v=dQw4w9WgXcQ'}});
      const button = screen.getByText(/extrair short/i).closest('button')!;
      await act(async () => { button.click(); });

      await waitFor(() => {
        expect(onProcessingChange).toHaveBeenCalledWith(true);
      }, {timeout: 5000});
    }, 10000);
  });
});
