import * as XLSX from "xlsx";

export interface StudentScore {
  name: string;
  ddgtx: (number | string)[];
  ddggk: number | string;
  ddgck: number | string;
  dtbmhk1: number | string;
}

export interface ParsedSheet {
  sheetName: string;
  students: StudentScore[];
}

export interface ParsedFile {
  sheets: ParsedSheet[];
  fileName: string;
}

// Normalize column name for comparison (case insensitive, remove spaces, handle Vietnamese)
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/\s+/g, "")
    .trim();
}

// Find column index by normalized name
function findColumnIndex(headers: string[], normalizedName: string): number {
  return headers.findIndex((h) => normalizeColumnName(h) === normalizedName);
}

// Parse a single sheet
function parseSheet(
  worksheet: XLSX.WorkSheet,
  sheetName: string
): StudentScore[] {
  // Convert to JSON to get all data
  const jsonData: string[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
  });

  // Find header row (row 6 or 7, but ĐĐGTX sub-columns are at row 8 - index 7)
  let headerRowIndex = 5;
  // Check if row 6 (index 5) contains student name header
  if (jsonData.length > 5) {
    const row = jsonData[5];
    const hasNameHeader = row.some(
      (cell: string) =>
        normalizeColumnName(String(cell)).includes("hoten") ||
        normalizeColumnName(String(cell)).includes("hovaten")
    );

    // Otherwise, header is row 7 (index 6)
    if (!hasNameHeader) headerRowIndex = 6;
  } else {
    throw new Error(`Không tìm thấy hàng tiêu đề trong sheet "${sheetName}"`);
  }

  // ĐĐGTX sub-columns are always at row 8 (index 7)
  const ddgtxSubRowIndex = 7;
  if (jsonData.length < 7) {
    throw new Error(`Không tìm thấy hàng DDGTX trong sheet "${sheetName}"`);
  }

  const headers = jsonData[headerRowIndex];
  const ddgtxSubHeaders = jsonData[ddgtxSubRowIndex];

  // Find column indices - try multiple variations for name column
  let nameColIndex = -1;
  const namePatterns = ["hoten", "hovaten"];

  for (const pattern of namePatterns) {
    const index = findColumnIndex(headers, pattern);
    if (index !== -1) {
      nameColIndex = index;
      break;
    }
  }

  if (nameColIndex === -1) {
    throw new Error(
      `Không tìm thấy cột tên học sinh trong sheet "${sheetName}"`
    );
  }

  const ddggkColIndex = findColumnIndex(headers, "đđggk");
  console.log({ ddggkColIndex, headers });
  const ddgckColIndex = findColumnIndex(headers, "đđgck");
  let dtbmhk1ColIndex = findColumnIndex(headers, "đtbmhk1");

  dtbmhk1ColIndex =
    dtbmhk1ColIndex !== -1
      ? dtbmhk1ColIndex
      : findColumnIndex(headers, "tbmhk1");

  // Find ĐĐGTX columns
  const ddgtxColIndices: number[] = [];

  // Look for columns in row 8 which has numbers 1-5
  for (let col = 0; col < ddgtxSubHeaders.length; col++) {
    const subHeader = String(ddgtxSubHeaders[col] || "").trim();
    const num = parseInt(subHeader);

    if (!isNaN(num) && num >= 1 && num <= 5) ddgtxColIndices.push(col);
  }

  // Parse students starting from row 9 (index 8)
  const students: StudentScore[] = [];
  for (let rowIndex = 8; rowIndex < jsonData.length; rowIndex++) {
    const row = jsonData[rowIndex];
    const name = String(row[nameColIndex] || "").trim();
    if (!name) continue;

    // Get ĐĐGTX scores
    const ddgtx: (number | string)[] = [];
    if (ddgtxColIndices.length > 0) {
      ddgtxColIndices.forEach((colIndex) => {
        const value = row[colIndex];
        if (value === "" || value == undefined) {
          ddgtx.push("");
        } else {
          const num = parseFloat(String(value));
          ddgtx.push(isNaN(num) ? String(value) : num);
        }
      });
    }

    // Get other scores
    const ddggk = ddggkColIndex !== -1 ? row[ddggkColIndex] || "" : "";
    const ddgck = ddgckColIndex !== -1 ? row[ddgckColIndex] || "" : "";
    const dtbmhk1 = dtbmhk1ColIndex !== -1 ? row[dtbmhk1ColIndex] || "" : "";

    students.push({
      name,
      ddgtx,
      ddggk: ddggk === "" ? "" : parseFloat(String(ddggk)),
      ddgck: ddgck === "" ? "" : parseFloat(String(ddgck)),
      dtbmhk1: dtbmhk1 === "" ? "" : parseFloat(String(dtbmhk1)),
    });
  }

  return students;
}

export function parseExcelFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        // Parse all sheets
        const sheets: ParsedSheet[] = [];

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          try {
            const students = parseSheet(worksheet, sheetName);
            sheets.push({
              sheetName,
              students,
            });
          } catch (error) {
            // Skip sheets that can't be parsed, but log the error
            console.warn(`Không thể đọc sheet "${sheetName}":`, error);
          }
        }

        if (sheets.length === 0) {
          reject(new Error("Không tìm thấy sheet nào có thể đọc được"));
          return;
        }

        resolve({
          sheets,
          fileName: file.name,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Lỗi khi đọc file"));
    };

    reader.readAsArrayBuffer(file);
  });
}
