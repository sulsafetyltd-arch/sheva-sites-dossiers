/**
 * Export a legal document (HTML) as a Word file.
 * Word opens HTML saved with the msword MIME type natively, keeping RTL,
 * headings and tables — no heavy docx library needed in the browser.
 */
const WORD_STYLES = `
  body { direction: rtl; font-family: 'David', 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; }
  h1 { font-size: 16pt; text-align: center; text-decoration: underline; }
  h2 { font-size: 13pt; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #444; padding: 4pt 6pt; text-align: right; }
  .legal-head { text-align: center; margin-bottom: 12pt; }
  .legal-head .office, .legal-head .file { font-size: 10pt; color: #333; }
  .office-logo { max-height: 60pt; }
  .sig-block { margin-top: 24pt; }
`;

export function buildWordHtml(title: string, bodyHtml: string): string {
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" dir="rtl" lang="he">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>${WORD_STYLES}</style>
</head>
<body dir="rtl">${bodyHtml}</body>
</html>`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'document';
}

export function downloadAsWord(title: string, bodyHtml: string): void {
  const html = buildWordHtml(title, bodyHtml);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(title)}.doc`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
