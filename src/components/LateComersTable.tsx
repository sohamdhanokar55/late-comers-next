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
import {
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { Search, AlertTriangle } from "lucide-react";
import { Input } from "./ui/input";
import Login from "./Login";
import { useToast } from "@/hooks/use-toast";

type LateComerData = {
  dept: string;
  count: number;
  uf: number;
  pf: number;
  lastUpdated: any;
  [key: string]: any; // For L1, L2, etc. timestamps
};

export default function LateComersTable() {
  const { currentUser, userDataobj, loading } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [lateComers, setLateComers] = useState<Record<string, LateComerData>>(
    {}
  );
  const [dept, setDept] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser && userDataobj) {
      // Get department from user data
      const userDept = userDataobj.dept || "";
      setDept(userDept);

      // Get late-comers data for this department
      const fetchLateComers = async () => {
        try {
          // Check if department exists
          if (!userDept) {
            console.error("No department found for user");
            toast({
              title: "Error",
              description: "No department found. Please contact administrator.",
              variant: "destructive",
            });
            return;
          }

          const lateComersDocRef = doc(db, "late-comers", userDept);
          const lateComersDoc = await getDoc(lateComersDocRef);
          const lateComersData = lateComersDoc.data() || {};

          // Set all late comers data for this department
          setLateComers(lateComersData);
        } catch (error) {
          console.error("Error fetching late-comers:", error);
          toast({
            title: "Error",
            description: "Failed to fetch late-comers data. Please try again.",
            variant: "destructive",
          });
        }
      };

      if (userDept) {
        fetchLateComers();
      }
    }
  }, [currentUser, userDataobj, toast]);

  if (loading) {
    return <Loading />;
  }

  if (!currentUser) {
    return <Login />;
  }

  const handlePaymentUpdate = async (rollNumber: string) => {
    try {
      // Check if department exists
      if (!dept) {
        toast({
          title: "Error",
          description: "No department found. Please contact administrator.",
          variant: "destructive",
        });
        return;
      }

      const lateComersDocRef = doc(db, "late-comers", dept);
      const isConfirm = window.confirm(
        `Are you sure you want to mark Roll No. ${rollNumber} as paid?`
      );

      if (isConfirm) {
        const currentRecord = lateComers[rollNumber];
        const fineAmount = currentRecord.uf; // Unpaid fine amount

        // Get current month and year for archive document
        const date = new Date();
        const month = date.getMonth();
        const year = date.getFullYear();
        const archiveMonth = `${dept}_${month + 1}_${year}`;
        const archiveDocRef = doc(db, "archive", archiveMonth);

        // Get existing archive data
        const archiveDoc = await getDoc(archiveDocRef);
        const existingArchiveData = archiveDoc.data() || {};
        const archiveRecord = existingArchiveData[rollNumber] || {};

        // Update late-comers record
        await updateDoc(lateComersDocRef, {
          [rollNumber]: {
            ...currentRecord,
            pf: (currentRecord.pf || 0) + fineAmount,
            uf: 0,
            lastUpdated: serverTimestamp(),
          },
        });
        console.log(archiveRecord);
        console.log(currentRecord);

        // Update archive record
        await updateDoc(archiveDocRef, {
          [rollNumber]: {
            ...archiveRecord,
            rollNumber: rollNumber,
            dept: currentRecord.dept,
            count: currentRecord.count,
            pf: (archiveRecord.pf || 0) + fineAmount,
            uf: 0,
            timestamps: currentRecord.timestamps || {},
            createdAt: currentRecord.createdAt,
            lastUpdated: serverTimestamp(),
            paidAt: serverTimestamp(),
          },
        });

        // Update local state
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
    .filter((rollNumber) => {
      const student = lateComers[rollNumber];
      // Only show students with unpaid fines and matching search query
      return (
        student.uf > 0 &&
        rollNumber.toLowerCase().includes(searchQuery.trim().toLowerCase())
      );
    })
    .sort((a, b) => {
      // Sort by unpaid fine amount in descending order
      const fineA = lateComers[a].uf;
      const fineB = lateComers[b].uf;
      if (fineA !== fineB) {
        return fineB - fineA;
      }
      // If fines are equal, sort by count in descending order
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
      (total, student) => total + (student.uf || 0),
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
            <h3 className="font-medium">Pending Fines Summary - {dept}</h3>
            <p className="text-sm text-gray-600">
              Showing {filteredAndSortedLateComers.length} students with unpaid
              fines from {dept} department
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
              <TableHead>Unpaid Fine</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedLateComers.length > 0 ? (
              filteredAndSortedLateComers.map((rollNumber) => (
                <TableRow key={rollNumber}>
                  <TableCell className="font-medium">{rollNumber}</TableCell>
                  <TableCell>
                    <span
                      className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full whitespace-nowrap ${
                        lateComers[rollNumber].count > 3
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {lateComers[rollNumber].count} times
                    </span>
                  </TableCell>
                  <TableCell>{lateComers[rollNumber].dept}</TableCell>
                  <TableCell>₹{lateComers[rollNumber].uf}</TableCell>
                  <TableCell>
                    {lateComers[rollNumber].lastUpdated
                      ?.toDate()
                      .toLocaleString() || "N/A"}
                  </TableCell>
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
                  No students with unpaid fines found in {dept} department
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
