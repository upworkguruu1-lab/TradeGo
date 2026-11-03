import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Candle, Direction, Timeframe, TradeSignal, UserPosition } from '../types/trading';
import { ema, vwap, bollingerBands } from '../utils/indicators';
import { ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff } from 'lucide-react';

interface ChartCanvasProps {
  candles: Candle[];
  timeframe: Timeframe;
  symbol: string;
  activeSignal?: TradeSignal | null;
  activePositions: UserPosition[];
  onTimeframeChange: (tf: Timeframe) => void;
  decimals?: number;
}

export const ChartCanvas: React.FC<ChartCanvasProps> = ({
  candles,
  timeframe,
  symbol,
  activeSignal,
  activePositions,
  onTimeframeChange,
  decimals = 2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOffset, setZoomOffset] = useState(0); // 0 = rightmost (latest candles)
  const [showIndicators, setShowIndicators] = useState({
    ema: true,
    vwap: true,
    bb: false,
  });

  const [crosshair, setCrosshair] = useState<{
    x: number;
    y: number;
    visible: boolean;
    candle: Candle | null;
    price: number | null;
  }>({ x: 0, y: 0, visible: false, candle: null, price: null });

  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);

  const formatPrice = useCallback(
    (p: number) => {
      return p.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    },
    [decimals]
  );

  const renderChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Reset transform & clear
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Dark sleek background
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, width, height);

    const padding = { top: 35, right: 75, bottom: 50, left: 10 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Visible candle calculation
    const total = candles.length;
    const minVisible = 20;
    const maxVisible = 250;
    const visibleCount = Math.max(
      minVisible,
      Math.min(maxVisible, Math.floor(total / zoomScale))
    );

    // Max scroll offset
    const maxOffset = Math.max(0, total - visibleCount);
    const startIndex = Math.max(
      0,
      Math.min(maxOffset, Math.floor(zoomOffset * maxOffset))
    );
    const endIndex = Math.min(total, startIndex + visibleCount);
    const visibleCandles = candles.slice(startIndex, endIndex);

    if (visibleCandles.length < 2) return;

    // Price bounds
    let maxPrice = Math.max(...visibleCandles.map((c) => c.high));
    let minPrice = Math.min(...visibleCandles.map((c) => c.low));

    // Pad price range by 5%
    const priceDelta = maxPrice - minPrice || 1;
    maxPrice += priceDelta * 0.05;
    minPrice -= priceDelta * 0.05;
    const priceRange = maxPrice - minPrice;

    const candleSlotW = chartW / visibleCandles.length;
    const candleBarW = Math.max(2, candleSlotW * 0.72);

    const getY = (p: number) =>
      padding.top + (1 - (p - minPrice) / priceRange) * chartH;
    const getX = (idx: number) =>
      padding.left + idx * candleSlotW + candleSlotW / 2;

    // Horizontal Price Grid Lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#172033';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';

    const gridSteps = 6;
    for (let i = 0; i <= gridSteps; i++) {
      const y = padding.top + (chartH / gridSteps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const pVal = maxPrice - (priceRange / gridSteps) * i;
      ctx.fillText(formatPrice(pVal), width - padding.right + 8, y + 3.5);
    }

    // Time Grid Lines
    const timeSteps = Math.min(6, visibleCandles.length);
    const stepIdx = Math.max(1, Math.floor(visibleCandles.length / timeSteps));
    for (let i = 0; i < visibleCandles.length; i += stepIdx) {
      const c = visibleCandles[i];
      const x = getX(i);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();

      const d = new Date(c.t);
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
      ctx.textAlign = 'center';
      ctx.fillText(timeStr, x, height - padding.bottom + 18);
    }

    // Technical Indicators
    if (showIndicators.bb) {
      const bb = bollingerBands(candles, 20, 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#334155';
      ctx.setLineDash([3, 3]);

      // Upper BB
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < visibleCandles.length; i++) {
        const val = bb.upper[startIndex + i];
        if (val == null) continue;
        const x = getX(i);
        const y = getY(val);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Lower BB
      ctx.beginPath();
      started = false;
      for (let i = 0; i < visibleCandles.length; i++) {
        const val = bb.lower[startIndex + i];
        if (val == null) continue;
        const x = getX(i);
        const y = getY(val);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (showIndicators.ema) {
      const ema9 = ema(candles, 9);
      const ema21 = ema(candles, 21);
      const ema50 = ema(candles, 50);

      const drawEma = (arr: (number | null)[], color: string, w = 1.5) => {
        ctx.lineWidth = w;
        ctx.strokeStyle = color;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < visibleCandles.length; i++) {
          const val = arr[startIndex + i];
          if (val == null) continue;
          const x = getX(i);
          const y = getY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      };

      drawEma(ema9, '#f59e0b', 1.5); // EMA 9 Gold
      drawEma(ema21, '#06b6d4', 1.5); // EMA 21 Cyan
      drawEma(ema50, '#a855f7', 1.5); // EMA 50 Purple
    }

    if (showIndicators.vwap) {
      const vw = vwap(candles);
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#ec4899'; // Pink VWAP
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < visibleCandles.length; i++) {
        const val = vw[startIndex + i];
        if (val == null) continue;
        const x = getX(i);
        const y = getY(val);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Volume Bars (bottom 18% of chart)
    const maxVol = Math.max(...visibleCandles.map((c) => c.volume), 1);
    const volAreaH = chartH * 0.18;
    const volBaseY = height - padding.bottom;

    for (let i = 0; i < visibleCandles.length; i++) {
      const c = visibleCandles[i];
      const isUp = c.close >= c.open;
      const x = getX(i);
      const vH = (c.volume / maxVol) * volAreaH;

      ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)';
      ctx.fillRect(x - candleBarW / 2, volBaseY - vH, candleBarW, vH);
    }

    // Candlesticks (Wicks and Bodies)
    for (let i = 0; i < visibleCandles.length; i++) {
      const c = visibleCandles[i];
      const x = getX(i);
      const isUp = c.close >= c.open;
      const color = isUp ? '#10b981' : '#ef4444';

      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;

      // Wick
      const yHigh = getY(c.high);
      const yLow = getY(c.low);
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // Body
      const yOpen = getY(c.open);
      const yClose = getY(c.close);
      const bodyTop = Math.min(yOpen, yClose);
      const bodyH = Math.max(1.5, Math.abs(yClose - yOpen));

      ctx.fillRect(x - candleBarW / 2, bodyTop, candleBarW, bodyH);
    }

    // Current Price Pulsing Guideline
    const latestCandle = candles[candles.length - 1];
    if (latestCandle) {
      const curY = getY(latestCandle.close);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, curY);
      ctx.lineTo(width - padding.right, curY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price Tag in Axis
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(width - padding.right, curY - 9, padding.right - 4, 18);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(formatPrice(latestCandle.close), width - padding.right + 5, curY + 3.5);
    }

    // Draw Active Positions & Signal Projections (SL / TP / Entry)
    const allOverlays: {
      type: 'signal' | 'position';
      dir: Direction;
      entry: number;
      sl: number;
      tp: number;
      label: string;
    }[] = [];

    if (activeSignal) {
      allOverlays.push({
        type: 'signal',
        dir: activeSignal.dir,
        entry: activeSignal.entry,
        sl: activeSignal.sl,
        tp: activeSignal.tp,
        label: `СИГНАЛ ${activeSignal.dir}`,
      });
    }

    for (const pos of activePositions) {
      allOverlays.push({
        type: 'position',
        dir: pos.dir,
        entry: pos.entry,
        sl: pos.sl,
        tp: pos.tp,
        label: `МОЯ СДЕЛКА ${pos.dir}`,
      });
    }

    allOverlays.forEach((item) => {
      // Entry line
      const yEntry = getY(item.entry);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, yEntry);
      ctx.lineTo(width - padding.right, yEntry);
      ctx.stroke();

      // SL line
      const ySl = getY(item.sl);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, ySl);
      ctx.lineTo(width - padding.right, ySl);
      ctx.stroke();

      // TP line
      const yTp = getY(item.tp);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(padding.left, yTp);
      ctx.lineTo(width - padding.right, yTp);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tags on left edge
      ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';

      // Entry badge
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(padding.left + 6, yEntry - 8, 80, 16);
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText(`Вход ${formatPrice(item.entry)}`, padding.left + 10, yEntry + 3.5);

      // TP badge
      ctx.fillStyle = '#10b981';
      ctx.fillRect(padding.left + 6, yTp - 8, 80, 16);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`TP ${formatPrice(item.tp)}`, padding.left + 10, yTp + 3.5);

      // SL badge
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(padding.left + 6, ySl - 8, 80, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`SL ${formatPrice(item.sl)}`, padding.left + 10, ySl + 3.5);
    });

    // Crosshair rendering
    if (crosshair.visible && crosshair.x > padding.left && crosshair.x < width - padding.right) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(crosshair.x, padding.top);
      ctx.lineTo(crosshair.x, height - padding.bottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(padding.left, crosshair.y);
      ctx.lineTo(width - padding.right, crosshair.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Crosshair Price Tag
      if (crosshair.price !== null) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(width - padding.right, crosshair.y - 9, padding.right - 4, 18);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(formatPrice(crosshair.price), width - padding.right + 6, crosshair.y + 3.5);
      }
    }
  }, [
    candles,
    zoomScale,
    zoomOffset,
    showIndicators,
    activeSignal,
    activePositions,
    crosshair,
    decimals,
    formatPrice,
  ]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      renderChart();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderChart]);

  // Re-render when dependencies change
  useEffect(() => {
    renderChart();
  }, [renderChart]);

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoomScale((prev) => Math.max(1, Math.min(10, prev * factor)));
  };

  // Mouse Drag Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = zoomOffset;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDraggingRef.current) {
      const dx = (e.clientX - dragStartXRef.current) / rect.width;
      setZoomOffset(Math.max(0, Math.min(1, dragStartOffsetRef.current - dx * 1.5)));
    }

    // Crosshair calculation
    const padding = { top: 35, right: 75, bottom: 50, left: 10 };
    const chartW = rect.width - padding.left - padding.right;
    const chartH = rect.height - padding.top - padding.bottom;

    if (x >= padding.left && x <= rect.width - padding.right && y >= padding.top && y <= rect.height - padding.bottom) {
      const total = candles.length;
      const visibleCount = Math.max(20, Math.min(250, Math.floor(total / zoomScale)));
      const maxOffset = Math.max(0, total - visibleCount);
      const startIndex = Math.max(0, Math.min(maxOffset, Math.floor(zoomOffset * maxOffset)));
      const visibleCandles = candles.slice(startIndex, startIndex + visibleCount);

      const slotW = chartW / visibleCandles.length;
      const relIdx = Math.floor((x - padding.left) / slotW);
      const candle = visibleCandles[relIdx] ?? null;

      // Price calculation
      let maxP = Math.max(...visibleCandles.map((c) => c.high));
      let minP = Math.min(...visibleCandles.map((c) => c.low));
      const delta = maxP - minP || 1;
      maxP += delta * 0.05;
      minP -= delta * 0.05;
      const price = maxP - ((y - padding.top) / chartH) * (maxP - minP);

      setCrosshair({
        x,
        y,
        visible: true,
        candle,
        price,
      });
    } else {
      setCrosshair((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const resetZoom = () => {
    setZoomScale(1);
    setZoomOffset(0);
  };

  const hoveredCandle = crosshair.visible && crosshair.candle ? crosshair.candle : candles[candles.length - 1];

  return (
    <div className="relative flex flex-col w-full h-full bg-[#0a0e1a] select-none overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur text-xs shrink-0 z-10">
        {/* Left: Quick Candlestick Metrics */}
        <div className="flex items-center gap-3 text-slate-400 font-mono">
          <span className="text-slate-200 font-bold tracking-wide">{symbol}</span>
          {hoveredCandle && (
            <div className="hidden sm:flex items-center gap-2.5 text-[11px]">
              <span>O: <b className="text-slate-200 font-normal">{formatPrice(hoveredCandle.open)}</b></span>
              <span>H: <b className="text-slate-200 font-normal">{formatPrice(hoveredCandle.high)}</b></span>
              <span>L: <b className="text-slate-200 font-normal">{formatPrice(hoveredCandle.low)}</b></span>
              <span>
                C:{' '}
                <b
                  className={`font-semibold ${
                    hoveredCandle.close >= hoveredCandle.open ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatPrice(hoveredCandle.close)}
                </b>
              </span>
              <span>Vol: <b className="text-slate-300 font-normal">{hoveredCandle.volume.toFixed(1)}</b></span>
            </div>
          )}
        </div>

        {/* Right: Timeframe Selectors & Tool buttons */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-800/80 rounded p-0.5 border border-slate-700/60">
            {(['1m', '5m', '15m', '1h'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-700/60 mx-1" />

          {/* Indicator Toggles */}
          <button
            onClick={() => setShowIndicators((p) => ({ ...p, ema: !p.ema }))}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors border ${
              showIndicators.ema
                ? 'bg-slate-800 text-amber-400 border-amber-500/30'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
            title="Экспоненциальные скользящие средние (EMA 9, 21, 50)"
          >
            EMA
          </button>
          <button
            onClick={() => setShowIndicators((p) => ({ ...p, vwap: !p.vwap }))}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors border ${
              showIndicators.vwap
                ? 'bg-slate-800 text-pink-400 border-pink-500/30'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
            title="Институциональный уровень VWAP"
          >
            VWAP
          </button>
          <button
            onClick={() => setShowIndicators((p) => ({ ...p, bb: !p.bb }))}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors border ${
              showIndicators.bb
                ? 'bg-slate-800 text-sky-400 border-sky-500/30'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
            title="Полосы Боллинджера (Bollinger Bands)"
          >
            BB
          </button>

          <div className="h-4 w-px bg-slate-700/60 mx-1" />

          {/* Zoom controls */}
          <button
            onClick={() => setZoomScale((s) => Math.min(10, s * 1.25))}
            className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800"
            title="Приблизить (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomScale((s) => Math.max(1, s * 0.8))}
            className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800"
            title="Отдалить (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetZoom}
            className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800"
            title="Сброс масштаба"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div
        ref={containerRef}
        className="flex-1 w-full h-full relative cursor-crosshair overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />

        {/* Legend Overlay */}
        <div className="absolute top-2 left-3 flex items-center gap-3 text-[10px] text-slate-400 pointer-events-none bg-slate-950/70 px-2 py-1 rounded border border-slate-800/60 backdrop-blur-sm">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-amber-500 inline-block rounded" /> EMA 9
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-cyan-400 inline-block rounded" /> EMA 21
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-purple-500 inline-block rounded" /> EMA 50
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-pink-500 inline-block rounded" /> VWAP
          </span>
        </div>
      </div>
    </div>
  );
};
