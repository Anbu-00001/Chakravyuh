import React, { useState, useEffect } from 'react';
import { Newspaper } from 'lucide-react';
import type { NewsArticle } from '../types';

interface NewsFeedProps {
  news: NewsArticle[];
}

function timeAgo(dateStr: string): string {
  if (!dateStr || dateStr === 'Just now') return 'Just now';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ news }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-[#080d19] border border-cyan-900/60 p-4 h-[220px] flex flex-col justify-between font-mono rounded">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold text-cyan-400 tracking-wider">GDELT LIVE INTEL FEED</h2>
        </div>
        <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          {news.length} ARTICLES
        </span>
      </div>

      <div className="overflow-y-auto space-y-3 pr-1 flex-1">
        {news.map((item, idx) => (
          <div key={idx} className="space-y-1 text-xs">
            <div className="flex items-baseline gap-2">
              <span className="text-slate-500 font-bold text-[11px] shrink-0 w-[60px]">
                {timeAgo(item.publishedAt || item.seennow)}
              </span>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-slate-200 hover:text-cyan-400 font-medium transition-colors line-clamp-1"
              >
                {item.title}
              </a>
            </div>

            <div className="flex items-center gap-4 text-[10px] pl-[60px]">
              <span className="text-slate-500 uppercase">SOURCE: {item.source}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
