'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function StorageManager() {
  const [buckets, setBuckets] = useState<any[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchBuckets();
  }, []);

  const fetchBuckets = async () => {
    try {
      const res = await fetch('/api/storage/buckets');
      if (res.ok) {
        const data = await res.json();
        setBuckets(data);
      }
    } catch (e) {
      console.error('Error fetching buckets', e);
    } finally {
      setLoading(false);
    }
  };

  const loadBucketFiles = async (bucketName: string) => {
    setSelectedBucket(bucketName);
    setFiles([]);
    try {
      const res = await fetch(`/api/storage/buckets/${bucketName}/objects`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (e) {
      console.error('Error fetching files', e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedBucket || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch(`/api/storage/buckets/${selectedBucket}/objects`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        loadBucketFiles(selectedBucket);
      } else {
        const data = await res.json();
        alert(`Upload failed: ${data.error}`);
      }
    } catch (err) {
      console.error('Upload error', err);
      alert('Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!selectedBucket) return;
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;

    try {
      const res = await fetch(`/api/storage/buckets/${selectedBucket}/objects/${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadBucketFiles(selectedBucket);
      } else {
        const data = await res.json();
        alert(`Delete failed: ${data.error}`);
      }
    } catch (err) {
      console.error('Delete error', err);
      alert('Delete failed.');
    }
  };

  const handleCreateBucket = async () => {
    const bucketName = prompt("Enter new bucket name (lowercase, no spaces):");
    if (!bucketName) return;

    try {
       const res = await fetch(`/api/storage/buckets/${bucketName}`, { method: 'POST' });
       if (res.ok) {
          fetchBuckets();
       } else {
          const data = await res.json();
          alert(`Failed to create bucket: ${data.error}`);
       }
    } catch (e) {
       alert("Failed to connect to storage service.");
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans relative">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-700 bg-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">Storage Manager</h1>
          <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300 mt-2 inline-block">&larr; Back to Dashboard</Link>
        </div>
        <div className="p-4 border-b border-gray-700">
           <button onClick={handleCreateBucket} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded text-sm font-semibold transition-colors">
              + New Bucket
           </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Buckets</h3>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : buckets.length === 0 ? (
            <p className="text-sm text-gray-500">No buckets found.</p>
          ) : (
            <ul className="space-y-1">
              {buckets.map((b, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => loadBucketFiles(b.name)}
                    className={`w-full text-left px-3 py-2 rounded text-sm truncate ${selectedBucket === b.name ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                  >
                    <svg className="inline-block w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                    {b.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-900">
        <div className="h-14 border-b border-gray-700 flex items-center justify-between px-6 bg-gray-800">
          <h2 className="text-lg font-medium">
            {selectedBucket ? `Bucket: ${selectedBucket}` : 'Select a bucket'}
          </h2>
          {selectedBucket && (
            <div>
              <label className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-semibold transition-colors cursor-pointer">
                {uploading ? 'Uploading...' : 'Upload File'}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {!selectedBucket ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              Select a bucket from the sidebar to view its files.
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
               <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
               <p>This bucket is empty. Upload a file to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {files.map((file, i) => (
                  <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col hover:border-gray-500 transition-colors">
                     <div className="flex-1 flex items-center justify-center bg-gray-900 rounded mb-4 h-32 overflow-hidden">
                        <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                     </div>
                     <div className="flex justify-between items-start">
                        <div className="overflow-hidden">
                           <p className="text-sm font-medium text-gray-200 truncate" title={file.name}>{file.name}</p>
                           <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                        <button
                           onClick={() => handleDeleteFile(file.name)}
                           className="text-red-400 hover:text-red-300 ml-2 p-1"
                           title="Delete file"
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                     </div>
                  </div>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
