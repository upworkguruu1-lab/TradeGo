import { Candle, Timeframe } from '../types/trading';

export interface SymbolInfo {
  symbol: string;
  name: string;
  baseAsset: string;
  quoteAsset: string;
  decimals: number;
  basePrice: number;
}

export const SYMBOLS: Record<string, SymbolInfo> = {
  BTCUSDT: {
    symbol: 'BTCUSDT',
    name: 'Bitcoin',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    decimals: 2,
    basePrice: 68450,
  },
  ETHUSDT: {
    symbol: 'ETHUSDT',
    name: 'Ethereum',
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    decimals: 2,
    basePrice: 2540,
  },
  SOLUSDT: {
    symbol: 'SOLUSDT',
    name: 'Solana',
    baseAsset: 'SOL',
    quoteAsset: 'USDT',
    decimals: 2,
    basePrice: 178,
  },
  PAXGUSDT: {
    symbol: 'PAXGUSDT',
    name: 'Gold (Pax Gold)',
    baseAsset: 'PAXG',
    quoteAsset: 'USDT',
    decimals: 2,
    basePrice: 2740,
  },
  BNBUSDT: {
    symbol: 'BNBUSDT',
    name: 'BNB',
    baseAsset: 'BNB',
    quoteAsset: 'USDT',
    decimals: 2,
    basePrice: 585,
  },
  XRPUSDT: {
    symbol: 'XRPUSDT',
    name: 'XRP',
    baseAsset: 'XRP',
    quoteAsset: 'USDT',
    decimals: 4,
    basePrice: 0.582,
  },
};

export const INTERVAL_MS: Record<Timeframe, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
};

// Try public Binance endpoints
const API_ENDPOINTS = [
  'https://api.binance.com/api/v3',
  'https://data-api.binance.vision/api/v3',
];

export async function fetchKlines(
  symbol: string,
  interval: Timeframe,
  limit = 200
): Promise<Candle[]> {
  for (const endpoint of API_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(
        `${endpoint}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const raw = await res.json();
        if (Array.isArray(raw) && raw.length > 0) {
          return raw.map((d: (string | number)[]) => ({
            t: Number(d[0]),
            open: Number(d[1]),
            high: Number(d[2]),
            low: Number(d[3]),
            close: Number(d[4]),
            volume: Number(d[5]),
            quoteVolume: Number(d[7]),
            closed: true,
          }));
        }
      }
    } catch {
      // Try next endpoint or fallback
    }
  }

  // If endpoints failed (e.g. CORS or network restrictions in sandbox), generate realistic organic candles
  return generateSyntheticHistory(symbol, interval, limit);
}

function generateSyntheticHistory(
  symbol: string,
  interval: Timeframe,
  limit = 200
): Candle[] {
  const info = SYMBOLS[symbol] || SYMBOLS.PAXGUSDT;
  let currentPrice = info.basePrice;
  const stepMs = INTERVAL_MS[interval];
  const now = Date.now();
  const candles: Candle[] = [];

  // Volatility scale
  const volPct = symbol === 'BTCUSDT' ? 0.0025 : symbol === 'SOLUSDT' ? 0.004 : 0.0018;

  for (let i = limit; i >= 0; i--) {
    const t = now - i * stepMs;
    const change = (Math.random() - 0.49) * (currentPrice * volPct);
    const open = currentPrice;
    currentPrice = Math.max(1, open + change);
    const high = Math.max(open, currentPrice) + Math.random() * (open * volPct * 0.8);
    const low = Math.min(open, currentPrice) - Math.random() * (open * volPct * 0.8);
    const volume = 20 + Math.random() * 150;

    candles.push({
      t,
      open,
      high,
      low,
      close: currentPrice,
      volume,
      quoteVolume: volume * currentPrice,
      closed: true,
    });
  }

  return candles;
}

export class MarketStreamManager {
  private ws: WebSocket | null = null;
  private isDestroyed = false;
  private mockInterval: number | null = null;
  private lastPrice = 0;
  private currentCandle: Candle | null = null;

  constructor(
    private symbol: string,
    private interval: Timeframe,
    private onCandle: (candle: Candle) => void,
    private onStatus: (status: 'live' | 'demo' | 'connecting' | 'error') => void,
    initialCandles: Candle[] = []
  ) {
    if (initialCandles.length > 0) {
      const last = initialCandles[initialCandles.length - 1];
      this.currentCandle = { ...last };
      this.lastPrice = last.close;
    } else {
      this.lastPrice = (SYMBOLS[symbol] || SYMBOLS.PAXGUSDT).basePrice;
    }
  }

  public start() {
    this.isDestroyed = false;
    this.connectWs();
  }

  public stop() {
    this.isDestroyed = true;
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.onmessage = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }

  private connectWs() {
    if (this.isDestroyed) return;
    this.onStatus('connecting');

    const streamName = `${this.symbol.toLowerCase()}@kline_${this.interval}`;
    const wsUrl = `wss://stream.binance.com:9443/ws/${streamName}`;

    let opened = false;

    try {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      const connectTimeout = setTimeout(() => {
        if (!opened && !this.isDestroyed) {
          // Fallback to high-frequency synthetic ticks if WS doesn't connect quickly
          this.ws?.close();
          this.startMockStream('WS timeout, demo live-stream');
        }
      }, 5000);

      ws.onopen = () => {
        if (this.isDestroyed) {
          ws.close();
          return;
        }
        opened = true;
        clearTimeout(connectTimeout);
        this.onStatus('live');
      };

      ws.onmessage = (event) => {
        if (this.isDestroyed) return;
        try {
          const data = JSON.parse(event.data);
          if (data && data.k) {
            const k = data.k;
            const candle: Candle = {
              t: Number(k.t),
              open: Number(k.o),
              high: Number(k.h),
              low: Number(k.l),
              close: Number(k.c),
              volume: Number(k.v),
              quoteVolume: Number(k.q),
              closed: Boolean(k.x),
            };
            this.lastPrice = candle.close;
            this.currentCandle = candle;
            this.onCandle(candle);
          }
        } catch {}
      };

      ws.onerror = () => {
        if (this.isDestroyed) return;
        clearTimeout(connectTimeout);
        this.startMockStream('WS error, demo mode active');
      };

      ws.onclose = () => {
        if (this.isDestroyed) return;
        clearTimeout(connectTimeout);
        // If not intentionally destroyed, try mock stream
        this.startMockStream('WS disconnected');
      };
    } catch {
      this.startMockStream('WS init failed');
    }
  }

  private startMockStream(_reason: string) {
    if (this.isDestroyed || this.mockInterval) return;
    this.onStatus('demo');

    const stepMs = INTERVAL_MS[this.interval];

    this.mockInterval = window.setInterval(() => {
      if (this.isDestroyed) return;
      const now = Date.now();
      const info = SYMBOLS[this.symbol] || SYMBOLS.PAXGUSDT;
      const volRate = this.symbol === 'BTCUSDT' ? 0.0006 : 0.0009;

      const tickDelta = (Math.random() - 0.495) * (this.lastPrice * volRate);
      const newPrice = Math.max(0.01, this.lastPrice + tickDelta);
      this.lastPrice = newPrice;

      if (!this.currentCandle || now - this.currentCandle.t >= stepMs) {
        // New candle
        this.currentCandle = {
          t: Math.floor(now / stepMs) * stepMs,
          open: newPrice,
          high: newPrice,
          low: newPrice,
          close: newPrice,
          volume: Math.random() * 2 + 0.5,
          quoteVolume: (Math.random() * 2 + 0.5) * newPrice,
          closed: false,
        };
      } else {
        // Update current candle
        this.currentCandle = {
          ...this.currentCandle,
          high: Math.max(this.currentCandle.high, newPrice),
          low: Math.min(this.currentCandle.low, newPrice),
          close: newPrice,
          volume: this.currentCandle.volume + (Math.random() * 0.4 + 0.05),
          quoteVolume: this.currentCandle.quoteVolume + (Math.random() * 0.4 * newPrice),
          closed: false,
        };
      }

      this.onCandle(this.currentCandle);
    }, 1000);
  }
}
