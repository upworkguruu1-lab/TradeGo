import React, { useState } from 'react';
import { ClosedTrade } from '../types/trading';
import { Download, Trash2, ArrowUpRight, ArrowDownRight, FileText, Bot, Check, Copy } from 'lucide-react';

interface JournalPanelProps {
  history: ClosedTrade[];
  onClearHistory: () => void;
}

export const JournalPanel: React.FC<JournalPanelProps> = ({
  history,
  onClearHistory,
}) => {
  const [copiedAi, setCopiedAi] = useState(false);

  // Standard CSV Export
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
      'Тип выхода',
      'MFE (Макс % прибыли)',
      'MAE (Макс % просадки)',
      'Входной ADX',
      'Входной RSI',
      '15M Тренд',
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
      t.exitType || (t.pnlNetPct > 0 ? 'TAKE_PROFIT' : 'STOP_LOSS'),
      t.mfePct !== undefined ? t.mfePct.toFixed(2) : '',
      t.maePct !== undefined ? t.maePct.toFixed(2) : '',
      t.entryAdx !== undefined ? t.entryAdx.toFixed(0) : '',
      t.entryRsi !== undefined ? t.entryRsi.toFixed(0) : '',
      t.htfTrend || '',
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

  // AI-Ready Export (Prompt + Structured JSON for ChatGPT, Claude, Gemini)
  const exportForAi = () => {
    if (history.length === 0) return;

    const totalWins = history.filter((t) => t.pnlNetPct > 0);
    const totalLosses = history.filter((t) => t.pnlNetPct <= 0);
    const grossWinsUsd = totalWins.reduce((acc, t) => acc + t.pnlUsd, 0);
    const grossLossesUsd = Math.abs(totalLosses.reduce((acc, t) => acc + t.pnlUsd, 0));
    const profitFactor = grossLossesUsd > 0 ? (grossWinsUsd / grossLossesUsd).toFixed(2) : '99.0';

    const aiPayload = {
      system_instruction: 'Ты — профессиональный количественный аналитик и алготрейдер (Quantitative Trading Analyst). Ниже представлен журнал совершенных сделок скальпинг-бота за торговую сессию. Твоя задача: 1) Найти закономерности убыточных серий (по времени, индикаторам ADX/RSI, расстоянию до SL). 2) Определить наиболее прибыльные стратегии. 3) Дать конкретные рекомендации по корректировке SL, TP, трейлинга и фильтров входа.',
      session_summary: {
        total_trades: history.length,
        win_rate_pct: history.length > 0 ? ((totalWins.length / history.length) * 100).toFixed(1) : 0,
        net_pnl_usd: history.reduce((acc, t) => acc + t.pnlUsd, 0).toFixed(2),
        net_pnl_pct: history.reduce((acc, t) => acc + t.pnlNetPct, 0).toFixed(2),
        profit_factor: profitFactor,
      },
      trades: history.map((t) => ({
        id: t.id,
        timestamp: new Date(t.exitTime).toISOString(),
        symbol: t.symbol,
        direction: t.dir,
        strategy: t.strategy,
        entry_price: t.entry,
        exit_price: t.exit,
        initial_sl: t.sl,
        initial_tp: t.tp,
        exit_type: t.exitType || (t.pnlNetPct > 0 ? 'PROFIT' : 'STOP_LOSS'),
        net_pnl_pct: Number(t.pnlNetPct.toFixed(2)),
        pnl_usd: Number(t.pnlUsd.toFixed(2)),
        fee_pct: Number(t.feePct.toFixed(2)),
        max_favorable_excursion_pct: t.mfePct !== undefined ? Number(t.mfePct.toFixed(2)) : null,
        max_adverse_excursion_pct: t.maePct !== undefined ? Number(t.maePct.toFixed(2)) : null,
        entry_adx: t.entryAdx,
        entry_rsi: t.entryRsi,
        htf_15m_trend: t.htfTrend,
        duration_seconds: t.durationSec,
        exit_reason: t.reason,
      })),
    };

    const textToCopy = `=== ЗАПРОС ДЛЯ НЕЙРОСЕТИ (AUDIT & OPTIMIZATION) ===\n${JSON.stringify(
      aiPayload,
      null,
      2
    )}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedAi(true);
    setTimeout(() => setCopiedAi(false), 4000);

    // Also download JSON file
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(aiPayload, null, 2));
    const dlLink = document.createElement('a');
    dlLink.setAttribute('href', dataStr);
    dlLink.setAttribute('download', `ai_trade_audit_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlLink);
    dlLink.click();
    document.body.removeChild(dlLink);
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
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Журнал Завершенных Сделок
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                AI Ready
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Глубокая телеметрия: MFE/MAE экскурсии, ADX, RSI, тип выхода и экспорт данных для нейросетей
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* AI-Ready Export Button */}
          <button
            onClick={exportForAi}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors disabled:opacity-40"
            title="Скачать JSON и скопировать готовый промпт со всеми сделками для отправки в ChatGPT / Claude / Gemini"
          >
            {copiedAi ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                Скопировано для ИИ!
              </>
            ) : (
              <>
                <Bot className="w-3.5 h-3.5 text-purple-200" />
                Экспорт для ИИ (Prompt)
              </>
            )}
          </button>

          <button
            onClick={exportToCsv}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            CSV
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

      {copiedAi && (
        <div className="p-3 bg-purple-950/40 border border-purple-500/50 rounded-lg text-xs text-purple-200 flex items-center gap-2 animate-fadeIn">
          <Bot className="w-4 h-4 text-purple-400 shrink-0" />
          <span>
            <b>Промпт и JSON сделок скопированы в буфер!</b> Вставьте скопированный текст в ChatGPT или Gemini — нейросеть мгновенно выдаст аналитику по таймфреймам, RSI и спреду.
          </span>
        </div>
      )}

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
                  <th className="py-3 px-3">Время</th>
                  <th className="py-3 px-2">Пара</th>
                  <th className="py-3 px-2">Тип</th>
                  <th className="py-3 px-2">Стратегия</th>
                  <th className="py-3 px-2">Вход</th>
                  <th className="py-3 px-2">Выход</th>
                  <th className="py-3 px-2">MFE / MAE</th>
                  <th className="py-3 px-3 text-right">Чистый P&L</th>
                  <th className="py-3 px-3">Исполнение</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.map((t) => {
                  const isWin = t.pnlNetPct > 0;
                  const timeStr = new Date(t.exitTime).toLocaleTimeString('ru-RU');

                  // Distinct badge color & text for exit type
                  let badge = {
                    text: t.reason,
                    color: isWin ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-rose-400 bg-rose-500/10 border-rose-500/30',
                  };

                  if (t.exitType === 'TRAILING_PROFIT' || (isWin && t.reason.includes('Трейлинг'))) {
                    badge = {
                      text: 'Трейлинг-Стоп (В плюсе)',
                      color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40 font-bold',
                    };
                  } else if (t.exitType === 'BREAK_EVEN' || (isWin && t.reason.includes('Безубыток'))) {
                    badge = {
                      text: 'Безубыток (+0.08%)',
                      color: 'text-sky-300 bg-sky-500/10 border-sky-500/30',
                    };
                  } else if (t.exitType === 'TAKE_PROFIT') {
                    badge = {
                      text: 'Take-Profit 🎯',
                      color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/50 font-bold',
                    };
                  }

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                        {timeStr}
                      </td>
                      <td className="py-2.5 px-2 font-semibold text-slate-200">
                        {t.symbol}
                      </td>
                      <td className="py-2.5 px-2">
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
                      <td className="py-2.5 px-2 text-slate-300 text-[11px]">
                        {t.strategy}
                      </td>
                      <td className="py-2.5 px-2 text-slate-300">{t.entry.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-slate-300">{t.exit.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-[10px]">
                        <span className="text-emerald-400 font-semibold" title="MFE: Максимальная плавающая прибыль в сделке">
                          +{t.mfePct !== undefined ? t.mfePct.toFixed(2) : '0.00'}%
                        </span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span className="text-rose-400" title="MAE: Максимальная просадка внутри сделки">
                          {t.maePct !== undefined ? t.maePct.toFixed(2) : '0.00'}%
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold text-xs ${
                          isWin ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isWin ? '+' : ''}{t.pnlNetPct.toFixed(2)}%
                        <div className="text-[10px] font-normal text-slate-500">
                          {t.pnlUsd >= 0 ? '+' : ''}${t.pnlUsd.toFixed(2)}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${badge.color}`}>
                          {badge.text}
                        </span>
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

