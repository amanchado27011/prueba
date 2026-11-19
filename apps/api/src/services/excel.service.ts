import ExcelJS from 'exceljs';
import type { ExportBook } from '../domain/export-book';

export async function renderWorkbook(book: ExportBook): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Gestion de la demanda';
  for (const sheet of book.sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    worksheet.addRow(sheet.headers);
    worksheet.getRow(1).font = { bold: true };
    for (const row of sheet.rows) worksheet.addRow(row);
    worksheet.columns.forEach((column) => {
      column.width = 24;
    });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
