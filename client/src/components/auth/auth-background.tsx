export default function AuthBackground() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_8%,rgba(168,85,247,0.22),transparent_30%),radial-gradient(circle_at_80%_22%,rgba(6,182,212,0.10),transparent_26%),linear-gradient(135deg,#050510_0%,#090d19_52%,#0f0b1f_100%)]" />

      {/* Grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:42px_42px]" />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08),transparent_16%,transparent_84%,rgba(255,255,255,0.05))] opacity-30" />
    </>
  );
}
