# Audio Analysis Metrics

This document explains how to use the audio analysis metrics system for monitoring audio processing performance in Grafana and Prometheus.

## Overview

The audio metrics system tracks:
- **Request duration**: How long audio analysis takes (up to 20 minutes)
- **Audio file duration**: Length of audio being processed
- **Success/error rates**: Track failures and success patterns
- **Processing patterns**: Identify bottlenecks and performance trends

## Available Metrics

### HTTP Request Metrics
- `http_requests_total`: Total HTTP requests with method, route, status labels
- `http_request_duration_seconds`: Request duration histogram (up to 10 minutes)
- `http_errors_total`: Error count with error type labels

### Audio-Specific Metrics
- `audio_analysis_requests_total`: Audio analysis request counter
- `audio_analysis_duration_seconds`: Audio processing duration histogram (up to 20 minutes)

## Usage in API Routes

### Basic Usage

```typescript
import { startAudioAnalysisTimer } from '@/app/lib/audioMetrics'

export async function POST(request: NextRequest) {
  // Start timing
  const audioTimer = startAudioAnalysisTimer()
  
  // Estimate audio duration (from file size or actual duration)
  const audioDurationSeconds = 30 // or calculate from audio file
  
  try {
    // Your audio processing logic here
    const result = await processAudio()
    
    // Record success
    audioTimer.end(audioDurationSeconds, 'success')
    return NextResponse.json(result)
    
  } catch (error) {
    // Record error
    audioTimer.end(audioDurationSeconds, 'error')
    throw error
  }
}
```

### Advanced Usage

```typescript
import { trackAudioAnalysis } from '@/app/lib/audioMetrics'

// Manual tracking
trackAudioAnalysis(
  audioDurationSeconds,    // Length of audio file
  processingDurationSeconds, // How long processing took
  'success'                // or 'error'
)
```

## Grafana Dashboard Queries

### Request Rate
```
rate(http_requests_total[5m])
```

### Error Rate
```
rate(http_errors_total[5m])
```

### Audio Analysis Rate
```
rate(audio_analysis_requests_total[5m])
```

### Latency Percentiles
```
# 95th percentile
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# 99th percentile  
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

### Audio Processing Percentiles
```
# 95th percentile audio processing time
histogram_quantile(0.95, rate(audio_analysis_duration_seconds_bucket[5m]))

# 99th percentile audio processing time
histogram_quantile(0.99, rate(audio_analysis_duration_seconds_bucket[5m]))
```

### Long-Running Requests
```
# Requests taking more than 30 seconds
sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m])) - 
sum(rate(http_request_duration_seconds_bucket{le="30"}[5m]))

# Requests taking more than 60 seconds
sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m])) - 
sum(rate(http_request_duration_seconds_bucket{le="60"}[5m]))
```

### Audio Analysis by Duration
```
# Group by audio duration buckets
sum(rate(audio_analysis_requests_total[5m])) by (audio_duration_seconds)
```

## Bucket Configuration

### HTTP Request Duration Buckets
- 0.1s, 0.3s, 0.5s, 1s, 3s, 5s, 10s, 30s, 60s, 120s, 300s, 600s (up to 10 minutes)

### Audio Analysis Duration Buckets  
- 1s, 5s, 10s, 30s, 60s, 120s, 300s, 600s, 900s, 1200s (up to 20 minutes)

## Example Grafana Dashboard Panels

1. **Request Rate**: Line chart showing requests per second
2. **Error Rate**: Line chart showing error percentage
3. **Latency Percentiles**: Line chart with 50th, 95th, 99th percentiles
4. **Audio Processing Time**: Histogram showing processing time distribution
5. **Long-Running Requests**: Gauge showing count of requests >60s
6. **Audio Analysis Success Rate**: Gauge showing success percentage

## Prometheus Configuration

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'school-ai-app'
    scrape_interval: 15s
    static_configs:
      - targets: ['your-app-url:3000']
    metrics_path: '/api/metrics'
```

## Accessing Metrics

- **Metrics endpoint**: `GET /api/metrics`
- **Content-Type**: `text/plain; version=0.0.4; charset=utf-8`
- **Format**: Prometheus exposition format

## Implementation Status

✅ **Completed**:
- Basic HTTP metrics with extended buckets (up to 10 minutes)
- Audio-specific metrics with extended buckets (up to 20 minutes)
- Metrics wrapper for App Router
- Implementation in pronunciation analysis route (`/api/analysis/pronunciation`)
- Implementation in scripted analysis route (`/api/analysis/scripted`)
- Implementation in unscripted analysis route (`/api/analysis/unscripted`)
- Implementation in video assignment analysis route (`/api/analyze-video-assignment`)
- Grafana query examples

🔄 **Next Steps**:
- Add metrics to remaining audio analysis routes (transcribe)
- Create Grafana dashboard JSON
- Add more granular audio metrics (file size, format, etc.)
- Add business metrics (user activity, assignment completion rates)
