import { collectDefaultMetrics, register, Histogram, Counter, Gauge } from "prom-client";
import { NextRequest, NextResponse } from "next/server";

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

/**
 * GET /api/metrics
 * Prometheus metrics endpoint for Grafana and monitoring
 * Returns metrics in Prometheus exposition format
 * 
 * Available metrics:
 * - http_requests_total: Total HTTP requests with method, route, status labels
 * - http_request_duration_seconds: Request duration histogram (up to 10 minutes)
 * - http_active_connections: Current active connections (gauge)
 * - http_errors_total: Error count with error type labels
 * - audio_analysis_requests_total: Audio analysis request counter with status and duration labels
 * - audio_analysis_duration_seconds: Audio processing duration histogram (up to 20 minutes)
 * - Default Node.js metrics: memory, CPU, event loop, etc.
 * 
 * Grafana Dashboard Queries:
 * - Request rate: rate(http_requests_total[5m])
 * - Error rate: rate(http_errors_total[5m])
 * - 95th percentile latency: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
 * - 99th percentile latency: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
 * - Audio analysis requests (>30s): sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m])) - sum(rate(http_request_duration_seconds_bucket{le="30"}[5m]))
 * - Long-running requests (>60s): sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m])) - sum(rate(http_request_duration_seconds_bucket{le="60"}[5m]))
 * - Audio analysis rate: rate(audio_analysis_requests_total[5m])
 * - Audio analysis 95th percentile: histogram_quantile(0.95, rate(audio_analysis_duration_seconds_bucket[5m]))
 * - Audio analysis 99th percentile: histogram_quantile(0.99, rate(audio_analysis_duration_seconds_bucket[5m]))
 * - Memory usage: nodejs_heap_size_used_bytes
 */
export async function GET(request: NextRequest) {
  try {
    // Get all metrics in Prometheus format
    const metrics = await register.metrics();
    
    // Return metrics with proper content type for Prometheus
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error collecting metrics:", error);
    
    // Return error response
    return new NextResponse("Error collecting metrics", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}
