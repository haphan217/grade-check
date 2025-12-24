import {
  type ParsedFile,
  type StudentScore,
  type ParsedSheet,
} from "./excelParser";

export interface ScoreDifference {
  studentName: string;
  scoreType: string;
  file1Value: number | string;
  file2Value: number | string;
}

export interface SheetComparisonResult {
  sheetName: string;
  differences: ScoreDifference[];
  missingInFile1: string[];
  missingInFile2: string[];
}

export interface ComparisonResult {
  sheetResults: SheetComparisonResult[];
  totalDifferences: number;
  totalMissingInFile1: number;
  totalMissingInFile2: number;
}

// Normalize student name for comparison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim();
}

// Compare two values (can be numbers or strings)
function valuesEqual(val1: number | string, val2: number | string): boolean {
  // Handle empty values
  if ((val1 === "" || val1 == null) && (val2 === "" || val2 == null)) {
    return true;
  }

  // Convert to numbers if possible
  const num1 = typeof val1 === "number" ? val1 : parseFloat(String(val1));
  const num2 = typeof val2 === "number" ? val2 : parseFloat(String(val2));

  // If both are valid numbers, compare them
  if (!isNaN(num1) && !isNaN(num2)) {
    return num1 === num2;
  }

  // Otherwise compare as strings
  return String(val1).trim() === String(val2).trim();
}

// Compare arrays of ĐĐGTX scores
function compareDDGTX(
  ddgtx1: (number | string)[],
  ddgtx2: (number | string)[],
  selectedColumns: string[]
): string[] {
  const differences: string[] = [];
  const maxLength = Math.max(ddgtx1.length, ddgtx2.length);

  for (let i = 0; i < maxLength; i++) {
    const columnName = `ĐĐGTX${i + 1}`;
    // Only compare if this column is selected
    if (!selectedColumns.includes(columnName)) continue;

    const val1 = ddgtx1[i] ?? "";
    const val2 = ddgtx2[i] ?? "";

    if (!valuesEqual(val1, val2)) differences.push(columnName);
  }

  return differences;
}

const getMissingStudents = (
  students1: StudentScore[],
  students2: StudentScore[],
  file1Map: Map<string, StudentScore>,
  file2Map: Map<string, StudentScore>
) => {
  const missingInFile1: string[] = [];
  const missingInFile2: string[] = [];

  students1.forEach((student) => {
    const normalizedName = normalizeName(student.name);
    file1Map.set(normalizedName, student);
  });

  students2.forEach((student) => {
    const normalizedName = normalizeName(student.name);
    file2Map.set(normalizedName, student);
  });

  // Find students in sheet1 but not in sheet2
  students1.forEach((student) => {
    const normalizedName = normalizeName(student.name);
    if (!file2Map.has(normalizedName)) {
      missingInFile2.push(student.name);
    }
  });

  // Find students in sheet2 but not in sheet1
  students2.forEach((student) => {
    const normalizedName = normalizeName(student.name);
    if (!file1Map.has(normalizedName)) {
      missingInFile1.push(student.name);
    }
  });

  return { missingInFile1, missingInFile2 };
};

// Compare two sheets with the same name
function compareSheets(
  sheet1: ParsedSheet,
  sheet2: ParsedSheet,
  selectedColumns: string[]
): SheetComparisonResult {
  const differences: ScoreDifference[] = [];

  // Create maps for quick lookup
  const file1Map = new Map<string, StudentScore>();
  const file2Map = new Map<string, StudentScore>();

  const { missingInFile1, missingInFile2 } = getMissingStudents(
    sheet1.students,
    sheet2.students,
    file1Map,
    file2Map
  );

  // Compare scores for students in both sheets
  sheet1.students.forEach((student1) => {
    const normalizedName = normalizeName(student1.name);
    const student2 = file2Map.get(normalizedName);
    const studentName = student1.name;

    if (!student2) return;

    // Compare ĐĐGTX scores
    if (selectedColumns.some((col) => col.startsWith("ĐĐGTX"))) {
      const ddgtxDiffs = compareDDGTX(
        student1.ddgtx,
        student2.ddgtx,
        selectedColumns
      );
      ddgtxDiffs.forEach((diffType) => {
        const index = parseInt(diffType.replace("ĐĐGTX", "")) - 1;
        differences.push({
          studentName,
          scoreType: diffType,
          file1Value: student1.ddgtx[index] ?? "",
          file2Value: student2.ddgtx[index] ?? "",
        });
      });
    }

    // Compare ĐĐGGK
    if (
      selectedColumns.includes("ĐĐGGK") &&
      !valuesEqual(student1.ddggk, student2.ddggk)
    ) {
      differences.push({
        studentName,
        scoreType: "ĐĐGGK",
        file1Value: student1.ddggk,
        file2Value: student2.ddggk,
      });
    }

    // Compare ĐĐGCK
    if (
      selectedColumns.includes("ĐĐGCK") &&
      !valuesEqual(student1.ddgck, student2.ddgck)
    ) {
      differences.push({
        studentName,
        scoreType: "ĐĐGCK",
        file1Value: student1.ddgck,
        file2Value: student2.ddgck,
      });
    }

    // Compare ĐTBMHK1/TBMHK1
    if (
      selectedColumns.includes("ĐTBMHK1") &&
      !valuesEqual(student1.dtbmhk1, student2.dtbmhk1)
    ) {
      differences.push({
        studentName,
        scoreType: "ĐTBMHK1",
        file1Value: student1.dtbmhk1,
        file2Value: student2.dtbmhk1,
      });
    }
  });

  return {
    sheetName: sheet1.sheetName,
    differences,
    missingInFile1,
    missingInFile2,
  };
}

export function compareFiles(
  file1: ParsedFile,
  file2: ParsedFile,
  compareMultipleSheets: boolean = false,
  selectedColumns: string[] = []
): ComparisonResult {
  const sheetResults: SheetComparisonResult[] = [];

  if (compareMultipleSheets) {
    // Compare multiple sheets: only compare sheets with the same name
    const file2SheetMap = new Map<string, ParsedSheet>();
    file2.sheets.forEach((sheet) => {
      file2SheetMap.set(sheet.sheetName, sheet);
    });

    // Compare sheets that exist in both files
    file1.sheets.forEach((sheet1) => {
      const sheet2 = file2SheetMap.get(sheet1.sheetName);
      // Only compare if the sheet exists in both files
      if (sheet2) {
        const result = compareSheets(sheet1, sheet2, selectedColumns);
        sheetResults.push(result);
      }
    });
  } else {
    // Compare single sheet: compare first sheet of file1 with first sheet of file2
    if (file1.sheets.length > 0 && file2.sheets.length > 0) {
      const sheet1 = file1.sheets[0];
      const sheet2 = file2.sheets[0];
      const result = compareSheets(sheet1, sheet2, selectedColumns);
      sheetResults.push(result);
    }
  }

  // Calculate totals
  const totalDifferences = sheetResults.reduce(
    (sum, result) => sum + result.differences.length,
    0
  );
  const totalMissingInFile1 = sheetResults.reduce(
    (sum, result) => sum + result.missingInFile1.length,
    0
  );
  const totalMissingInFile2 = sheetResults.reduce(
    (sum, result) => sum + result.missingInFile2.length,
    0
  );

  return {
    sheetResults,
    totalDifferences,
    totalMissingInFile1,
    totalMissingInFile2,
  };
}
