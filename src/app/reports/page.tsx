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
import { Download, Loader2 } from "lucide-react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";
import * as XLSX from "xlsx";

interface AttendanceRecord {
  id: string;
  rollNumber: string;
  count: number;
  fine: number;
  createdAt: string;
  archivedAt: any;
  dept: string;
  status: boolean;
}

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const fetchRecords = async (month: string, year: string) => {
    setIsLoading(true);
    try {
      const formattedMonth = `${parseInt(month, 10)} ${year}`;
      const attendanceRef = collection(db, "archive");

      // Create a query to filter documents
      const q = query(
        attendanceRef,
        where("createdAt", "==", formattedMonth),
        orderBy("rollNumber", "asc")
      );

      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AttendanceRecord[];

      setRecords(data);

      if (data.length === 0) {
        alert(`No records found for ${formattedMonth}.`);
      }

      return data;
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

  const handleDownload = async () => {
    if (!selectedMonth) return;

    setIsLoading(true);
    try {
      const [month, year] = selectedMonth.split("-");
      const data = await fetchRecords(month, year);

      if (data.length === 0) return;

      // Prepare data for Excel export
      const exportData = data.map((record) => ({
        "Roll Number": record.rollNumber,
        Department: record.dept,
        "Late Count": record.count,
        "Fine Amount": `₹${record.fine * 50}`,
        "Payment Status": record.status ? "Paid" : "Unpaid",
        "Created Date": record.createdAt,
        "Archived Date": record.archivedAt?.toDate().toLocaleString() || "N/A",
      }));

      // Convert to Excel format
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

      // Auto-size columns
      const maxWidth = exportData.reduce(
        (w, r) => Math.max(w, Object.keys(r).length),
        0
      );
      const colWidths = new Array(maxWidth).fill({ wch: 15 });
      worksheet["!cols"] = colWidths;

      // Export file
      XLSX.writeFile(workbook, `Attendance_${selectedMonth}.xlsx`);
      alert(`Excel file has been downloaded for ${selectedMonth}.`);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Failed to export data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Attendance Reports</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Monthly Attendance Report</CardTitle>
          <CardDescription>
            View and download attendance records by month
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="month-select" className="text-sm font-medium">
              Select Month
            </label>
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger id="month-select">
                <SelectValue placeholder="Select a month" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, index) => {
                  const month = String(index + 1).padStart(2, "0");
                  return (
                    <SelectItem key={month} value={`${month}-${currentYear}`}>
                      {new Date(0, index).toLocaleString("default", {
                        month: "long",
                      })}{" "}
                      {currentYear}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleDownload}
            disabled={!selectedMonth || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating
                Report...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Download Excel Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {records.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Records Preview</CardTitle>
            <CardDescription>
              Showing {records.length} records for {selectedMonth}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Late Count</TableHead>
                    <TableHead>Fine Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.rollNumber}</TableCell>
                      <TableCell>{record.dept}</TableCell>
                      <TableCell>{record.count}</TableCell>
                      <TableCell>₹{record.fine * 50}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            record.status
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {record.status ? "Paid" : "Unpaid"}
                        </span>
                      </TableCell>
                      <TableCell>{record.createdAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
