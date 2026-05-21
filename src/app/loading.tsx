export default function Loading() {
  return (
    <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto w-full animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="h-4 w-72 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-32 bg-gray-200 rounded-xl" />
      </div>
      <div className="h-64 bg-gray-200 rounded-xl mt-2" />
    </div>
  );
}
