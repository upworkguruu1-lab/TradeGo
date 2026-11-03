export type Timeframe = '1m' | '5m' | '15m' | '1h';

export interface Candle {
  t: number;          // timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  closed?: boolean;
}

export type Direction = 'LONG' | 'SHORT';
export type StrategyName = 'MOMENTUM' | 'VWAP' | 'BREAK' | 'PULLBACK';
export type MarketMode = 'TREND_UP' | 'TREND_DOWN' | 'RANGE' | 'SQUEEZE' | 'MIXED';

export interface MarketAnalysis {
  mode: MarketMode;
  adx: number;
  trend: 'up' | 'down';
  spread: number;
  bbWidth: number;
  ema9: number;
  ema21: number;
  ema50: number;
  vwap: number;
  atr: number;
  rsi: number;
  volumeAvg: number;
}

export interface TradeSignal {
  id: string;
  dir: Direction;
  symbol: string;
  entry: number;
  sl: number;
  tp: number;
  strategy: StrategyName;
  reason: string;
  time: number;
  expiresAt: number;     // TTL timestamp
  rrRatio: number;       // Reward-to-Risk ratio e.g. 2.4
  confidence: number;    // 0-100% score
  analysis: MarketAnalysis;
}

export interface UserPosition {
  id: string;
  dir: Direction;
  symbol: string;
  entry: number;
  currentPrice: number;
  sl: number;
  tp: number;
  initialSl: number;
  strategy: StrategyName;
  reason: string;
  sizeUsd: number;       // Margin allocated
  contracts: number;     // e.g. 0.05 BTC
  leverage: number;
  feeRate: number;       // e.g. 0.05% per side
  entryTime: number;
  maxProfitPct: number;
  layer1Done: boolean;
  layer2Done: boolean;   // Break-even moved
}

export interface ClosedTrade {
  id: string;
  dir: Direction;
  symbol: string;
  entry: number;
  exit: number;
  sl: number;
  tp: number;
  strategy: StrategyName;
  reason: string;
  pnlGrossPct: number;
  feePct: number;
  pnlNetPct: number;
  pnlUsd: number;
  entryTime: number;
  exitTime: number;
  durationSec: number;
  isUserTrade?: boolean;
}

export interface TerminalSettings {
  symbol: string;
  timeframe: Timeframe;
  botMode: 'turbo' | 'standard' | 'safe';
  marketType: 'spot' | 'futures';   // 'spot' = 1x leverage, only LONG; 'futures' = leverage, LONG & SHORT
  depositUsd: number;
  riskPct: number;
  leverage: number;
  feeRatePct: number;      // e.g. 0.05%
  slAtr: number;
  tpAtr: number;
  useSound: boolean;
  useVoice: boolean;
  usePushNotifications: boolean;
  autoCopy: boolean;
  signalTtlSec: number;
  cooldownSec: number;     // cooldown between trades in seconds
  maxPositions: number;    // max concurrent positions
  activeStrategies: Record<StrategyName, boolean>;
}

export interface MLState {
  enabled: boolean;
  warmUpDone: boolean;
  params: {
    slMult: number;
    tpMult: number;
    riskPct: number;
    adxMin: number;
    spreadMax: number;
    strategyWeights: Record<StrategyName, number>;
  };
  strategyPerformance: Record<
    StrategyName,
    {
      total: { w: number; l: number; pnl: number };
      byAdxHigh: { w: number; l: number; pnl: number };
      byAdxLow: { w: number; l: number; pnl: number };
      byTrendUp: { w: number; l: number; pnl: number };
      byTrendDown: { w: number; l: number; pnl: number };
      bySpreadWide: { w: number; l: number; pnl: number };
      bySpreadNarrow: { w: number; l: number; pnl: number };
    }
  >;
  slHistory: { mult: number; pnl: number }[];
  tpHistory: { mult: number; pnl: number }[];
}

export interface DaySummary {
  date: string; // YYYY-MM-DD
  trades: number;
  wins: number;
  losses: number;
  pnlNetPct: number;
  pnlUsd: number;
  history: ClosedTrade[];
}
