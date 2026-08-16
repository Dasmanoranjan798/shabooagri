/**
 * ShabooAgri Export & Sharing Engine (PDF, Excel, WhatsApp)
 * Strict requirement: Excel & PDF export only (No CSV).
 */

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

/**
 * Generates and triggers download of a formatted Microsoft Excel (.xls/.xlsx compatible) file
 * using structured XML Spreadsheet schema with UTF-8 encoding.
 */
export function exportToExcel(
  filename: string,
  sheetName: string,
  columns: ExcelColumn[],
  data: Record<string, any>[]
) {
  const cleanFilename = filename.endsWith(".xls") || filename.endsWith(".xlsx")
    ? filename
    : `${filename}.xls`;

  // Build Excel XML Document Header & WorkSheet
  const headerXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>ShabooAgri Operational System</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1B7A3E" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D4722"/>
   </Borders>
  </Style>
  <Style ss:ID="DataStyle">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#111827"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
  <Style ss:ID="CurrencyStyle">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#111827"/>
   <NumberFormat ss:Format="&#34;&#x20B9;&#34;#,##0.00"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>
`;

  // Column Specifications
  let columnXml = "";
  for (const col of columns) {
    const width = col.width ? col.width * 8 : 120;
    columnXml += `   <Column ss:AutoFitWidth="1" ss:Width="${width}"/>\n`;
  }

  // Header Row
  let tableRowsXml = '   <Row ss:Height="24">\n';
  for (const col of columns) {
    tableRowsXml += `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${escapeXml(col.header)}</Data></Cell>\n`;
  }
  tableRowsXml += "   </Row>\n";

  // Data Rows
  for (const row of data) {
    tableRowsXml += '   <Row ss:Height="20">\n';
    for (const col of columns) {
      const rawVal = row[col.key];
      const isNum = typeof rawVal === "number" && !isNaN(rawVal);
      const isCurrency = col.key.toLowerCase().includes("amount") || col.key.toLowerCase().includes("total") || col.key.toLowerCase().includes("rate") || col.key.toLowerCase().includes("price");

      if (rawVal === null || rawVal === undefined) {
        tableRowsXml += `    <Cell ss:StyleID="DataStyle"><Data ss:Type="String"></Data></Cell>\n`;
      } else if (isNum) {
        const styleId = isCurrency ? "CurrencyStyle" : "DataStyle";
        tableRowsXml += `    <Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${rawVal}</Data></Cell>\n`;
      } else {
        const strVal = String(rawVal);
        tableRowsXml += `    <Cell ss:StyleID="DataStyle"><Data ss:Type="String">${escapeXml(strVal)}</Data></Cell>\n`;
      }
    }
    tableRowsXml += "   </Row>\n";
  }

  const footerXml = `  </Table>
 </Worksheet>
</Workbook>`;

  const fullXml = headerXml + columnXml + tableRowsXml + footerXml;
  const blob = new Blob([fullXml], { type: "application/vnd.ms-excel;charset=utf-8" });
  downloadBlob(blob, cleanFilename);
}

/**
 * Triggers PDF export / printing via native browser print engine with document title
 */
export function exportToPdf(documentTitle: string = "ShabooAgri Document") {
  const originalTitle = document.title;
  document.title = documentTitle;
  window.print();
  document.title = originalTitle;
}

/**
 * Opens direct WhatsApp chat window with formatted message text
 */
export function shareOnWhatsApp(phoneNumber?: string | null, messageText?: string) {
  let cleanPhone = "";
  if (phoneNumber) {
    cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }
  }

  const encodedMsg = messageText ? encodeURIComponent(messageText) : "";
  let url = "";

  if (cleanPhone) {
    url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${encodedMsg}`;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
