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

// Strategy detection with strict anti-false-breakout and RSI filtering
export function checkMomentum(
  candles: Candle[],
  analysis: MarketAnalysis
): { dir: Direction; reason: string; strategy: StrategyName } | null {
  if (candles.length < 5) return null;
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const pprev = candles[candles.length - 3];

  // Must have volume confirmation (at least 20% above average)
  if (last.volume < analysis.volumeAvg * 1.2) return null;

  // Bullish momentum: breakout above previous 2 highs, RSI healthy (not overbought > 75)
  if (
    last.close > prev.high &&
    last.close > pprev.high &&
    analysis.rsi < 75 &&
    analysis.rsi > 45 &&
    last.close > analysis.ema21
  ) {
    return {
      dir: 'LONG',
      reason: `Импульсный пробой 2 свечей с объемом x${(last.volume / analysis.volumeAvg).toFixed(1)} (RSI ${analysis.rsi.toFixed(0)})`,
      strategy: 'MOMENTUM',
    };
  }

  // Bearish momentum: breakout below previous 2 lows, RSI not oversold < 25
  if (
    last.close < prev.low &&
    last.close < pprev.low &&
    analysis.rsi > 25 &&
    analysis.rsi < 55 &&
    last.close < analysis.ema21
  ) {
    return {
      dir: 'SHORT',
      reason: `Медвежий импульс с объемом x${(last.volume / analysis.volumeAvg).toFixed(1)} (RSI ${analysis.rsi.toFixed(0)})`,
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

  // Bullish VWAP bounce: low tested VWAP, closed above it with bullish candle body
  if (
    price > vw &&
    last.low <= vw * 1.0015 &&
    last.close > last.open &&
    analysis.trend === 'up' &&
    analysis.rsi > 40 &&
    analysis.rsi < 70
  ) {
    return {
      dir: 'LONG',
      reason: 'Чистый отскок от институционального уровня VWAP вверх по тренду',
      strategy: 'VWAP',
    };
  }

  // Bearish VWAP rejection: high tested VWAP, closed below with bearish candle
  if (
    price < vw &&
    last.high >= vw * 0.9985 &&
    last.close < last.open &&
    analysis.trend === 'down' &&
    analysis.rsi < 60 &&
    analysis.rsi > 30
  ) {
    return {
      dir: 'SHORT',
      reason: 'Отбой от линии VWAP вниз в сторону нисходящего тренда',
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

  if (last.volume < analysis.volumeAvg * 1.3) return null;

  if (last.close > hh && last.open <= hh && analysis.rsi < 78) {
    return {
      dir: 'LONG',
      reason: `Истинный пробой 20-барного диапазона (${hh.toFixed(2)}) с повышенным объемом`,
      strategy: 'BREAK',
    };
  }

  if (last.close < ll && last.open >= ll && analysis.rsi > 22) {
    return {
      dir: 'SHORT',
      reason: `Пробой поддержки 20-барного диапазона (${ll.toFixed(2)}) вниз`,
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

  // Bullish pullback: price in uptrend (e9 > e21), dipped to touch e9 or e21, closed green
  if (
    e9 > e21 &&
    last.low <= e9 * 1.001 &&
    last.close > last.open &&
    analysis.rsi > 45 &&
    analysis.rsi < 68
  ) {
    return {
      dir: 'LONG',
      reason: 'Откат к бычьей скользящей EMA-9 с формированием разворотной свечи',
      strategy: 'PULLBACK',
    };
  }

  // Bearish pullback: price in downtrend (e9 < e21), rallied to test e9, closed red
  if (
    e9 < e21 &&
    last.high >= e9 * 0.999 &&
    last.close < last.open &&
    analysis.rsi < 55 &&
    analysis.rsi > 32
  ) {
    return {
      dir: 'SHORT',
      reason: 'Тест сопротивления EMA-9 в нисходящем тренде и возврат продавцов',
      strategy: 'PULLBACK',
    };
  }

  return null;
}
