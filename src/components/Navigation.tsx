import React from 'react';
import { useTaskStore } from '../stores/taskStore';
import { Home, BarChart2, Settings, Plus, Timer } from 'lucide-react';

export const Navigation: React.FC = () => {
  const { currentScreen, setCurrentScreen, activeTaskId } = useTaskStore();

  if (currentScreen === 'active_session') {
    return null; // Active session has full-screen focus
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 px-4 pb-4 pt-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-lg border-t border-zinc-200/60 dark:border-zinc-800">
      <div className="flex items-center justify-around relative">
        {/* Home Tab */}
        <button
          onClick={() => setCurrentScreen('home')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all ${
            currentScreen === 'home'
              ? 'text-[#0F6E56] font-semibold'
              : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[11px]">Tasks</span>
        </button>

        {/* Active Timer shortcut if active */}
        {activeTaskId ? (
          <button
            onClick={() => setCurrentScreen('active_session')}
            className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl text-[#0F6E56] animate-pulse"
          >
            <Timer className="w-5 h-5" />
            <span className="text-[11px] font-bold">Active</span>
          </button>
        ) : (
          /* Plus Button */
          <button
            onClick={() => setCurrentScreen('add_task')}
            className="w-12 h-12 -mt-5 rounded-2xl bg-[#0F6E56] hover:bg-[#0c5945] text-white flex items-center justify-center shadow-lg shadow-[#0F6E56]/30 active:scale-90 transition-transform"
            aria-label="Add Task"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        )}

        {/* History Tab */}
        <button
          onClick={() => setCurrentScreen('history')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all ${
            currentScreen === 'history'
              ? 'text-[#0F6E56] font-semibold'
              : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
          }`}
        >
          <BarChart2 className="w-5 h-5" />
          <span className="text-[11px]">History</span>
        </button>

        {/* Settings Tab */}
        <button
          onClick={() => setCurrentScreen('settings')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all ${
            currentScreen === 'settings'
              ? 'text-[#0F6E56] font-semibold'
              : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[11px]">Settings</span>
        </button>
      </div>
    </nav>
  );
};
