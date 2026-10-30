export interface PdfTableColumn {
  label: string;
  width: number;
  align?: 'left' | 'right';
}

export interface PdfTableSection {
  title: string;
  columns: PdfTableColumn[];
  rows: string[][];
}

export interface PdfDocumentOptions {
  title: string;
  subtitle?: string;
  meta?: string[];
  sections: PdfTableSection[];
}

const ACCENT: [number, number, number] = [0.05, 0.35, 0.32];
const HEADER_FILL: [number, number, number] = [0.94, 0.96, 0.95];
const TEXT_COLOR: [number, number, number] = [0.13, 0.15, 0.18];
const MUTED_COLOR: [number, number, number] = [0.45, 0.47, 0.5];
const RULE_COLOR: [number, number, number] = [0.82, 0.84, 0.83];

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function toLatin1(value: string) {
  let output = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code === 0x00a0) output += ' ';
    else if (code === 0x2026) output += '...';
    else if (code === 0x2013 || code === 0x2014) output += '-';
    else if (code === 0x2018 || code === 0x2019) output += "'";
    else if (code === 0x201c || code === 0x201d) output += '"';
    else if (code === 0x20ac) output += 'EUR';
    else if (code <= 0xff) output += char;
    else output += '?';
  }
  return output;
}

function pdfString(value: string) {
  const text = toLatin1(String(value ?? '').replace(/[\r\n\t]+/g, ' '));
  return `(${text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')})`;
}

function measure(value: string, size: number, bold: boolean) {
  let units = 0;
  for (const char of value) {
    if ('iljtfrI.,:;!|\'`()[]'.includes(char)) units += 0.3;
    else if ('mwMW@%'.includes(char)) units += 0.86;
    else if (char === ' ') units += 0.28;
    else if (char >= 'A' && char <= 'Z') units += 0.68;
    else if (char >= '0' && char <= '9') units += 0.56;
    else units += 0.53;
  }
  return units * size * (bold ? 1.05 : 1);
}

class PdfWriter {
  private pages: string[] = [];
  private ops: string[] = [];
  y: number;

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly margin: number
  ) {
    this.y = height - margin;
  }

  text(
    value: string,
    x: number,
    y: number,
    size: number,
    options: {
      bold?: boolean;
      color?: [number, number, number];
      align?: 'left' | 'right';
      maxWidth?: number;
    } = {}
  ) {
    let text = String(value ?? '').replace(/[\r\n\t]+/g, ' ');
    if (options.maxWidth) text = this.fit(text, options.maxWidth, size, Boolean(options.bold));
    const textWidth = measure(text, size, Boolean(options.bold));
    const px = options.align === 'right' ? x - textWidth : x;
    const color = options.color ?? TEXT_COLOR;
    this.ops.push(
      `BT ${round(color[0])} ${round(color[1])} ${round(color[2])} rg /${options.bold ? 'F2' : 'F1'} ${round(size)} Tf ` +
        `1 0 0 1 ${round(px)} ${round(y)} Tm ${pdfString(text)} Tj ET`
    );
  }

  rect(x: number, y: number, width: number, height: number, color: [number, number, number]) {
    this.ops.push(
      `q ${round(color[0])} ${round(color[1])} ${round(color[2])} rg ${round(x)} ${round(y)} ${round(width)} ${round(height)} re f Q`
    );
  }

  line(x1: number, y1: number, x2: number, y2: number, color: [number, number, number] = RULE_COLOR) {
    this.ops.push(
      `q ${round(color[0])} ${round(color[1])} ${round(color[2])} RG 0.6 w ${round(x1)} ${round(y1)} m ${round(x2)} ${round(y2)} l S Q`
    );
  }

  ensure(height: number) {
    if (this.y - height < this.margin) this.newPage();
  }

  newPage() {
    this.flush();
    this.y = this.height - this.margin;
  }

  renderSection(section: PdfTableSection) {
    const available = this.width - this.margin * 2;
    const totalWeight = section.columns.reduce((total, column) => total + column.width, 0) || 1;
    const widths = section.columns.map((column) => (available * column.width) / totalWeight);
    const positions: number[] = [];
    let cursor = this.margin;
    for (const width of widths) {
      positions.push(cursor);
      cursor += width;
    }

    const drawHeader = (suffix: string) => {
      this.text(section.title + suffix, this.margin, this.y - 8, 10.5, { bold: true, color: ACCENT });
      this.y -= 15;
      this.rect(this.margin, this.y - 14, available, 14, HEADER_FILL);
      section.columns.forEach((column, index) => {
        const x = column.align === 'right' ? positions[index] + widths[index] - 3 : positions[index] + 3;
        this.text(column.label, x, this.y - 10, 7.2, {
          bold: true,
          align: column.align,
          maxWidth: widths[index] - 6,
        });
      });
      this.y -= 14;
      this.line(this.margin, this.y, this.margin + available, this.y);
    };

    this.ensure(72);
    drawHeader('');

    if (section.rows.length === 0) {
      this.text('Sin resultados en el periodo seleccionado.', this.margin + 3, this.y - 12, 8, {
        color: MUTED_COLOR,
      });
      this.y -= 24;
      return;
    }

    for (const row of section.rows) {
      if (this.y - 13 < this.margin) {
        this.newPage();
        drawHeader(' (continuación)');
      }
      section.columns.forEach((column, index) => {
        const x = column.align === 'right' ? positions[index] + widths[index] - 3 : positions[index] + 3;
        this.text(String(row[index] ?? ''), x, this.y - 9.5, 7.4, {
          align: column.align,
          maxWidth: widths[index] - 6,
        });
      });
      this.y -= 12.5;
    }

    this.y -= 10;
  }

  finish(): Buffer {
    this.flush();
    const pages = this.pages.length > 0 ? this.pages : [''];
    const total = pages.length;
    const footer = (index: number) =>
      `BT 0.5 0.52 0.55 rg /F1 7 Tf 1 0 0 1 ${round(this.width - this.margin - 70)} ${round(this.margin - 14)} Tm ` +
      `${pdfString(`Página ${index + 1} de ${total}`)} Tj ET`;

    const objects: Buffer[] = [];
    objects.push(Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'latin1'));
    const kids = pages.map((_, index) => `${5 + index * 2} 0 R`).join(' ');
    objects.push(Buffer.from(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`, 'latin1'));
    objects.push(
      Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', 'latin1')
    );
    objects.push(
      Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>', 'latin1')
    );

    pages.forEach((page, index) => {
      const contentId = 6 + index * 2;
      objects.push(
        Buffer.from(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width} ${this.height}] ` +
            `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
          'latin1'
        )
      );
      const stream = Buffer.from(`${page}\n${footer(index)}`, 'latin1');
      objects.push(
        Buffer.concat([
          Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, 'latin1'),
          stream,
          Buffer.from('\nendstream', 'latin1'),
        ])
      );
    });

    const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n', 'latin1')];
    let length = chunks[0].length;
    const offsets: number[] = [];
    objects.forEach((object, index) => {
      offsets.push(length);
      const head = Buffer.from(`${index + 1} 0 obj\n`, 'latin1');
      const tail = Buffer.from('\nendobj\n', 'latin1');
      chunks.push(head, object, tail);
      length += head.length + object.length + tail.length;
    });

    const xrefOffset = length;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    chunks.push(Buffer.from(xref + trailer, 'latin1'));

    return Buffer.concat(chunks);
  }

  private fit(value: string, maxWidth: number, size: number, bold: boolean) {
    if (measure(value, size, bold) <= maxWidth) return value;
    let truncated = value;
    while (truncated.length > 1 && measure(`${truncated}...`, size, bold) > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return `${truncated}...`;
  }

  private flush() {
    if (this.ops.length > 0) {
      this.pages.push(this.ops.join('\n'));
      this.ops = [];
    }
  }
}

export function renderPdf(options: PdfDocumentOptions): Buffer {
  const writer = new PdfWriter(842, 595, 34);

  writer.text(options.title, 34, writer.y - 20, 16, { bold: true, color: ACCENT });
  writer.y -= 27;
  if (options.subtitle) {
    writer.text(options.subtitle, 34, writer.y, 9.5, { color: MUTED_COLOR });
    writer.y -= 13;
  }
  for (const line of options.meta ?? []) {
    writer.text(line, 34, writer.y, 8, { color: MUTED_COLOR });
    writer.y -= 11;
  }
  writer.y -= 4;
  writer.line(34, writer.y, 842 - 34, writer.y, ACCENT);
  writer.y -= 8;

  for (const section of options.sections) writer.renderSection(section);

  return writer.finish();
}
