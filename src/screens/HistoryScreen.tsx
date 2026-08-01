import React, { useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { TaskCard } from '../components/TaskCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CheckCircle2, AlertTriangle, XCircle, Clock, Award, Flame, BarChart2 } from 'lucide-react';

export const HistoryScreen: React.FC = () => {
  const { tasks, getCompletionStats } = useTaskStore();
  const [filter, setFilter] = useState<'all' | 'completed' | 'missed' | 'dismissed'>('all');

  const stats = getCompletionStats();

  const historyTasks = tasks.filter((t) => {
    if (filter === 'all') return t.status !== 'pending' && t.status !== 'active';
    return t.status === filter;
  });

  // Data for completion rate chart
  const chartData = [
    { name: 'Done', count: stats.completedTasks, color: '#0F6E56' },
    { name: 'Missed', count: stats.missedTasks, color: '#993C1D' },
    { name: 'Dismissed', count: stats.dismissedTasks, color: '#71717A' },
  ];

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-[#0F6E56]" />
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Task Analytics</h1>
        </div>
        <p className="text-xs text-zinc-500">Track task completion rate & focus history</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Completion Rate */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0F6E56] to-emerald-800 text-white shadow-md">
          <span className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider block mb-1">
            Completion Rate
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold font-mono">{stats.completionRate}%</span>
          </div>
          <p className="text-[10px] text-emerald-100/80 mt-1">
            {stats.completedTasks} of {stats.totalTasks} tasks completed
          </p>
        </div>

        {/* Focus Minutes */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Focus Minutes
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold font-mono text-zinc-900 dark:text-zinc-100">
              {stats.totalFocusMinutes}
            </span>
            <span className="text-xs font-semibold text-zinc-500">mins</span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">Logged from active sessions</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
          Task Outcome Breakdown
        </h3>
        <div className="h-44 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Past History List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Past Tasks Log
          </h3>

          <div className="flex gap-1 text-[11px]">
            {(['all', 'completed', 'missed', 'dismissed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-all ${
                  filter === f
                    ? 'bg-[#0F6E56] text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {historyTasks.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800">
            <p className="text-xs text-zinc-400">No past tasks matching selected filter.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {historyTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
