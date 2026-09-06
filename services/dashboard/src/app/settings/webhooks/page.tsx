export default function Page() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-8 border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
        <p className="text-gray-400 mt-2">Manage your project webhooks and event triggers.</p>
      </header>

      <main className="flex-1">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Configured Webhooks</h2>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium text-sm transition-colors">
              Add new webhook
            </button>
          </div>

          <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-700 rounded-lg">
            <p>No webhooks configured yet.</p>
            <p className="text-sm mt-2">Webhooks allow you to send real-time data to other applications when certain events happen.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
