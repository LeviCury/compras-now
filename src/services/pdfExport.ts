import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfResult {
  filename: string;
  blob: Blob;
  dataUrl: string;
}

export interface GeneratePdfOptions {
  orientation?: 'portrait' | 'landscape';
}

/**
 * Gera um PDF a partir de um elemento DOM.
 *
 * Se o elemento conter filhos com atributo `data-pdf-page="N"`, cada filho
 * eh capturado como uma pagina separada do PDF. Caso contrario, o elemento
 * inteiro vira uma unica pagina (backwards-compat).
 */
export async function generatePdf(
  element: HTMLElement,
  baseName: string,
  options: GeneratePdfOptions = {},
): Promise<PdfResult> {
  const orientation = options.orientation ?? 'portrait';

  const pages = Array.from(
    element.querySelectorAll<HTMLElement>('[data-pdf-page]'),
  );
  const sources: HTMLElement[] = pages.length > 0 ? pages : [element];

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];

    const canvas = await html2canvas(source, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: source.scrollWidth,
      windowHeight: source.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.94);

    const ratio = canvas.height / canvas.width;
    let renderWidth = pageWidth;
    let renderHeight = renderWidth * ratio;
    if (renderHeight > pageHeight) {
      renderHeight = pageHeight;
      renderWidth = renderHeight / ratio;
    }

    const x = (pageWidth - renderWidth) / 2;
    const y = (pageHeight - renderHeight) / 2;

    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', x, y, renderWidth, renderHeight, undefined, 'FAST');
  }

  const blob = pdf.output('blob');
  const dataUrl = pdf.output('datauristring');
  const filename = `${baseName}.pdf`;

  return { filename, blob, dataUrl };
}

export function downloadPdf(result: PdfResult) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(result.blob);
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 4000);
}

export function buildPdfBaseName(prefix = 'compras-now', capturedAt?: string): string {
  const date = capturedAt ? new Date(capturedAt) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}
