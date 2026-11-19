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

  const handleDownloadPdf = async () => {
    if (generating) return;
    try {
      setGenerating(true);
      setActionType('download');
      setProgress(0);
      const blob = await generateMaintenanceQrPdfBlob(qrItems, (p) => setProgress(p));
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

  const handlePreviewPdf = async () => {
    if (generating) return;
    try {
      setGenerating(true);
      setActionType('preview');
      setProgress(0);
      const blob = await generateMaintenanceQrPdfBlob(qrItems, (p) => setProgress(p));
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
      <div className="fixed inset-0 bg-slate-900/80 z-[130] flex items-center justify-center p-4 overflow-y-auto no-print">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
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
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 disabled:opacity-50 transition-colors"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>

          {/* Progress bar banner while generating */}
          {generating && (
            <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
                <Loader2 size={14} className="animate-spin text-indigo-600 shrink-0" />
                <span>
                  {actionType === 'download' ? 'Generating PDF for download...' : 'Generating PDF preview...'} ({progress}%)
                </span>
              </div>
              <div className="w-40 bg-indigo-200/70 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Preview grid */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {qrItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center gap-2 hover:border-indigo-200 transition-colors"
                >
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <QRCodeSVG value={item.qrValue} size={110} level="H" includeMargin={false} />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-slate-700 tracking-tight leading-none bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {item.assetCode}
                  </span>
                  <span className="text-[10px] text-slate-400 text-center leading-tight truncate max-w-full">
                    {item.machineNumber} · {item.machineType}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
            <div className="text-[11px] text-slate-400 font-medium">
              Multi-page PDF ensures all {qrItems.length} QR codes are cleanly paginated across {totalPages} page{totalPages === 1 ? '' : 's'}.
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={generating}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePreviewPdf}
                disabled={generating}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 flex items-center gap-1.5 uppercase tracking-wider transition-colors disabled:opacity-50"
                title="Open generated PDF in new tab to view or print with browser dialog"
              >
                <Printer size={14} strokeWidth={2.5} />
                <span>Print / Preview PDF</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={generating}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-2 uppercase tracking-wider shadow-md shadow-indigo-600/25 transition-all disabled:opacity-60"
              >
                {generating && actionType === 'download' ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Generating ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Download size={14} strokeWidth={2.5} />
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
