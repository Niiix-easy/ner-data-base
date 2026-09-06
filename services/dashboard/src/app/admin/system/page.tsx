"use client";

import React, { useState } from 'react';

export default function SystemAdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{success?: boolean; message?: string; error?: string} | null>(null);

  const handleUpdate = async () => {
    if (!confirm('Are you sure you want to trigger a system update? This will pull the latest code and restart the Docker containers.')) {
        return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Hardcoded for demo/simplicity, should come from env/context
      const response = await fetch('/api/system/update', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ${process.env.STUDIO_SESSION_SECRET || "fallback-secret"}'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: data.message });
      } else {
        setResult({ error: data.message || 'Update failed' });
      }
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">System Administration</h1>

      <section className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4 text-red-600">Danger Zone</h2>
        <div className="flex items-center justify-between border-t pt-4">
            <div>
                <h3 className="font-medium">Force System Update</h3>
                <p className="text-sm text-gray-500">Pulls latest code from Git, runs migrations, and rebuilds Docker containers.</p>
            </div>
            <button
                onClick={handleUpdate}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
                {loading ? 'Triggering...' : 'Trigger Update'}
            </button>
        </div>

        {result && (
            <div className={`mt-4 p-4 rounded ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {result.message || result.error}
            </div>
        )}
      </section>
    </div>
  );
}
