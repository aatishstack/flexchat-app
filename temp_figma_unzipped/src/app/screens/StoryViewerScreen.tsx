import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { X, MoreVertical, Heart, Send } from "lucide-react";
import { STORIES } from "../data";
import { Avatar } from "../components/shared";

export function StoryViewerScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const story = STORIES.find((s) => s.id === Number(id)) || STORIES[1];
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          navigate(-1);
          return 100;
        }
        return p + 1;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col h-full bg-black relative">
      {/* Background Image */}
      {story.storyImage ? (
        <img src={story.storyImage} alt="Story" className="absolute inset-0 w-full h-full object-cover" />
      ) : story.image ? (
        <img src={story.image} alt="Story" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center" style={{ background: story.color }}>
          <h2 className="text-white text-3xl font-bold px-8 text-center leading-snug">
            Just thinking about how good the new FlexChat is 🚀
          </h2>
        </div>
      )}

      {/* Overlay gradient top & bottom */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
        <div className="h-32 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="h-40 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Progress Bar */}
        <div className="pt-[14px] px-2 flex gap-1">
          <div className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <div className="flex items-center gap-2.5">
            <Avatar initials={story.initials} color={story.color} size={34} imgUrl={story.image} />
            <div className="flex flex-col">
              <span className="text-[13.5px] font-bold text-white shadow-black drop-shadow-md">{story.name}</span>
              <span className="text-[11px] text-white/80 font-medium shadow-black drop-shadow-md">2h ago</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2">
              <MoreVertical size={20} className="text-white drop-shadow-md" />
            </button>
            <button onClick={() => navigate(-1)} className="p-2">
              <X size={24} className="text-white drop-shadow-md" />
            </button>
          </div>
        </div>

        <div className="flex-1" onClick={() => setProgress((p) => Math.min(p + 20, 100))} />

        {/* Footer actions */}
        <div className="flex items-center gap-3 px-4 pb-8 pt-4">
          <div className="flex-1 flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-4 py-3 border border-white/20">
            <input
              className="flex-1 bg-transparent text-[14px] text-white placeholder-white/60 outline-none"
              placeholder="Send message"
            />
          </div>
          <button className="w-11 h-11 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20">
            <Heart size={20} className="text-white" />
          </button>
          <button className="w-11 h-11 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20">
            <Send size={18} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
