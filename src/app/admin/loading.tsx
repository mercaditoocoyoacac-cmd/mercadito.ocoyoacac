export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6 p-8 max-w-6xl mx-auto w-full">
      <div className="h-8 w-56 shimmer rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-28 shimmer rounded-xl" />
        <div className="h-28 shimmer rounded-xl" />
        <div className="h-28 shimmer rounded-xl" />
        <div className="h-28 shimmer rounded-xl" />
      </div>
      <div className="h-72 shimmer rounded-xl" />
    </div>
  );
}
