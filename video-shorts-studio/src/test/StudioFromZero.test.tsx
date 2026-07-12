import {render, screen, fireEvent, waitFor, act} from '@testing-library/react';
import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import StudioFromZero from '../components/StudioFromZero';

describe('StudioFromZero', () => {
  const defaultProps = {
    onProjectComplete: vi.fn(),
    onCaptionsChange: vi.fn(),
    onProcessingChange: vi.fn(),
    onPreviewUpdate: vi.fn(),
  };

  beforeEach(() => {
    // localStorage is cleared only inside 'state transitions' describe
  });

  it('renders the title and description', () => {
    render(<StudioFromZero {...defaultProps} />);
    expect(screen.getByText(/estúdio do zero ia/i)).toBeInTheDocument();
    expect(screen.getByText(/gere vídeos completos com roteirização/i)).toBeInTheDocument();
  });

  it('renders the AI script mode toggle as active by default', () => {
    render(<StudioFromZero {...defaultProps} />);
    expect(screen.getByText(/roteiro ia/i)).toBeInTheDocument();
    expect(screen.getByText(/meu roteiro/i)).toBeInTheDocument();
  });

  it('renders the idea input textarea in AI mode', () => {
    render(<StudioFromZero {...defaultProps} />);
    expect(screen.getByPlaceholderText(/descreva sua ideia para o vídeo/i)).toBeInTheDocument();
  });

  it('renders idea suggestion buttons', () => {
    render(<StudioFromZero {...defaultProps} />);
    expect(screen.getByText(/fatos curiosos sobre o espaço/i)).toBeInTheDocument();
    expect(screen.getByText(/dicas rápidas de produtividade/i)).toBeInTheDocument();
    expect(screen.getByText(/mitos e verdades sobre alimentação/i)).toBeInTheDocument();
    expect(screen.getByText(/tutorial de 30 segundos/i)).toBeInTheDocument();
  });

  it('fills idea input when a suggestion is clicked', () => {
    render(<StudioFromZero {...defaultProps} />);
    fireEvent.click(screen.getByText(/fatos curiosos sobre o espaço/i));
    const textarea = screen.getByPlaceholderText(/descreva sua ideia para o vídeo/i);
    expect(textarea).toHaveValue('Fatos curiosos sobre o espaço que você não sabia');
  });

  it('renders visual engine selector with 3 options', () => {
    render(<StudioFromZero {...defaultProps} />);
    expect(screen.getByText(/pexels/i)).toBeInTheDocument();
    expect(screen.getByText(/imagens ia/i)).toBeInTheDocument();
    expect(screen.getByText(/veo vídeos/i)).toBeInTheDocument();
  });

  it('renders the generate button', () => {
    render(<StudioFromZero {...defaultProps} />);
    expect(screen.getByText(/gerar vídeo do zero/i)).toBeInTheDocument();
  });

  it('disables the generate button when idea is empty', () => {
    render(<StudioFromZero {...defaultProps} />);
    const button = screen.getByText(/gerar vídeo do zero/i).closest('button');
    expect(button).toBeDisabled();
  });

  it('enables the generate button when idea is provided', () => {
    render(<StudioFromZero {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/descreva sua ideia para o vídeo/i);
    fireEvent.change(textarea, {target: {value: 'Dicas de produtividade'}});
    const button = screen.getByText(/gerar vídeo do zero/i).closest('button');
    expect(button).not.toBeDisabled();
  });

  it('switches to manual mode when "Meu roteiro" is clicked', () => {
    render(<StudioFromZero {...defaultProps} />);
    fireEvent.click(screen.getByText(/meu roteiro/i));
    expect(screen.getByPlaceholderText(/digite uma cena por linha/i)).toBeInTheDocument();
  });

  it('renders voice selector with available voices', () => {
    render(<StudioFromZero {...defaultProps} />);
    expect(screen.getByText(/voz da narração/i)).toBeInTheDocument();
    expect(screen.getByText('Antonio')).toBeInTheDocument();
    expect(screen.getByText('Francisca')).toBeInTheDocument();
    expect(screen.getByText('Thalita')).toBeInTheDocument();
  });

  it('renders subtitle style selector', () => {
    render(<StudioFromZero {...defaultProps} />);
    expect(screen.getByText(/estilo da legenda/i)).toBeInTheDocument();
    expect(screen.getByText(/amarelo premium/i)).toBeInTheDocument();
    expect(screen.getByText(/branco minimal/i)).toBeInTheDocument();
    expect(screen.getByText(/neon roxo/i)).toBeInTheDocument();
  });

  it('renders position selector', () => {
    render(<StudioFromZero {...defaultProps} />);
    expect(screen.getByText(/posição/i)).toBeInTheDocument();
    expect(screen.getByText(/topo/i)).toBeInTheDocument();
    expect(screen.getByText(/centro/i)).toBeInTheDocument();
    expect(screen.getByText(/baixo/i)).toBeInTheDocument();
  });

  it('renders transition type selector', () => {
    render(<StudioFromZero {...defaultProps} />);
    expect(screen.getByText(/transição/i)).toBeInTheDocument();
    expect(screen.getByText(/crossfade/i)).toBeInTheDocument();
    expect(screen.getByText(/slide/i)).toBeInTheDocument();
    expect(screen.getByText(/círculo/i)).toBeInTheDocument();
    expect(screen.getByText(/wipe/i)).toBeInTheDocument();
  });

  it('renders transition duration slider', () => {
    render(<StudioFromZero {...defaultProps} />);
    expect(screen.getByText(/duração/i)).toBeInTheDocument();
    const slider = document.querySelector('input[type="range"]');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('min', '0.3');
    expect(slider).toHaveAttribute('max', '1.0');
    expect(slider).toHaveAttribute('step', '0.1');
  });

  it('renders template presets', () => {
    render(<StudioFromZero {...defaultProps} />);
    expect(screen.getByText(/template visual/i)).toBeInTheDocument();
    expect(screen.getByText(/tecnologia/i)).toBeInTheDocument();
    expect(screen.getByText(/gaming/i)).toBeInTheDocument();
    expect(screen.getByText(/minimalista/i)).toBeInTheDocument();
  });

  it('does not show progress/error sections when idle', () => {
    render(<StudioFromZero {...defaultProps} />);
    expect(screen.queryByText(/roteirizando com gemini/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/concatenando cenas/i)).not.toBeInTheDocument();
  });

  it('does not show done actions when idle', () => {
    render(<StudioFromZero {...defaultProps} />);
    expect(screen.queryByText(/vídeo gerado com sucesso/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/download do short/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/publicar shorts/i)).not.toBeInTheDocument();
  });

  it('changes visual engine when clicked', () => {
    render(<StudioFromZero {...defaultProps} />);
    const geminiButton = screen.getByText(/imagens ia/i).closest('button');
    fireEvent.click(geminiButton!);
    expect(screen.getByText(/gerar vídeo do zero/i)).toBeInTheDocument();
  });

  it('enables generate button when idea is provided', () => {
    render(<StudioFromZero {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/descreva sua ideia para o vídeo/i);
    fireEvent.change(textarea, {target: {value: 'Dicas de produtividade'}});
    const button = screen.getByText(/gerar vídeo do zero/i).closest('button');
    expect(button).not.toBeDisabled();
  });

  describe('state transitions', () => {
    const MOCK_SCENES = [
      {
        sceneIndex: 0,
        sceneDescription: 'Cena de abertura impactante',
        duration: 6.0,
        caption: 'Isto vai mudar sua vida!',
        visualPrompt: 'dramatic opening cinematic',
      },
      {
        sceneIndex: 1,
        sceneDescription: 'Explicação do conceito principal',
        duration: 6.0,
        caption: 'Veja como funciona na prática.',
        visualPrompt: 'concept explanation animation',
      },
      {
        sceneIndex: 2,
        sceneDescription: 'Demonstração visual impressionante',
        duration: 6.0,
        caption: 'Resultados que você pode alcançar!',
        visualPrompt: 'amazing results showcase',
      },
    ];

    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('completes full Pexels flow and shows success screen', async () => {
      const onProjectComplete = vi.fn();
      const onCaptionsChange = vi.fn();
      const onProcessingChange = vi.fn();

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            projectId: 'studio-test123',
            scenes: MOCK_SCENES,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({success: true, sceneIndex: 0}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({success: true, sceneIndex: 1}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({success: true, sceneIndex: 2}),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            success: true,
            projectId: 'studio-test123',
            outputPath: '/outputs/studio-test123/final.mp4',
          }),
        });

      vi.stubGlobal('fetch', fetchMock);

      render(
        <StudioFromZero
          {...defaultProps}
          onProjectComplete={onProjectComplete}
          onCaptionsChange={onCaptionsChange}
          onProcessingChange={onProcessingChange}
        />
      );

      const textarea = screen.getByPlaceholderText(/descreva sua ideia para o vídeo/i);
      fireEvent.change(textarea, {target: {value: 'Dicas de produtividade'}});
      const button = screen.getByText(/gerar vídeo do zero/i).closest('button')!;
      await act(async () => { button.click(); });

      await waitFor(() => {
        expect(screen.getByText(/vídeo gerado com sucesso/i)).toBeInTheDocument();
      }, {timeout: 10000});

      expect(screen.getByText(/download do short/i)).toBeInTheDocument();
      expect(screen.getByText(/publicar shorts/i)).toBeInTheDocument();
      expect(onProcessingChange).toHaveBeenCalledWith(false);
      expect(onProjectComplete).toHaveBeenCalledWith(
        MOCK_SCENES,
        expect.stringContaining('/api/download/studio-test123')
      );
      expect(onCaptionsChange).toHaveBeenCalledWith(
        MOCK_SCENES.map((s) => s.caption)
      );
    });

    it('shows error state when script generation fails', async () => {
      const onProcessingChange = vi.fn();

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      vi.stubGlobal('fetch', fetchMock);

      render(
        <StudioFromZero
          {...defaultProps}
          onProcessingChange={onProcessingChange}
        />
      );

      const textarea = screen.getByPlaceholderText(/descreva sua ideia para o vídeo/i);
      fireEvent.change(textarea, {target: {value: 'Dicas de produtividade'}});
      const button = screen.getByText(/gerar vídeo do zero/i).closest('button')!;
      await act(async () => { button.click(); });

      await waitFor(() => {
        expect(screen.getByText(/tentar novamente/i)).toBeInTheDocument();
      }, {timeout: 5000});

      expect(onProcessingChange).toHaveBeenCalledWith(false);
    });

    it('shows error state when script returns no scenes', async () => {
      const onProcessingChange = vi.fn();

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          error: 'IA não conseguiu gerar cenas para esta ideia',
        }),
      });

      vi.stubGlobal('fetch', fetchMock);

      render(
        <StudioFromZero
          {...defaultProps}
          onProcessingChange={onProcessingChange}
        />
      );

      const textarea = screen.getByPlaceholderText(/descreva sua ideia para o vídeo/i);
      fireEvent.change(textarea, {target: {value: 'Dicas de produtividade'}});
      const button = screen.getByText(/gerar vídeo do zero/i).closest('button')!;
      await act(async () => { button.click(); });

      await waitFor(() => {
        expect(screen.getByText(/tentar novamente/i)).toBeInTheDocument();
      }, {timeout: 5000});
    });

    it('shows error state when scene generation fails', async () => {
      const onProcessingChange = vi.fn();

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            projectId: 'studio-fail456',
            scenes: MOCK_SCENES,
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({success: false, error: 'fallback'}),
        });

      vi.stubGlobal('fetch', fetchMock);

      render(
        <StudioFromZero
          {...defaultProps}
          onProcessingChange={onProcessingChange}
        />
      );

      const textarea = screen.getByPlaceholderText(/descreva sua ideia para o vídeo/i);
      fireEvent.change(textarea, {target: {value: 'Dicas de produtividade'}});
      const button = screen.getByText(/gerar vídeo do zero/i).closest('button')!;
      await act(async () => { button.click(); });

      await waitFor(() => {
        expect(screen.getByText(/tentar novamente/i)).toBeInTheDocument();
      }, {timeout: 5000});

      expect(onProcessingChange).toHaveBeenCalledWith(false);
    });

    it('shows error state when stitch fails', async () => {
      const onProcessingChange = vi.fn();

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            projectId: 'studio-stitch789',
            scenes: MOCK_SCENES,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({success: true, sceneIndex: 0}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({success: true, sceneIndex: 1}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({success: true, sceneIndex: 2}),
        })
        .mockResolvedValue({
          ok: false,
          status: 500,
        });

      vi.stubGlobal('fetch', fetchMock);

      render(
        <StudioFromZero
          {...defaultProps}
          onProcessingChange={onProcessingChange}
        />
      );

      const textarea = screen.getByPlaceholderText(/descreva sua ideia para o vídeo/i);
      fireEvent.change(textarea, {target: {value: 'Dicas de produtividade'}});
      const button = screen.getByText(/gerar vídeo do zero/i).closest('button')!;
      await act(async () => { button.click(); });

      await waitFor(() => {
        expect(screen.getByText(/tentar novamente/i)).toBeInTheDocument();
      }, {timeout: 10000});
    }, 15000);

    it('calls onProcessingChange(true) when generation starts', async () => {
      const onProcessingChange = vi.fn();

      const neverResolve = new Promise(() => {});
      const fetchMock = vi.fn().mockReturnValue(neverResolve);

      vi.stubGlobal('fetch', fetchMock);

      render(
        <StudioFromZero
          {...defaultProps}
          onProcessingChange={onProcessingChange}
        />
      );

      const textarea = screen.getByPlaceholderText(/descreva sua ideia para o vídeo/i);
      fireEvent.change(textarea, {target: {value: 'Dicas de produtividade'}});
      const button = screen.getByText(/gerar vídeo do zero/i).closest('button')!;
      await act(async () => { button.click(); });

      await waitFor(() => {
        expect(onProcessingChange).toHaveBeenCalledWith(true);
      }, {timeout: 5000});
    });

    it('works with manual script mode', async () => {
      const onProjectComplete = vi.fn();
      const onCaptionsChange = vi.fn();
      const onProcessingChange = vi.fn();

      // Manual mode sends 2 scene generations + 1 stitch = 3 calls
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({success: true, sceneIndex: 0}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({success: true, sceneIndex: 1}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            projectId: 'studio-manual333',
            outputPath: '/outputs/studio-manual333/final.mp4',
          }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({success: false, detail: 'fallback'}),
        });

      vi.stubGlobal('fetch', fetchMock);

      render(
        <StudioFromZero
          {...defaultProps}
          onProjectComplete={onProjectComplete}
          onCaptionsChange={onCaptionsChange}
          onProcessingChange={onProcessingChange}
        />
      );

      fireEvent.click(screen.getByText(/meu roteiro/i));

      const textarea = screen.getByPlaceholderText(/digite uma cena por linha/i);
      fireEvent.change(textarea, {
        target: {
          value:
            'Close-up de mãos digitando | 6 | Produtividade total! | typing keyboard\n' +
            'Pessoa tomando café relaxada | 5 | Pausa estratégica | drinking coffee',
        },
      });

      // In manual mode, the button text changes to "Gerar do Meu Roteiro"
      const button = screen.getByText(/gerar do meu roteiro/i).closest('button')!;
      await act(async () => { button.click(); });

      await waitFor(() => {
        expect(screen.getByText(/vídeo gerado com sucesso/i)).toBeInTheDocument();
      }, {timeout: 10000});

      expect(onProjectComplete).toHaveBeenCalled();
      expect(onCaptionsChange).toHaveBeenCalled();
      expect(onProcessingChange).toHaveBeenCalledWith(false);
    }, 15000);
  });
});
