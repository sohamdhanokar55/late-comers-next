"use client";
import { Flame } from "lucide-react";
import React from "react";
import BarcodeScanner from "@/components/BarcodeScanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Login from "./Login";
import Loading from "./Loading";

export default function CallToAction() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <Loading></Loading>;
  }
  if (currentUser) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Barcode Scanner</CardTitle>
          </CardHeader>
          <CardContent>
            <BarcodeScanner />
          </CardContent>
        </Card>
      </div>
    );
  } else {
    return <Login></Login>;
  }
}
