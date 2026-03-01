import jsPDF from 'jspdf';
import { ReimbursementRequest, ReimbursementItem, ReimbursementAttachment } from '@/hooks/useReimbursements';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PdfData {
  reimbursement: ReimbursementRequest & {
    requester_name?: string;
    reviewer_name?: string;
    project_name?: string;
    client_name?: string;
    paid_by_name?: string;
    paid_at?: string;
  };
  items: ReimbursementItem[];
  attachments: ReimbursementAttachment[];
}

const fmtCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d: string) =>
  format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

export function generateReimbursementPdf({ reimbursement, items, attachments }: PdfData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Comprovante de Reembolso', pageWidth / 2, y, { align: 'center' });
  y += 12;

  // Status
  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    paid: 'Pago',
  };
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Status: ${statusLabels[reimbursement.status] || reimbursement.status}`, pageWidth / 2, y, { align: 'center' });
  y += 12;

  // Separator
  doc.setDrawColor(200);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Info fields
  doc.setFontSize(10);
  const addField = (label: string, value: string) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 60, y);
    y += 7;
  };

  addField('Solicitante:', reimbursement.requester_name || 'Desconhecido');
  addField('Valor Total:', fmtCurrency(reimbursement.total_amount));
  addField('Data Pedido:', fmtDate(reimbursement.created_at));
  addField('Tipo:', reimbursement.is_internal ? 'Interno' : 'Projeto');

  if (!reimbursement.is_internal && reimbursement.project_name) {
    addField('Projeto:', reimbursement.project_name);
  }
  if (reimbursement.client_name) {
    addField('Cliente:', reimbursement.client_name);
  }

  // Approval info
  if (reimbursement.reviewed_at) {
    y += 3;
    addField('Aprovado por:', reimbursement.reviewer_name || '-');
    addField('Data Aprovação:', fmtDate(reimbursement.reviewed_at));
  }

  // Payment info
  if (reimbursement.paid_at) {
    y += 3;
    addField('Pago por:', reimbursement.paid_by_name || '-');
    addField('Data Pagamento:', fmtDate(reimbursement.paid_at));
  }

  // Description
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Descrição:', 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  const descLines = doc.splitTextToSize(reimbursement.description || '-', pageWidth - 28);
  doc.text(descLines, 14, y);
  y += descLines.length * 5 + 5;

  // Expense items
  if (items.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.text('Itens de Despesa:', 14, y);
    y += 7;

    // Table header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Data', 14, y);
    doc.text('Descrição', 50, y);
    doc.text('Valor', pageWidth - 14, y, { align: 'right' });
    y += 2;
    doc.line(14, y, pageWidth - 14, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    for (const item of items) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(format(new Date(item.expense_date + 'T12:00:00'), 'dd/MM/yyyy'), 14, y);
      const descText = doc.splitTextToSize(item.description, 90);
      doc.text(descText, 50, y);
      doc.text(fmtCurrency(item.amount), pageWidth - 14, y, { align: 'right' });
      y += Math.max(descText.length * 5, 6) + 2;
    }

    // Total
    y += 2;
    doc.line(14, y, pageWidth - 14, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', 50, y);
    doc.text(fmtCurrency(reimbursement.total_amount), pageWidth - 14, y, { align: 'right' });
    y += 8;
  }

  // Attachments list
  if (attachments.length > 0) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Anexos:', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (const a of attachments) {
      if (y > 270) { doc.addPage(); y = 20; }
      const sizeKB = a.file_size ? `(${(a.file_size / 1024).toFixed(0)} KB)` : '';
      doc.text(`• ${a.file_name} ${sizeKB}`, 18, y);
      y += 5;
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );

  doc.save(`reembolso-${reimbursement.id.slice(0, 8)}.pdf`);
}
