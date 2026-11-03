import React from 'react';
import { ClosedTrade } from '../types/trading';
import { Download, Trash2, ArrowUpRight, ArrowDownRight, FileText } from 'lucide-react';

interface JournalPanelProps {
  history: ClosedTrade[];
  onClearHistory: () => void;
}

export const JournalPanel: React.FC<JournalPanelProps> = ({
  history,
  onClearHistory,
}) => {
  const exportToCsv = () => {
    if (history.length === 0) return;

    const headers = [
      'Дата/Время',
      'Пара',
      'Направление',
      'Стратегия',
      'Вход',
      'Выход',
      'Stop-Loss',
      'Take-Profit',
      'Грязный P&L %',
      'Комиссия %',
      'Чистый P&L %',
      'P&L USDT',
      'Причина выхода',
    ];

    const rows = history.map((t) => [
      new Date(t.exitTime).toLocaleString('ru-RU'),
      t.symbol,
      t.dir,
      t.strategy,
      t.entry.toFixed(4),
      t.exit.toFixed(4),
      t.sl.toFixed(4),
      t.tp.toFixed(4),
      t.pnlGrossPct.toFixed(2),
      t.feePct.toFixed(2),
      t.pnlNetPct.toFixed(2),
      t.pnlUsd.toFixed(2),
      `"${t.reason}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `scalp_journal_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalNetPnlUsd = history.reduce((acc, t) => acc + t.pnlUsd, 0);
  const totalNetPnlPct = history.reduce((acc, t) => acc + t.pnlNetPct, 0);
  const wins = history.filter((t) => t.pnlNetPct > 0).length;
  const losses = history.filter((t) => t.pnlNetPct <= 0).length;
  const winRate = history.length > 0 ? (wins / history.length) * 100 : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-slate-200 select-none overflow-y-auto">
      {/* Header & Export Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">
              Журнал Завершенных Сделок
            </h1>
            <p className="text-xs text-slate-400">
              Детальная история исполненных ордеров с точным расчетом комиссии биржи
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCsv}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            Экспорт в CSV
          </button>

          <button
            onClick={onClearHistory}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-lg text-xs font-semibold border border-slate-700 hover:border-rose-900 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Очистить
          </button>
        </div>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
          <div className="text-slate-500 text-[10px]">Всего сделок</div>
          <div className="text-lg font-bold text-slate-100 mt-1">{history.length}</div>
          <div className="text-[10px] text-slate-400">Побед: {wins} | Поражений: {losses}</div>
        </div>

        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
          <div className="text-slate-500 text-[10px]">Win Rate</div>
          <div className="text-lg font-bold text-amber-400 mt-1">{winRate.toFixed(1)}%</div>
          <div className="text-[10px] text-slate-400">С учетом комиссии</div>
        </div>

        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
          <div className="text-slate-500 text-[10px]">Суммарный P&L %</div>
          <div
            className={`text-lg font-bold mt-1 ${
              totalNetPnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalNetPnlPct >= 0 ? '+' : ''}{totalNetPnlPct.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-400">Чистая доходность</div>
        </div>

        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
          <div className="text-slate-500 text-[10px]">Прибыль / Убыток ($)</div>
          <div
            className={`text-lg font-bold mt-1 ${
              totalNetPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalNetPnlUsd >= 0 ? '+' : ''}${totalNetPnlUsd.toFixed(1)} USDT
          </div>
          <div className="text-[10px] text-slate-400">Балансовый результат</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        {history.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-1">
            <FileText className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
            <p className="font-semibold text-slate-400 text-sm">Журнал сделок пуст</p>
            <p className="text-xs text-slate-600">
              Здесь появится полная история закрытых позиций после первой отработки сигналов
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Время</th>
                  <th className="py-3 px-3">Пара</th>
                  <th className="py-3 px-3">Тип</th>
                  <th className="py-3 px-3">Стратегия</th>
                  <th className="py-3 px-3">Вход</th>
                  <th className="py-3 px-3">Выход</th>
                  <th className="py-3 px-3">Комиссия</th>
                  <th className="py-3 px-3 text-right">Чистый P&L</th>
                  <th className="py-3 px-4">Причина</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.map((t) => {
                  const isWin = t.pnlNetPct > 0;
                  const timeStr = new Date(t.exitTime).toLocaleTimeString('ru-RU');

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {timeStr}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200">
                        {t.symbol}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            t.dir === 'LONG'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {t.dir === 'LONG' ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {t.dir}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                        {t.strategy}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{t.entry.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-slate-300">{t.exit.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-slate-500 text-[10px]">
                        -{t.feePct.toFixed(2)}%
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold text-sm ${
                          isWin ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isWin ? '+' : ''}{t.pnlNetPct.toFixed(2)}%
                        <div className="text-[10px] font-normal text-slate-500">
                          {t.pnlUsd >= 0 ? '+' : ''}${t.pnlUsd.toFixed(1)}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px] truncate max-w-[180px]">
                        {t.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
