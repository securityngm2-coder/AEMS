import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, FileText, Loader2, Printer, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { MaintenanceMachine } from '../types/maintenance';
import { buildMaintenanceScanUrl } from '../lib/maintenanceCodes';
import {
  generateMaintenanceQrPdfBlob,
  downloadPdfBlob,
  openPdfBlobInNewTab,
} from '../lib/maintenanceQrPdf';

interface MaintenanceQRPrintModalProps {
  machines: MaintenanceMachine[];
  onClose: () => void;
}

/** Print/Download labels: High-quality multi-page PDF generation & cut-guides */
export default function MaintenanceQRPrintModal({ machines, onClose }: MaintenanceQRPrintModalProps) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [actionType, setActionType] = useState<'download' | 'preview' | null>(null);

  const qrItems = useMemo(
    () =>
      machines.map((m) => ({
        id: m.id,
        qrValue: buildMaintenanceScanUrl(m),
        assetCode: m.assetCode,
        machineNumber: m.machineNumber,
        machineType: m.machineType,
      })),
    [machines]
  );

  const totalPages = Math.max(1, Math.ceil(qrItems.length / 12));

  const handleDownloadPdf = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (generating) return;

    try {
      setGenerating(true);
      setActionType('download');
      setProgress(5);

      // Short delay so browser immediately repaints the button into loading state
      await new Promise((resolve) => setTimeout(resolve, 50));

      const blob = await generateMaintenanceQrPdfBlob(qrItems, (p) => {
        setProgress(Math.max(5, Math.min(99, p)));
      });

      setProgress(100);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadPdfBlob(blob, `Preventive_Maintenance_QR_${dateStr}.pdf`);
      toast.success(`PDF downloaded successfully! (${totalPages} page${totalPages === 1 ? '' : 's'})`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
      setActionType(null);
      setProgress(0);
    }
  };

  const handlePreviewPdf = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (generating) return;

    try {
      setGenerating(true);
      setActionType('preview');
      setProgress(5);

      // Short delay so browser immediately repaints the button into loading state
      await new Promise((resolve) => setTimeout(resolve, 50));

      const blob = await generateMaintenanceQrPdfBlob(qrItems, (p) => {
        setProgress(Math.max(5, Math.min(99, p)));
      });

      setProgress(100);
      openPdfBlobInNewTab(blob);
    } catch (err) {
      console.error('Failed to open PDF:', err);
      toast.error('Failed to open PDF preview.');
    } finally {
      setGenerating(false);
      setActionType(null);
      setProgress(0);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/80 z-[130] flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col h-[90vh] max-h-[820px] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Fixed & Shrink-0 */}
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="text-indigo-600" size={20} />
                <h3 className="text-lg font-black text-slate-900">Preventive Maintenance QR Code PDF</h3>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {qrItems.length} label{qrItems.length === 1 ? '' : 's'} · {totalPages} A4 page{totalPages === 1 ? '' : 's'} (12 labels per sheet with cut-guides)
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={generating}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Close modal"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>

          {/* Progress bar banner while generating - Fixed & Shrink-0 */}
          {generating && (
            <div className="shrink-0 bg-indigo-50 border-b border-indigo-100 px-6 py-2.5 flex items-center justify-between transition-all">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
                <Loader2 size={15} className="animate-spin text-indigo-600 shrink-0" />
                <span>
                  {actionType === 'download' ? 'Generating and downloading PDF...' : 'Generating PDF for preview...'} ({progress}%)
                </span>
              </div>
              <div className="w-48 bg-indigo-200/80 rounded-full h-2 overflow-hidden shadow-inner">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Preview grid - Scrollable & min-h-0 so footer is never pushed out */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-slate-50/50">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {qrItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center gap-2 hover:border-indigo-300 transition-colors"
                >
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-center">
                    <QRCodeSVG value={item.qrValue} size={110} level="H" includeMargin={false} />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-slate-700 tracking-tight leading-none bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-center max-w-full truncate">
                    {item.assetCode}
                  </span>
                  <span className="text-[10px] text-slate-400 text-center leading-tight truncate max-w-full">
                    {item.machineNumber} · {item.machineType}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons footer - Fixed & Shrink-0, ALWAYS visible and clickable */}
          <div className="shrink-0 px-6 py-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-10">
            <div className="text-[11px] text-slate-500 font-medium">
              Multi-page PDF ensures all {qrItems.length} QR codes are cleanly paginated across {totalPages} page{totalPages === 1 ? '' : 's'}.
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={generating}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed select-none"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handlePreviewPdf}
                disabled={generating}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all select-none ${
                  generating && actionType === 'preview'
                    ? 'bg-slate-200 border-slate-300 text-slate-900 cursor-wait ring-2 ring-slate-400/40 shadow-sm'
                    : generating
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                    : 'bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 border-slate-300 cursor-pointer'
                }`}
                title="Open generated PDF in new tab to view or print with browser dialog"
              >
                {generating && actionType === 'preview' ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-slate-700 shrink-0" />
                    <span>Preparing... ({progress}%)</span>
                  </>
                ) : (
                  <>
                    <Printer size={15} strokeWidth={2.5} className="shrink-0" />
                    <span>Print / Preview PDF</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={generating}
                className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all select-none ${
                  generating && actionType === 'download'
                    ? 'bg-indigo-700 text-white cursor-wait opacity-95 shadow-indigo-700/30 ring-2 ring-indigo-400/50'
                    : generating
                    ? 'bg-indigo-400 text-white cursor-not-allowed opacity-50'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-indigo-600/25 cursor-pointer'
                }`}
              >
                {generating && actionType === 'download' ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-white shrink-0" />
                    <span>Downloading... ({progress}%)</span>
                  </>
                ) : (
                  <>
                    <Download size={15} strokeWidth={2.5} className="shrink-0" />
                    <span>Download PDF ({totalPages} {totalPages === 1 ? 'Page' : 'Pages'})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Media print fallback */}
      <style>{`
        #printable-maint-qr-grid { display: none; }
        @media print {
          @page { margin: 10mm 8mm; size: portrait; }
          body, html {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            height: auto !important;
          }
          body * {
            visibility: hidden;
            background-color: transparent !important;
            box-shadow: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-maint-qr-grid, #printable-maint-qr-grid * {
            visibility: visible;
          }
          #printable-maint-qr-grid {
            display: grid !important;
            position: static !important;
            width: 100% !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 14px !important;
            padding: 4px !important;
            background: white !important;
          }
          .maint-qr-card-print {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            border: 1px dashed #94a3b8 !important;
            border-radius: 6px !important;
            padding: 10px 8px !important;
            background: white !important;
            text-align: center !important;
          }
          .maint-qr-svg-print {
            width: 3.2cm !important;
            height: 3.2cm !important;
          }
          .maint-qr-code-print {
            font-size: 6pt !important;
            font-family: ui-monospace, Menlo, Consolas, monospace !important;
            font-weight: 700 !important;
            margin-top: 4px !important;
            color: #0f172a !important;
            letter-spacing: 0.02em !important;
            line-height: 1 !important;
          }
          .maint-qr-meta-print {
            font-size: 5.5pt !important;
            color: #64748b !important;
            margin-top: 2px !important;
            max-width: 90% !important;
            line-height: 1.2 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div id="printable-maint-qr-grid">
        {qrItems.map((item) => (
          <div key={item.id} className="maint-qr-card-print">
            <QRCodeSVG
              value={item.qrValue}
              size={128}
              level="H"
              includeMargin={false}
              className="maint-qr-svg-print"
            />
            <div className="maint-qr-code-print">{item.assetCode}</div>
            <div className="maint-qr-meta-print">
              {item.machineNumber} · {item.machineType}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
