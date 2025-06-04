import React from "react";
import { Spinner } from "@/components/ui/Spinner";

const Loading = () => {
  return (
    <div className="h-screen flex items-center justify-center">
      <Spinner>Loading...</Spinner>
    </div>
  );
};

export default Loading;
