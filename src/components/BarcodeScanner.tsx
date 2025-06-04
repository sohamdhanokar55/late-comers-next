"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../../context/AuthContext";
import { doc, increment, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { Loader2 } from "lucide-react";

export default function BarcodeScanner() {
  const [rollNumber, setRollNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userDataobj, currentUser, loading } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const date = new Date();
  const month = date.getMonth();
  const year = date.getFullYear();
  const createdAt = `${month + 1} ${year}`;

  // Auto-focus input on mount and after submission
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const validateRollNumber = (roll: string): boolean => {
    const rollNum = +roll;
    if (rollNum === 0) {
      toast({
        title: "Invalid Roll Number",
        description: "Please enter a valid roll number",
        variant: "destructive",
      });
      return false;
    }

    if (roll.length !== 5) {
      toast({
        title: "Invalid Roll Number Format",
        description: "Roll number must be exactly 5 digits",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "Please log in to mark attendance",
        variant: "destructive",
      });
      return;
    }

    if (!validateRollNumber(rollNumber)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const roll = +rollNumber;
      const docRef = doc(db, "users", currentUser.uid);
      const rollObj = { ...userDataobj };

      // Prepare base data
      const baseData = {
        count: userDataobj.hasOwnProperty(roll) ? increment(1) : 1,
        status: false,
        createdAt: createdAt,
        lastUpdated: serverTimestamp(),
      };

      // Update or create record
      await setDoc(
        docRef,
        {
          [roll]: baseData,
        },
        { merge: true }
      );

      // Update local count for toast message
      const newCount = rollObj[roll] ? rollObj[roll].count + 1 : 1;

      // Check if fine needs to be applied
      if (newCount > 3) {
        await setDoc(
          docRef,
          {
            [roll]: {
              fine: increment(1),
            },
          },
          { merge: true }
        );

        toast({
          title: "⚠️ Collect ID! Late comer",
          description: `Roll number ${roll} has been late ${newCount} times. Fine will be applied.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "✅ Attendance Marked",
          description: `Roll number ${roll} marked as late (${newCount}/3)`,
        });
      }

      // Clear input and refocus
      setRollNumber("");
      inputRef.current?.focus();
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast({
        title: "Error",
        description: "Failed to mark attendance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSubmitting) {
      handleSubmit();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          ref={inputRef}
          type="number"
          placeholder="Enter Roll Number (5 digits)"
          value={rollNumber}
          onChange={(e) => setRollNumber(e.target.value)}
          onKeyPress={handleKeyPress}
          className="text-lg p-6"
          disabled={isSubmitting}
          maxLength={5}
          min={0}
        />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !rollNumber}
        className="w-full py-6 text-lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
          </>
        ) : (
          "Mark Late"
        )}
      </Button>
    </div>
  );
}
