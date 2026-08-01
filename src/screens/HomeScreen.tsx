import React from 'react';
import { useTaskStore } from '../stores/taskStore';
import { TaskCard } from '../components/TaskCard';
import { Search, Plus, Play, Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const {
    tasks,
    activeTaskId,
    activeRemainingSeconds,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    setCurrentScreen,
  } = useTaskStore();

  const activeTask = tasks.find((t) => t.id === activeTaskId && t.status === 'active');

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterStatus === 'pending') return t.status === 'pending';
    if (filterStatus === 'completed') return t.status === 'completed';
    if (filterStatus === 'missed') return t.status === 'missed' || t.status === 'dismissed';
    return true; // 'all'
  });

  const pendingTasks = filteredTasks.filter((t) => t.status === 'pending');
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed');
  const missedTasks = filteredTasks.filter((t) => t.status === 'missed' || t.status === 'dismissed');

  // Active timer format (MM:SS)
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <div className="flex items-center gap-2">
            {/* Minimalist Logo Icon */}
            <div className="w-8 h-8 rounded-xl bg-[#0F6E56] text-white flex items-center justify-center font-bold text-sm shadow-sm">
              T
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Tapost
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Task & Built-in Session Alarms
          </p>
        </div>

        <button
          onClick={() => setCurrentScreen('add_task')}
          className="p-2.5 rounded-xl bg-[#0F6E56] hover:bg-[#0c5945] text-white shadow-sm flex items-center gap-1 text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Active Session Banner if task is running */}
      {activeTask && (
        <div
          onClick={() => setCurrentScreen('active_session')}
          className="rounded-2xl p-4 bg-gradient-to-r from-[#0F6E56] to-emerald-800 text-white shadow-lg cursor-pointer transform transition-transform hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
              Active Session
            </span>
            <span className="font-mono text-xl font-extrabold tracking-wider bg-black/20 px-3 py-1 rounded-lg border border-white/10">
              {formatTimer(activeRemainingSeconds)}
            </span>
          </div>

          <h2 className="text-base font-bold line-clamp-1">{activeTask.title}</h2>
          <p className="text-xs text-emerald-100/80 mt-1 flex items-center justify-between">
            <span>Tap to open active focus timer</span>
            <span className="font-semibold underline">View Session →</span>
          </p>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks or notes..."
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-[#0F6E56] focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: 'all', label: 'All Tasks', count: tasks.length },
            { id: 'pending', label: 'Pending', count: tasks.filter((t) => t.status === 'pending').length },
            { id: 'completed', label: 'Done', count: tasks.filter((t) => t.status === 'completed').length },
            { id: 'missed', label: 'Missed', count: tasks.filter((t) => t.status === 'missed' || t.status === 'dismissed').length },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterStatus(pill.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filterStatus === pill.id
                  ? 'bg-[#0F6E56] text-white shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <span>{pill.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterStatus === pill.id ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                }`}
              >
                {pill.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Task Sections */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-dashed border-zinc-200 dark:border-zinc-800">
          <Calendar className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No tasks found</h3>
          <p className="text-xs text-zinc-400 mt-1 mb-4">
            Create a task with a start & end time to get started with your session alarm.
          </p>
          <button
            onClick={() => setCurrentScreen('add_task')}
            className="px-4 py-2 rounded-xl bg-[#0F6E56] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Task</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending / Reserved Tasks */}
          {pendingTasks.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#0F6E56]" />
                  Pending Sessions ({pendingTasks.length})
                </span>
                <span className="text-[10px] font-normal text-zinc-400">Tap Start to begin</span>
              </div>
              <div className="space-y-2.5">
                {pendingTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Completed Tasks ({completedTasks.length})
                </span>
              </div>
              <div className="space-y-2.5">
                {completedTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Missed / Dismissed Tasks */}
          {missedTasks.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-[#993C1D]" />
                  Missed or Dismissed ({missedTasks.length})
                </span>
              </div>
              <div className="space-y-2.5">
                {missedTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
