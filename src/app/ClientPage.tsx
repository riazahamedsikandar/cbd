"use client";

import React from "react";
import dynamic from "next/dynamic";

const AppWithNoSSR = dynamic(() => import("../App"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#f7f9f4] flex flex-col items-center justify-center font-sans space-y-4">
      <div className="w-12 h-12 border-4 border-[#3b142e] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-semibold text-[#5b6b55] animate-pulse">Loading CBD American Shaman of Hurst...</p>
    </div>
  ),
});

export default function ClientPage() {
  return <AppWithNoSSR />;
}
