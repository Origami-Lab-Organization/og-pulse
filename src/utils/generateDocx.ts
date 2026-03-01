import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Footer, PageNumber, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';

export async function generateDocxFromMarkdown(markdown: string, title: string): Promise<void> {
  const lines = markdown.split('\n');
  const children: (Paragraph | Table)[] = [];

  let tableRows: string[][] = [];

  const processTable = () => {
    if (tableRows.length > 0) {
      const table = new Table({
        rows: tableRows.map((row, idx) =>
          new TableRow({
            children: row.map(cell =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: cell.trim(), bold: idx === 0 })] })],
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                  left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                  right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                },
              })
            ),
          })
        ),
        width: { size: 100, type: WidthType.PERCENTAGE },
      });
      children.push(new Paragraph({ children: [] }));
      children.push(table);
      tableRows = [];
    }
  };

  let inTable = false;

  for (const line of lines) {
    if (line.startsWith('|') && line.endsWith('|')) {
      if (line.includes('---')) continue;
      inTable = true;
      const cells = line.split('|').filter(c => c.trim());
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      processTable();
      inTable = false;
    }

    if (line.startsWith('# ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        children: [new TextRun({ text: line.slice(2), bold: true, size: 32 })],
      }));
    } else if (line.startsWith('## ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
        children: [new TextRun({ text: line.slice(3), bold: true, size: 28 })],
      }));
    } else if (line.startsWith('### ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: line.slice(4), bold: true, size: 24 })],
      }));
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      children.push(new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: line.slice(2) })],
      }));
    } else if (line.match(/^\d+\. /)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line })],
      }));
    } else if (line.trim()) {
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
      const runs = parts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return new TextRun({ text: part.slice(2, -2), bold: true });
        } else if (part.startsWith('*') && part.endsWith('*')) {
          return new TextRun({ text: part.slice(1, -1), italics: true });
        }
        return new TextRun({ text: part });
      });
      children.push(new Paragraph({ children: runs }));
    }
  }

  processTable();

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Gerado por Origami Pulse | Strategy Analyst | Página ', size: 18, color: '666666' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '666666' }),
            ],
          })],
        }),
      },
      children: children as Paragraph[],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `analise-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().split('T')[0]}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
