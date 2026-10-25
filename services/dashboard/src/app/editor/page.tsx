'use client'

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Table as TableIcon, 
  Plus, 
  Search, 
  ArrowLeft, 
  MoreHorizontal, 
  Edit3, 
  Trash2, 
  ChevronRight,
  Database,
  RefreshCw,
  Filter
} from 'lucide-react';

export default function TableEditorWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030303] flex items-center justify-center text-emerald-500 font-bold uppercase tracking-widest animate-pulse">Loading Schema...</div>}>
      <TableEditor />
    </Suspense>
  );
}

function TableEditor() {
  const [tables, setTables] = useState<{table_schema: string, table_name: string}[]>([]);
  const [selectedTable, setSelectedTable] = useState<{schema: string, name: string} | null>(null);
  const [tableData, setTableData] = useState<{rows: any[], columns: string[]}>({ rows: [], columns: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'insert' | 'update'>('insert');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedRowKey, setSelectedRowKey] = useState<Record<string, any> | null>(null);

  const searchParams = useSearchParams();
  const tableName = searchParams.get('table');
  const schemaName = searchParams.get('schema');

  useEffect(() => {
    fetchTables();
    if (tableName && schemaName) {
      loadTableData(schemaName, tableName);
    }
  }, [tableName, schemaName]);

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/control-plane/db/tables');
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables);
      }
    } catch (e) {
      console.error('Error fetching tables', e);
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (schema: string, name: string) => {
    setSelectedTable({ schema, name });
    setTableData({ rows: [], columns: [] });
    try {
      const res = await fetch(`/api/control-plane/db/tables/${schema}/${name}/data`);
      if (res.ok) {
        const data = await res.json();
        setTableData(data);
      }
    } catch (e) {
      console.error('Error fetching table data', e);
    }
  };

  const reloadCurrentTable = () => {
    if (selectedTable) {
      loadTableData(selectedTable.schema, selectedTable.name);
    }
  };

  const handleOpenInsertModal = () => {
    setModalMode('insert');
    const emptyForm: Record<string, any> = {};
    tableData.columns.forEach(col => emptyForm[col] = '');
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const handleOpenUpdateModal = (row: any) => {
    setModalMode('update');
    if (!row.id) {
       alert("Error: Only tables with an 'id' column can be updated via this simple UI.");
       return;
    }
    setSelectedRowKey({ id: row.id });
    setFormData({ ...row });
    setIsModalOpen(true);
  };

  const handleDeleteRow = async (row: any) => {
    if (!selectedTable) return;
    if (!row.id) {
       alert("Error: Only tables with an 'id' column can be deleted via this simple UI.");
       return;
    }

    if (!confirm(`Are you sure you want to delete row with id ${row.id}?`)) return;

    try {
      const res = await fetch(`/api/control-plane/db/tables/${selectedTable.schema}/${selectedTable.name}/data`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id })
      });

      if (res.ok) {
        reloadCurrentTable();
      } else {
        const data = await res.json();
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (e) {
      console.error('Error deleting row', e);
      alert('Failed to connect to backend.');
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;

    const cleanedData = { ...formData };
    Object.keys(cleanedData).forEach(k => {
      if (cleanedData[k] === '') {
        delete cleanedData[k];
      }
    });

    try {
      let res;
      if (modalMode === 'insert') {
        res = await fetch(`/api/control-plane/db/tables/${selectedTable.schema}/${selectedTable.name}/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanedData)
        });
      } else {
        res = await fetch(`/api/control-plane/db/tables/${selectedTable.schema}/${selectedTable.name}/data`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filter: selectedRowKey, data: cleanedData })
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        reloadCurrentTable();
      } else {
        const data = await res.json();
        alert(`Failed: ${data.error}`);
      }
    } catch (e) {
       console.error('Error submitting form', e);
       alert('Failed to connect to backend.');
    }
  };

  const filteredTables = tables.filter(t => 
    t.table_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.table_schema.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#030303] text-white font-sans overflow-hidden">
      {/* Table List Sidebar */}
      <div className="w-72 border-r border-white/5 bg-[#0a0a0a] flex flex-col shrink-0">
        <div className="p-6 border-b border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-[0.2em]">Table Editor</h2>
            <Link href="/dashboard" className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-600 hover:text-white" title="Back to Dashboard">
              <ArrowLeft size={16} />
            </Link>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              placeholder="Search tables..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-white/5 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            filteredTables.map((t, idx) => (
              <button
                key={idx}
                onClick={() => loadTableData(t.table_schema, t.table_name)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group ${selectedTable?.name === t.table_name && selectedTable?.schema === t.table_schema ? 'bg-emerald-500/10 text-emerald-400' : 'hover:bg-white/5 text-neutral-400 hover:text-white'}`}
              >
                <TableIcon size={16} className={selectedTable?.name === t.table_name ? 'text-emerald-400' : 'text-neutral-600 group-hover:text-white'} />
                <span className="truncate">{t.table_name}</span>
                <span className="ml-auto text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 px-1.5 py-0.5 rounded uppercase">{t.table_schema}</span>
              </button>
            ))
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-[#070707]">
           <button className="w-full flex items-center justify-center gap-2 bg-white text-black py-2.5 rounded-xl text-xs font-bold hover:bg-neutral-200 transition-all shadow-lg shadow-white/5">
             <Plus size={14} />
             New Table
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[#030303] overflow-hidden">
        {/* Toolbar Header */}
        <header className="h-14 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-xl flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4 text-xs font-medium text-neutral-500">
            <Database size={14} />
            <span className="hover:text-white transition-colors cursor-pointer">Database</span>
            <ChevronRight size={12} className="text-neutral-700" />
            <span className="text-white font-bold">{selectedTable ? selectedTable.name : 'Select Table'}</span>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={reloadCurrentTable} className="p-1.5 hover:bg-white/5 rounded-lg text-neutral-500 hover:text-white transition-colors" title="Refresh">
               <RefreshCw size={16} />
             </button>
             <div className="h-4 w-px bg-white/5"></div>
             <button className="flex items-center gap-2 text-neutral-500 hover:text-white text-xs font-bold transition-colors">
               <Filter size={14} />
               Filter
             </button>
             <div className="h-4 w-px bg-white/5"></div>
             <button
               onClick={handleOpenInsertModal}
               disabled={!selectedTable}
               className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
             >
               <Plus size={14} />
               Add Row
             </button>
          </div>
        </header>

        {/* Data Grid Area */}
        <div className="flex-1 overflow-auto bg-[#030303] p-8">
          {!selectedTable ? (
            <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-50">
              <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-600">
                <TableIcon size={32} />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-bold tracking-tight">Select a table to begin</p>
                <p className="text-sm font-medium text-neutral-500 max-w-xs mx-auto">Navegue pelos seus esquemas e tabelas no menu lateral para visualizar e editar dados.</p>
              </div>
            </div>
          ) : tableData.columns.length === 0 ? (
            <div className="h-full flex items-center justify-center">
               <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="min-w-full inline-block align-middle">
              <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                <table className="min-w-full divide-y divide-white/5 font-mono text-[13px] tabular-nums">
                  <thead>
                    <tr className="bg-white/[0.02]">
                      {tableData.columns.map((col, i) => (
                        <th key={i} scope="col" className="px-6 py-4 text-left font-bold text-neutral-500 uppercase tracking-widest text-[10px] border-b border-white/5">
                          {col}
                        </th>
                      ))}
                      <th scope="col" className="px-6 py-4 text-right font-bold text-neutral-500 uppercase tracking-widest text-[10px] border-b border-white/5">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {tableData.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                        {tableData.columns.map((col, j) => (
                          <td key={j} className="px-6 py-4 whitespace-nowrap text-neutral-300">
                            {row[col] !== null ? (
                              <span className="truncate max-w-[200px] block">{String(row[col])}</span>
                            ) : (
                              <span className="text-neutral-700 italic">null</span>
                            )}
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                           <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => handleOpenUpdateModal(row)} className="p-1.5 hover:bg-white/5 rounded-lg text-emerald-500 transition-colors" title="Edit">
                               <Edit3 size={14} />
                             </button>
                             <button onClick={() => handleDeleteRow(row)} className="p-1.5 hover:bg-white/5 rounded-lg text-rose-500 transition-colors" title="Delete">
                               <Trash2 size={14} />
                             </button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modern Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
           <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-2xl font-bold tracking-tight">{modalMode === 'insert' ? 'Add New Row' : 'Edit Row'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-neutral-500 hover:text-white transition-colors">
                 <Plus className="rotate-45" size={20} />
               </button>
             </div>
             
             <form onSubmit={handleModalSubmit} className="space-y-6">
               <div className="max-h-[50vh] overflow-y-auto pr-4 space-y-5 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                 {tableData.columns.map((col, idx) => (
                   <div key={idx} className="space-y-2">
                     <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest block">{col}</label>
                     <input
                       type="text"
                       value={formData[col] || ''}
                       onChange={(e) => setFormData({...formData, [col]: e.target.value})}
                       disabled={modalMode === 'update' && col === 'id'}
                       className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all disabled:opacity-30 font-mono"
                       placeholder={`Enter ${col}...`}
                     />
                   </div>
                 ))}
               </div>
               
               <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-sm font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-white text-black hover:bg-neutral-200 rounded-xl text-sm font-bold transition-all shadow-xl shadow-white/5 active:scale-[0.98]"
                  >
                    {modalMode === 'insert' ? 'Insert Row' : 'Save Changes'}
                  </button>
               </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
}
