import React from 'react';
import { SessionStats, TerminalSettings } from '../types/trading';
import { Target, Shield, CheckCircle2, AlertTriangle, RotateCcw, TrendingUp, Sliders, Activity, ShieldCheck } from 'lucide-react';
import { MarketRegimeInfo, HtfTrendAnalysis } from '../utils/indicators';

interface DailySessionCardProps {
  sessionStats: SessionStats;
  settings: TerminalSettings;
  marketRegime?: MarketRegimeInfo | null;
  htfTrend?: HtfTrendAnalysis | null;
  onResetSession: () => void;
  onOpenSettings: () => void;
}

export const DailySessionCard: React.FC<DailySessionCardProps> = ({
  sessionStats,
  settings,
  marketRegime,
  htfTrend,
  onResetSession,
  onOpenSettings,
}) => {
  const targetPct = settings.dailyTargetPct || 5.0;
  const maxLossPct = settings.maxDailyLossPct || 3.0;
  const currentPnlPct = sessionStats.sessionPnlPct;
  const currentPnlUsd = sessionStats.sessionPnlUsd;

  // Calculate percentage of target achieved (0 to 100%)
  const progressRatio = targetPct > 0 ? Math.min(100, Math.max(0, (currentPnlPct / targetPct) * 100)) : 0;
  
  const isTargetReached = sessionStats.status === 'TARGET_REACHED' || currentPnlPct >= targetPct;
  const isLossLimit = sessionStats.status === 'LOSS_LIMIT' || currentPnlPct <= -maxLossPct;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 backdrop-blur shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-100 text-xs uppercase tracking-wide">
                Дневная торговая сессия
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                5M {settings.marketType.toUpperCase()}
              </span>
              {settings.singlePairMode && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono font-semibold">
                  Фокус: {settings.symbol}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Цель дня: <span className="text-emerald-400 font-mono font-bold">+{targetPct}%</span> | Защита сессии: <span className="text-rose-400 font-mono font-bold">-{maxLossPct}%</span>
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {isTargetReached ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold animate-pulse">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Цель дня достигнута! (+{currentPnlPct.toFixed(2)}%)
            </div>
          ) : isLossLimit ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Лимит просадки: Защита включена
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Сессия активна
            </div>
          )}

          <button
            onClick={onResetSession}
            title="Сбросить статистику сессии и начать новый торговый день"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-[11px] transition-colors"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">Новый день</span>
          </button>
        </div>
      </div>

      {/* Progress towards Daily Target */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
            Прогресс к цели:
          </span>
          <div className="flex items-center gap-2 font-mono">
            <span
              className={`font-bold ${
                currentPnlPct > 0
                  ? 'text-emerald-400'
                  : currentPnlPct < 0
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}
            >
              {currentPnlPct >= 0 ? '+' : ''}{currentPnlPct.toFixed(2)}%
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-300 font-semibold">+{targetPct}%</span>
            <span className="text-slate-500 text-[10px]">
              ({currentPnlUsd >= 0 ? '+' : ''}${currentPnlUsd.toFixed(2)})
            </span>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isTargetReached
                ? 'bg-gradient-to-r from-emerald-500 to-amber-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : currentPnlPct < 0
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-amber-500 to-emerald-400'
            }`}
            style={{ width: `${Math.max(2, progressRatio)}%` }}
          />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-2.5 border-t border-slate-800/60 text-[11px]">
        <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/40">
          <div className="text-slate-500">Сделок сегодня</div>
          <div className="font-mono font-bold text-slate-200 mt-0.5">
            {sessionStats.sessionTradesCount}
          </div>
        </div>

        <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/40">
          <div className="text-slate-500">Винрейт (W / L)</div>
          <div className="font-mono font-bold text-slate-200 mt-0.5 flex items-center gap-1.5">
            <span className="text-emerald-400">{sessionStats.sessionWins}W</span>
            <span className="text-slate-500">/</span>
            <span className="text-rose-400">{sessionStats.sessionLosses}L</span>
            <span className="text-slate-400 text-[10px] ml-auto">
              ({sessionStats.sessionTradesCount > 0 ? sessionStats.sessionWinRate.toFixed(0) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/40">
          <div className="text-slate-500">Осталось до цели</div>
          <div className="font-mono font-bold text-slate-200 mt-0.5">
            {currentPnlPct >= targetPct ? (
              <span className="text-emerald-400">Выполнено 🎯</span>
            ) : (
              <span className="text-amber-400">+{(targetPct - currentPnlPct).toFixed(2)}%</span>
            )}
          </div>
        </div>

        <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/40 flex items-center justify-between">
          <div>
            <div className="text-slate-500">Авто-локер</div>
            <div className="font-mono font-semibold text-slate-300 mt-0.5">
              {settings.autoStopOnTarget ? 'Включен' : 'Отключен'}
            </div>
          </div>
          <button
            onClick={onOpenSettings}
            className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
            title="Настройки целей сессии"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Market Regime & HTF Trend Ribbon */}
      {(marketRegime || htfTrend) && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 flex items-center gap-1 font-medium">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Рыночный режим:
            </span>
            {marketRegime ? (
              <span
                className={`px-2 py-0.5 rounded-full border font-mono font-semibold ${marketRegime.badgeColor}`}
                title={marketRegime.reason}
              >
                {marketRegime.label}
              </span>
            ) : (
              <span className="text-slate-500 font-mono">Анализ свечей...</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">15M Тренд:</span>
            {htfTrend ? (
              <span
                className={`px-2 py-0.5 rounded-full border font-mono font-semibold ${
                  htfTrend.dir === 'UP'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : htfTrend.dir === 'DOWN'
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                    : 'text-slate-400 bg-slate-800 border-slate-700'
                }`}
                title={htfTrend.desc}
              >
                {htfTrend.dir === 'UP' ? 'Восходящий ↗' : htfTrend.dir === 'DOWN' ? 'Нисходящий ↘' : 'Боковик ➔'}
              </span>
            ) : (
              <span className="text-slate-500 font-mono">Загрузка...</span>
            )}

            <div className="hidden lg:flex items-center gap-1 text-slate-400 ml-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-mono">Параболик ATR Трейлинг</span>
            </div>
          </div>
        </div>
      )}

      {/* Advisory Banner when target reached or locked */}
      {isTargetReached && settings.autoStopOnTarget && (
        <div className="mt-2.5 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-[11px] text-emerald-300 flex items-center justify-between">
          <span>
            🎉 Дневная цель +{targetPct}% взята! Новые сделки заблокированы, чтобы защитить заработанную прибыль.
          </span>
          <button
            onClick={onResetSession}
            className="underline font-semibold ml-2 hover:text-emerald-100"
          >
            Продолжить торговлю
          </button>
        </div>
      )}

      {isLossLimit && settings.autoStopOnLoss && (
        <div className="mt-2.5 p-2 rounded-lg bg-rose-950/40 border border-rose-500/40 text-[11px] text-rose-300 flex items-center justify-between">
          <span>
            🛡️ Сработал Circuit Breaker (-{maxLossPct}%). Торги остановлены для сохранения баланса.
          </span>
          <button
            onClick={onResetSession}
            className="underline font-semibold ml-2 hover:text-rose-100"
          >
            Снять блокировку
          </button>
        </div>
      )}
    </div>
  );
};
