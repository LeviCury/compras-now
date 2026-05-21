import { useEffect, useRef, useState } from 'react';
import { ClipboardCopy, FileDown, MessageCircle, Loader2, Check } from 'lucide-react';
import type { AllSnapshots, ComprasSnapshot } from '../types';
import { buildWhatsappMessage, copyToClipboard, openWhatsapp } from '../services/whatsappShare';
import { buildPdfBaseName, downloadPdf, generatePdf } from '../services/pdfExport';

interface Props {
  open: boolean;
  onClose: () => void;
  snapshot: ComprasSnapshot;
  allSnapshots?: AllSnapshots;
  pdfTargetRef: React.RefObject<HTMLDivElement | null>;
  onNotify: (message: string, variant?: 'success' | 'error' | 'info') => void;
}

export default function ShareMenu({ open, onClose, snapshot, allSnapshots, pdfTargetRef, onNotify }: Props) {
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [open, onClose]);

  if (!open) return null;

  const downloadAsPdf = async () => {
    if (!pdfTargetRef.current) {
      onNotify('Layout do PDF nao esta pronto.', 'error');
      return;
    }
    try {
      setGenerating(true);
      const baseName = buildPdfBaseName('compras-now', snapshot.capturedAt);
      const result = await generatePdf(pdfTargetRef.current, baseName);
      downloadPdf(result);
      onNotify('PDF gerado com sucesso.', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      onNotify('Falha ao gerar PDF.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const shareWhatsapp = () => {
    const message = buildWhatsappMessage(snapshot, allSnapshots);
    openWhatsapp(message);
    onClose();
  };

  const copyText = async () => {
    const ok = await copyToClipboard(buildWhatsappMessage(snapshot, allSnapshots));
    if (ok) {
      setCopied(true);
      onNotify('Resumo copiado para a area de transferencia.', 'success');
      setTimeout(() => setCopied(false), 1800);
    } else {
      onNotify('Nao foi possivel copiar.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        ref={ref}
        className="relative card-padded w-full max-w-sm flex flex-col gap-3 animate-slide-up"
      >
        <div>
          <h3 className="text-lg font-bold">Exportar / Compartilhar</h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Gere o resumo executivo do snapshot atual.
          </p>
        </div>

        <button onClick={downloadAsPdf} className="btn-primary w-full" disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          {generating ? 'Gerando PDF...' : 'Baixar Resumo Executivo (PDF)'}
        </button>

        <button onClick={shareWhatsapp} className="btn-secondary w-full">
          <MessageCircle className="h-4 w-4 text-emerald-500" />
          Compartilhar resumo no WhatsApp
        </button>

        <button onClick={copyText} className="btn-ghost w-full">
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <ClipboardCopy className="h-4 w-4" />}
          {copied ? 'Copiado!' : 'Copiar texto do resumo'}
        </button>

        <p className="text-[11px] leading-relaxed pt-2 border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-faint)' }}>
          O PDF inclui KPIs do periodo selecionado ({snapshot.periodLabel}), tabela detalhada, comparativo entre os 4 periodos e o print oficial do DUX como prova.
        </p>
      </div>
    </div>
  );
}
