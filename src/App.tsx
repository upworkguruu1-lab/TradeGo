import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Candle,
  ClosedTrade,
  DaySummary,
  Direction,
  MLState,
  StrategyName,
  TerminalSettings,
  Timeframe,
  TradeSignal,
  UserPosition,
} from './types/trading';
import {
  SYMBOLS,
  fetchKlines,
  MarketStreamManager,
} from './services/binance';
import {
  analyzeMarket,
  checkMomentum,
  checkVwap,
  checkBreak,
  checkPullback,
} from './utils/indicators';
import {
  playChime,
  speakAlert,
  requestNotificationPermission,
  sendPushNotification,
} from './utils/sound';

import { Header } from './components/Header';
import { ChartCanvas } from './components/ChartCanvas';
import { CopyTradingPanel } from './components/CopyTradingPanel';
import { StrategyPanel } from './components/StrategyPanel';
import { CalendarPanel } from './components/CalendarPanel';
import { JournalPanel } from './components/JournalPanel';
import { SettingsModal } from './components/SettingsModal';

const DEFAULT_SETTINGS: TerminalSettings = {
  symbol: 'PAXGUSDT',
  timeframe: '5m',
  botMode: 'turbo',
  marketType: 'spot', // Default to safe spot trading (1x leverage, only LONG)
  depositUsd: 1000,
  riskPct: 1.0,
  leverage: 1, // 1x for spot (own funds)
  feeRatePct: 0.05,
  slAtr: 0.6,
  tpAtr: 1.8,
  useSound: true,
  useVoice: true,
  usePushNotifications: false,
  autoCopy: false,
  signalTtlSec: 90,
  cooldownSec: 60, // 60 seconds cooldown after trade exit
  maxPositions: 1, // Max 1 active position at a time
  activeStrategies: {
    MOMENTUM: true,
    VWAP: true,
    BREAK: true,
    PULLBACK: true,
  },
};

const DEFAULT_ML_STATE: MLState = {
  enabled: true,
  warmUpDone: false,
  params: {
    slMult: 0.6,
    tpMult: 1.8,
    riskPct: 1.0,
    adxMin: 18,
    spreadMax: 0.18,
    strategyWeights: {
      MOMENTUM: 1.0,
      VWAP: 1.1,
      BREAK: 1.0,
      PULLBACK: 1.05,
    },
  },
  strategyPerformance: {
    MOMENTUM: {
      total: { w: 0, l: 0, pnl: 0 },
      byAdxHigh: { w: 0, l: 0, pnl: 0 },
      byAdxLow: { w: 0, l: 0, pnl: 0 },
      byTrendUp: { w: 0, l: 0, pnl: 0 },
      byTrendDown: { w: 0, l: 0, pnl: 0 },
      bySpreadWide: { w: 0, l: 0, pnl: 0 },
      bySpreadNarrow: { w: 0, l: 0, pnl: 0 },
    },
    VWAP: {
      total: { w: 0, l: 0, pnl: 0 },
      byAdxHigh: { w: 0, l: 0, pnl: 0 },
      byAdxLow: { w: 0, l: 0, pnl: 0 },
      byTrendUp: { w: 0, l: 0, pnl: 0 },
      byTrendDown: { w: 0, l: 0, pnl: 0 },
      bySpreadWide: { w: 0, l: 0, pnl: 0 },
      bySpreadNarrow: { w: 0, l: 0, pnl: 0 },
    },
    BREAK: {
      total: { w: 0, l: 0, pnl: 0 },
      byAdxHigh: { w: 0, l: 0, pnl: 0 },
      byAdxLow: { w: 0, l: 0, pnl: 0 },
      byTrendUp: { w: 0, l: 0, pnl: 0 },
      byTrendDown: { w: 0, l: 0, pnl: 0 },
      bySpreadWide: { w: 0, l: 0, pnl: 0 },
      bySpreadNarrow: { w: 0, l: 0, pnl: 0 },
    },
    PULLBACK: {
      total: { w: 0, l: 0, pnl: 0 },
      byAdxHigh: { w: 0, l: 0, pnl: 0 },
      byAdxLow: { w: 0, l: 0, pnl: 0 },
      byTrendUp: { w: 0, l: 0, pnl: 0 },
      byTrendDown: { w: 0, l: 0, pnl: 0 },
      bySpreadWide: { w: 0, l: 0, pnl: 0 },
      bySpreadNarrow: { w: 0, l: 0, pnl: 0 },
    },
  },
  slHistory: [],
  tpHistory: [],
};

export default function App() {
  const [settings, setSettings] = useState<TerminalSettings>(() => {
    try {
      const saved = localStorage.getItem('scalpmaster_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [mlState, setMlState] = useState<MLState>(() => {
    try {
      const saved = localStorage.getItem('scalpmaster_ml');
      return saved ? { ...DEFAULT_ML_STATE, ...JSON.parse(saved) } : DEFAULT_ML_STATE;
    } catch {
      return DEFAULT_ML_STATE;
    }
  });

  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChangePct, setPriceChangePct] = useState(0);
  const [streamStatus, setStreamStatus] = useState<'live' | 'demo' | 'connecting' | 'error'>('connecting');
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'strategies' | 'calendar' | 'journal'>('overview');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasPushPermission, setHasPushPermission] = useState(false);

  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [positions, setPositions] = useState<UserPosition[]>([]);
  const [history, setHistory] = useState<ClosedTrade[]>(() => {
    try {
      const saved = localStorage.getItem('scalpmaster_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dailyStats, setDailyStats] = useState<Record<string, DaySummary>>(() => {
    try {
      const saved = localStorage.getItem('scalpmaster_daily');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [strategyStats, setStrategyStats] = useState<
    Record<StrategyName, { trades: number; wins: number; losses: number; pnlNet: number }>
  >(() => {
    try {
      const saved = localStorage.getItem('scalpmaster_strat_stats');
      return saved
        ? JSON.parse(saved)
        : {
            MOMENTUM: { trades: 0, wins: 0, losses: 0, pnlNet: 0 },
            VWAP: { trades: 0, wins: 0, losses: 0, pnlNet: 0 },
            BREAK: { trades: 0, wins: 0, losses: 0, pnlNet: 0 },
            PULLBACK: { trades: 0, wins: 0, losses: 0, pnlNet: 0 },
          };
    } catch {
      return {
        MOMENTUM: { trades: 0, wins: 0, losses: 0, pnlNet: 0 },
        VWAP: { trades: 0, wins: 0, losses: 0, pnlNet: 0 },
        BREAK: { trades: 0, wins: 0, losses: 0, pnlNet: 0 },
        PULLBACK: { trades: 0, wins: 0, losses: 0, pnlNet: 0 },
      };
    }
  });

  const [logs, setLogs] = useState<{ id: string; time: string; text: string; type: string }[]>([]);

  const streamRef = useRef<MarketStreamManager | null>(null);
  const lastScanRef = useRef<number>(0);
  const lastExitTimeRef = useRef<number>(0);

  const addLog = useCallback((text: string, type = 'info') => {
    const time = new Date().toLocaleTimeString('ru-RU');
    setLogs((prev) => [
      { id: `${Date.now()}-${Math.random()}`, time, text, type },
      ...prev.slice(0, 50),
    ]);
  }, []);

  // Save state on change
  useEffect(() => {
    try {
      localStorage.setItem('scalpmaster_settings', JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('scalpmaster_history', JSON.stringify(history));
    } catch {}
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem('scalpmaster_daily', JSON.stringify(dailyStats));
    } catch {}
  }, [dailyStats]);

  useEffect(() => {
    try {
      localStorage.setItem('scalpmaster_strat_stats', JSON.stringify(strategyStats));
    } catch {}
  }, [strategyStats]);

  // Clean expired signals automatically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setSignals((prev) => prev.filter((s) => s.expiresAt > now));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Market Stream
  useEffect(() => {
    let isCancelled = false;

    if (streamRef.current) {
      streamRef.current.stop();
      streamRef.current = null;
    }

    addLog(`Загрузка свечей ${settings.symbol} [${settings.timeframe}]...`);

    fetchKlines(settings.symbol, settings.timeframe, 200).then((data) => {
      if (isCancelled) return;
      setCandles(data);

      if (data.length > 0) {
        const last = data[data.length - 1];
        setCurrentPrice(last.close);
        const change = ((last.close - data[0].open) / data[0].open) * 100;
        setPriceChangePct(change);
      }

      // Start Stream
      const manager = new MarketStreamManager(
        settings.symbol,
        settings.timeframe,
        (updatedCandle) => {
          setCandles((prev) => {
            if (prev.length === 0) return [updatedCandle];
            const last = prev[prev.length - 1];
            if (last.t === updatedCandle.t) {
              const updated = [...prev];
              updated[updated.length - 1] = updatedCandle;
              return updated;
            } else if (updatedCandle.t > last.t) {
              const updated = [...prev, updatedCandle];
              return updated.length > 250 ? updated.slice(-250) : updated;
            }
            return prev;
          });

          setCurrentPrice(updatedCandle.close);
        },
        (status) => setStreamStatus(status),
        data
      );

      manager.start();
      streamRef.current = manager;
    });

    return () => {
      isCancelled = true;
      if (streamRef.current) {
        streamRef.current.stop();
        streamRef.current = null;
      }
    };
  }, [settings.symbol, settings.timeframe, addLog]);

  // Close Position Handler
  const handleClosePosition = useCallback(
    (positionId: string, reason: string) => {
      const pos = positions.find((p) => p.id === positionId);
      if (!pos) return;

      const exitPrice = currentPrice || pos.entry;
      const priceDelta = pos.dir === 'LONG' ? (exitPrice - pos.entry) : (pos.entry - exitPrice);
      const pnlGrossPct = (priceDelta / pos.entry) * 100 * pos.leverage;
      const feePct = pos.feeRate * 2 * pos.leverage;
      const pnlNetPct = pnlGrossPct - feePct;
      const pnlUsd = (pos.sizeUsd * pnlNetPct) / 100;
      const isWin = pnlNetPct > 0;

      const closedTrade: ClosedTrade = {
        id: `trade-${Date.now()}`,
        dir: pos.dir,
        symbol: pos.symbol,
        entry: pos.entry,
        exit: exitPrice,
        sl: pos.sl,
        tp: pos.tp,
        strategy: pos.strategy,
        reason,
        pnlGrossPct,
        feePct,
        pnlNetPct,
        pnlUsd,
        entryTime: pos.entryTime,
        exitTime: Date.now(),
        durationSec: Math.floor((Date.now() - pos.entryTime) / 1000),
        isUserTrade: true,
      };

      setHistory((prev) => [closedTrade, ...prev]);
      setPositions((prev) => prev.filter((p) => p.id !== positionId));

      // Update Strategy Stats
      setStrategyStats((prev) => {
        const curr = prev[pos.strategy] || { trades: 0, wins: 0, losses: 0, pnlNet: 0 };
        return {
          ...prev,
          [pos.strategy]: {
            trades: curr.trades + 1,
            wins: curr.wins + (isWin ? 1 : 0),
            losses: curr.losses + (isWin ? 0 : 1),
            pnlNet: curr.pnlNet + pnlNetPct,
          },
        };
      });

      // Update Daily Stats
      const todayKey = new Date().toISOString().slice(0, 10);
      setDailyStats((prev) => {
        const day = prev[todayKey] || {
          date: todayKey,
          trades: 0,
          wins: 0,
          losses: 0,
          pnlNetPct: 0,
          pnlUsd: 0,
          history: [],
        };
        return {
          ...prev,
          [todayKey]: {
            ...day,
            trades: day.trades + 1,
            wins: day.wins + (isWin ? 1 : 0),
            losses: day.losses + (isWin ? 0 : 1),
            pnlNetPct: day.pnlNetPct + pnlNetPct,
            pnlUsd: day.pnlUsd + pnlUsd,
            history: [closedTrade, ...day.history],
          },
        };
      });

      lastExitTimeRef.current = Date.now();

      if (settings.useSound) {
        playChime(isWin ? 'win' : 'loss');
      }

      addLog(
        `Сделка закрыта (${reason}) ${pos.dir} @ ${exitPrice.toFixed(2)} | Чистый P&L: ${
          isWin ? '+' : ''
        }${pnlNetPct.toFixed(2)}% ($${pnlUsd.toFixed(1)})`,
        isWin ? 'win' : 'loss'
      );
    },
    [positions, currentPrice, settings.useSound, addLog]
  );

  // Position Monitor & Trailing Stop Engine
  useEffect(() => {
    if (positions.length === 0 || currentPrice <= 0) return;

    positions.forEach((pos) => {
      const priceDelta = pos.dir === 'LONG' ? (currentPrice - pos.entry) : (pos.entry - currentPrice);
      const pnlGrossPct = (priceDelta / pos.entry) * 100 * pos.leverage;

      // Check Stop Loss
      if (pos.dir === 'LONG' && currentPrice <= pos.sl) {
        handleClosePosition(pos.id, 'Stop-Loss сработал');
        return;
      }
      if (pos.dir === 'SHORT' && currentPrice >= pos.sl) {
        handleClosePosition(pos.id, 'Stop-Loss сработал');
        return;
      }

      // Check Take Profit
      if (pos.dir === 'LONG' && currentPrice >= pos.tp) {
        handleClosePosition(pos.id, 'Take-Profit взят! 🎯');
        return;
      }
      if (pos.dir === 'SHORT' && currentPrice <= pos.tp) {
        handleClosePosition(pos.id, 'Take-Profit взят! 🎯');
        return;
      }

      // Smart Break-Even Move: if price moved 50% toward TP, move SL to entry + slight buffer
      const targetDelta = Math.abs(pos.tp - pos.entry);
      const curMove = Math.abs(currentPrice - pos.entry);
      if (!pos.layer2Done && curMove >= targetDelta * 0.55 && pnlGrossPct > 0.4) {
        const breakEvenPrice = pos.dir === 'LONG' ? pos.entry * 1.0005 : pos.entry * 0.9995;
        setPositions((prev) =>
          prev.map((p) =>
            p.id === pos.id ? { ...p, sl: breakEvenPrice, layer2Done: true } : p
          )
        );
        addLog(`🛡️ Защита прибыли: Stop-Loss по ${pos.symbol} переведен в безубыток!`, 'info');
      }
    });
  }, [currentPrice, positions, handleClosePosition, addLog]);

  // Market Scanner Engine
  useEffect(() => {
    if (!isRunning || candles.length < 30) return;

    const now = Date.now();
    if (now - lastScanRef.current < 3500) return;
    lastScanRef.current = now;

    // Anti-overtrading Guard 1: Do not create signals if max positions reached
    if (positions.length >= settings.maxPositions) {
      return;
    }

    // Anti-overtrading Guard 2: If we ALREADY hold an active position on this symbol, do NOT open another
    if (positions.some((p) => p.symbol === settings.symbol)) {
      return;
    }

    // Anti-overtrading Guard 3: If an unexpired signal is already active for this symbol, do NOT spam another
    if (signals.some((s) => s.symbol === settings.symbol && s.expiresAt > now)) {
      return;
    }

    // Anti-overtrading Guard 4: Cooldown period after previous trade closure (avoids re-entering same chop)
    if (lastExitTimeRef.current && now - lastExitTimeRef.current < settings.cooldownSec * 1000) {
      return;
    }

    const analysis = analyzeMarket(candles);
    const lastCandle = candles[candles.length - 1];

    // Filter checks: Spread and ADX
    if (analysis.spread > mlState.params.spreadMax) return;
    if (settings.botMode === 'safe' && analysis.adx < 22) return;

    // Check Strategy Setups
    const detected: { dir: Direction; reason: string; strategy: StrategyName }[] = [];

    if (settings.activeStrategies.MOMENTUM) {
      const s = checkMomentum(candles, analysis);
      if (s) detected.push(s);
    }
    if (settings.activeStrategies.VWAP) {
      const s = checkVwap(candles, analysis);
      if (s) detected.push(s);
    }
    if (settings.activeStrategies.BREAK) {
      const s = checkBreak(candles, analysis);
      if (s) detected.push(s);
    }
    if (settings.activeStrategies.PULLBACK) {
      const s = checkPullback(candles, analysis);
      if (s) detected.push(s);
    }

    // Spot Mode Filter: on Spot you cannot short; ONLY LONG dip-buys and breakouts are allowed!
    const validDetected = settings.marketType === 'spot'
      ? detected.filter((s) => s.dir === 'LONG')
      : detected;

    if (validDetected.length === 0) return;

    // Pick top weighted strategy
    const chosen = validDetected[0];
    const atrVal = analysis.atr || (lastCandle.close * 0.005);
    const slDist = atrVal * settings.slAtr;
    const tpDist = atrVal * settings.tpAtr;

    const isLong = chosen.dir === 'LONG';
    const entry = lastCandle.close;
    const sl = isLong ? entry - slDist : entry + slDist;
    const tp = isLong ? entry + tpDist : entry - tpDist;
    const rrRatio = slDist > 0 ? tpDist / slDist : 2.0;

    const newSignal: TradeSignal = {
      id: `sig-${Date.now()}`,
      dir: chosen.dir,
      symbol: settings.symbol,
      entry,
      sl,
      tp,
      strategy: chosen.strategy,
      reason: chosen.reason,
      time: Date.now(),
      expiresAt: Date.now() + settings.signalTtlSec * 1000,
      rrRatio,
      confidence: Math.round(75 + Math.min(20, analysis.adx * 0.5)),
      analysis,
    };

    setSignals((prev) => [newSignal, ...prev.slice(0, 3)]);

    if (settings.useSound) {
      playChime('signal');
    }

    if (settings.useVoice) {
      const assetName = SYMBOLS[settings.symbol]?.name || settings.symbol;
      speakAlert(`Сигнал ${chosen.dir === 'LONG' ? 'ЛОНГ' : 'ШОРТ'} по ${assetName}`);
    }

    sendPushNotification(
      `Сигнал ${chosen.dir} ${settings.symbol}`,
      `Вход: ${entry.toFixed(2)} | SL: ${sl.toFixed(2)} | TP: ${tp.toFixed(2)} (R:R 1:${rrRatio.toFixed(1)})`
    );

    addLog(
      `🎯 ОБНАРУЖЕН СИГНАЛ ${chosen.dir} @ ${entry.toFixed(2)} | ${chosen.strategy} | R:R 1:${rrRatio.toFixed(1)}`,
      'signal'
    );

    // Auto Copy feature
    if (settings.autoCopy) {
      handleConfirmSignal(newSignal);
    }
  }, [
    isRunning,
    candles,
    settings,
    mlState,
    signals,
    positions,
    addLog,
  ]);

  // User Confirms Signal to copy trade
  const handleConfirmSignal = (sig: TradeSignal) => {
    // If already in a position for this symbol, block duplicate position spam
    if (positions.some((p) => p.symbol === sig.symbol)) {
      addLog(`Позиция по ${sig.symbol} уже открыта. Дополнительный вход заблокирован.`, 'info');
      return;
    }

    const effectiveLev = settings.marketType === 'spot' ? 1 : settings.leverage;
    // Calculate margin and contracts
    const riskAmount = (settings.depositUsd * (settings.riskPct / 100));
    const slDistPct = Math.abs(sig.entry - sig.sl) / sig.entry;
    const marginUsd = slDistPct > 0 ? Math.min(settings.depositUsd, riskAmount / slDistPct) : 100;
    const contracts = (marginUsd * effectiveLev) / sig.entry;

    const newPosition: UserPosition = {
      id: `pos-${Date.now()}`,
      dir: sig.dir,
      symbol: sig.symbol,
      entry: sig.entry,
      currentPrice: sig.entry,
      sl: sig.sl,
      tp: sig.tp,
      initialSl: sig.sl,
      strategy: sig.strategy,
      reason: sig.reason,
      sizeUsd: marginUsd,
      contracts,
      leverage: effectiveLev,
      feeRate: settings.feeRatePct / 100,
      entryTime: Date.now(),
      maxProfitPct: 0,
      layer1Done: false,
      layer2Done: false,
    };

    setPositions((prev) => [newPosition, ...prev]);
    setSignals((prev) => prev.filter((s) => s.id !== sig.id));

    if (settings.useSound) {
      playChime('entry');
    }

    addLog(
      `💼 Вы вошли в сделку ${sig.dir} @ ${sig.entry.toFixed(2)} (Маржа: $${marginUsd.toFixed(1)}, Плечо: ${
        settings.leverage
      }x)`,
      'entry'
    );
  };

  const handleSkipSignal = (signalId: string) => {
    setSignals((prev) => prev.filter((s) => s.id !== signalId));
    addLog('Сигнал отклонен пользователем');
  };

  const handleEnablePush = async () => {
    const granted = await requestNotificationPermission();
    setHasPushPermission(granted);
    if (granted) {
      addLog('Уведомления браузера активированы!', 'info');
      sendPushNotification('ScalpMaster PRO', 'Оповещения о скальпинг-сигналах успешно настроены!');
    }
  };

  const currentAnalysis = candles.length > 20 ? analyzeMarket(candles) : null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0b0f19] text-slate-100 font-sans">
      {/* 3-Zone Top Navigation Header */}
      <Header
        isRunning={isRunning}
        onToggleBot={() => {
          setIsRunning((prev) => {
            const next = !prev;
            addLog(next ? '▶ Скальпинг-бот запущен' : '⏹ Скальпинг-бот остановлен');
            return next;
          });
        }}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        streamStatus={streamStatus}
        currentPrice={currentPrice}
        priceChangePct={priceChangePct}
        symbol={settings.symbol}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center / Primary Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {activeTab === 'overview' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Candlestick Interactive Chart (Takes ~65% of viewport) */}
              <div className="flex-1 min-h-[380px] relative">
                <ChartCanvas
                  candles={candles}
                  timeframe={settings.timeframe}
                  symbol={settings.symbol}
                  activeSignal={signals[0] || null}
                  activePositions={positions}
                  onTimeframeChange={(tf) => setSettings((s) => ({ ...s, timeframe: tf }))}
                  decimals={SYMBOLS[settings.symbol]?.decimals || 2}
                />
              </div>

              {/* Bottom Telemetry & Diagnostics Strip */}
              <div className="h-44 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-800 text-xs shrink-0">
                {/* Market Condition Indicators */}
                <div className="p-3 sm:w-80 shrink-0 space-y-2 overflow-y-auto">
                  <div className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                    Состояние рынка ({settings.symbol})
                  </div>
                  {currentAnalysis ? (
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="bg-slate-900 p-2 rounded border border-slate-800/80">
                        <div className="text-slate-500 text-[10px]">Режим:</div>
                        <div className="font-bold text-amber-400">{currentAnalysis.mode}</div>
                      </div>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800/80">
                        <div className="text-slate-500 text-[10px]">Сила ADX:</div>
                        <div className="font-bold text-sky-400">{currentAnalysis.adx.toFixed(1)}</div>
                      </div>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800/80">
                        <div className="text-slate-500 text-[10px]">Волатильность ATR:</div>
                        <div className="font-bold text-slate-200">{currentAnalysis.atr.toFixed(2)}</div>
                      </div>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800/80">
                        <div className="text-slate-500 text-[10px]">Индекс RSI:</div>
                        <div
                          className={`font-bold ${
                            currentAnalysis.rsi > 70
                              ? 'text-rose-400'
                              : currentAnalysis.rsi < 30
                              ? 'text-emerald-400'
                              : 'text-slate-200'
                          }`}
                        >
                          {currentAnalysis.rsi.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-center py-4">Расчет индикаторов...</div>
                  )}
                </div>

                {/* Real-time System Scanner Log */}
                <div className="flex-1 p-3 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-1.5 shrink-0">
                    <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                      Лог сканера & событий
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {isRunning ? '🟢 Сканер активен' : '⏸ Остановлен'}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px]">
                    {logs.length === 0 ? (
                      <div className="text-slate-600 py-3">Лог чист. Нажмите «Запустить скальпинг».</div>
                    ) : (
                      logs.map((log) => (
                        <div key={log.id} className="flex items-baseline gap-2 leading-relaxed">
                          <span className="text-slate-600 text-[10px] shrink-0">{log.time}</span>
                          <span
                            className={
                              log.type === 'signal'
                                ? 'text-amber-400 font-semibold'
                                : log.type === 'win'
                                ? 'text-emerald-400 font-semibold'
                                : log.type === 'loss'
                                ? 'text-rose-400 font-semibold'
                                : log.type === 'entry'
                                ? 'text-sky-300'
                                : 'text-slate-300'
                            }
                          >
                            {log.text}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'strategies' && (
            <StrategyPanel
              candles={candles}
              settings={settings}
              mlState={mlState}
              strategyStats={strategyStats}
              onToggleStrategy={(name) =>
                setSettings((s) => ({
                  ...s,
                  activeStrategies: {
                    ...s.activeStrategies,
                    [name]: !s.activeStrategies[name],
                  },
                }))
              }
              onUpdateMLParams={(params) => setMlState((ml) => ({ ...ml, params }))}
              onUpdateSettings={(newSet) => setSettings((s) => ({ ...s, ...newSet }))}
            />
          )}

          {activeTab === 'calendar' && <CalendarPanel dailyStats={dailyStats} />}

          {activeTab === 'journal' && (
            <JournalPanel
              history={history}
              onClearHistory={() => {
                if (window.confirm('Очистить историю всех сделок?')) {
                  setHistory([]);
                  setDailyStats({});
                }
              }}
            />
          )}
        </div>

        {/* Right Sidebar: Dedicated Copy Trading Hub (always accessible or in Overview) */}
        <aside className="w-80 sm:w-96 shrink-0 h-full">
          <CopyTradingPanel
            signals={signals}
            positions={positions}
            settings={settings}
            currentPrice={currentPrice}
            onConfirmSignal={handleConfirmSignal}
            onSkipSignal={handleSkipSignal}
            onClosePosition={handleClosePosition}
            onUpdateSettings={(updated) => setSettings((s) => ({ ...s, ...updated }))}
            onEnablePush={handleEnablePush}
            hasPushPermission={hasPushPermission}
          />
        </aside>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={(updated) => setSettings((s) => ({ ...s, ...updated }))}
      />
    </div>
  );
}
