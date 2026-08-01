import React, { useState } from 'react';
import { Smartphone, Monitor } from 'lucide-react';

interface MobileFrameProps {
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  const [isPhoneFrame, setIsPhoneFrame] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-0 sm:p-4 transition-colors">
      {/* Desktop Top Control Bar */}
      <div className="hidden sm:flex items-center justify-between w-full max-w-md mb-2 px-2 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#0F6E56] dark:text-emerald-400">Tapost</span>
          <span>• Task & Alarm Productivity</span>
        </div>
        <button
          onClick={() => setIsPhoneFrame(!isPhoneFrame)}
          className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 text-zinc-700 dark:text-zinc-300 transition-all shadow-xs"
        >
          {isPhoneFrame ? (
            <>
              <Monitor className="w-3.5 h-3.5 text-[#0F6E56]" />
              <span>Full Screen</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5 text-[#0F6E56]" />
              <span>Phone Frame</span>
            </>
          )}
        </button>
      </div>

      {/* Main View Container */}
      <div
        className={`w-full max-w-md bg-white dark:bg-zinc-900 overflow-hidden relative flex flex-col transition-all duration-300 ${
          isPhoneFrame
            ? 'h-[844px] rounded-[48px] border-[10px] border-zinc-800 dark:border-zinc-950 shadow-2xl ring-1 ring-black/10'
            : 'min-h-screen sm:min-h-[800px] sm:rounded-3xl sm:border sm:border-zinc-200 sm:dark:border-zinc-800 sm:shadow-xl'
        }`}
      >
        {/* Phone Notch/Bar in Frame mode */}
        {isPhoneFrame && (
          <div className="w-full bg-zinc-900 text-white px-6 pt-3 pb-1 flex items-center justify-between text-[11px] font-medium z-50 select-none">
            <span>9:41</span>
            <div className="w-20 h-4 bg-black rounded-full" />
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-5 h-2.5 border border-white/80 rounded-xs p-0.5 flex items-center">
                <div className="w-full h-full bg-white rounded-2xs" />
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      </div>
    </div>
  );
};
