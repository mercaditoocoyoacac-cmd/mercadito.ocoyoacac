export default function VendorLoading() {
  return (
    <div className="flex flex-col gap-6 p-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shimmer rounded-full" />
        <div className="flex flex-col gap-2">
          <div className="h-6 w-40 shimmer rounded" />
          <div className="h-4 w-24 shimmer rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-28 shimmer rounded-xl" />
        <div className="h-28 shimmer rounded-xl" />
        <div className="h-28 shimmer rounded-xl" />
      </div>
      <div className="h-64 shimmer rounded-xl" />
    </div>
  );
}
