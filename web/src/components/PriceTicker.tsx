import React, { useState, useEffect } from 'react';
import type { PriceData } from '../types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PriceTickerProps {
  prices?: PriceData;
  financials?: {
    btc_usd: number;
    btc_change_24h: number;
    usd_inr: number;
  };
}

export const PriceTicker: React.FC<PriceTickerProps> = ({ prices, financials }) => {
  const brentVal = prices?.brent?.value || 84.50;
  const brentChange = prices?.brent?.change24h || -1.20;
  const wtiVal = prices?.wti?.value || 80.20;
  const wtiChange = prices?.wti?.change24h || 0.40;

  // Fallback-only snapshot, used solely when the live ingest feed hasn't populated
  // `prices` yet. Dated 2026-07-20 (source: goodreturns.in / PSU OMC-published retail
  // rates). Retail fuel prices move ~daily — this is a last-resort placeholder, not a
  // maintained "current" value. The badges below only claim TIER A/TIER B when the
  // value actually came from a live fetch.
  const petrolIsLive = Boolean(prices?.indiaRetail?.petrol?.mumbai);
  const dieselIsLive = Boolean(prices?.indiaRetail?.diesel?.mumbai);
  const petrolRate = prices?.indiaRetail?.petrol?.mumbai || 111.21;
  const dieselRate = prices?.indiaRetail?.diesel?.mumbai || 97.83;

  // BTC/USD and USD/INR ARE fetched live elsewhere (CoinGecko / open.er-api via
  // ingest/index.js) — these constants are last-resort fallbacks only, used when
  // `financials` hasn't loaded from the server yet.
  const btcIsLive = Boolean(financials?.btc_usd);
  const usdInrIsLive = Boolean(financials?.usd_inr);
  const btcUsd = financials?.btc_usd || 64120.00;
  const btcChange = financials?.btc_change_24h || 0.0;
  const usdInr = financials?.usd_inr || 83.43;

  const [sysTime, setSysTime] = useState<string>("05:47:24Z");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSysTime(now.toISOString().substring(11, 19) + "Z");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#080d19] border border-cyan-900/60 p-4 flex flex-col justify-between font-mono rounded space-y-4">
      {/* Top Section: Energy Markets */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h2 className="text-xs font-bold text-cyan-400 tracking-wider">ENERGY MARKETS & DOMESTIC PUMP INDEX</h2>
        {prices?.asOf ? (
          <span className="text-[10px] text-slate-500 font-bold">{prices.asOf}</span>
        ) : (
          <span
            className="px-1 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold tracking-wider"
            title="Live price feed has not loaded yet — figures below are static fallbacks"
          >
            AWAITING FEED
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Brent & WTI */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-[11px] text-slate-400 font-bold">BRENT CRUDE SPOT</span>
            <span className="text-[11px] text-slate-400 font-bold">WTI CRUDE SPOT</span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">${brentVal.toFixed(2)}</span>
              <span className={`text-xs font-bold ${brentChange < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {brentChange < 0 ? `▼ ${Math.abs(brentChange)}%` : `▲ ${brentChange}%`}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">${wtiVal.toFixed(2)}</span>
              <span className={`text-xs font-bold ${wtiChange < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {wtiChange < 0 ? `▼ ${Math.abs(wtiChange)}%` : `▲ ${wtiChange}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Domestic Retail Index */}
        <div className="bg-[#0b1322] p-3 rounded border border-slate-800 space-y-1.5">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">DOMESTIC RETAIL PUMP INDEX</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between items-center text-[9px] mb-0.5">
                <span className="text-slate-400">PETROL (MUMBAI)</span>
                {petrolIsLive ? (
                  <span
                    className="px-1 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded"
                    title="Tier A: live-fetched retail price"
                  >
                    TIER A
                  </span>
                ) : (
                  <span
                    className="px-1 py-0.2 bg-slate-500/20 text-slate-400 border border-slate-500/30 rounded"
                    title="Static fallback snapshot dated 2026-07-20 — not live"
                  >
                    TIER C · EST
                  </span>
                )}
              </div>
              <div className="text-lg font-black text-white">₹{petrolRate.toFixed(2)}</div>
            </div>
            <div>
              <div className="flex justify-between items-center text-[9px] mb-0.5">
                <span className="text-slate-400">DIESEL (MUMBAI)</span>
                {dieselIsLive ? (
                  <span
                    className="px-1 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded"
                    title="Tier B: periodic/dated retail price"
                  >
                    TIER B
                  </span>
                ) : (
                  <span
                    className="px-1 py-0.2 bg-slate-500/20 text-slate-400 border border-slate-500/30 rounded"
                    title="Static fallback snapshot dated 2026-07-20 — not live"
                  >
                    TIER C · EST
                  </span>
                )}
              </div>
              <div className="text-lg font-black text-white">₹{dieselRate.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Fixed Telemetry Status Bar */}
      <div className="bg-[#04070d] border border-cyan-900/80 px-4 py-2 rounded text-[10px] font-mono flex flex-wrap items-center justify-between gap-4 text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SYSTEM_TIME: <strong className="text-white">{sysTime}</strong></span>
          </div>
          <span title="Static reference coordinate — not a live position/GPS feed">
            REF (NEW DELHI, OPS HQ): <strong className="text-cyan-300">28.6139N, 77.2090E</strong>
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div
            className="flex items-center gap-1"
            title={btcIsLive ? "Tier A: live-fetched (CoinGecko)" : "Static fallback — not live"}
          >
            <span className="text-slate-400 font-bold">BTC/USD</span>
            <span className="text-emerald-400 font-bold">${btcUsd.toLocaleString()}</span>
            {!btcIsLive && <span className="text-[8px] text-slate-500 font-bold uppercase">(EST)</span>}
            {btcChange >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
          </div>

          <div
            className="flex items-center gap-1"
            title={usdInrIsLive ? "Tier A: live-fetched (open.er-api.com)" : "Static fallback — not live"}
          >
            <span className="text-slate-400 font-bold">USD/INR</span>
            <span className="text-cyan-300 font-bold">₹{usdInr.toFixed(2)}</span>
            {!usdInrIsLive && <span className="text-[8px] text-slate-500 font-bold uppercase">(EST)</span>}
            <TrendingDown className="w-3 h-3 text-cyan-400" />
          </div>

          <span className="text-slate-600">v4.2.1-TAC_ALPHA</span>
        </div>
      </div>
    </div>
  );
};
