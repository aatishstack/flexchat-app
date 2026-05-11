"use client";

const stats = [
  {
    title: "Messages",
    value: "24K",
  },
  {
    title: "Media",
    value: "1.2K",
  },
  {
    title: "Calls",
    value: "328",
  },
];

export default function ChatStats() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((item, index) => (
        <div
          key={index}
          className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-3xl"
        >
          <p className="text-sm text-cyan-300">
            {item.title}
          </p>

          <h3 className="mt-2 text-2xl font-black">
            {item.value}
          </h3>
        </div>
      ))}
    </div>
  );
}