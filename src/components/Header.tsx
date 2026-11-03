import React from 'react';
import {
  Play,
  Square,
  Activity,
  Sliders,
  Calendar,
  Layers,
  BookOpen,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface HeaderProps {
  isRunning: boolean;
  onToggleBot: () => void;
  activeTab: 'overview' | 'strategies' | 'calendar' | 'journal';
  onSelectTab: (tab: 'overview' | 'strategies' | 'calendar' | 'journal') => void;
  onOpenSettings: () => void;
  streamStatus: 'live' | 'demo' | 'connecting' | 'error';
  currentPrice: number;
  priceChangePct: number;
  symbol: string;
}

export const Header: React.FC<HeaderProps> = ({
  isRunning,
  onToggleBot,
  activeTab,
  onSelectTab,
  onOpenSettings,
  streamStatus,
  currentPrice,
  priceChangePct,
  symbol,
}) => {
  const isUp = priceChangePct >= 0;

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950 px-4 flex items-center justify-between gap-6 shrink-0 select-none z-20">
      {/* Zone 1: Brand Wordmark & Active Asset Price */}
      <div className="flex items-center gap-4 whitespace-nowrap shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-sm">
            ⚡
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight text-slate-100">
              ScalpMaster
            </span>
            <span className="text-xs font-semibold text-amber-400 ml-1">PRO</span>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-800" />

        {/* Live Asset Badge */}
        <div className="flex items-baseline gap-2 font-mono">
          <span className="text-sm font-bold text-slate-200">{symbol}</span>
          <span className="text-sm font-bold text-slate-100">
            {currentPrice > 0 ? currentPrice.toFixed(2) : '----.--'}
          </span>
          <span
            className={`text-xs font-semibold ${
              isUp ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isUp ? '+' : ''}
            {priceChangePct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Tabs */}
      <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-slate-400">
        <button
          onClick={() => onSelectTab('overview')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'overview'
              ? 'text-amber-400 bg-amber-500/10 font-semibold'
              : 'hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Терминал
        </button>

        <button
          onClick={() => onSelectTab('strategies')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'strategies'
              ? 'text-amber-400 bg-amber-500/10 font-semibold'
              : 'hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Стратегии & ML
        </button>

        <button
          onClick={() => onSelectTab('calendar')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'calendar'
              ? 'text-amber-400 bg-amber-500/10 font-semibold'
              : 'hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Календарь P&L
        </button>

        <button
          onClick={() => onSelectTab('journal')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'journal'
              ? 'text-amber-400 bg-amber-500/10 font-semibold'
              : 'hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Журнал сделок
        </button>
      </nav>

      {/* Zone 3: Connection Status & Scalper Action */}
      <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
        {/* Stream badge */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800">
          {streamStatus === 'live' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-semibold">Binance Live</span>
            </>
          ) : streamStatus === 'connecting' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-amber-400">Подключение...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span className="text-sky-400">Демо-поток</span>
            </>
          )}
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded-lg border border-slate-800 transition-colors"
          title="Настройки риск-менеджмента и комиссий"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Start / Stop Scalping Bot Button */}
        <button
          onClick={onToggleBot}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap shrink-0 shadow-md ${
            isRunning
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/40 font-extrabold'
          }`}
        >
          {isRunning ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              Остановить бота
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              Запустить скальпинг
            </>
          )}
        </button>
      </div>
    </header>
  );
};
