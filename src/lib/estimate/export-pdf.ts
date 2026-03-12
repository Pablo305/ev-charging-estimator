import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EstimateOutput, EstimateLineItem } from './types';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export function exportEstimatePDF(output: EstimateOutput): void {
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

  // ── Cost Summary ────────────────────────────────────────
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

  // Totals rows
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

  // Grand total
  doc.setFillColor(37, 99, 235);
  doc.rect(margin, y, pageWidth - margin * 2, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', margin + 10, y + 18);
  doc.text(fmt(summary.total), pageWidth - margin - 10, y + 18, { align: 'right' });

  y += 44;

  // ── Manual Review Triggers ──────────────────────────────
  if (manualReviewTriggers.length > 0) {
    if (y > 680) { doc.addPage(); y = margin; }

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

  // ── Line Items ──────────────────────────────────────────
  if (y > 600) { doc.addPage(); y = margin; }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Line Items (${lineItems.length})`, margin, y);
  y += 6;

  // Group by category
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

  // ── Exclusions ──────────────────────────────────────────
  if (exclusions.length > 0) {
    if (y > 650) { doc.addPage(); y = margin; }

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

  // ── Footer on every page ────────────────────────────────
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

  // ── Save ────────────────────────────────────────────────
  const projectSlug = (input.project.name || 'estimate')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`bulletev-${projectSlug}-${dateStr}.pdf`);
}
