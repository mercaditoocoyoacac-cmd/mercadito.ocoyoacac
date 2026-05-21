export default function CarritoLoading() {
  return (
    <div className="flex flex-col gap-6 p-8 max-w-6xl mx-auto w-full animate-pulse">
      <div className="h-8 w-32 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}
