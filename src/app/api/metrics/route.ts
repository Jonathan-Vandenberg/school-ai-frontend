import { NextRequest, NextResponse } from "next/server";
import { register } from "@/app/lib/metrics";

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
