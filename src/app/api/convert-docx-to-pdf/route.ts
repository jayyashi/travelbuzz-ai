import { NextRequest, NextResponse } from 'next/server';
import * as mammoth from 'mammoth';
import PDFDocument from 'pdfkit';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const isDocxFile = ext === 'docx' || ext === 'doc';

    if (!isDocxFile) {
      return NextResponse.json({ error: 'Only .docx and .doc files are supported' }, { status: 400 });
    }

    // Convert docx to text using mammoth
    const arrayBuffer = await file.arrayBuffer();
    const mammothResult = await mammoth.extractRawText({ arrayBuffer });
    const textContent = mammothResult.value || 'Unable to extract text from document';

    // Create a PDF from the text
    const pdfBuffer = await generatePDFFromText(textContent, file.name);

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.[^.]+$/, '')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error converting docx to pdf:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Conversion failed' },
      { status: 500 }
    );
  }
}

// Generate PDF from text content
async function generatePDFFromText(text: string, originalFileName: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add title
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(`Document: ${originalFileName}`)
        .fontSize(11)
        .font('Helvetica')
        .moveDown();

      // Add converted text
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          doc.text(line, { align: 'left', width: 500 });
        } else {
          doc.moveDown(0.5);
        }
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
