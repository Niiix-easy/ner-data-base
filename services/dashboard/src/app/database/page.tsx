"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function DatabasePage() {
  const [tables, setTables] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await fetch("/api/control-plane/db/tables");
        if (res.ok) {
          const data = await res.json();
          setTables(data.tables || []);
        } else {
          setError("Failed to fetch tables.");
        }
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchTables();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-8 border-b border-gray-700 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database</h1>
          <p className="text-gray-400 mt-2">Manage your database tables.</p>
        </div>
        <Link href="/sql-editor" className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors">
          SQL Editor
        </Link>
      </header>

      <main className="flex-1">
        {loading ? (
          <div className="text-gray-400">Loading tables...</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : tables.length === 0 ? (
          <div className="text-gray-400">No tables found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables.map((t, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-semibold mb-2">{t.table_name}</h3>
                <p className="text-sm text-gray-400 mb-4">Schema: {t.table_schema}</p>
                <Link href={`/editor`} className="text-green-400 hover:text-green-300 font-medium">
                  View Data &rarr;
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
