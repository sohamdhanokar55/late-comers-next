"use client";

import "./globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import BottomNavigation from "@/components/BottomNavigation";
import Header from "@/components/Header";
import { AuthProvider } from "../../context/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useEffect } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("/sw.js").then(
          function (registration) {
            console.log("ServiceWorker registration successful");
          },
          function (err) {
            console.log("ServiceWorker registration failed: ", err);
          }
        );
      });
    }
  }, []);

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>
            <div className="min-h-screen bg-background">
              <div className="p-10">
                <Header />
              </div>
              <main className="pb-16 flex flex-col justify-center items-center">
                {children}
              </main>
              <BottomNavigation />
              <Toaster />
            </div>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
