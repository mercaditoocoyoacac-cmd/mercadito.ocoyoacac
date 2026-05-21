export default function PerfilLoading() {
  return (
    <div className="flex flex-col gap-6 p-8 max-w-2xl mx-auto w-full animate-pulse">
      <div className="h-8 w-32 bg-gray-200 rounded" />
      <div className="flex flex-col gap-4">
        <div className="h-16 bg-gray-200 rounded-xl" />
        <div className="h-16 bg-gray-200 rounded-xl" />
        <div className="h-16 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}
