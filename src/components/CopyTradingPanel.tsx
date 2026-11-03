import React, { useState, useEffect } from 'react';
import {
  TradeSignal,
  UserPosition,
  TerminalSettings,
} from '../types/trading';
import {
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Volume2,
  VolumeX,
  Bell,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface CopyTradingPanelProps {
  signals: TradeSignal[];
  positions: UserPosition[];
  settings: TerminalSettings;
  currentPrice: number;
  onConfirmSignal: (signal: TradeSignal) => void;
  onSkipSignal: (signalId: string) => void;
  onClosePosition: (positionId: string, reason: string) => void;
  onUpdateSettings: (settings: Partial<TerminalSettings>) => void;
  onEnablePush: () => void;
  hasPushPermission: boolean;
}

export const CopyTradingPanel: React.FC<CopyTradingPanelProps> = ({
  signals,
  positions,
  settings,
  currentPrice,
  onConfirmSignal,
  onSkipSignal,
  onClosePosition,
  onUpdateSettings,
  onEnablePush,
  hasPushPermission,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Keep countdown timer ticking every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const copyOrderParams = (sig: TradeSignal) => {
    const riskAmount = (settings.depositUsd * (settings.riskPct / 100));
    const slDistPct = Math.abs(sig.entry - sig.sl) / sig.entry;
    const marginUsd = slDistPct > 0 ? (riskAmount / slDistPct) : 100;
    const contracts = sig.entry > 0 ? ((marginUsd * settings.leverage) / sig.entry) : 0;

    const text = `🎯 СКАЛЬПИНГ ОРДЕР: ${sig.symbol}\n` +
      `Направление: ${sig.dir === 'LONG' ? 'ПОКУПКА (LONG) 🟢' : 'ПРОДАЖА (SHORT) 🔴'}\n` +
      `Тип: Рыночный / Лимитный @ ${sig.entry.toFixed(2)}\n` +
      `Stop-Loss: ${sig.sl.toFixed(2)} (-${(slDistPct * 100).toFixed(2)}%)\n` +
      `Take-Profit: ${sig.tp.toFixed(2)} (+${(Math.abs(sig.tp - sig.entry) / sig.entry * 100).toFixed(2)}%)\n` +
      `Плечо: ${settings.leverage}x\n` +
      `Расчетная маржа: $${marginUsd.toFixed(1)} USDT (~${contracts.toFixed(4)} монет)\n` +
      `R:R: 1 : ${sig.rrRatio.toFixed(1)} | Стратегия: ${sig.strategy}`;

    navigator.clipboard.writeText(text);
    setCopiedId(sig.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 border-l border-slate-800 text-xs select-none overflow-y-auto">
      {/* Panel Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="font-bold text-slate-100 text-sm tracking-wide">
            Центр Копирования (Copy Trading)
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onUpdateSettings({ useSound: !settings.useSound })}
            className={`p-1.5 rounded transition-colors ${
              settings.useSound
                ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title={settings.useSound ? 'Звук включен' : 'Звук выключен'}
          >
            {settings.useSound ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onEnablePush}
            className={`p-1.5 rounded transition-colors ${
              hasPushPermission
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 hover:text-amber-300'
            }`}
            title={hasPushPermission ? 'Уведомления браузера активны' : 'Включить пуш-уведомления'}
          >
            <Bell className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Settings & Risk Calculator Bar */}
      <div className="p-3 bg-slate-950/60 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Депозит:</span>
          <span className="font-mono text-slate-200 font-semibold">${settings.depositUsd} USDT</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Риск на сделку:</span>
          <span className="font-mono text-amber-400 font-medium">
            {settings.riskPct}% (${((settings.depositUsd * settings.riskPct) / 100).toFixed(1)} max loss)
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Плечо:</span>
          <span className="font-mono text-slate-200 font-medium">{settings.leverage}x</span>
        </div>

        {/* Auto Confirm Toggle */}
        <label className="flex items-center justify-between pt-1 cursor-pointer">
          <span className="text-[11px] text-slate-300">Авто-вход в сделку:</span>
          <input
            type="checkbox"
            checked={settings.autoCopy}
            onChange={(e) => onUpdateSettings({ autoCopy: e.target.checked })}
            className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0 cursor-pointer"
          />
        </label>
      </div>

      {/* Signals Queue Section */}
      <div className="p-3 border-b border-slate-800 flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-300 uppercase tracking-wider text-[11px]">
            <span>Входящие сигналы</span>
            {signals.length > 0 && (
              <span className="bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full font-mono text-[10px] font-extrabold animate-pulse">
                {signals.length}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500">TTL: {settings.signalTtlSec}с</span>
        </div>

        {signals.length === 0 ? (
          <div className="py-8 text-center text-slate-500 space-y-1">
            <Clock className="w-6 h-6 mx-auto opacity-40 text-slate-400" />
            <p className="font-medium">Сканирование рынка...</p>
            <p className="text-[10px] text-slate-600">Сигналы появятся автоматически при пробое уровней</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {signals.map((sig) => {
              const secondsLeft = Math.max(0, Math.floor((sig.expiresAt - now) / 1000));
              const isExpired = secondsLeft <= 0;
              const isLong = sig.dir === 'LONG';

              return (
                <div
                  key={sig.id}
                  className={`p-3 rounded-lg border transition-all ${
                    isExpired
                      ? 'bg-slate-900/40 border-slate-800 opacity-60'
                      : isLong
                      ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                      : 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/20'
                  }`}
                >
                  {/* Signal Header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-mono font-extrabold text-[12px] flex items-center gap-0.5 ${
                          isLong ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isLong ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {sig.dir}
                      </span>
                      <span className="text-slate-300 font-semibold">{sig.symbol}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-mono">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className={secondsLeft < 20 ? 'text-rose-400 font-bold' : 'text-amber-400'}>
                        {isExpired ? 'Истек' : `${secondsLeft}с`}
                      </span>
                    </div>
                  </div>

                  {/* Pricing grid */}
                  <div className="grid grid-cols-3 gap-1.5 py-1.5 my-1.5 bg-slate-950/60 rounded px-2 text-[10px] font-mono">
                    <div>
                      <div className="text-slate-500">Вход</div>
                      <div className="text-slate-200 font-semibold">{sig.entry.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-rose-400/80">Stop-Loss</div>
                      <div className="text-rose-400 font-semibold">{sig.sl.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-emerald-400/80">Take-Profit</div>
                      <div className="text-emerald-400 font-semibold">{sig.tp.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Strategy Note & R:R */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2.5">
                    <span className="truncate max-w-[180px]">{sig.reason}</span>
                    <span className="font-mono text-amber-400 shrink-0 font-medium">
                      R:R 1:{sig.rrRatio.toFixed(1)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onConfirmSignal(sig)}
                      disabled={isExpired}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded font-bold text-slate-950 transition-all ${
                        isExpired
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : isLong
                          ? 'bg-emerald-400 hover:bg-emerald-300'
                          : 'bg-rose-400 hover:bg-rose-300'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Повторить сделку
                    </button>

                    <button
                      onClick={() => copyOrderParams(sig)}
                      className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium border border-slate-700 transition-colors"
                      title="Скопировать параметры ордера для биржи"
                    >
                      {copiedId === sig.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Скопировано!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Копировать ордер</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User's Active Position Tracker (Мои сделки) */}
      <div className="p-3 bg-slate-950/40">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <span>Мои открытые позиции</span>
            {positions.length > 0 && (
              <span className="text-amber-400 font-mono text-[11px]">({positions.length})</span>
            )}
          </div>
        </div>

        {positions.length === 0 ? (
          <div className="py-4 text-center text-slate-600 text-[11px]">
            Нет открытых сделок
          </div>
        ) : (
          <div className="space-y-2">
            {positions.map((pos) => {
              const price = currentPrice || pos.entry;
              const priceDelta = pos.dir === 'LONG' ? (price - pos.entry) : (pos.entry - price);
              const pnlGrossPct = (priceDelta / pos.entry) * 100 * pos.leverage;
              // Exchange fee round-trip deduction (e.g. 0.05% * 2 * leverage)
              const feePct = pos.feeRate * 2 * pos.leverage;
              const pnlNetPct = pnlGrossPct - feePct;
              const isProfit = pnlNetPct >= 0;

              // Distance to SL / TP in percent
              const distToSl = Math.abs(price - pos.sl) / price * 100;
              const distToTp = Math.abs(pos.tp - price) / price * 100;

              // Progress towards TP vs SL
              const totalDist = Math.abs(pos.tp - pos.sl);
              const curDist = pos.dir === 'LONG' ? (price - pos.sl) : (pos.sl - price);
              const progressPct = totalDist > 0 ? Math.max(0, Math.min(100, (curDist / totalDist) * 100)) : 50;

              const elapsedSec = Math.floor((now - pos.entryTime) / 1000);
              const mins = Math.floor(elapsedSec / 60);
              const secs = elapsedSec % 60;

              return (
                <div
                  key={pos.id}
                  className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-mono font-bold text-[11px] ${
                          pos.dir === 'LONG' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {pos.dir}
                      </span>
                      <span className="font-semibold text-slate-200">{pos.symbol}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {mins}м {secs}с
                      </span>
                    </div>

                    <div
                      className={`font-mono font-bold text-[13px] ${
                        isProfit ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isProfit ? '+' : ''}{pnlNetPct.toFixed(2)}%
                    </div>
                  </div>

                  {/* Position details */}
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 font-mono">
                    <div>Вход: <span className="text-slate-200 font-semibold">{pos.entry.toFixed(2)}</span></div>
                    <div>Тек: <span className="text-slate-200 font-semibold">{price.toFixed(2)}</span></div>
                    <div>До SL: <span className="text-rose-400 font-semibold">{distToSl.toFixed(2)}%</span></div>
                    <div>До TP: <span className="text-emerald-400 font-semibold">{distToTp.toFixed(2)}%</span></div>
                  </div>

                  {/* SL / TP Track Bar */}
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isProfit ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>SL {pos.sl.toFixed(1)}</span>
                      <span>TP {pos.tp.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => onClosePosition(pos.id, 'Ручной выход')}
                    className="w-full py-1.5 bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-800/60 border border-slate-700/80 rounded font-medium text-slate-300 transition-colors"
                  >
                    Закрыть сделку по рынку
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
