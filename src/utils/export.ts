import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * Robust DOM-to-DataURL renderer using html-to-image.
 * Natively supports modern CSS color formats (oklch, oklab, color-mix)
 * and SVG filters/defs without parser exceptions.
 */
export const renderElementToDataUrl = async (
  element: HTMLElement,
  pixelRatio: number = 3,
  backgroundColor: string | null = '#ffffff'
): Promise<string> => {
  const options = {
    pixelRatio,
    cacheBust: true,
    backgroundColor: backgroundColor || undefined,
    filter: (node: Node) => {
      if (node instanceof HTMLElement && node.classList.contains('no-print')) {
        return false;
      }
      return true;
    },
  };

  try {
    return await toPng(element, options);
  } catch (err) {
    console.warn('Standard toPng failed, retrying with skipFonts: true fallback', err);
    return await toPng(element, { ...options, skipFonts: true });
  }
};

export const exportElementAsPng = async (
  element: HTMLElement,
  fileName: string = 'id_card.png',
  scale: number = 3
): Promise<string> => {
  const dataUrl = await renderElementToDataUrl(element, scale, '#ffffff');

  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return dataUrl;
};

export const exportSingleCardPdf = async (
  element: HTMLElement,
  studentName: string,
  orientation: 'landscape' | 'portrait'
): Promise<void> => {
  // CR80 dimensions: 85.6mm x 53.98mm
  const isLandscape = orientation === 'landscape';
  const widthMm = isLandscape ? 85.6 : 53.98;
  const heightMm = isLandscape ? 53.98 : 85.6;

  const dataUrl = await renderElementToDataUrl(element, 3, '#ffffff');

  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [widthMm, heightMm],
  });

  pdf.addImage(dataUrl, 'PNG', 0, 0, widthMm, heightMm, undefined, 'FAST');
  const safeName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
  pdf.save(`ID_Card_${safeName}.pdf`);
};

export const exportMultiCardA4Pdf = async (
  containerElement: HTMLElement,
  fileName: string = 'Bulk_Student_ID_Cards.pdf'
): Promise<void> => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 8;
  const maxAvailableWidth = pageWidth - margin * 2;
  const maxAvailableHeight = pageHeight - margin * 2;

  // Check if container contains individual .print-sheet pages
  const sheets = Array.from(containerElement.querySelectorAll<HTMLElement>('.print-sheet'));

  if (sheets.length > 0) {
    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];
      const dataUrl = await renderElementToDataUrl(sheet, 3, '#ffffff');

      if (i > 0) {
        pdf.addPage();
      }

      const aspect = sheet.offsetHeight / (sheet.offsetWidth || 1);
      const targetWidthMm = Number(sheet.dataset.physicalWidthMm || 0);
      let printWidth = targetWidthMm > 0 ? Math.min(targetWidthMm, maxAvailableWidth) : maxAvailableWidth;
      let printHeight = printWidth * aspect;

      if (printHeight > maxAvailableHeight) {
        printHeight = maxAvailableHeight;
        printWidth = maxAvailableHeight / aspect;
      }

      const x = (pageWidth - printWidth) / 2;
      const y = (pageHeight - printHeight) / 2;

      pdf.addImage(dataUrl, 'PNG', x, y, printWidth, printHeight, undefined, 'FAST');
    }
  } else {
    // Single container fallback
    const dataUrl = await renderElementToDataUrl(containerElement, 3, '#ffffff');
    const aspect = containerElement.offsetHeight / (containerElement.offsetWidth || 1);
    const printWidth = maxAvailableWidth;
    const printHeight = Math.min(maxAvailableWidth * aspect, maxAvailableHeight);
    const x = (pageWidth - printWidth) / 2;
    const y = (pageHeight - printHeight) / 2;
    pdf.addImage(dataUrl, 'PNG', x, y, printWidth, printHeight, undefined, 'FAST');
  }

  pdf.save(fileName);
};

