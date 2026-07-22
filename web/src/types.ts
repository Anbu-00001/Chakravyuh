export interface Vessel {
  mmsi: string;
  name: string;
  type: string;
  flag?: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  destination: string;
  lastUpdated: string;
  isLiveAIS: boolean;
}

export interface SPRSite {
  id: string;
  name: string;
  state: string;
  capacity_mmt: number;
  capacity_million_barrels: number;
  current_fill_pct: number;
  coordinates: [number, number];
  status: string;
  source: string;
}

export interface Refinery {
  id: string;
  name: string;
  capacity_mmtpa: number;
  coordinates: [number, number];
  port: string;
  hormuz_dependency_pct: number;
  tier: string;
}

export interface Chokepoint {
  id: string;
  name: string;
  coordinates: [number, number];
  status: string;
  status_detail: string;
  normal_daily_tankers: number;
  current_daily_tankers: number;
  risk_level: string;
}

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  seennow: string;
  publishedAt: string;
  topic: string;
}

export interface PriceData {
  asOf: string;
  brent: {
    value: number;
    unit: string;
    change24h: number;
    tier: string;
  };
  wti: {
    value: number;
    unit: string;
    change24h: number;
    tier: string;
  };
  indiaRetail: {
    petrol: Record<string, number>;
    diesel: Record<string, number>;
    unit: string;
    tier: string;
  };
}

export interface CountryBaseline {
  name: string;
  crude_import_dependency_pct: number;
  spr_capacity_mmt: number;
  spr_cover_full_days: number;
  spr_cover_typical_days: number;
  omc_commercial_stock_days: number;
  total_buffer_days: number;
  buffer_range_days: [number, number];
  diversified_source_countries: number;
  last_updated: string;
  source: string;
}

export interface SeedData {
  country_baseline: CountryBaseline;
  spr_sites: SPRSite[];
  refineries: Refinery[];
  chokepoints: Chokepoint[];
  timeline_anchors: Array<{
    date: string;
    title: string;
    description: string;
    severity: string;
  }>;
}
