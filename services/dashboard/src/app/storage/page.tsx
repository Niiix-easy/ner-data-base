'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Archive, 
  Plus, 
  Search, 
  ArrowLeft, 
  Upload, 
  File, 
  Trash2, 
  MoreHorizontal,
  ChevronRight,
  Database,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

export default function StorageManager() {
  const [buckets, setBuckets] = useState<any[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredBuckets = buckets.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#030303] text-white font-sans overflow-hidden">
      {/* Bucket List Sidebar */}
      <div className="w-72 border-r border-white/5 bg-[#0a0a0a] flex flex-col shrink-0">
        <div className="p-6 border-b border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-[0.2em]">Storage</h2>
            <Link href="/dashboard" className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-600 hover:text-white" title="Back to Dashboard">
              <ArrowLeft size={16} />
            </Link>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              placeholder="Search buckets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            filteredBuckets.map((b, idx) => (
              <button
                key={idx}
                onClick={() => loadBucketFiles(b.name)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${selectedBucket === b.name ? 'bg-emerald-500/10 text-emerald-400' : 'hover:bg-white/5 text-neutral-400 hover:text-white'}`}
              >
                <Archive size={16} className={selectedBucket === b.name ? 'text-emerald-400' : 'text-neutral-600 group-hover:text-white'} />
                <span className="truncate">{b.name}</span>
                <span className="ml-auto text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 px-1.5 py-0.5 rounded uppercase">Public</span>
              </button>
            ))
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-[#070707]">
           <button onClick={handleCreateBucket} className="w-full flex items-center justify-center gap-2 bg-white text-black py-2.5 rounded-xl text-xs font-bold hover:bg-neutral-200 transition-all shadow-lg shadow-white/5">
             <Plus size={14} />
             New Bucket
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[#030303] overflow-hidden">
        {/* Toolbar Header */}
        <header className="h-14 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-xl flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4 text-xs font-medium text-neutral-500">
            <Database size={14} />
            <span className="hover:text-white transition-colors cursor-pointer">Storage</span>
            <ChevronRight size={12} className="text-neutral-700" />
            <span className="text-white font-bold">{selectedBucket ? selectedBucket : 'Select Bucket'}</span>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={() => selectedBucket && loadBucketFiles(selectedBucket)} className="p-1.5 hover:bg-white/5 rounded-lg text-neutral-500 hover:text-white transition-colors" title="Refresh">
               <RefreshCw size={16} />
             </button>
             <div className="h-4 w-px bg-white/5"></div>
             {selectedBucket && (
                <label className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-900/20 active:scale-[0.98]">
                  <Upload size={14} />
                  {uploading ? 'Uploading...' : 'Upload Object'}
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
             )}
          </div>
        </header>

        {/* File Grid Area */}
        <div className="flex-1 overflow-auto p-8">
          {!selectedBucket ? (
            <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-50">
              <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-600">
                <Archive size={32} />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-bold tracking-tight">Select a bucket to view objects</p>
                <p className="text-sm font-medium text-neutral-500 max-w-xs mx-auto">Gerencie seus arquivos, imagens e ativos de forma segura e local.</p>
              </div>
            </div>
          ) : files.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-50">
               <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-600">
                <FolderOpen size={32} />
              </div>
               <p className="text-sm font-bold uppercase tracking-widest text-neutral-500">This bucket is empty</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
               {files.map((file, i) => (
                  <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 flex flex-col hover:border-white/10 transition-all group relative overflow-hidden">
                     <div className="aspect-square bg-white/[0.02] rounded-2xl flex items-center justify-center text-neutral-700 mb-6 group-hover:bg-white/[0.04] transition-colors overflow-hidden">
                        <File size={40} className="group-hover:scale-110 transition-transform" />
                     </div>
                     <div className="space-y-1">
                        <p className="text-sm font-bold text-white truncate" title={file.name}>{file.name}</p>
                        <div className="flex justify-between items-center">
                           <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB</p>
                           <button
                             onClick={() => handleDeleteFile(file.name)}
                             className="p-1.5 hover:bg-rose-500/10 rounded-lg text-neutral-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                             title="Delete"
                           >
                             <Trash2 size={14} />
                           </button>
                        </div>
                     </div>
                     <button className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-xl text-neutral-700 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                        <MoreHorizontal size={16} />
                     </button>
                  </div>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
