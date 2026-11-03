import React from 'react';
import { TerminalSettings } from '../types/trading';
import { SYMBOLS } from '../services/binance';
import { X, Sliders, Shield, Volume2, DollarSign } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TerminalSettings;
  onSave: (updated: Partial<TerminalSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h2 className="font-bold text-slate-100 text-sm">
              Настройки Терминала & Риск-Менеджмент
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-300">
          {/* Symbol & Mode */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">Торговый актив (Символ):</label>
            <select
              value={settings.symbol}
              onChange={(e) => onSave({ symbol: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
            >
              {Object.values(SYMBOLS).map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.name} ({s.symbol})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">Режим торговли:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'turbo', label: '🔥 TURBO', desc: 'Высокая частота' },
                { id: 'standard', label: '⚖️ Стандарт', desc: 'Баланс R:R' },
                { id: 'safe', label: '🛡️ Безопасный', desc: 'Строгий фильтр' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => onSave({ botMode: m.id as TerminalSettings['botMode'] })}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    settings.botMode === m.id
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs">{m.label}</div>
                  <div className="text-[10px] text-slate-500">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Market Type: Spot vs Futures */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">Рынок и кредитное плечо:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSave({ marketType: 'spot', leverage: 1 })}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  settings.marketType === 'spot'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Спот (Без плеча, 1x)
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Торговля собственными средствами. Только покупки (LONG). Риск ликвидации 0%.
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSave({ marketType: 'futures', leverage: Math.max(2, settings.leverage) })}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  settings.marketType === 'futures'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Фьючерсы (С плечом)
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Маржинальная торговля с плечом. Сигналы в обе стороны (LONG и SHORT).
                </div>
              </button>
            </div>
          </div>

          <div className="h-px bg-slate-800 my-2" />

          {/* Risk Management */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-400">Депозит ($ USDT):</label>
              <input
                type="number"
                min="10"
                step="50"
                value={settings.depositUsd}
                onChange={(e) => onSave({ depositUsd: Math.max(10, parseFloat(e.target.value) || 100) })}
                className="w-full p-2 rounded bg-slate-950 border border-slate-800 font-mono text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Риск на сделку (%):</label>
              <input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={settings.riskPct}
                onChange={(e) => onSave({ riskPct: parseFloat(e.target.value) || 1.0 })}
                className="w-full p-2 rounded bg-slate-950 border border-slate-800 font-mono text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Кредитное плечо:</label>
              {settings.marketType === 'spot' ? (
                <div className="p-2 rounded bg-slate-950 border border-slate-800 font-mono text-emerald-400 font-bold">
                  1x (Без плеча, Спот)
                </div>
              ) : (
                <input
                  type="number"
                  min="2"
                  max="50"
                  step="1"
                  value={settings.leverage}
                  onChange={(e) => onSave({ leverage: parseInt(e.target.value, 10) || 5 })}
                  className="w-full p-2 rounded bg-slate-950 border border-slate-800 font-mono text-slate-100"
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Комиссия биржи (% за сделку):</label>
              <input
                type="number"
                min="0.01"
                max="0.2"
                step="0.01"
                value={settings.feeRatePct}
                onChange={(e) => onSave({ feeRatePct: parseFloat(e.target.value) || 0.05 })}
                className="w-full p-2 rounded bg-slate-950 border border-slate-800 font-mono text-slate-100"
              />
            </div>
          </div>

          <div className="h-px bg-slate-800 my-2" />

          {/* SL / TP & Overtrading protections */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-slate-400">Stop-Loss (ATR):</label>
              <input
                type="number"
                min="0.2"
                max="3.0"
                step="0.1"
                value={settings.slAtr}
                onChange={(e) => onSave({ slAtr: parseFloat(e.target.value) || 0.6 })}
                className="w-full p-2 rounded bg-slate-950 border border-slate-800 font-mono text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Take-Profit (ATR):</label>
              <input
                type="number"
                min="0.5"
                max="6.0"
                step="0.1"
                value={settings.tpAtr}
                onChange={(e) => onSave({ tpAtr: parseFloat(e.target.value) || 1.8 })}
                className="w-full p-2 rounded bg-slate-950 border border-slate-800 font-mono text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">TTL сигнала (сек):</label>
              <input
                type="number"
                min="30"
                max="300"
                step="15"
                value={settings.signalTtlSec}
                onChange={(e) => onSave({ signalTtlSec: parseInt(e.target.value, 10) || 90 })}
                className="w-full p-2 rounded bg-slate-950 border border-slate-800 font-mono text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Пауза между сделками:</label>
              <input
                type="number"
                min="10"
                max="600"
                step="10"
                value={settings.cooldownSec}
                onChange={(e) => onSave({ cooldownSec: parseInt(e.target.value, 10) || 60 })}
                title="Кулдаун в секундах после закрытия сделки, чтобы избежать череды ложных входов"
                className="w-full p-2 rounded bg-slate-950 border border-slate-800 font-mono text-amber-400 font-semibold"
              />
            </div>
          </div>

          {/* 5M PRO & Dynamic Sizing Toggles */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 mt-2">
            <div className="font-bold text-slate-200 text-xs flex items-center justify-between pb-1 border-b border-slate-800/60">
              <span className="text-amber-400">⚡ Режим 5M PRO & Динамические уровни:</span>
            </div>

            <label className="flex items-center justify-between cursor-pointer pt-1">
              <div>
                <div className="text-slate-200 font-medium">Динамический SL / TP по свингам 5M</div>
                <div className="text-[10px] text-slate-500">Автоматически прячет стоп за локальный лоу 5м свечей</div>
              </div>
              <input
                type="checkbox"
                checked={settings.useDynamicSlTp}
                onChange={(e) => onSave({ useDynamicSlTp: e.target.checked })}
                className="rounded border-slate-700 bg-slate-800 text-amber-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-slate-200 font-medium">Динамический Трейлинг-Стоп</div>
                <div className="text-[10px] text-slate-500">Подтягивает стоп вслед за ростом цены, защищая накопленную прибыль</div>
              </div>
              <input
                type="checkbox"
                checked={settings.trailingStopEnabled}
                onChange={(e) => onSave({ trailingStopEnabled: e.target.checked })}
                className="rounded border-slate-700 bg-slate-800 text-amber-500"
              />
            </label>
          </div>

          {/* Audio Toggles */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 mt-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-300">Звуковые сигналы (бипер)</span>
              <input
                type="checkbox"
                checked={settings.useSound}
                onChange={(e) => onSave({ useSound: e.target.checked })}
                className="rounded border-slate-700 bg-slate-800 text-amber-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-300">Голосовое оповещение на русском</span>
              <input
                type="checkbox"
                checked={settings.useVoice}
                onChange={(e) => onSave({ useVoice: e.target.checked })}
                className="rounded border-slate-700 bg-slate-800 text-amber-500"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold text-xs transition-colors"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
