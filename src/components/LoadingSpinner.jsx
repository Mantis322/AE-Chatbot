const LoadingSpinner = () => {
    return (
      <div className="flex items-center justify-start gap-2 p-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-[bounce_0.7s_infinite]" />
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-[bounce_0.7s_0.1s_infinite]" />
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-[bounce_0.7s_0.2s_infinite]" />
        </div>
        <span className="text-slate-300 text-sm">Processing...</span>
      </div>
    );
  };
  
  export default LoadingSpinner;