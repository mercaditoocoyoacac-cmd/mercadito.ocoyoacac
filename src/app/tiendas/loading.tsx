export default function TiendasLoading() {
  return (
    <div className="flex flex-col gap-6 p-8 max-w-6xl mx-auto w-full animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}
