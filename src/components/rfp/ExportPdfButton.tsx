"use client";

import { useCallback } from "react";
import { Download } from "lucide-react";

interface ExportPdfButtonProps {
  /** CSS selector — the DOM element whose HTML will be exported */
  contentSelector: string;
  /** Title printed in the PDF header */
  title: string;
  /** Subtitle line (e.g. "M&A · Thailand") */
  subtitle?: string;
}

/** Self-contained PDF stylesheet — no Tailwind, no lab() colours */
const PDF_STYLES = `
@page { size: A4; margin: 18mm 16mm 20mm 16mm; }
* { box-sizing: border-box; }
body {
  font-family: "Segoe UI", Inter, system-ui, -apple-system, sans-serif;
  color: #111827; line-height: 1.6; margin: 0; padding: 24px 32px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.pdf-header {
  display: flex; align-items: center; gap: 16px;
  padding-bottom: 14px; border-bottom: 3px solid #E0251C; margin-bottom: 20px;
}
.pdf-badge {
  background: #E0251C; color: white; font-weight: 700; font-size: 15px;
  padding: 8px 14px; border-radius: 8px; letter-spacing: 0.5px; flex-shrink: 0;
}
.pdf-header-text h1 { margin: 0; font-size: 17px; font-weight: 700; color: #111827; }
.pdf-header-text .subtitle { margin: 3px 0 0 0; font-size: 12px; color: #6B7280; }
.pdf-header-text .date { margin: 3px 0 0 0; font-size: 11px; color: #9CA3AF; }
.pdf-body { font-size: 12px; }
.pdf-body h2 {
  font-size: 14px; font-weight: 700; color: #111827;
  border-bottom: 1px solid #E5E7EB; padding-bottom: 4px; margin: 22px 0 10px 0;
}
.pdf-body h3 { font-size: 12.5px; font-weight: 700; color: #1F2937; margin: 16px 0 6px 0; }
.pdf-body p { margin: 0 0 8px 0; color: #374151; font-size: 12px; line-height: 1.65; }
.pdf-body strong { font-weight: 600; color: #111827; }
.pdf-body ul, .pdf-body ol { margin: 0 0 10px 18px; padding: 0; color: #374151; }
.pdf-body li { margin-bottom: 3px; font-size: 12px; line-height: 1.55; }
.pdf-body hr { border: none; border-top: 1px solid #E5E7EB; margin: 16px 0; }
.pdf-body blockquote {
  border-left: 3px solid #E0251C; padding-left: 12px;
  margin: 10px 0; color: #6B7280; font-style: italic;
}
.pdf-body table {
  width: 100%; border-collapse: collapse; font-size: 11px;
  margin: 12px 0; page-break-inside: avoid;
}
.pdf-body thead { background: #F3F4F6; }
.pdf-body th {
  padding: 6px 8px; text-align: left; font-weight: 600; color: #374151;
  border: 1px solid #D1D5DB; font-size: 11px; white-space: nowrap;
}
.pdf-body td { padding: 5px 8px; border: 1px solid #E5E7EB; color: #4B5563; font-size: 11px; }
.pdf-body tbody tr:nth-child(even) { background: #F9FAFB; }
.pdf-footer {
  margin-top: 28px; padding-top: 10px; border-top: 1px solid #E5E7EB;
  display: flex; justify-content: space-between; font-size: 10px; color: #9CA3AF;
}
@media print {
  body { padding: 0; font-size: 12px; }
  .pdf-body table { page-break-inside: avoid; }
  .pdf-body h2, .pdf-body h3 { page-break-after: avoid; }
  .pdf-body p, .pdf-body li { orphans: 3; widows: 3; }
}
`;

export function ExportPdfButton({
  contentSelector,
  title,
  subtitle,
}: ExportPdfButtonProps) {
  const handleExport = useCallback(() => {
    const sourceEl = document.querySelector(contentSelector);
    if (!sourceEl) {
      console.error("ExportPdf: content element not found");
      return;
    }

    const dateStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timeStr = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>${PDF_STYLES}</style>
</head>
<body>
  <div class="pdf-header">
    <div class="pdf-badge">SCG</div>
    <div class="pdf-header-text">
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}
      <p class="date">Generated ${dateStr} at ${timeStr}</p>
    </div>
  </div>
  <div class="pdf-body">${sourceEl.innerHTML}</div>
  <div class="pdf-footer">
    <span>SCG Legal &mdash; Outside Counsel Platform</span>
    <span>Confidential</span>
  </div>
</body>
</html>`;

    // Use a hidden iframe to avoid popup blockers
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!iframeDoc) {
      console.error("ExportPdf: could not access iframe document");
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Print once loaded
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("ExportPdf: print failed", err);
      }
      // Clean up after a delay so the print dialog isn't interrupted
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);
    };

    // Fallback — some browsers fire load synchronously for about:blank frames
    setTimeout(() => {
      try {
        if (iframe.parentNode) {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }
      } catch {
        // ignore — may have already printed
      }
    }, 600);
  }, [contentSelector, title, subtitle]);

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
    >
      <Download size={12} />
      Export PDF
    </button>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
