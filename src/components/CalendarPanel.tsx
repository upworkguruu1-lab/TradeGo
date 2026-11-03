import React, { useState } from 'react';
import { ClosedTrade, DaySummary } from '../types/trading';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface CalendarPanelProps {
  dailyStats: Record<string, DaySummary>;
}

export const CalendarPanel: React.FC<CalendarPanelProps> = ({ dailyStats }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday = 0, Sunday = 6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Calculate monthly stats
  let monthTrades = 0;
  let monthWins = 0;
  let monthPnlPct = 0;
  let monthPnlUsd = 0;
  let plusDays = 0;
  let minusDays = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = d.toString().padStart(2, '0');
    const mStr = (month + 1).toString().padStart(2, '0');
    const key = `${year}-${mStr}-${dStr}`;
    const dayData = dailyStats[key];
    if (dayData && dayData.trades > 0) {
      monthTrades += dayData.trades;
      monthWins += dayData.wins;
      monthPnlPct += dayData.pnlNetPct;
      monthPnlUsd += dayData.pnlUsd;
      if (dayData.pnlNetPct > 0) plusDays++;
      else if (dayData.pnlNetPct < 0) minusDays++;
    }
  }

  const monthWinRate = monthTrades > 0 ? (monthWins / monthTrades) * 100 : 0;
  const selectedDayData = selectedDayKey ? dailyStats[selectedDayKey] : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-slate-200 select-none overflow-y-auto">
      {/* Month Header & Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">
              {monthNames[month]} {year}
            </h1>
            <p className="text-xs text-slate-400">
              Дневной журнал результатов скальпинга с учетом биржевых комиссий
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            Текущий месяц
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 text-xs">Чистый P&L месяца</div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              monthPnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {monthPnlPct >= 0 ? '+' : ''}
            {monthPnlPct.toFixed(2)}%
          </div>
          <div className="text-xs text-slate-500 font-mono mt-0.5">
            {monthPnlUsd >= 0 ? '+' : ''}${monthPnlUsd.toFixed(1)} USDT
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 text-xs">Всего сделок</div>
          <div className="text-xl font-bold font-mono text-slate-100 mt-1">
            {monthTrades}
          </div>
          <div className="text-xs text-slate-500 font-mono mt-0.5">
            Побед: {monthWins} / Поражений: {monthTrades - monthWins}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 text-xs">Win Rate</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {monthWinRate.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 font-mono mt-0.5">
            Целевой диапазон: 55-70%
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 text-xs">Прибыльные дни</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {plusDays} <span className="text-xs text-slate-500 font-normal">дней</span>
          </div>
          <div className="text-xs text-slate-500 font-mono mt-0.5">
            Убыточных: {minusDays}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-slate-400 mb-2">
          <div>Пн</div>
          <div>Вт</div>
          <div>Ср</div>
          <div>Чт</div>
          <div>Пт</div>
          <div>Сб</div>
          <div>Вс</div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {/* Empty days before 1st of month */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[64px] rounded-lg bg-slate-950/30 border border-slate-900/50"
            />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dStr = dayNum.toString().padStart(2, '0');
            const mStr = (month + 1).toString().padStart(2, '0');
            const dayKey = `${year}-${mStr}-${dStr}`;
            const dayData = dailyStats[dayKey];
            const hasTrades = dayData && dayData.trades > 0;
            const isSelected = selectedDayKey === dayKey;
            const isProfit = hasTrades && dayData.pnlNetPct > 0;
            const isLoss = hasTrades && dayData.pnlNetPct < 0;

            return (
              <div
                key={dayKey}
                onClick={() => setSelectedDayKey(dayKey)}
                className={`min-h-[64px] p-1.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'ring-2 ring-amber-400 border-amber-400'
                    : isProfit
                    ? 'bg-emerald-950/30 border-emerald-500/30 hover:bg-emerald-950/50'
                    : isLoss
                    ? 'bg-rose-950/30 border-rose-500/30 hover:bg-rose-950/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold text-slate-300">{dayNum}</span>
                  {hasTrades && (
                    <span className="font-mono text-slate-500 text-[9px]">
                      {dayData.trades} сд
                    </span>
                  )}
                </div>

                {hasTrades ? (
                  <div className="font-mono text-right">
                    <div
                      className={`text-[11px] font-bold ${
                        isProfit ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isProfit ? '+' : ''}
                      {dayData.pnlNetPct.toFixed(1)}%
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-600 text-center font-mono">—</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Panel */}
      {selectedDayKey && (
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-slate-100 text-sm">
              Детализация дня: {selectedDayKey}
            </h3>
            {selectedDayData && (
              <div className="font-mono text-xs">
                Итог:{' '}
                <span
                  className={`font-bold ${
                    selectedDayData.pnlNetPct >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {selectedDayData.pnlNetPct >= 0 ? '+' : ''}
                  {selectedDayData.pnlNetPct.toFixed(2)}% (${selectedDayData.pnlUsd.toFixed(1)} USDT)
                </span>
              </div>
            )}
          </div>

          {!selectedDayData || selectedDayData.history.length === 0 ? (
            <div className="py-4 text-center text-slate-500 text-xs">
              В этот день сделок не зафиксировано
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayData.history.map((tr, idx) => (
                <div
                  key={tr.id || idx}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-semibold">#{idx + 1}</span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        tr.dir === 'LONG'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {tr.dir}
                    </span>
                    <span className="text-slate-200 font-semibold">{tr.symbol}</span>
                    <span className="text-slate-400 text-[11px]">
                      {tr.entry.toFixed(2)} → {tr.exit.toFixed(2)}
                    </span>
                    <span className="text-slate-500 text-[10px]">({tr.strategy})</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-slate-500 text-[10px]">
                      Комиссия: -{tr.feePct.toFixed(2)}%
                    </span>
                    <span
                      className={`font-bold text-sm ${
                        tr.pnlNetPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tr.pnlNetPct >= 0 ? '+' : ''}
                      {tr.pnlNetPct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
