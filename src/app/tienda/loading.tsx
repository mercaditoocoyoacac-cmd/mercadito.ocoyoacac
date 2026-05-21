export default function TiendaLoading() {
  return (
    <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto w-full animate-pulse">
      <div className="h-48 bg-gray-200 rounded-xl" />
      <div className="h-6 w-48 bg-gray-200 rounded" />
      <div className="h-4 w-72 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-40 bg-gray-200 rounded-xl" />
        <div className="h-40 bg-gray-200 rounded-xl" />
        <div className="h-40 bg-gray-200 rounded-xl" />
        <div className="h-40 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}
