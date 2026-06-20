export default function ComingSoon({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-32 text-center">
      <span className="text-5xl">🚧</span>
      <h1 className="text-3xl font-bold neon-text">{title}</h1>
      <p className="text-muted">{note}</p>
    </div>
  );
}
