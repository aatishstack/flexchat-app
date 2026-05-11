export const TypingIndicator = () => {
  return (
    <div className="flex justify-start">
      
      <div className="rounded-3xl rounded-bl-md bg-white/10 px-5 py-4 backdrop-blur-xl">
        
        <div className="flex items-center gap-1">
          
          <div className="h-2 w-2 animate-bounce rounded-full bg-white/60" />

          <div className="h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:0.2s]" />

          <div className="h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:0.4s]" />
        </div>
      </div>
    </div>
  );
};