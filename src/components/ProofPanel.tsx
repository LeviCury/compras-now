import { useState } from 'react';
import { Camera, ExternalLink, ShieldCheck, X, ZoomIn } from 'lucide-react';
import type { ComprasSnapshot } from '../types';
import { formatDateTime } from '../utils/formatters';
import { screenshotUrl } from '../services/dataLoader';

interface Props {
  snapshot: ComprasSnapshot;
}

export default function ProofPanel({ snapshot }: Props) {
  const [open, setOpen] = useState(false);
  const url = screenshotUrl(snapshot);

  return (
    <div className="card-padded flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <ShieldCheck className="h-4 w-4" strokeWidth={2} />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight" style={{ letterSpacing: '-0.01em' }}>
              Prova do DUX
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Captura oficial do {snapshot.source?.module ?? 'Compras Now'} para{' '}
              <strong style={{ color: 'var(--text)' }}>{snapshot.periodLabel}</strong>. O dashboard
              apenas exibe; o numero original esta aqui.
            </p>
          </div>
        </div>
        {url && (
          <button onClick={() => setOpen(true)} className="btn-secondary">
            <ZoomIn className="h-4 w-4" />
            <span className="hidden sm:inline">Ampliar</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <div className="flex items-center gap-2">
          <Camera className="h-3.5 w-3.5" />
          <span>
            Capturado em{' '}
            <strong style={{ color: 'var(--text)' }}>{formatDateTime(snapshot.capturedAt)}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ExternalLink className="h-3.5 w-3.5" />
          <span>{snapshot.source?.breadcrumb ?? 'DUX > Minerva Reports > Relatorios de Controle > Compras Now'}</span>
        </div>
      </div>

      <div
        className="relative rounded-xl overflow-hidden border cursor-zoom-in group"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
        onClick={() => url && setOpen(true)}
      >
        {url ? (
          <img
            src={url}
            alt="Print da consulta no DUX (Compras Now)"
            className="w-full h-auto block transition-transform group-hover:scale-[1.01]"
            loading="lazy"
          />
        ) : (
          <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Print do DUX ainda nao capturado.
          </div>
        )}
        {url && (
          <div className="absolute inset-x-0 bottom-0 px-3 py-2 text-[10px] tracking-wide uppercase flex items-center justify-between bg-black/55 text-white">
            <span>Fonte oficial - DUX/Compras Now</span>
            <span>{formatDateTime(snapshot.capturedAt)}</span>
          </div>
        )}
      </div>

      {open && url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 btn-ghost text-white"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={url}
            alt="Print do DUX ampliado"
            className="max-h-[90vh] max-w-[95vw] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
