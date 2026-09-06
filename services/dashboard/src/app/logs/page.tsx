export default function Page() {
  const title = "logs".replace("-", " ");
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-8 border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold tracking-tight capitalize">
          {title}
        </h1>
        <p className="text-gray-400 mt-2">Página em construção.</p>
      </header>
    </div>
  );
}
