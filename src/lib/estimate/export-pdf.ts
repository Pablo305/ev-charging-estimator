import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EstimateOutput, EstimateLineItem } from './types';
import type { SharedPreviewAssets } from './shared-types';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export interface EstimatePdfPreviewImage {
  label: string;
  dataUrl: string;
  format: 'JPEG' | 'PNG';
}

/**
 * Build the full estimate PDF document. Optionally embed site preview images after project info.
 */
export function buildEstimatePdfDocument(
  output: EstimateOutput,
  options?: { previewImages?: readonly EstimatePdfPreviewImage[] },
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const { input, summary, metadata, lineItems, exclusions, manualReviewTriggers } = output;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // ── Header ──────────────────────────────────────────────
  doc.setFillColor(11, 18, 32); // #0B1220
  doc.rect(0, 0, pageWidth, 80, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('BulletEV', margin, 35);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('EV Charging Infrastructure Estimate', margin, 52);

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date(metadata.generatedAt).toLocaleDateString()}`, pageWidth - margin, 35, { align: 'right' });
  doc.text(`Engine: ${metadata.engineVersion}`, pageWidth - margin, 48, { align: 'right' });
  doc.text(`Confidence: ${metadata.automationConfidence.toUpperCase()}`, pageWidth - margin, 61, { align: 'right' });

  y = 100;

  // ── Project Info ────────────────────────────────────────
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(input.project.name || 'Untitled Project', margin, y);
  y += 18;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const infoLines = [
    input.customer.companyName && `Client: ${input.customer.companyName}`,
    input.site.address && `Site: ${input.site.address}`,
    input.customer.contactName && `Contact: ${input.customer.contactName}`,
    input.project.salesRep && `Sales Rep: ${input.project.salesRep}`,
    `Project Type: ${input.project.projectType.replace(/_/g, ' ')}`,
  ].filter(Boolean) as string[];

  for (const line of infoLines) {
    doc.text(line, margin, y);
    y += 14;
  }
  y += 10;

  // ── Optional site preview images ─────────────────────
  const previews = options?.previewImages;
  if (previews && previews.length > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Site imagery (reference)', margin, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Illustrative views for context — not a substitute for a field survey.', margin, y);
    y += 12;

    const imgW = pageWidth - margin * 2;
    const imgH = Math.min(220, imgW * 0.56);
    for (const p of previews) {
      if (y > 680) {
        doc.addPage();
        y = margin;
      }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(p.label, margin, y);
      y += 12;
      try {
        doc.addImage(p.dataUrl, p.format, margin, y, imgW, imgH);
      } catch {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text('(Image could not be embedded)', margin, y + 20);
      }
      y += imgH + 16;
    }
    y += 6;
  }

  // ── Map Workspace Site Layout ──────────────────────────
  const mapSnapshot = input.mapWorkspace?.mapSnapshotDataUrl;
  if (mapSnapshot) {
    if (y > 500) {
      doc.addPage();
      y = margin;
    }
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Site Layout (Map Workspace)', margin, y);
    y += 14;
    const imgW = pageWidth - margin * 2;
    const imgH = Math.min(260, imgW * 0.56);
    try {
      doc.addImage(mapSnapshot, 'PNG', margin, y, imgW, imgH);
    } catch {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text('(Map snapshot could not be embedded)', margin, y + 20);
    }
    y += imgH + 12;
  }

  // ── Map Measurements Table ────────────────────────────
  const drawings = input.mapWorkspace?.drawings;
  if (drawings && ((drawings.runs?.length ?? 0) > 0 || (drawings.equipment?.length ?? 0) > 0)) {
    if (y > 620) {
      doc.addPage();
      y = margin;
    }
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Map Measurements', margin, y);
    y += 6;

    const measureRows: string[][] = [];

    // Aggregate runs by type
    const runTotals: Record<string, { count: number; totalFt: number }> = {};
    for (const run of drawings.runs ?? []) {
      if (!runTotals[run.runType]) runTotals[run.runType] = { count: 0, totalFt: 0 };
      runTotals[run.runType].count += 1;
      runTotals[run.runType].totalFt += run.lengthFt;
    }
    for (const [type, data] of Object.entries(runTotals)) {
      const label = type.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
      measureRows.push([label, `${Math.round(data.totalFt)} ft`, `${data.count} segment(s)`]);
    }

    // Aggregate equipment by type
    const eqCounts: Record<string, number> = {};
    for (const eq of drawings.equipment ?? []) {
      eqCounts[eq.equipmentType] = (eqCounts[eq.equipmentType] ?? 0) + 1;
    }
    for (const [type, count] of Object.entries(eqCounts)) {
      const label = type.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
      measureRows.push([label, `${count}`, 'Equipment']);
    }

    if (measureRows.length > 0) {
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Type', 'Distance / Count', 'Notes']],
        body: measureRows,
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      });
      y = (doc as any).lastAutoTable.finalY + 16;
    }
  }

  // ── Cost Summary ────────────────────────────────────────
  if (y > 620) {
    doc.addPage();
    y = margin;
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Cost Summary', margin, y);
  y += 6;

  const summaryData = [
    ['Hardware', fmt(summary.hardwareTotal)],
    ['Installation', fmt(summary.installationTotal)],
    ['Permit & Design', fmt(summary.permitDesignTotal)],
    ['Network', fmt(summary.networkTotal)],
    ['Accessories', fmt(summary.accessoriesTotal)],
    ['Service & Software', fmt(summary.serviceTotal)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Category', 'Amount']],
    body: summaryData,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  const totalsData = [
    [`Subtotal (with ${input.estimateControls.markupPercent}% markup)`, fmt(summary.subtotal)],
    [`Tax (${input.estimateControls.taxRate}%)`, fmt(summary.tax)],
    [`Contingency (${input.estimateControls.contingencyPercent}%)`, fmt(summary.contingency)],
  ];

  autoTable(doc, {
    startY: y,
    body: totalsData,
    margin: { left: margin, right: margin },
    theme: 'plain',
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  doc.setFillColor(37, 99, 235);
  doc.rect(margin, y, pageWidth - margin * 2, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', margin + 10, y + 18);
  doc.text(fmt(summary.total), pageWidth - margin - 10, y + 18, { align: 'right' });

  y += 44;

  if (manualReviewTriggers.length > 0) {
    if (y > 680) {
      doc.addPage();
      y = margin;
    }

    doc.setTextColor(180, 80, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Manual Review Required (${manualReviewTriggers.length})`, margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Severity', 'Message', 'Field']],
      body: manualReviewTriggers.map((t) => [t.severity.toUpperCase(), t.message, t.field]),
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 60 } },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  }

  if (y > 600) {
    doc.addPage();
    y = margin;
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Line Items (${lineItems.length})`, margin, y);
  y += 6;

  const byCategory = lineItems.reduce<Record<string, EstimateLineItem[]>>((acc, li) => {
    if (!acc[li.category]) acc[li.category] = [];
    acc[li.category].push(li);
    return acc;
  }, {});

  const lineData: (string | number)[][] = [];
  for (const [cat, items] of Object.entries(byCategory)) {
    lineData.push([{ content: cat, colSpan: 5, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } } as unknown as string]);
    for (const li of items) {
      lineData.push([
        li.description,
        String(li.quantity),
        li.unit,
        fmt(li.unitPrice),
        fmt(li.extendedPrice),
      ]);
    }
    const catTotal = items.reduce((s, li) => s + li.extendedPrice, 0);
    lineData.push([
      { content: `${cat} Subtotal`, colSpan: 4, styles: { halign: 'right', fontStyle: 'italic' } } as unknown as string,
      fmt(catTotal),
    ]);
  }

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Qty', 'Unit', 'Unit Price', 'Ext. Price']],
    body: lineData,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 200 },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 70, halign: 'right' },
      4: { cellWidth: 70, halign: 'right' },
    },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;

  if (exclusions.length > 0) {
    if (y > 650) {
      doc.addPage();
      y = margin;
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Exclusions (${exclusions.length})`, margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Category', 'Exclusion']],
      body: exclusions.map((ex) => [ex.category, ex.text]),
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [107, 114, 128], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 100 } },
    });
  }

  const pageCount = (doc as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    (doc as unknown as { setPage: (n: number) => void }).setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'This estimate is for budgetary purposes only and is subject to final site survey and engineering review.',
      margin,
      pageH - 25,
    );
    doc.text(
      `BulletEV Estimate Generator | Page ${i} of ${pageCount}`,
      pageWidth - margin,
      pageH - 25,
      { align: 'right' },
    );
  }

  return doc;
}

export function exportEstimatePDF(output: EstimateOutput): void {
  const doc = buildEstimatePdfDocument(output);
  const { input } = output;
  const projectSlug = (input.project.name || 'estimate')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`bulletev-${projectSlug}-${dateStr}.pdf`);
}

async function fetchUrlAsPreviewImage(
  url: string,
  label: string,
): Promise<EstimatePdfPreviewImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const mime = blob.type || '';
    const format: 'JPEG' | 'PNG' = mime.includes('png') ? 'PNG' : 'JPEG';
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { label, dataUrl, format };
  } catch {
    return null;
  }
}

/** Download PDF with embedded satellite / Street View previews when URLs are available (CORS must allow fetch). */
export async function exportEstimatePDFWithPreviews(
  output: EstimateOutput,
  previews?: SharedPreviewAssets,
): Promise<void> {
  const images: EstimatePdfPreviewImage[] = [];
  if (previews?.satelliteStaticUrl) {
    const img = await fetchUrlAsPreviewImage(previews.satelliteStaticUrl, 'Satellite (Mapbox)');
    if (img) images.push(img);
  }
  if (previews?.streetViewStaticUrl) {
    const img = await fetchUrlAsPreviewImage(previews.streetViewStaticUrl, 'Street View (Google)');
    if (img) images.push(img);
  }
  const doc = buildEstimatePdfDocument(output, { previewImages: images });
  const { input } = output;
  const projectSlug = (input.project.name || 'estimate')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`bulletev-${projectSlug}-${dateStr}.pdf`);
}
