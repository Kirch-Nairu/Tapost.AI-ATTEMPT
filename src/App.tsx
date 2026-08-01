import React, { useEffect } from 'react';
import { useTaskStore } from './stores/taskStore';
import { MobileFrame } from './components/MobileFrame';
import { Navigation } from './components/Navigation';
import { AlarmRingingModal } from './components/AlarmRingingModal';
import { HomeScreen } from './screens/HomeScreen';
import { AddTaskScreen } from './screens/AddTaskScreen';
import { TaskDetailScreen } from './screens/TaskDetailScreen';
import { ActiveSessionScreen } from './screens/ActiveSessionScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export default function App() {
  const { currentScreen, initializeStore, isLoading, settings } = useTaskStore();

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  // Sync theme class
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-[#0F6E56] flex items-center justify-center text-white font-bold text-xl mb-3 animate-pulse">
          T
        </div>
        <p className="text-sm font-semibold tracking-wide text-zinc-300">Loading Tapost...</p>
        <p className="text-xs text-zinc-500 mt-1">Initialising local database & alarm triggers</p>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen />;
      case 'add_task':
        return <AddTaskScreen />;
      case 'task_detail':
        return <TaskDetailScreen />;
      case 'active_session':
        return <ActiveSessionScreen />;
      case 'history':
        return <HistoryScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <MobileFrame>
      {renderScreen()}
      <Navigation />
      <AlarmRingingModal />
    </MobileFrame>
  );
}
