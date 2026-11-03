import React, { useState } from 'react';
import {
  Candle,
  MLState,
  StrategyName,
  TerminalSettings,
} from '../types/trading';
import {
  Brain,
  Play,
  RotateCw,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import {
  analyzeMarket,
  atr,
  checkMomentum,
  checkVwap,
  checkBreak,
  checkPullback,
  calculateStructuralSlTp,
} from '../utils/indicators';

interface StrategyPanelProps {
  candles: Candle[];
  settings: TerminalSettings;
  mlState: MLState;
  strategyStats: Record<StrategyName, { trades: number; wins: number; losses: number; pnlNet: number }>;
  onToggleStrategy: (name: StrategyName) => void;
  onUpdateMLParams: (params: MLState['params']) => void;
  onUpdateSettings: (settings: Partial<TerminalSettings>) => void;
}

export const StrategyPanel: React.FC<StrategyPanelProps> = ({
  candles,
  settings,
  mlState,
  strategyStats,
  onToggleStrategy,
  onUpdateMLParams,
  onUpdateSettings,
}) => {
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestResult, setBacktestResult] = useState<{
    bestSl: number;
    bestTp: number;
    trades: number;
    winRate: number;
    netPnl: number;
  } | null>(null);

  const strategies: {
    id: StrategyName;
    name: string;
    desc: string;
    tag: string;
  }[] = [
    {
      id: 'MOMENTUM',
      name: 'Импульсный пробой (Momentum)',
      desc: 'Вход при пробое экстремумов 2 предыдущих свечей с объемом выше среднего на 20% и фильтром RSI (защита от покупок на перекупленности).',
      tag: 'Высокая частота',
    },
    {
      id: 'VWAP',
      name: 'VWAP Bounce (Отскок)',
      desc: 'Отбой от средневзвешенной цены объема (VWAP) в сторону доминирующего тренда (EMA-50). Любимый паттерн институциональных алгоритмов.',
      tag: 'Высокий Win Rate',
    },
    {
      id: 'BREAK',
      name: 'Пробой диапазона (Breakout)',
      desc: 'Выход из 20-свечной консолидации с подтверждением всплеска объема x1.3. Ловит резкие импульсы в начале направленного движения.',
      tag: 'Большой Take-Profit',
    },
    {
      id: 'PULLBACK',
      name: 'Откат к тренду (EMA Pullback)',
      desc: 'Покупка на коррекции к скользящей средней EMA-9 / EMA-21 при сохранении трендовой структуры. Минимальный риск Stop-Loss.',
      tag: 'Оптимальный R:R',
    },
  ];

  const runBacktest = () => {
    if (candles.length < 50) return;
    setIsBacktesting(true);

    setTimeout(() => {
      let bestScore = -999999;
      let bestConfig = { sl: 1.4, tp: 2.4, trades: 0, winRate: 0, netPnl: 0 };

      // Test realistic structural multipliers that give price breathing room above noise
      const slVariants = [1.2, 1.4, 1.6, 1.8];
      const tpVariants = [1.8, 2.2, 2.8, 3.4];

      const effLev = settings.marketType === 'spot' ? 1 : settings.leverage;
      const feeRoundTrip = settings.feeRatePct * 2 * effLev;

      for (const slMult of slVariants) {
        for (const tpMult of tpVariants) {
          let trades = 0;
          let wins = 0;
          let netPnl = 0;
          let lastTradeCandleIdx = -99;

          // Scan across historical candles
          for (let i = 25; i < candles.length - 12; i++) {
            // Anti-churn cooldown: at least 4 candles between entries
            if (i - lastTradeCandleIdx < 4) continue;

            const slice = candles.slice(0, i + 1);
            const analysis = analyzeMarket(slice);
            const lastC = slice[slice.length - 1];

            // Filter by active strategies
            const detected: { dir: 'LONG' | 'SHORT'; strategy: StrategyName }[] = [];
            if (settings.activeStrategies.MOMENTUM) {
              const s = checkMomentum(slice, analysis);
              if (s) detected.push(s);
            }
            if (settings.activeStrategies.VWAP) {
              const s = checkVwap(slice, analysis);
              if (s) detected.push(s);
            }
            if (settings.activeStrategies.BREAK) {
              const s = checkBreak(slice, analysis);
              if (s) detected.push(s);
            }
            if (settings.activeStrategies.PULLBACK) {
              const s = checkPullback(slice, analysis);
              if (s) detected.push(s);
            }

            // Spot Mode: Only LONG allowed
            const valid = settings.marketType === 'spot'
              ? detected.filter((d) => d.dir === 'LONG')
              : detected;

            if (valid.length === 0) continue;

            const chosen = valid[0];
            const entry = lastC.close;
            const atrVal = analysis.atr || (entry * 0.005);

            const { sl, tp } = calculateStructuralSlTp(
              slice,
              entry,
              chosen.dir,
              atrVal,
              slMult,
              tpMult
            );

            let tradeSl = sl;
            let breakEvenTriggered = false;
            let closed = false;

            // Follow the trade for up to 15 candles
            for (let j = i + 1; j < Math.min(candles.length, i + 16); j++) {
              const c = candles[j];

              if (chosen.dir === 'LONG') {
                // Check break-even move (if price reached halfway to TP)
                if (!breakEvenTriggered && c.high >= entry + (tp - entry) * 0.5) {
                  tradeSl = entry * 1.0005;
                  breakEvenTriggered = true;
                }

                // Check Stop Loss
                if (c.low <= tradeSl) {
                  trades++;
                  const exitPrice = tradeSl;
                  const grossPct = ((exitPrice - entry) / entry) * 100 * effLev;
                  const net = grossPct - feeRoundTrip;
                  netPnl += net;
                  if (net > 0) wins++;
                  lastTradeCandleIdx = j;
                  closed = true;
                  break;
                }

                // Check Take Profit
                if (c.high >= tp) {
                  trades++;
                  wins++;
                  const grossPct = ((tp - entry) / entry) * 100 * effLev;
                  const net = grossPct - feeRoundTrip;
                  netPnl += net;
                  lastTradeCandleIdx = j;
                  closed = true;
                  break;
                }
              } else {
                // SHORT
                if (!breakEvenTriggered && c.low <= entry - (entry - tp) * 0.5) {
                  tradeSl = entry * 0.9995;
                  breakEvenTriggered = true;
                }

                if (c.high >= tradeSl) {
                  trades++;
                  const exitPrice = tradeSl;
                  const grossPct = ((entry - exitPrice) / entry) * 100 * effLev;
                  const net = grossPct - feeRoundTrip;
                  netPnl += net;
                  if (net > 0) wins++;
                  lastTradeCandleIdx = j;
                  closed = true;
                  break;
                }

                if (c.low <= tp) {
                  trades++;
                  wins++;
                  const grossPct = ((entry - tp) / entry) * 100 * effLev;
                  const net = grossPct - feeRoundTrip;
                  netPnl += net;
                  lastTradeCandleIdx = j;
                  closed = true;
                  break;
                }
              }
            }

            // If trade did not hit SL or TP within 15 candles, close at market
            if (!closed && i + 15 < candles.length) {
              const exitCandle = candles[i + 15];
              trades++;
              const pDelta = chosen.dir === 'LONG' ? (exitCandle.close - entry) : (entry - exitCandle.close);
              const grossPct = (pDelta / entry) * 100 * effLev;
              const net = grossPct - feeRoundTrip;
              netPnl += net;
              if (net > 0) wins++;
              lastTradeCandleIdx = i + 15;
            }
          }

          const wr = trades > 0 ? (wins / trades) * 100 : 0;
          // Score prioritizes positive net P&L and solid win rate
          const score = (netPnl * 1.5) + (wr * 0.5);

          if (trades >= 2 && score > bestScore) {
            bestScore = score;
            bestConfig = {
              sl: slMult,
              tp: tpMult,
              trades,
              winRate: wr,
              netPnl,
            };
          }
        }
      }

      setBacktestResult({
        bestSl: bestConfig.sl,
        bestTp: bestConfig.tp,
        trades: bestConfig.trades,
        winRate: bestConfig.winRate,
        netPnl: bestConfig.netPnl,
      });

      // Apply optimized parameters
      onUpdateSettings({ slAtr: bestConfig.sl, tpAtr: bestConfig.tp });
      onUpdateMLParams({
        ...mlState.params,
        slMult: bestConfig.sl,
        tpMult: bestConfig.tp,
      });

      setIsBacktesting(false);
    }, 600);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-slate-200 select-none overflow-y-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <h1 className="text-lg font-bold text-slate-100">
              Торговые Стратегии & ML Адаптация
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Каждая стратегия использует мульти-индикаторную фильтрацию: всплеск объема, спред, силу тренда ADX и фильтр перекупленности RSI.
            Машинное обучение автоматически оптимизирует веса прибыльных сетапов в реальном времени.
          </p>
        </div>

        <button
          onClick={runBacktest}
          disabled={isBacktesting || candles.length < 50}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-xs transition-colors shrink-0 disabled:opacity-50"
        >
          {isBacktesting ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              Оптимизация...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Оптимизировать SL / TP
            </>
          )}
        </button>
      </div>

      {/* Backtest Notification if run */}
      {backtestResult && (
        <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-500/40 text-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-emerald-300">Параметры успешно откалиброваны по истории:</div>
              <div className="text-slate-300 font-mono mt-0.5">
                Оптимальный SL: <b className="text-amber-400">{backtestResult.bestSl}x ATR</b> | Take-Profit: <b className="text-emerald-400">{backtestResult.bestTp}x ATR</b> (Win Rate: {backtestResult.winRate.toFixed(1)}%, Чистый P&L: {backtestResult.netPnl >= 0 ? '+' : ''}{backtestResult.netPnl.toFixed(2)}%)
              </div>
            </div>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold">Применено</span>
        </div>
      )}

      {/* Strategies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.map((strat) => {
          const isActive = settings.activeStrategies[strat.id];
          const stats = strategyStats[strat.id] || { trades: 0, wins: 0, losses: 0, pnlNet: 0 };
          const winRate = stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0;
          const weight = mlState.params.strategyWeights[strat.id] ?? 1.0;

          return (
            <div
              key={strat.id}
              className={`p-4 rounded-xl border transition-all ${
                isActive
                  ? 'bg-slate-900/90 border-slate-700/80 shadow-md'
                  : 'bg-slate-950/40 border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-100 text-sm">{strat.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                      {strat.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{strat.desc}</p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => onToggleStrategy(strat.id)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Performance Counters */}
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-800/80 text-[11px] font-mono mt-3">
                <div className="bg-slate-950/60 p-2 rounded text-center">
                  <div className="text-slate-500 text-[10px]">Сделок</div>
                  <div className="font-bold text-slate-200">{stats.trades}</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded text-center">
                  <div className="text-slate-500 text-[10px]">Win Rate</div>
                  <div className="font-bold text-amber-400">{winRate.toFixed(0)}%</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded text-center">
                  <div className="text-slate-500 text-[10px]">P&L (Чистый)</div>
                  <div
                    className={`font-bold ${
                      stats.pnlNet >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {stats.pnlNet >= 0 ? '+' : ''}
                    {stats.pnlNet.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded text-center">
                  <div className="text-slate-500 text-[10px]">ML Вес</div>
                  <div className="font-bold text-purple-400">x{weight.toFixed(2)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ML Diagnostic Card */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="font-bold text-slate-100 text-sm">
              Текущие параметры самообучающейся модели
            </h2>
          </div>
          <span className="text-xs font-mono text-purple-400">
            {mlState.warmUpDone ? 'Адаптивный режим активен' : 'Фаза сбора статистики'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <div className="text-slate-500 text-[10px]">Stop-Loss ATR</div>
            <div className="text-base font-bold text-slate-200 mt-1">
              {mlState.params.slMult.toFixed(2)}x
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Динамический порог</div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <div className="text-slate-500 text-[10px]">Take-Profit ATR</div>
            <div className="text-base font-bold text-emerald-400 mt-1">
              {mlState.params.tpMult.toFixed(2)}x
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Целевая прибыль</div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <div className="text-slate-500 text-[10px]">Фильтр тренда ADX</div>
            <div className="text-base font-bold text-sky-400 mt-1">
              {mlState.params.adxMin.toFixed(0)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Мин. сила импульса</div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <div className="text-slate-500 text-[10px]">Макс. допустимый спред</div>
            <div className="text-base font-bold text-amber-400 mt-1">
              {mlState.params.spreadMax.toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Защита от проскальзывания</div>
          </div>
        </div>
      </div>
    </div>
  );
};
