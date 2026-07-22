/**
 * Chakravyuh Web API Configuration
 * Reads from environment variables (VITE_INGEST_API_URL & VITE_SIMULATE_API_URL) with localhost fallbacks.
 */

export const INGEST_API_URL = import.meta.env.VITE_INGEST_API_URL || 'http://localhost:5000';
export const SIMULATE_API_URL = import.meta.env.VITE_SIMULATE_API_URL || 'http://localhost:8000';
