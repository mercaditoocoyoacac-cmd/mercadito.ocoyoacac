export default function Loading() {
  return (
    <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto w-full">
      <div className="h-8 w-48 shimmer rounded" />
      <div className="h-4 w-72 shimmer rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="h-32 shimmer rounded-xl" />
        <div className="h-32 shimmer rounded-xl" />
        <div className="h-32 shimmer rounded-xl" />
      </div>
      <div className="h-64 shimmer rounded-xl mt-2" />
    </div>
  );
}
