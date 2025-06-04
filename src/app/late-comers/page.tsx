import { getLateComers } from "@/lib/actions";
import LateComersTable from "@/components/LateComersTable";
import { useAuth } from "../../../context/AuthContext";

export const metadata = {
  title: "Late Comers System",
  description: "A simple late comers system with barcode scanning",
};

export default async function LateComersPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Late Comers</h1>
      <LateComersTable />
    </div>
  );
}
