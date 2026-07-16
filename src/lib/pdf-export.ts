import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Capture the printable content area and export it as a multi-page PDF.
 * Uses html2canvas to rasterise the DOM and jsPDF to paginate.
 */
/**
 * Convert cross-origin images to inline base64 so html2canvas can render them.
 */
async function inlineImages(container: HTMLElement): Promise<() => void> {
  const images = Array.from(container.querySelectorAll('img'));
  const originals: { img: HTMLImageElement; src: string }[] = [];

  await Promise.all(
    images.map(async (img) => {
      if (img.src.startsWith('data:')) return;
      try {
        const resp = await fetch(img.src, { mode: 'cors' });
        const blob = await resp.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        originals.push({ img, src: img.src });
        img.src = dataUrl;
      } catch {
        // If fetch fails, leave original src
      }
    }),
  );

  // Return a restore function
  return () => originals.forEach(({ img, src }) => (img.src = src));
}

export async function createPdfBlob(contentElement: HTMLElement): Promise<Blob> {
  const body = document.body;
  body.classList.add('pdf-capturing');
  const restoreImages = await inlineImages(contentElement);
  let canvas: HTMLCanvasElement;
  try {
    await new Promise(r => setTimeout(r, 300));
    // The report is rendered at a fixed A4-friendly width. Capturing that exact
    // width prevents responsive/mobile styles from distorting table columns.
    canvas = await html2canvas(contentElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: contentElement.scrollWidth,
      height: contentElement.scrollHeight,
      windowWidth: contentElement.scrollWidth,
      windowHeight: contentElement.scrollHeight,
      scrollX: 0,
      scrollY: 0,
    });
  } finally {
    body.classList.remove('pdf-capturing');
    restoreImages();
  }

  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // A4 dimensions in mm
  const pdfWidth = 210;
  const pdfHeight = 297;
  const margin = 10;
  const usableWidth = pdfWidth - margin * 2;
  const usableHeight = pdfHeight - margin * 2;

  // Scale image to fit page width
  const ratio = usableWidth / imgWidth;
  const scaledHeight = imgHeight * ratio;

  // Total pages
  const pageCount = Math.ceil(scaledHeight / usableHeight);

  const pdf = new jsPDF('p', 'mm', 'a4');

  for (let page = 0; page < pageCount; page++) {
    if (page > 0) pdf.addPage();

    // Source crop from canvas
    const srcY = (page * usableHeight) / ratio;
    const srcH = Math.min(usableHeight / ratio, imgHeight - srcY);

    // Create a cropped canvas for this page
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = imgWidth;
    pageCanvas.height = Math.round(srcH);
    const ctx = pageCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, -srcY);

    const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.92);
    const destH = srcH * ratio;

    pdf.addImage(pageImgData, 'JPEG', margin, margin, usableWidth, destH);

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(
      `${page + 1} / ${pageCount}`,
      pdfWidth / 2,
      pdfHeight - 5,
      { align: 'center' },
    );
  }

  return pdf.output('blob');
}

export function downloadPdfBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportToPdf(
  contentElement: HTMLElement,
  fileName: string,
): Promise<void> {
  downloadPdfBlob(await createPdfBlob(contentElement), fileName);
}
