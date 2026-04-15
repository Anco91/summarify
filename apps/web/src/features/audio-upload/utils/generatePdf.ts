import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generatePdf(text: string, filename = "transcription"): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const INDIGO: [number, number, number] = [99, 102, 241];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INDIGO);
  doc.text("Summarify", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Transcription audio", 14, 27);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Genere le ${new Date().toLocaleDateString("fr-FR")}`, 14, 34);

  doc.setDrawColor(...INDIGO);
  doc.setLineWidth(0.5);
  doc.line(14, 38, 196, 38);

  const paragraphs = text
    .replace(/\s+/g, " ")
    .trim()
    .match(/.{1,500}(\s|$)/g) ?? [text];

  autoTable(doc, {
    startY: 44,
    body: paragraphs.map((p) => [p.trim()]),
    theme: "plain",
    styles: {
      fontSize: 10,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    columnStyles: { 0: { cellWidth: 180 } },
    didDrawPage: (data) => {
      const str = `Page ${data.pageNumber}`;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(str, doc.internal.pageSize.width / 2, 290, { align: "center" });
    },
  });

  doc.save(`${filename}.pdf`);
}
