"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Upload } from "lucide-react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import { Timestamp } from "firebase/firestore";

interface AttendanceRecord {
  rollNumber: string;
  count: number;
  createdAt: string;
  dept: string;
  paidAt?: string;
  paidFine: number;
  uf: number;
  timestamps: {
    L1?: string;
    L2?: string;
    L3?: string;
    L4?: string;
    L5?: string;
    L6?: string;
    L7?: string;
    L8?: string;
  };
}

interface ExcelRecord {
  RollNo: string;
  Name: string;
  Dept: string;
  Semister: string;
}

interface ExcelRow {
  [key: string]: string | number | null;
}

interface ExcelData {
  [key: number]: string | number | null;
  length: number;
}

interface ColumnMap {
  rollNo: string;
  name: string;
  semester: string;
}

// Add a helper function to format timestamps
function formatTimestamp(timestamp: any): string {
  if (!timestamp) return "-";
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toLocaleString();
  }
  return "-";
}

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [matchedRecords, setMatchedRecords] = useState<
    (AttendanceRecord & ExcelRecord)[]
  >([]);

  // Replace this with your Google Spreadsheet link
  const SPREADSHEET_URL =
    "https://docs.google.com/spreadsheets/d/1ALQWqADE8E3DBwIL3U-RaYg8vY-t-Yn1/edit?usp=sharing&ouid=117677212679251065100&rtpof=true&sd=true";

  const fetchRecords = async (month: string, year: string) => {
    setIsLoading(true);
    try {
      const formattedMonth = `${parseInt(month, 10)} ${year}`;
      const archiveRef = collection(db, "archive");

      // Get all documents from archive collection
      const snapshot = await getDocs(archiveRef);
      const allData: AttendanceRecord[] = [];

      // Process each department's document
      for (const doc of snapshot.docs) {
        const deptData = doc.data();

        // Convert document data to records and filter by createdAt
        Object.entries(deptData).forEach(
          ([rollNumber, record]: [string, any]) => {
            if (record.createdAt === formattedMonth) {
              allData.push({
                rollNumber,
                count: record.count,
                createdAt: record.createdAt,
                dept: record.dept,
                paidAt: record.paidAt,
                paidFine: record.pf || 0,
                uf: record.uf || 0,
                timestamps: record.timestamps || {},
              });
            }
          }
        );
      }

      // Sort by department and roll number
      const sortedData = allData.sort((a, b) => {
        if (a.dept !== b.dept) {
          return a.dept.localeCompare(b.dept);
        }
        return a.rollNumber.localeCompare(b.rollNumber);
      });

      setRecords(sortedData);

      if (sortedData.length === 0) {
        alert(`No records found for ${formattedMonth}.`);
      }

      return sortedData;
    } catch (error) {
      console.error("Error retrieving data:", error);
      alert("Failed to retrieve data. Please try again later.");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const handleMonthChange = async (value: string) => {
    setSelectedMonth(value);
    const [month, year] = value.split("-");
    await fetchRecords(month, year);
  };

  const processExcelFile = async () => {
    if (!records.length) return;

    setIsLoading(true);
    try {
      // Convert Google Spreadsheet URL to export URL
      const spreadsheetId = SPREADSHEET_URL.match(/\/d\/(.*?)(\/|$)/)?.[1];
      if (!spreadsheetId) {
        throw new Error("Invalid Google Spreadsheet link format");
      }

      // Create export URL for Excel format
      const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

      console.log("Fetching spreadsheet from:", exportUrl);
      const response = await fetch(exportUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log(
        "File fetched successfully, size:",
        arrayBuffer.byteLength,
        "bytes"
      );

      // Read the Excel file
      const sourceWorkbook = XLSX.read(new Uint8Array(arrayBuffer), {
        type: "array",
      });
      console.log("Available sheets:", sourceWorkbook.SheetNames);

      // Use the first sheet
      const sourceWorksheet =
        sourceWorkbook.Sheets[sourceWorkbook.SheetNames[0]];
      console.log("Worksheet range:", sourceWorksheet["!ref"]);

      // Convert to JSON with headers
      const excelData = XLSX.utils.sheet_to_json(sourceWorksheet, {
        raw: false,
        defval: "",
        blankrows: false,
        header: 1,
      }) as Array<Array<string | number | null>>;

      console.log("Raw Excel Data:", JSON.stringify(excelData, null, 2));

      if (!Array.isArray(excelData) || excelData.length < 3) {
        throw new Error("Spreadsheet is empty or has no data rows");
      }

      // Skip the first row (A, B, C) and get headers from second row
      const headers = excelData[0].map((h) => String(h));
      console.log("Headers found:", headers);

      // Find column indices
      const rollNoIndex = headers.findIndex(
        (header) => header.toLowerCase().trim() === "rollno"
      );
      const nameIndex = headers.findIndex(
        (header) => header.toLowerCase().trim() === "name"
      );
      const deptIndex = headers.findIndex(
        (header) => header.toLowerCase().trim() === "dept"
      );
      const semesterIndex = headers.findIndex(
        (header) => header.toLowerCase().trim() === "semister"
      );

      console.log("Column indices:", {
        rollNoIndex,
        nameIndex,
        deptIndex,
        semesterIndex,
      });

      if (
        rollNoIndex === -1 ||
        nameIndex === -1 ||
        deptIndex === -1 ||
        semesterIndex === -1
      ) {
        throw new Error(
          `Could not find required columns. Headers must be exactly "RollNo", "Name", "Dept" and "Semister". Found: ${headers.join(
            ", "
          )}`
        );
      }

      // Convert the data to our format, skipping the first row (headers)
      const normalizedData = excelData
        .slice(1)
        .map((row: Array<string | number | null>) => {
          if (!Array.isArray(row)) {
            console.warn(`Invalid row format:`, row);
            return null;
          }

          const rollNo = row[rollNoIndex];
          const name = row[nameIndex];
          const dept = row[deptIndex];
          const semister = row[semesterIndex];

          console.log(`Processing row:`, { rollNo, name, dept, semister });

          if (!rollNo || !name || !dept || !semister) {
            console.warn(`Row has missing data:`, {
              rollNo,
              name,
              dept,
              semister,
            });
            return null;
          }

          const normalizedRow: ExcelRecord = {
            RollNo: String(rollNo).trim(),
            Name: String(name).trim(),
            Dept: String(dept).trim(),
            Semister: String(semister).trim(),
          };

          console.log(`Normalized row:`, normalizedRow);
          return normalizedRow;
        })
        .filter(
          (row): row is ExcelRecord =>
            row !== null && typeof row.RollNo === "string" && row.RollNo !== ""
        );

      console.log("Normalized data:", normalizedData);

      if (normalizedData.length === 0) {
        throw new Error("No valid data rows found in Spreadsheet");
      }

      // Match records with better error handling
      const matched = records.map((record) => {
        const excelRecord = normalizedData.find(
          (excel) =>
            String(excel.RollNo).toLowerCase().trim() ===
            String(record.rollNumber).toLowerCase().trim()
        );

        if (excelRecord) {
          return {
            ...record,
            dept: excelRecord.Dept, // Use department from Excel
            RollNo: excelRecord.RollNo,
            Name: excelRecord.Name,
            Dept: excelRecord.Dept,
            Semister: excelRecord.Semister,
          } as AttendanceRecord & ExcelRecord;
        }

        // If no match found, create a compatible record
        return {
          ...record,
          RollNo: record.rollNumber,
          Name: "N/A",
          Dept: record.dept,
          Semister: "N/A",
        } as AttendanceRecord & ExcelRecord;
      });

      console.log("Total matches found:", matched.length);
      setMatchedRecords(matched);

      if (matched.length === 0) {
        alert(`No matching records found. Please check if:
1. The Spreadsheet has these exact column names: "RollNo", "Name", "Dept", "Semister"
2. Roll numbers in Spreadsheet match the database format exactly
3. Data is present in all columns

Found headers: ${headers.join(", ")}`);
      } else {
        alert(`Successfully matched ${matched.length} records!`);
      }
    } catch (error) {
      console.error("Error processing Excel file:", error);
      alert("Failed to process Excel file. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedMonth || !matchedRecords.length) return;

    try {
      const dataToExport = matchedRecords.map((record) => ({
        RollNo: record.rollNumber,
        Name: record.Name,
        Dept: record.Dept, // Using Excel sheet department
        Semister: record.Semister,
        L1: formatTimestamp(record.timestamps?.L1),
        L2: formatTimestamp(record.timestamps?.L2),
        L3: formatTimestamp(record.timestamps?.L3),
        L4: formatTimestamp(record.timestamps?.L4),
        L5: formatTimestamp(record.timestamps?.L5),
        L6: formatTimestamp(record.timestamps?.L6),
        L7: formatTimestamp(record.timestamps?.L7),
        L8: formatTimestamp(record.timestamps?.L8),
        "Paid Fine": `₹${record.paidFine}`,
        "Unpaid Fine": `₹${record.uf || 0}`,
        "Paid at": formatTimestamp(record.paidAt),
      }));

      const exportWorksheet = XLSX.utils.json_to_sheet(dataToExport);
      const exportWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        exportWorkbook,
        exportWorksheet,
        "Attendance"
      );

      const maxWidth = dataToExport.reduce(
        (w, r) => Math.max(w, Object.keys(r).length),
        0
      );
      exportWorksheet["!cols"] = new Array(maxWidth).fill({ wch: 15 });

      XLSX.writeFile(exportWorkbook, `Attendance_${selectedMonth}.xlsx`);
      alert(`Excel file has been downloaded for ${selectedMonth}.`);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Failed to export data. Please try again later.");
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Late Comers Report</CardTitle>
          <CardDescription>
            View and download late comers reports by month. The system will
            match records with the master Spreadsheet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Select onValueChange={handleMonthChange} value={selectedMonth}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const year = new Date().getFullYear();
                    const value = `${month}-${year}`;
                    return (
                      <SelectItem key={value} value={value}>
                        {new Date(year, i).toLocaleString("default", {
                          month: "long",
                          year: "numeric",
                        })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <div className="flex flex-row gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={processExcelFile}
                  disabled={isLoading || !records.length}
                  className="flex-1 sm:flex-none whitespace-nowrap"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Process Sheet
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleDownload}
                  disabled={!matchedRecords.length}
                  className="flex-1 sm:flex-none whitespace-nowrap"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>

            {(matchedRecords.length > 0 || records.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>Records Preview</CardTitle>
                  <CardDescription>
                    Showing {matchedRecords.length || records.length} records
                    for {selectedMonth}
                    {matchedRecords.length > 0 &&
                      " (Matched with Spreadsheet data)"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>RollNo</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Dept</TableHead>
                          <TableHead>Semister</TableHead>
                          <TableHead>L1</TableHead>
                          <TableHead>L2</TableHead>
                          <TableHead>L3</TableHead>
                          <TableHead>L4</TableHead>
                          <TableHead>L5</TableHead>
                          <TableHead>L6</TableHead>
                          <TableHead>L7</TableHead>
                          <TableHead>L8</TableHead>
                          <TableHead>Paid Fine</TableHead>
                          <TableHead>Unpaid Fine</TableHead>
                          <TableHead>Paid at</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(matchedRecords.length > 0
                          ? matchedRecords
                          : records
                        ).map((record) => (
                          <TableRow key={record.rollNumber}>
                            <TableCell>{record.rollNumber}</TableCell>
                            <TableCell>
                              {(record as AttendanceRecord & ExcelRecord)
                                .Name || "N/A"}
                            </TableCell>
                            <TableCell>
                              {(record as AttendanceRecord & ExcelRecord)
                                .Dept || record.dept}
                            </TableCell>
                            <TableCell>
                              {(record as AttendanceRecord & ExcelRecord)
                                .Semister || "N/A"}
                            </TableCell>
                            <TableCell>
                              {formatTimestamp(record.timestamps?.L1)}
                            </TableCell>
                            <TableCell>
                              {formatTimestamp(record.timestamps?.L2)}
                            </TableCell>
                            <TableCell>
                              {formatTimestamp(record.timestamps?.L3)}
                            </TableCell>
                            <TableCell>
                              {formatTimestamp(record.timestamps?.L4)}
                            </TableCell>
                            <TableCell>
                              {formatTimestamp(record.timestamps?.L5)}
                            </TableCell>
                            <TableCell>
                              {formatTimestamp(record.timestamps?.L6)}
                            </TableCell>
                            <TableCell>
                              {formatTimestamp(record.timestamps?.L7)}
                            </TableCell>
                            <TableCell>
                              {formatTimestamp(record.timestamps?.L8)}
                            </TableCell>
                            <TableCell>₹{record.paidFine}</TableCell>
                            <TableCell>₹{record.uf || 0}</TableCell>
                            <TableCell>
                              {formatTimestamp(record.paidAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
