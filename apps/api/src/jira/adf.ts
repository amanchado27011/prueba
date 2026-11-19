export function adfToText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node !== 'object') return '';
  const record = node as { text?: unknown; content?: unknown[] };
  const self = typeof record.text === 'string' ? record.text : '';
  const inner = Array.isArray(record.content) ? record.content.map((child) => adfToText(child)).filter(Boolean).join('\n') : '';
  return [self, inner].filter(Boolean).join('\n').trim();
}
