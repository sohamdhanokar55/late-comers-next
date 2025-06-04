"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, FileText } from "lucide-react";

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 dark:bg-gray-900 dark:border-gray-700">
      <div className="container mx-auto flex justify-around py-2">
        <Link
          href="/"
          className={`flex flex-col items-center ${
            pathname === "/"
              ? "text-primary"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-xs">Home</span>
        </Link>
        <Link
          href="/late-comers"
          className={`flex flex-col items-center ${
            pathname === "/late-comers"
              ? "text-primary"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <Users className="h-5 w-5" />
          <span className="text-xs">Late Comers</span>
        </Link>
        <Link
          href="/reports"
          className={`flex flex-col items-center ${
            pathname === "/reports"
              ? "text-primary"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <FileText className="h-5 w-5" />
          <span className="text-xs">Reports</span>
        </Link>
      </div>
    </nav>
  );
}
