import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

export interface MaintenanceQrItem {
  id: string;
  qrValue: string;
  assetCode: string;
  machineNumber?: string;
  machineType?: string;
}

function sanitizeWinAnsi(text: string): string {
  if (!text) return '';
  return text
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates a high-quality multi-page A4 PDF for Preventive Maintenance QR code labels.
 * 12 labels per page (3 columns x 4 rows) with cut-guides and crisp vector typography.
 * Yields to the browser event loop regularly to keep UI responsive with smooth loading animation.
 */
export async function generateMaintenanceQrPdfBlob(
  items: MaintenanceQrItem[],
  onProgress?: (progressPercent: number) => void
): Promise<Blob> {
  // Initial yield to allow React to paint the loading button state
  await new Promise((resolve) => setTimeout(resolve, 30));

  const pdfDoc = await PDFDocument.create();

  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontCourierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  // A4 Dimensions in points: 210mm x 297mm
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  const marginHorizontal = 24;
  const marginTop = 32;
  const marginBottom = 28;

  const cols = 3;
  const rows = 4;
  const itemsPerPage = cols * rows; // 12
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));

  const cardWidth = 171;
  const cardHeight = 178;
  const colGap = (pageWidth - 2 * marginHorizontal - cols * cardWidth) / (cols - 1);
  const rowGap = (pageHeight - marginTop - marginBottom - rows * cardHeight) / (rows - 1);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const pageIndex = Math.floor(i / itemsPerPage);
    const indexOnPage = i % itemsPerPage;
    const col = indexOnPage % cols;
    const row = Math.floor(indexOnPage / cols);

    let page = pdfDoc.getPageCount() > pageIndex ? pdfDoc.getPage(pageIndex) : null;
    if (!page) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);

      // Header on every page
      page.drawText('PREVENTIVE MAINTENANCE QR LABELS', {
        x: marginHorizontal,
        y: pageHeight - 20,
        size: 7.5,
        font: fontHelveticaBold,
        color: rgb(0.35, 0.4, 0.48),
      });

      const todayStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const headerRight = `Generated: ${todayStr}`;
      const headerRightWidth = fontHelvetica.widthOfTextAtSize(headerRight, 7);
      page.drawText(headerRight, {
        x: pageWidth - marginHorizontal - headerRightWidth,
        y: pageHeight - 20,
        size: 7,
        font: fontHelvetica,
        color: rgb(0.5, 0.55, 0.62),
      });

      // Footer on every page
      const footerText = `Page ${pageIndex + 1} of ${totalPages} · ${items.length} Total QR Code${items.length === 1 ? '' : 's'}`;
      page.drawText(footerText, {
        x: marginHorizontal,
        y: 12,
        size: 7,
        font: fontHelvetica,
        color: rgb(0.5, 0.55, 0.62),
      });
    }

    const cardX = marginHorizontal + col * (cardWidth + colGap);
    // In PDF coordinates, (0, 0) is bottom-left
    const cardY = pageHeight - marginTop - (row + 1) * cardHeight - row * rowGap;

    // Cut guide dashed border
    page.drawRectangle({
      x: cardX,
      y: cardY,
      width: cardWidth,
      height: cardHeight,
      borderColor: rgb(0.78, 0.82, 0.87),
      borderWidth: 0.75,
      borderDashArray: [3, 2],
    });

    // Generate high-resolution QR image (240px with level M for fast rendering & crisp scan)
    try {
      const qrDataUrl = await QRCode.toDataURL(item.qrValue || '', {
        width: 240,
        margin: 1,
        errorCorrectionLevel: 'M',
      });
      const qrImage = await pdfDoc.embedPng(qrDataUrl);

      const qrSize = 108;
      const qrX = cardX + (cardWidth - qrSize) / 2;
      const qrY = cardY + cardHeight - qrSize - 12;

      page.drawImage(qrImage, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
      });

      // Asset Code (Bold Monospace)
      const codeText = sanitizeWinAnsi(item.assetCode || 'NO-CODE');
      const codeFontSize = 8.5;
      const codeWidth = fontCourierBold.widthOfTextAtSize(codeText, codeFontSize);
      page.drawText(codeText, {
        x: cardX + Math.max(4, (cardWidth - codeWidth) / 2),
        y: qrY - 14,
        size: codeFontSize,
        font: fontCourierBold,
        color: rgb(0.08, 0.12, 0.18),
      });

      // Machine Meta (Number & Type)
      let metaText = sanitizeWinAnsi(
        [item.machineNumber, item.machineType].filter(Boolean).join(' - ')
      );
      const metaFontSize = 6.8;
      while (
        metaText.length > 3 &&
        fontHelvetica.widthOfTextAtSize(metaText, metaFontSize) > cardWidth - 12
      ) {
        metaText = metaText.slice(0, -4).trim() + '...';
      }
      const metaWidth = fontHelvetica.widthOfTextAtSize(metaText, metaFontSize);
      page.drawText(metaText, {
        x: cardX + Math.max(4, (cardWidth - metaWidth) / 2),
        y: qrY - 26,
        size: metaFontSize,
        font: fontHelvetica,
        color: rgb(0.38, 0.44, 0.52),
      });
    } catch (err) {
      console.error('Failed to render QR for item:', item, err);
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / items.length) * 100));
    }

    // Yield control to the browser every iteration to ensure UI stays silky smooth
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // Handle case when items is empty
  if (items.length === 0) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawText('No machine QR codes selected.', {
      x: marginHorizontal,
      y: pageHeight / 2,
      size: 12,
      font: fontHelvetica,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // Final yield before packing bytes
  await new Promise((resolve) => setTimeout(resolve, 10));
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Triggers a download of the PDF blob in the browser.
 */
export function downloadPdfBlob(blob: Blob, filename = 'Maintenance_QR_Codes.pdf') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Opens the PDF blob in a new tab for direct viewing and native printing.
 */
export function openPdfBlobInNewTab(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
