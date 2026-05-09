export default function AppBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">

      <div className="absolute top-[-260px] right-[-160px] h-[680px] w-[680px] rounded-full bg-violet-500/20 blur-[240px]" />

      <div className="absolute bottom-[-260px] left-[-140px] h-[560px] w-[560px] rounded-full bg-fuchsia-500/10 blur-[240px]" />

      <div className="absolute top-[35%] left-[40%] h-[340px] w-[340px] rounded-full bg-cyan-500/10 blur-[200px]" />
    </div>
  );
}