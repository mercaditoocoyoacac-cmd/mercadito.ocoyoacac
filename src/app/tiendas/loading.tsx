export default function TiendasLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-20 pt-10 lg:pt-14">
      <div className="h-9 w-64 shimmer rounded-lg" />
      <div className="h-14 w-full shimmer rounded-full" />
      <div className="flex gap-2">
        <div className="h-9 w-24 shimmer rounded-full" />
        <div className="h-9 w-28 shimmer rounded-full" />
        <div className="h-9 w-24 shimmer rounded-full" />
        <div className="h-9 w-32 shimmer rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-80 shimmer rounded-3xl" />
        <div className="h-80 shimmer rounded-3xl" />
        <div className="h-80 shimmer rounded-3xl" />
        <div className="h-80 shimmer rounded-3xl" />
        <div className="h-80 shimmer rounded-3xl" />
        <div className="h-80 shimmer rounded-3xl" />
      </div>
    </div>
  );
}
