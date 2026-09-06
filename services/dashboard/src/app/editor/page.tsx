'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TableEditor() {
  const [tables, setTables] = useState<{table_schema: string, table_name: string}[]>([]);
  const [selectedTable, setSelectedTable] = useState<{schema: string, name: string} | null>(null);
  const [tableData, setTableData] = useState<{rows: any[], columns: string[]}>({ rows: [], columns: [] });
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'insert' | 'update'>('insert');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedRowKey, setSelectedRowKey] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    fetchTables();
  }, []);

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
    // Using id as the primary key for simplicity in this example.
    // In a production app, you'd fetch the actual primary key from information_schema.
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

    // Clean up empty strings to be proper nulls for DB insert/update if needed
    const cleanedData = { ...formData };
    Object.keys(cleanedData).forEach(k => {
      if (cleanedData[k] === '') {
        delete cleanedData[k]; // Let the DB default it
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

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans relative">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-700 bg-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">Table Editor</h1>
          <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300 mt-2 inline-block">&larr; Back to Dashboard</Link>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Schemas & Tables</h3>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <ul className="space-y-1">
              {tables.map((t, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => loadTableData(t.table_schema, t.table_name)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm truncate ${selectedTable?.name === t.table_name && selectedTable?.schema === t.table_schema ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                  >
                    <span className="text-gray-500 mr-1">{t.table_schema}.</span>
                    {t.table_name}
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
            {selectedTable ? `${selectedTable.schema}.${selectedTable.name}` : 'Select a table'}
          </h2>
          {selectedTable && (
            <button
              onClick={handleOpenInsertModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-sm font-semibold transition-colors"
            >
              + Add Row
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {!selectedTable ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              Select a table from the sidebar to view its data.
            </div>
          ) : tableData.columns.length === 0 ? (
            <div className="text-gray-500">Loading data or table is empty...</div>
          ) : (
            <div className="inline-block min-w-full align-middle">
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800">
                    <tr>
                      {tableData.columns.map((col, i) => (
                        <th key={i} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          {col}
                        </th>
                      ))}
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 bg-gray-900">
                    {tableData.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-800">
                        {tableData.columns.map((col, j) => (
                          <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {row[col] !== null ? String(row[col]) : <span className="text-gray-600 italic">null</span>}
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                           <button onClick={() => handleOpenUpdateModal(row)} className="text-indigo-400 hover:text-indigo-300 mr-3">Edit</button>
                           <button onClick={() => handleDeleteRow(row)} className="text-red-400 hover:text-red-300">Delete</button>
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

      {/* Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-lg shadow-2xl">
             <h3 className="text-xl font-bold mb-4">{modalMode === 'insert' ? 'Add New Row' : 'Edit Row'}</h3>
             <form onSubmit={handleModalSubmit}>
               <div className="max-h-96 overflow-y-auto pr-2 space-y-4">
                 {tableData.columns.map((col, idx) => (
                   <div key={idx}>
                     <label className="block text-sm font-medium text-gray-400 mb-1">{col}</label>
                     <input
                       type="text"
                       value={formData[col] || ''}
                       onChange={(e) => setFormData({...formData, [col]: e.target.value})}
                       disabled={modalMode === 'update' && col === 'id'}
                       className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                     />
                   </div>
                 ))}
               </div>
               <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-semibold transition-colors"
                  >
                    {modalMode === 'insert' ? 'Insert' : 'Save Changes'}
                  </button>
               </div>
             </form>
           </div>
        </div>
      )}

    </div>
  );
}
