import { Candle, Direction, MarketAnalysis, StrategyName } from '../types/trading';

export function sma(candles: Candle[], n: number): (number | null)[] {
  const res: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < n - 1) {
      res.push(null);
      continue;
    }
    let s = 0;
    for (let j = 0; j < n; j++) s += candles[i - j].close;
    res.push(s / n);
  }
  return res;
}

export function ema(candles: Candle[], n: number): (number | null)[] {
  const res: (number | null)[] = [];
  const k = 2 / (n + 1);
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      res.push(candles[0].close);
      continue;
    }
    const prev = res[i - 1] ?? candles[i].close;
    res.push(candles[i].close * k + prev * (1 - k));
  }
  return res;
}

export function atr(candles: Candle[], n = 14): (number | null)[] {
  const res: (number | null)[] = [];
  let prevAtr = 0;
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      prevAtr = candles[0].high - candles[0].low;
      res.push(prevAtr);
      continue;
    }
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    if (i < n) {
      prevAtr = (prevAtr * i + tr) / (i + 1);
      res.push(prevAtr);
    } else {
      prevAtr = (prevAtr * (n - 1) + tr) / n;
      res.push(prevAtr);
    }
  }
  return res;
}

export function vwap(candles: Candle[]): (number | null)[] {
  let cumPV = 0;
  let cumV = 0;
  return candles.map((c) => {
    const tp = (c.high + c.low + c.close) / 3;
    const vol = c.volume > 0 ? c.volume : 1;
    cumPV += tp * vol;
    cumV += vol;
    return cumV > 0 ? cumPV / cumV : c.close;
  });
}

export function bollingerBands(candles: Candle[], n = 20, k = 2) {
  const mid = sma(candles, n);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const width: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    const m = mid[i];
    if (m === null || i < n - 1) {
      upper.push(null);
      lower.push(null);
      width.push(0);
      continue;
    }
    let s = 0;
    for (let j = 0; j < n; j++) {
      s += Math.pow(candles[i - j].close - m, 2);
    }
    const std = Math.sqrt(s / n);
    const u = m + k * std;
    const l = m - k * std;
    upper.push(u);
    lower.push(l);
    width.push(((u - l) / m) * 100);
  }
  return { mid, upper, lower, width };
}

export function rsi(candles: Candle[], n = 14): (number | null)[] {
  const res: (number | null)[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      res.push(50);
      continue;
    }
    const change = candles[i].close - candles[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= n) {
      avgGain += gain / n;
      avgLoss += loss / n;
      if (i === n) {
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        res.push(100 - 100 / (1 + rs));
      } else {
        res.push(50);
      }
    } else {
      avgGain = (avgGain * (n - 1) + gain) / n;
      avgLoss = (avgLoss * (n - 1) + loss) / n;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      res.push(100 - 100 / (1 + rs));
    }
  }
  return res;
}

export function adx(candles: Candle[], n = 14): (number | null)[] {
  if (candles.length < n + 2) return candles.map(() => 0);
  const dx: (number | null)[] = [];
  let plusDM = 0;
  let minusDM = 0;
  let trSum = 0;

  for (let i = 1; i < candles.length; i++) {
    const up = candles[i].high - candles[i - 1].high;
    const down = candles[i - 1].low - candles[i].low;
    const pdm = up > down && up > 0 ? up : 0;
    const mdm = down > up && down > 0 ? down : 0;
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );

    if (i <= n) {
      plusDM += pdm;
      minusDM += mdm;
      trSum += tr;
    } else {
      plusDM = (plusDM * (n - 1) + pdm) / n;
      minusDM = (minusDM * (n - 1) + mdm) / n;
      trSum = (trSum * (n - 1) + tr) / n;
    }

    if (i >= n && trSum > 0) {
      const pdi = (100 * plusDM) / trSum;
      const mdi = (100 * minusDM) / trSum;
      const sum = pdi + mdi;
      dx.push(sum === 0 ? 0 : (Math.abs(pdi - mdi) / sum) * 100);
    } else {
      dx.push(null);
    }
  }
  dx.unshift(null);

  const adxArr: (number | null)[] = [];
  let smoothedAdx = 0;
  for (let i = 0; i < dx.length; i++) {
    if (i < n || dx[i] === null) {
      adxArr.push(null);
      continue;
    }
    if (i === n) {
      const valid = dx.slice(1, n + 1).filter((v): v is number => v !== null);
      smoothedAdx = valid.reduce((a, b) => a + b, 0) / (valid.length || 1);
      adxArr.push(smoothedAdx);
    } else {
      smoothedAdx = (smoothedAdx * (n - 1) + (dx[i] ?? 0)) / n;
      adxArr.push(smoothedAdx);
    }
  }
  return adxArr;
}

export function analyzeMarket(candles: Candle[]): MarketAnalysis {
  if (candles.length < 35) {
    const p = candles.length > 0 ? candles[candles.length - 1].close : 100;
    return {
      mode: 'MIXED',
      adx: 18,
      trend: 'up',
      spread: 0.05,
      bbWidth: 1.2,
      ema9: p,
      ema21: p,
      ema50: p,
      vwap: p,
      atr: p * 0.005,
      rsi: 50,
      volumeAvg: 100,
    };
  }

  const ema9Arr = ema(candles, 9);
  const ema21Arr = ema(candles, 21);
  const ema50Arr = ema(candles, 50);
  const atrArr = atr(candles, 14);
  const adxArr = adx(candles, 14);
  const bb = bollingerBands(candles, 20, 2);
  const vwapArr = vwap(candles);
  const rsiArr = rsi(candles, 14);

  const lastIdx = candles.length - 1;
  const lastCandle = candles[lastIdx];
  const price = lastCandle.close;

  const ema9Val = ema9Arr[lastIdx] ?? price;
  const ema21Val = ema21Arr[lastIdx] ?? price;
  const ema50Val = ema50Arr[lastIdx] ?? price;
  const atrVal = atrArr[lastIdx] ?? price * 0.005;
  const adxVal = adxArr[lastIdx] ?? 20;
  const vwapVal = vwapArr[lastIdx] ?? price;
  const rsiVal = rsiArr[lastIdx] ?? 50;
  const bbWidth = bb.width[lastIdx] ?? 1.0;

  const spread = ((lastCandle.high - lastCandle.low) / price) * 100;
  const last20Vol = candles.slice(-20);
  const volumeAvg =
    last20Vol.reduce((acc, c) => acc + c.volume, 0) / (last20Vol.length || 1);

  const aboveEma50 = price > ema50Val;
  const distEma50 = Math.abs(price - ema50Val) / price * 100;

  let mode: MarketAnalysis['mode'] = 'MIXED';
  if (adxVal > 24 && distEma50 > 0.15) {
    mode = aboveEma50 ? 'TREND_UP' : 'TREND_DOWN';
  } else if (bbWidth < 0.6 && adxVal < 20) {
    mode = 'SQUEEZE';
  } else if (adxVal < 18 && distEma50 < 0.12) {
    mode = 'RANGE';
  }

  return {
    mode,
    adx: adxVal,
    trend: aboveEma50 ? 'up' : 'down',
    spread,
    bbWidth,
    ema9: ema9Val,
    ema21: ema21Val,
    ema50: ema50Val,
    vwap: vwapVal,
    atr: atrVal,
    rsi: rsiVal,
    volumeAvg,
  };
}

// Strategy detection with strict trend alignment, candle body validation, and anti-noise filters
export function checkMomentum(
  candles: Candle[],
  analysis: MarketAnalysis
): { dir: Direction; reason: string; strategy: StrategyName } | null {
  if (candles.length < 5) return null;
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const pprev = candles[candles.length - 3];

  const bodySize = Math.abs(last.close - last.open);
  const candleRange = Math.max(0.0001, last.high - last.low);

  // Must have volume confirmation (at least 15% above average)
  if (last.volume < analysis.volumeAvg * 1.15) return null;

  // Bullish momentum:
  // 1. In established uptrend: price > EMA50 and EMA21 >= EMA50
  // 2. Strong green candle body (conviction, not a topping wick)
  // 3. Breakout above previous 2 highs
  // 4. Healthy RSI (48-68, not overbought > 70)
  // 5. Active trend strength: ADX >= 18
  if (
    last.close > last.open &&
    bodySize >= 0.35 * candleRange &&
    last.close > prev.high &&
    last.close > pprev.high &&
    last.close > analysis.ema50 &&
    analysis.ema21 >= analysis.ema50 &&
    analysis.rsi >= 48 &&
    analysis.rsi <= 68 &&
    analysis.adx >= 18
  ) {
    return {
      dir: 'LONG',
      reason: `Трендовый импульс вверх с объемом x${(last.volume / analysis.volumeAvg).toFixed(1)} (RSI ${analysis.rsi.toFixed(0)}, ADX ${analysis.adx.toFixed(0)})`,
      strategy: 'MOMENTUM',
    };
  }

  // Bearish momentum:
  if (
    last.close < last.open &&
    bodySize >= 0.35 * candleRange &&
    last.close < prev.low &&
    last.close < pprev.low &&
    last.close < analysis.ema50 &&
    analysis.ema21 <= analysis.ema50 &&
    analysis.rsi >= 32 &&
    analysis.rsi <= 52 &&
    analysis.adx >= 18
  ) {
    return {
      dir: 'SHORT',
      reason: `Импульсный пробой вниз по тренду с объемом x${(last.volume / analysis.volumeAvg).toFixed(1)} (RSI ${analysis.rsi.toFixed(0)})`,
      strategy: 'MOMENTUM',
    };
  }

  return null;
}

export function checkVwap(
  candles: Candle[],
  analysis: MarketAnalysis
): { dir: Direction; reason: string; strategy: StrategyName } | null {
  if (candles.length < 25) return null;
  const last = candles[candles.length - 1];
  const price = last.close;
  const vw = analysis.vwap;

  // Bullish VWAP bounce:
  // Price in uptrend (above EMA50), tested VWAP from above, formed strong green rejection candle
  if (
    price > vw &&
    last.low <= vw * 1.002 &&
    last.close > last.open &&
    price > analysis.ema50 &&
    analysis.rsi >= 42 &&
    analysis.rsi <= 68
  ) {
    return {
      dir: 'LONG',
      reason: 'Отскок от институциональной линии VWAP в сторону восходящего тренда',
      strategy: 'VWAP',
    };
  }

  // Bearish VWAP rejection:
  if (
    price < vw &&
    last.high >= vw * 0.998 &&
    last.close < last.open &&
    price < analysis.ema50 &&
    analysis.rsi >= 32 &&
    analysis.rsi <= 58
  ) {
    return {
      dir: 'SHORT',
      reason: 'Отбой от сопротивления VWAP вниз по нисходящему тренду',
      strategy: 'VWAP',
    };
  }

  return null;
}

export function checkBreak(
  candles: Candle[],
  analysis: MarketAnalysis
): { dir: Direction; reason: string; strategy: StrategyName } | null {
  if (candles.length < 25) return null;
  const last = candles[candles.length - 1];
  const range = candles.slice(-21, -1);
  const hh = Math.max(...range.map((c) => c.high));
  const ll = Math.min(...range.map((c) => c.low));

  if (last.volume < analysis.volumeAvg * 1.25) return null;

  if (
    last.close > hh &&
    last.close > last.open &&
    last.close > analysis.ema50 &&
    analysis.rsi >= 50 &&
    analysis.rsi <= 72
  ) {
    return {
      dir: 'LONG',
      reason: `Истинный пробой диапазона (${hh.toFixed(2)}) с импульсным объемом x${(last.volume / analysis.volumeAvg).toFixed(1)}`,
      strategy: 'BREAK',
    };
  }

  if (
    last.close < ll &&
    last.close < last.open &&
    last.close < analysis.ema50 &&
    analysis.rsi >= 28 &&
    analysis.rsi <= 50
  ) {
    return {
      dir: 'SHORT',
      reason: `Пробой поддержки диапазона (${ll.toFixed(2)}) вниз на объеме`,
      strategy: 'BREAK',
    };
  }

  return null;
}

export function checkPullback(
  candles: Candle[],
  analysis: MarketAnalysis
): { dir: Direction; reason: string; strategy: StrategyName } | null {
  if (candles.length < 20) return null;
  const last = candles[candles.length - 1];
  const e9 = analysis.ema9;
  const e21 = analysis.ema21;

  // Bullish pullback: price in strong uptrend (e9 > e21 and price > EMA50), dipped to test e9/e21, closed green
  if (
    e9 > e21 &&
    last.close > analysis.ema50 &&
    last.low <= e9 * 1.002 &&
    last.close > last.open &&
    analysis.rsi >= 46 &&
    analysis.rsi <= 66
  ) {
    return {
      dir: 'LONG',
      reason: 'Откат к трендовой EMA-9/21 и подтверждение разворота бычьей свечой',
      strategy: 'PULLBACK',
    };
  }

  // Bearish pullback:
  if (
    e9 < e21 &&
    last.close < analysis.ema50 &&
    last.high >= e9 * 0.998 &&
    last.close < last.open &&
    analysis.rsi >= 34 &&
    analysis.rsi <= 54
  ) {
    return {
      dir: 'SHORT',
      reason: 'Тест сопротивления EMA-9/21 в нисходящем тренде и возврат продавцов',
      strategy: 'PULLBACK',
    };
  }

  return null;
}

// Calculate structural Stop Loss and Take Profit with dynamic 5M swing & volatility adaptation
export function calculateStructuralSlTp(
  candles: Candle[],
  entry: number,
  dir: Direction,
  atrVal: number,
  slMult = 1.4,
  tpMult = 2.4,
  timeframe = '5m'
): { sl: number; tp: number; rrRatio: number; targetGainPct: number } {
  // On 5m, the ideal lookback for local swing pivots is 8 to 12 candles (40-60 min)
  const lookback = timeframe === '5m' ? 10 : 8;
  const recentBars = candles.slice(-lookback);

  // Dynamic noise floor based on 5m ATR: minimum 1.3x ATR to never get stopped by normal wicks
  const minSlDist = atrVal * Math.max(1.3, slMult);
  const maxSlDist = atrVal * 2.5;

  if (dir === 'LONG') {
    // Find dynamic swing low
    const swingLow = Math.min(...recentBars.map((c) => c.low));
    // Buffer below swing low
    let slDist = entry - swingLow + atrVal * 0.25;
    slDist = Math.max(minSlDist, Math.min(maxSlDist, slDist));

    const sl = entry - slDist;
    // Dynamic Take Profit: target at least 1.8x to 2.4x the distance of the stop
    const targetRr = Math.max(1.8, tpMult / Math.max(1, slMult));
    const tp = entry + slDist * targetRr;
    const rrRatio = (tp - entry) / slDist;
    const targetGainPct = ((tp - entry) / entry) * 100;

    return { sl, tp, rrRatio, targetGainPct };
  } else {
    // Find dynamic swing high
    const swingHigh = Math.max(...recentBars.map((c) => c.high));
    let slDist = swingHigh - entry + atrVal * 0.25;
    slDist = Math.max(minSlDist, Math.min(maxSlDist, slDist));

    const sl = entry + slDist;
    const targetRr = Math.max(1.8, tpMult / Math.max(1, slMult));
    const tp = entry - slDist * targetRr;
    const rrRatio = (entry - tp) / slDist;
    const targetGainPct = ((entry - tp) / entry) * 100;

    return { sl, tp, rrRatio, targetGainPct };
  }
}

