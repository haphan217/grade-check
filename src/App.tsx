import { useRef, useState } from "react";

import { compareFiles } from "./utils/compareScores";
import { parseExcelFile } from "./utils/excelParser";

import type { ParsedFile } from "./utils/excelParser";
import type {
  ComparisonResult,
  SheetComparisonResult,
} from "./utils/compareScores";

const availableColumns = [
  "ĐĐGTX1",
  "ĐĐGTX2",
  "ĐĐGTX3",
  "ĐĐGTX4",
  "ĐĐGTX5",
  "ĐĐGGK",
  "ĐĐGCK",
  "ĐTBMHK1",
];

function App() {
  const [parsedFile1, setParsedFile1] = useState<ParsedFile | null>(null);
  const [parsedFile2, setParsedFile2] = useState<ParsedFile | null>(null);
  const [comparisonResult, setComparisonResult] =
    useState<ComparisonResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compareMultipleSheets, setCompareMultipleSheets] = useState(false);
  const [selectedColumns, setSelectedColumns] =
    useState<string[]>(availableColumns);

  const input1Ref = useRef<HTMLInputElement>(null);
  const input2Ref = useRef<HTMLInputElement>(null);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fileIndex: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    try {
      const parsed = await parseExcelFile(file);
      if (fileIndex === 1) setParsedFile1(parsed);
      else setParsedFile2(parsed);

      setSelectedColumns(availableColumns);
    } catch (err) {
      setError(
        `Lỗi khi đọc file ${fileIndex}: ${
          (err as Error)?.message || "Lỗi không xác định"
        }`
      );
      if (fileIndex === 1) setParsedFile1(null);
      else setParsedFile2(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = () => {
    if (!parsedFile1 || !parsedFile2) return;

    try {
      const result = compareFiles(
        parsedFile1,
        parsedFile2,
        compareMultipleSheets,
        selectedColumns
      );
      setComparisonResult(result);
      setError(null);
    } catch (err) {
      setError(
        `Lỗi khi đối chiếu: ${(err as Error)?.message || "Lỗi không xác định"}`
      );
    }
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(
      selectedColumns.includes(column)
        ? selectedColumns.filter((c) => c !== column)
        : [...selectedColumns, column]
    );
  };

  const handleSelectAll = () => {
    setSelectedColumns(availableColumns);
  };

  const handleDeselectAll = () => {
    setSelectedColumns([]);
  };

  const handleReset = () => {
    setParsedFile1(null);
    setParsedFile2(null);
    setComparisonResult(null);
    setError(null);

    input1Ref.current!.value = "";
    input2Ref.current!.value = "";
  };

  const renderStudentList = (students: string[], label: string) => {
    if (students.length === 0) return null;

    return (
      <div className="bg-yellow-50 p-4 rounded-md">
        <div className="text-2xl font-bold text-yellow-600">
          {students.length}
        </div>
        <div className="text-sm text-gray-600">{label}</div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-2">
          <ul className="list-disc list-inside space-y-1 text-left">
            {students.map((name, index) => (
              <li key={index} className="text-gray-700">
                {name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    if (!comparisonResult || !compareMultipleSheets) return null;

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Tổng quan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-md">
            <div className="text-2xl font-bold text-blue-600">
              {comparisonResult.totalDifferences}
            </div>
            <div className="text-sm text-gray-600">Tổng sự khác biệt</div>
          </div>

          {comparisonResult.totalMissingInFile1 > 0 && (
            <div className="bg-orange-50 p-4 rounded-md">
              <div className="text-2xl font-bold text-orange-600">
                {comparisonResult.totalMissingInFile1}
              </div>
              <div className="text-sm text-gray-600">
                Học sinh chỉ có trong file 2
              </div>
            </div>
          )}

          {comparisonResult.totalMissingInFile2 > 0 && (
            <div className="bg-purple-50 p-4 rounded-md">
              <div className="text-2xl font-bold text-purple-600">
                {comparisonResult.totalMissingInFile2}
              </div>
              <div className="text-sm text-gray-600">
                Học sinh chỉ có trong file 1
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSheetResult = (sheetResult: SheetComparisonResult) => {
    const hasDifferences = sheetResult.differences.length > 0;
    const hasMissing =
      sheetResult.missingInFile1.length > 0 ||
      sheetResult.missingInFile2.length > 0;

    if (!hasDifferences && !hasMissing) {
      return (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="text-lg font-semibold text-green-800 mb-2">
            Lớp {sheetResult.sheetName}
          </h4>
          <p className="text-green-700">✓ Không có sự khác biệt</p>
        </div>
      );
    }

    return (
      <div className="mb-6 p-4 bg-white border border-gray-200 rounded-md">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">
          Lớp {sheetResult.sheetName}
        </h4>

        {/* Summary for this sheet */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded-md">
            <div className="text-xl font-bold text-blue-600">
              {sheetResult.differences.length}
            </div>
            <div className="text-xs text-gray-600">Sự khác biệt</div>
          </div>

          {hasMissing && (
            <div>
              {renderStudentList(
                sheetResult.missingInFile1,
                "Chỉ có trong file 2"
              )}
              {renderStudentList(
                sheetResult.missingInFile2,
                "Chỉ có trong file 1"
              )}
            </div>
          )}
        </div>

        {hasDifferences && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Học sinh", "Loại điểm", "File 1", "File 2"].map(
                    (header, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {sheetResult.differences.map((diff, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {diff.studentName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {diff.scoreType}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 font-semibold">
                      {diff.file1Value === "" ? "(trống)" : diff.file1Value}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 font-semibold">
                      {diff.file2Value === "" ? "(trống)" : diff.file2Value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderDifferences = () => {
    if (!comparisonResult?.sheetResults.length) return null;

    return (
      <div className="mb-6">
        {compareMultipleSheets && (
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Chi tiết theo từng lớp
          </h3>
        )}
        {comparisonResult.sheetResults.map((sheetResult, index) => (
          <div key={index}>{renderSheetResult(sheetResult)}</div>
        ))}
      </div>
    );
  };

  const renderFileInput = (index: number) => (
    <div key={index}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        File điểm {index}
      </label>
      <input
        ref={index === 1 ? input1Ref : input2Ref}
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => handleFileChange(e, index)}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        disabled={loading}
      />

      {parsedFile1 && index === 1 && (
        <div className="mt-2">
          <p className="text-sm text-green-600">
            ✓ Đã đọc {parsedFile1.sheets.length} sheet từ {parsedFile1.fileName}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {parsedFile1.sheets
              .map((s) => `${s.sheetName} (${s.students.length} học sinh)`)
              .join(", ")}
          </p>
        </div>
      )}

      {parsedFile2 && index === 2 && (
        <div className="mt-2">
          <p className="text-sm text-green-600">
            ✓ Đã đọc {parsedFile2.sheets.length} sheet từ {parsedFile2.fileName}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {parsedFile2.sheets
              .map((s) => `${s.sheetName} (${s.students.length} học sinh)`)
              .join(", ")}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-[80%] mx-auto ">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Đối chiếu điểm học sinh
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(renderFileInput)}
          </div>

          {/* Checkbox for multiple sheets comparison */}
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="compareMultipleSheets"
              checked={compareMultipleSheets}
              onChange={(e) => setCompareMultipleSheets(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="compareMultipleSheets"
              className="ml-2 text-sm font-medium text-gray-700"
            >
              Đối chiếu nhiều lớp
            </label>
          </div>

          {/* Column selection dropdown */}
          {parsedFile1 && parsedFile2 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn cột điểm để đối chiếu
              </label>
              <div className="relative">
                <div className="border border-gray-300 rounded-md bg-white p-3 max-h-60 overflow-y-auto">
                  <div className="mb-2 pb-2 border-b border-gray-200">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-xs text-blue-600 hover:text-blue-800 mr-3 bg-blue-50 hover:bg-blue-100"
                    >
                      Chọn tất cả
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-xs text-gray-600 hover:text-gray-800 bg-blue-50 hover:bg-blue-100"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>

                  <div className="space-y-2">
                    {availableColumns.map((column) => (
                      <div key={column} className="flex items-center">
                        <input
                          type="checkbox"
                          id={column}
                          checked={selectedColumns.includes(column)}
                          onChange={() => handleColumnToggle(column)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label
                          htmlFor={column}
                          className="ml-2 text-sm text-gray-700"
                        >
                          {column}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="mt-6 flex gap-4 justify-center">
            <button
              onClick={handleCompare}
              disabled={
                !parsedFile1 ||
                !parsedFile2 ||
                loading ||
                !selectedColumns.length
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Đang xử lý..." : "Đối chiếu"}
            </button>

            <button
              onClick={handleReset}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Xóa
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Comparison Results */}
        {comparisonResult && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Kết quả đối chiếu
            </h2>

            {renderSummary()}

            {renderDifferences()}

            {/* No Differences Message */}
            {comparisonResult.totalDifferences === 0 &&
              comparisonResult.totalMissingInFile1 === 0 &&
              comparisonResult.totalMissingInFile2 === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <p className="text-green-800 font-semibold">
                    ✓ Không có sự khác biệt nào! Tất cả các lớp được đối chiếu
                    đều giống nhau.
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
