import { collectDefaultMetrics, register, Histogram, Counter, Gauge } from "prom-client";

// Collect default Node.js metrics (memory, CPU, etc.)
collectDefaultMetrics({ register });

// HTTP request counter metric
export const httpRequestCounter = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

// HTTP request duration histogram
export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.1, 0.3, 0.5, 1, 3, 5, 10, 30, 60, 120, 300, 600], // Extended buckets for audio analysis (up to 10 minutes)
});

// Active connections gauge
export const activeConnections = new Gauge({
  name: "http_active_connections",
  help: "Number of active HTTP connections",
});

// Error rate counter
export const errorCounter = new Counter({
  name: "http_errors_total",
  help: "Total number of HTTP errors",
  labelNames: ["method", "route", "status", "error_type"],
});

// Audio analysis specific metrics
export const audioAnalysisCounter = new Counter({
  name: "audio_analysis_requests_total",
  help: "Total number of audio analysis requests",
  labelNames: ["status", "audio_duration_seconds"],
});

export const audioAnalysisDuration = new Histogram({
  name: "audio_analysis_duration_seconds",
  help: "Duration of audio analysis processing in seconds",
  labelNames: ["audio_duration_seconds", "status"],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600, 900, 1200], // Up to 20 minutes for very long audio files
});

// Export the register for the metrics endpoint
export { register };
