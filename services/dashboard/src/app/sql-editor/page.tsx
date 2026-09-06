"use client";

import React, { useState } from "react";

export default function SqlEditorPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/control-plane/db/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to execute query");
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-8 border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">SQL Editor</h1>
        <p className="text-gray-400 mt-2">Execute SQL queries directly on your database.</p>
      </header>

      <main className="flex-1 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <textarea
            className="w-full bg-gray-800 border border-gray-700 rounded-md p-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
            rows={8}
            placeholder="SELECT * FROM public.users;"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          ></textarea>
          <button
            onClick={handleExecute}
            disabled={loading}
            className="self-end bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? "Executing..." : "Run Query"}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-md font-mono text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-gray-800 border border-gray-700 rounded-md p-4 overflow-auto max-h-[500px]">
            {result.rows && result.rows.length > 0 ? (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-700">
                  <tr>
                    {result.fields.map((field: any) => (
                      <th key={field.name} className="p-3 font-semibold text-gray-200 border-b border-gray-600">
                        {field.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {result.rows.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-700/50">
                      {result.fields.map((field: any) => (
                        <td key={field.name} className="p-3 text-gray-300">
                          {String(row[field.name] ?? "NULL")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 italic text-sm">Query executed successfully. No rows returned.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
