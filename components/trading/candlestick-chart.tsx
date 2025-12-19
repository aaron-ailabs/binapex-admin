
"use client"

import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import React, { useEffect, useRef, useState } from 'react';

interface CandleData {
    time: string
    open: number
    high: number
    low: number
    close: number
}

interface ChartProps {
  data?: CandleData[] // Optional now as it fetches internal
  symbol?: string; // e.g. "BTC-USD"
}

export const CandlestickChart = ({ symbol = "BTC-USD", data }: ChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. INITIALIZE CHART
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#000000' }, // Deep Black
        textColor: '#D4AF37', // Royal Gold Text
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#333',
      },
      rightPriceScale: {
        borderColor: '#333',
      },
    });

    // 2. CONFIGURE SERIES (Deep Royal Gold Theme) - Using v5 API
    const newSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#D4AF37',        // Gold for Bullish
      downColor: '#000000',      // Black for Bearish
      borderUpColor: '#D4AF37',  // Gold Border
      borderDownColor: '#D4AF37',// Gold Border (Hollow look)
      wickUpColor: '#D4AF37',
      wickDownColor: '#D4AF37',
    });

    chartRef.current = chart;
    seriesRef.current = newSeries as ISeriesApi<"Candlestick">;

    // 3. UPDATE SERIES DATA
    if (data && data.length > 0) {
        // Sort by time to ensure lightweight-charts doesn't error on unsorted data
        const sortedData = [...data].sort((a, b) => {
            const timeA = typeof a.time === 'string' ? new Date(a.time).getTime() : a.time;
            const timeB = typeof b.time === 'string' ? new Date(b.time).getTime() : b.time;
            return timeA - timeB;
        });

        const chartData: CandlestickData[] = sortedData.map(d => ({
            time: d.time as Time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close
        }));

        newSeries.setData(chartData);
    }

    // 4. HANDLE RESIZE
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [symbol, data]);

  return (
    <div className="w-full h-full bg-black border border-white/10 rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-[#D4AF37]">{symbol}</span>
            <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded">1D</span>
        </div>
        <div className="text-xl font-mono text-white">
            ${currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '---'}
        </div>
      </div>
      
      {/* Chart Container */}
      <div ref={chartContainerRef} className="flex-1 w-full relative" />
      
      {/* Timeframe Selector (Static for MVP) */}
      <div className="flex gap-2 px-4 py-2 bg-black border-t border-white/10 text-xs">
        {['1H', '1D', '1W', '1M', '1Y'].map((tf) => (
            <button 
                key={tf} 
                className={`px-3 py-1 rounded ${tf === '1D' ? 'bg-[#D4AF37] text-black font-bold' : 'text-gray-500 hover:text-white'}`}
            >
                {tf}
            </button>
        ))}
      </div>
    </div>
  );
}
