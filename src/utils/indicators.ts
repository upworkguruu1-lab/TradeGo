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

// Refined Pullback Strategy: requires decisive candlestick rejection and protects against RSI exhaustion
export function checkPullback(
  candles: Candle[],
  analysis: MarketAnalysis
): { dir: Direction; reason: string; strategy: StrategyName } | null {
  if (candles.length < 20) return null;
  const last = candles[candles.length - 1];
  const e9 = analysis.ema9;
  const e21 = analysis.ema21;

  const candleRange = Math.max(0.0001, last.high - last.low);
  const bodySize = Math.abs(last.close - last.open);
  const isDecisiveBody = bodySize >= 0.30 * candleRange;

  // Bullish pullback:
  // 1. Established uptrend (e9 > e21 and close > EMA50)
  // 2. Tested EMA-9/21 from above and formed a solid green rejection candle
  // 3. Healthy RSI (44-60), avoiding buying into overbought tops
  // 4. Trend momentum: ADX >= 20
  if (
    e9 > e21 &&
    last.close > analysis.ema50 &&
    last.low <= e9 * 1.002 &&
    last.close > last.open &&
    isDecisiveBody &&
    analysis.rsi >= 44 &&
    analysis.rsi <= 60 &&
    analysis.adx >= 20
  ) {
    return {
      dir: 'LONG',
      reason: `Подтвержденный отбой от EMA-9/21 бычьей свечой (RSI ${analysis.rsi.toFixed(0)}, ADX ${analysis.adx.toFixed(0)})`,
      strategy: 'PULLBACK',
    };
  }

  // Bearish pullback:
  // 1. Established downtrend (e9 < e21 and close < EMA50)
  // 2. Tested EMA-9/21 from below with upper rejection wick and formed solid red candle
  // 3. Healthy RSI (40-56), STRICTLY avoiding shorting oversold exhaustion bottoms (RSI < 40)
  // 4. Trend momentum: ADX >= 20
  if (
    e9 < e21 &&
    last.close < analysis.ema50 &&
    last.high >= e9 * 0.998 &&
    last.close < last.open &&
    isDecisiveBody &&
    analysis.rsi >= 40 &&
    analysis.rsi <= 56 &&
    analysis.adx >= 20
  ) {
    return {
      dir: 'SHORT',
      reason: `Отбой от сопротивления EMA-9/21 медвежьей свечой (RSI ${analysis.rsi.toFixed(0)}, ADX ${analysis.adx.toFixed(0)})`,
      strategy: 'PULLBACK',
    };
  }

  return null;
}

// Calculate structural Stop Loss and Take Profit with dynamic 5M swing & volatility adaptation (tailored for PAXG & Crypto)
export function calculateStructuralSlTp(
  candles: Candle[],
  entry: number,
  dir: Direction,
  atrVal: number,
  slMult = 1.3,
  tpMult = 1.6,
  timeframe = '5m',
  symbol = 'PAXGUSDT'
): { sl: number; tp: number; rrRatio: number; targetGainPct: number } {
  // On 5m, lookback for local swing pivots is 8 to 12 candles
  const lookback = timeframe === '5m' ? 10 : 8;
  const recentBars = candles.slice(-lookback);

  // Is this a precious metal / low % volatility asset?
  const isGold = symbol.toUpperCase().includes('PAXG') || symbol.toUpperCase().includes('XAU');

  // Realistic noise floor: for gold 1.1x - 1.4x ATR is standard breathing room
  const minSlDist = atrVal * Math.max(isGold ? 1.05 : 1.2, slMult);
  const maxSlDist = atrVal * (isGold ? 1.8 : 2.5);

  if (dir === 'LONG') {
    // Find dynamic swing low
    const swingLow = Math.min(...recentBars.map((c) => c.low));
    let slDist = entry - swingLow + atrVal * (isGold ? 0.15 : 0.25);
    slDist = Math.max(minSlDist, Math.min(maxSlDist, slDist));

    const sl = entry - slDist;
    // Dynamic Take Profit: for gold, target 1.2x to 1.8x ATR so profits are realistically achieved
    const targetRr = isGold
      ? Math.max(1.1, tpMult / Math.max(1, slMult * 0.9))
      : Math.max(1.4, tpMult / Math.max(1, slMult));
    const tp = entry + slDist * targetRr;
    const rrRatio = (tp - entry) / slDist;
    const targetGainPct = ((tp - entry) / entry) * 100;

    return { sl, tp, rrRatio, targetGainPct };
  } else {
    // Find dynamic swing high
    const swingHigh = Math.max(...recentBars.map((c) => c.high));
    let slDist = swingHigh - entry + atrVal * (isGold ? 0.15 : 0.25);
    slDist = Math.max(minSlDist, Math.min(maxSlDist, slDist));

    const sl = entry + slDist;
    const targetRr = isGold
      ? Math.max(1.1, tpMult / Math.max(1, slMult * 0.9))
      : Math.max(1.4, tpMult / Math.max(1, slMult));
    const tp = entry - slDist * targetRr;
    const rrRatio = (entry - tp) / slDist;
    const targetGainPct = ((entry - tp) / entry) * 100;

    return { sl, tp, rrRatio, targetGainPct };
  }
}

// Resample 5m candles into 15m (factor 3) or 1h (factor 12)
export function resampleCandles(candles: Candle[], factor = 3): Candle[] {
  if (candles.length === 0) return [];
  const resampled: Candle[] = [];
  for (let i = 0; i < candles.length; i += factor) {
    const chunk = candles.slice(i, i + factor);
    if (chunk.length === 0) continue;
    const open = chunk[0].open;
    const close = chunk[chunk.length - 1].close;
    const high = Math.max(...chunk.map((c) => c.high));
    const low = Math.min(...chunk.map((c) => c.low));
    const volume = chunk.reduce((acc, c) => acc + c.volume, 0);
    const quoteVolume = chunk.reduce((acc, c) => acc + (c.quoteVolume || 0), 0);
    resampled.push({
      t: chunk[0].t,
      open,
      high,
      low,
      close,
      volume,
      quoteVolume,
      closed: chunk.length === factor,
    });
  }
  return resampled;
}

export interface HtfTrendAnalysis {
  dir: 'UP' | 'DOWN' | 'NEUTRAL';
  emaFast: number;
  emaSlow: number;
  adx: number;
  isBullish: boolean;
  isBearish: boolean;
  isNeutral: boolean;
  desc: string;
}

// Calculate Higher Timeframe (15M / 1H) Trend Confluence
export function getHigherTimeframeTrend(candles: Candle[], factor = 3): HtfTrendAnalysis {
  if (candles.length < 25) {
    return {
      dir: 'NEUTRAL',
      emaFast: 0,
      emaSlow: 0,
      adx: 0,
      isBullish: false,
      isBearish: false,
      isNeutral: true,
      desc: 'Накопление данных (менее 25 свечей)',
    };
  }

  const htfCandles = resampleCandles(candles, factor);
  const lastPrice = candles[candles.length - 1].close;

  // If resampled bars are few, use higher periods on 5M (EMA 60 and EMA 150)
  if (htfCandles.length < 16) {
    const eFast = ema(candles, 60);
    const eSlow = ema(candles, 150);
    const ef = eFast[eFast.length - 1] ?? lastPrice;
    const es = eSlow[eSlow.length - 1] ?? lastPrice;
    const distPct = ((ef - es) / es) * 100;

    if (distPct > 0.04 && lastPrice > ef) {
      return {
        dir: 'UP',
        emaFast: ef,
        emaSlow: es,
        adx: 24,
        isBullish: true,
        isBearish: false,
        isNeutral: false,
        desc: '15M Старший тренд ВОСХОДЯЩИЙ (EMA-60 > EMA-150)',
      };
    } else if (distPct < -0.04 && lastPrice < ef) {
      return {
        dir: 'DOWN',
        emaFast: ef,
        emaSlow: es,
        adx: 24,
        isBullish: false,
        isBearish: true,
        isNeutral: false,
        desc: '15M Старший тренд НИСХОДЯЩИЙ (EMA-60 < EMA-150)',
      };
    }
    return {
      dir: 'NEUTRAL',
      emaFast: ef,
      emaSlow: es,
      adx: 14,
      isBullish: false,
      isBearish: false,
      isNeutral: true,
      desc: '15M Старший тренд НЕЙТРАЛЬНЫЙ (Боковик)',
    };
  }

  const eFast = ema(htfCandles, 20);
  const eSlow = ema(htfCandles, 50);
  const adxVals = adx(htfCandles, 14);
  const lastBar = htfCandles[htfCandles.length - 1];
  const ef = eFast[eFast.length - 1] ?? lastBar.close;
  const es = eSlow[eSlow.length - 1] ?? lastBar.close;
  const htfAdx = adxVals[adxVals.length - 1] ?? 18;

  const distPct = ((ef - es) / es) * 100;
  if (ef > es && lastPrice >= es * 0.999 && (distPct > 0.03 || htfAdx >= 18)) {
    return {
      dir: 'UP',
      emaFast: ef,
      emaSlow: es,
      adx: htfAdx,
      isBullish: true,
      isBearish: false,
      isNeutral: false,
      desc: `15M Тренд ВОСХОДЯЩИЙ (ADX ${htfAdx.toFixed(0)}, EMA20 > EMA50)`,
    };
  } else if (ef < es && lastPrice <= es * 1.001 && (distPct < -0.03 || htfAdx >= 18)) {
    return {
      dir: 'DOWN',
      emaFast: ef,
      emaSlow: es,
      adx: htfAdx,
      isBullish: false,
      isBearish: true,
      isNeutral: false,
      desc: `15M Тренд НИСХОДЯЩИЙ (ADX ${htfAdx.toFixed(0)}, EMA20 < EMA50)`,
    };
  }

  return {
    dir: 'NEUTRAL',
    emaFast: ef,
    emaSlow: es,
    adx: htfAdx,
    isBullish: false,
    isBearish: false,
    isNeutral: true,
    desc: '15M Тренд НЕЙТРАЛЬНЫЙ (Боковой распил)',
  };
}

// Parabolic ATR Trailing Stop calculation
export function calculateParabolicAtrStop(
  entry: number,
  currentPrice: number,
  highestPrice: number,
  lowestPrice: number,
  dir: Direction,
  atrVal: number,
  currentSl: number,
  feeRatePct = 0.05
): { newSl: number; trailingActivated: boolean; breakEvenDone: boolean; reason: string } {
  const isLong = dir === 'LONG';
  const minProfitCover = feeRatePct * 2.2; // покрыть двойную комиссию с запасом (+0.11%)

  if (isLong) {
    const gainPct = ((currentPrice - entry) / entry) * 100;
    const peakGainPct = ((highestPrice - entry) / entry) * 100;

    let targetSl = currentSl;
    let breakEvenDone = false;
    let trailingActivated = false;
    let reason = '';

    // Step 1: Early Break-Even upon reaching +0.25% profit
    if (gainPct >= 0.25 && targetSl < entry * (1 + minProfitCover / 100)) {
      targetSl = entry * (1 + minProfitCover / 100);
      breakEvenDone = true;
      reason = 'Безубыток перенесен (+0.11% с учетом комиссии)';
    }

    // Step 2: Parabolic ATR trailing once price moves >= +0.40%
    if (peakGainPct >= 0.40) {
      trailingActivated = true;
      // Acceleration: starts at 1.3x ATR and tightens to 0.75x ATR as profit grows
      const af = Math.max(0.75, 1.3 - Math.min(0.55, (peakGainPct - 0.40) * 0.4));
      const parabolicStop = highestPrice - atrVal * af;
      if (parabolicStop > targetSl) {
        targetSl = parabolicStop;
        reason = `Параболик ATR трейлинг (${af.toFixed(2)}x ATR)`;
      }
    }

    return {
      newSl: Math.max(currentSl, targetSl),
      trailingActivated,
      breakEvenDone,
      reason,
    };
  } else {
    // SHORT logic
    const gainPct = ((entry - currentPrice) / entry) * 100;
    const peakGainPct = ((entry - lowestPrice) / entry) * 100;

    let targetSl = currentSl;
    let breakEvenDone = false;
    let trailingActivated = false;
    let reason = '';

    if (gainPct >= 0.25 && targetSl > entry * (1 - minProfitCover / 100)) {
      targetSl = entry * (1 - minProfitCover / 100);
      breakEvenDone = true;
      reason = 'Безубыток перенесен (-0.11% с учетом комиссии)';
    }

    if (peakGainPct >= 0.40) {
      trailingActivated = true;
      const af = Math.max(0.75, 1.3 - Math.min(0.55, (peakGainPct - 0.40) * 0.4));
      const parabolicStop = lowestPrice + atrVal * af;
      if (parabolicStop < targetSl) {
        targetSl = parabolicStop;
        reason = `Параболик ATR трейлинг (${af.toFixed(2)}x ATR)`;
      }
    }

    return {
      newSl: Math.min(currentSl, targetSl),
      trailingActivated,
      breakEvenDone,
      reason,
    };
  }
}

export interface MarketRegimeInfo {
  regime: 'TREND_STRONG' | 'TREND_MODERATE' | 'CHOP_SIDEWAYS' | 'SQUEEZE_FLAT';
  isFavorable: boolean;
  label: string;
  badgeColor: string;
  reason: string;
}

// Market Regime & Volatility Squeeze Classifier
export function getMarketRegime(candles: Candle[], analysis: MarketAnalysis): MarketRegimeInfo {
  const emaFast = analysis.ema21;
  const emaSlow = analysis.ema50;
  const emaDistPct = (Math.abs(emaFast - emaSlow) / emaSlow) * 100;

  // Squeeze or dead flat
  if (analysis.bbWidth < 0.26 || analysis.adx < 15) {
    return {
      regime: 'SQUEEZE_FLAT',
      isFavorable: false,
      label: 'Сжатие / Штиль',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      reason: 'Волатильность экстремально низкая (ADX < 15). Торги заблокированы от ложных выносов.',
    };
  }

  // Sideways chop: EMAs tangled, ADX < 19
  if (emaDistPct < 0.05 && analysis.adx < 19) {
    return {
      regime: 'CHOP_SIDEWAYS',
      isFavorable: false,
      label: 'Боковой распил',
      badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      reason: 'Скользящие EMA сплетены, направленного тренда нет. Вход в сделки запрещен.',
    };
  }

  // Strong trend
  if (analysis.adx >= 24 && emaDistPct >= 0.07) {
    return {
      regime: 'TREND_STRONG',
      isFavorable: true,
      label: 'Сильный тренд',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      reason: `Благоприятная фаза для скальпинга (ADX ${analysis.adx.toFixed(0)}, тренд EMA ${emaDistPct.toFixed(2)}%).`,
    };
  }

  return {
    regime: 'TREND_MODERATE',
    isFavorable: true,
    label: 'Умеренный тренд',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    reason: 'Допустимый тренд с достаточным объемом. Входы разрешены с параболическим трейлингом.',
  };
}


