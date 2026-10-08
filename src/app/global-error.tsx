"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f7f9f4] flex flex-col items-center justify-center font-sans p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-2xl font-serif font-bold text-[#2c3527] mb-3">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-6">
            {error?.message || "An unexpected error occurred while loading CBD American Shaman of Hurst."}
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 bg-[#3b142e] text-white font-semibold rounded-lg hover:bg-[#5b7d20] transition-colors shadow-sm text-sm"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
