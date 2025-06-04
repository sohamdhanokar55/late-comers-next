"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../context/AuthContext";
import Loading from "./Loading";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { Search, AlertTriangle } from "lucide-react";
import { Input } from "./ui/input";
import Login from "./Login";

type LateComerData = {
  count: number;
  status: boolean;
  fine: number;
  createdAt: string | null;
};

export default function LateComersTable() {
  const { currentUser, userDataobj, loading } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [lateComers, setLateComers] = useState<Record<string, LateComerData>>(
    {}
  );
  const [dept, setDept] = useState<string>("");

  useEffect(() => {
    if (currentUser && userDataobj) {
      // Filter out entries where count <= 3 and remove 'dept' field
      const filteredLateComers = Object.entries(
        userDataobj as Record<string, LateComerData>
      )
        .filter(
          ([key, value]) =>
            key !== "dept" &&
            value &&
            typeof value === "object" &&
            "count" in value &&
            value.count > 3
        )
        .reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: value,
          }),
          {} as Record<string, LateComerData>
        );

      setLateComers(filteredLateComers);
      setDept(userDataobj.dept || "");
    }
  }, [currentUser, userDataobj]);

  if (loading) {
    return <Loading />;
  }

  if (!currentUser) {
    return <Login />;
  }

  const handlePaymentUpdate = async (rollNumber: string) => {
    try {
      const docRef = doc(db, "users", currentUser.uid);
      const archiveRef = doc(db, "archive", `${currentUser.uid}_${rollNumber}`);

      const isConfirm = window.confirm(
        `Are you sure you want to mark Roll No. ${rollNumber} as paid?`
      );

      if (isConfirm) {
        const currentRecord = lateComers[rollNumber];
        const fineAmount = currentRecord.fine * 50; // ₹50 per fine

        const dataToArchive = {
          rollNumber,
          dept,
          count: currentRecord.count,
          fine: currentRecord.fine,
          totalAmount: fineAmount,
          status: true,
          createdAt: currentRecord.createdAt,
          archivedAt: serverTimestamp(),
        };

        // Save to archive
        await setDoc(archiveRef, dataToArchive);

        // Update user record
        await updateDoc(docRef, {
          [rollNumber]: {
            status: true,
            count: 0,
            fine: 0,
          },
        });

        // Update local state by removing the paid record
        const updatedLateComers = { ...lateComers };
        delete updatedLateComers[rollNumber];
        setLateComers(updatedLateComers);

        // Show success message
        alert(
          `Payment of ₹${fineAmount} recorded successfully for Roll No. ${rollNumber}`
        );
      }
    } catch (error) {
      console.error("Error updating payment:", error);
      alert("Failed to update payment. Please try again.");
    }
  };

  // Filter and Sort LateComers
  const filteredAndSortedLateComers = Object.keys(lateComers)
    .filter((rollNumber) =>
      rollNumber.toLowerCase().includes(searchQuery.trim().toLowerCase())
    )
    .sort((a, b) => {
      // Sort by count in descending order
      const countA = lateComers[a].count;
      const countB = lateComers[b].count;
      if (countA !== countB) {
        return countB - countA;
      }
      // If counts are equal, sort by roll number
      return a.localeCompare(b);
    });

  const getTotalFineAmount = () => {
    return Object.values(lateComers).reduce(
      (total, student) => total + student.fine * 50,
      0
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
          <div>
            <h3 className="font-medium">Late Comers Summary</h3>
            <p className="text-sm text-gray-600">
              Showing {filteredAndSortedLateComers.length} students with more
              than 3 late marks
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">Total Pending Fines</p>
          <p className="text-lg font-bold text-yellow-600">
            ₹{getTotalFineAmount()}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by roll number..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Roll Number</TableHead>
              <TableHead>Late Count</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Fine Amount</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedLateComers.length > 0 ? (
              filteredAndSortedLateComers.map((rollNumber) => (
                <TableRow key={rollNumber}>
                  <TableCell className="font-medium">{rollNumber}</TableCell>
                  <TableCell>
                    <span className="bg-red-100 text-red-800 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full whitespace-nowrap">
                      {lateComers[rollNumber].count} times
                    </span>
                  </TableCell>
                  <TableCell>{dept}</TableCell>
                  <TableCell>₹{lateComers[rollNumber].fine * 50}</TableCell>
                  <TableCell>{lateComers[rollNumber].createdAt}</TableCell>
                  <TableCell>
                    <Button
                      onClick={() => handlePaymentUpdate(rollNumber)}
                      size="sm"
                      variant="outline"
                    >
                      Mark as Paid
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  No late comers found with more than 3 late marks
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
