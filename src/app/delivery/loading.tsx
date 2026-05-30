export default function DeliveryLoading() {
  return (
    <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto w-full">
      <div className="h-8 w-48 shimmer rounded" />
      <div className="flex flex-col gap-4">
        <div className="h-40 shimmer rounded-xl" />
        <div className="h-40 shimmer rounded-xl" />
        <div className="h-40 shimmer rounded-xl" />
      </div>
    </div>
  );
}
