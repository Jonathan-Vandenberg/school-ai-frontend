import { audioAnalysisCounter, audioAnalysisDuration } from "@/app/lib/metrics";

/**
 * Track audio analysis metrics
 * Use this in your audio analysis API routes to automatically track
 * audio-specific metrics for Grafana dashboards
 */
export function trackAudioAnalysis(
  audioDurationSeconds: number,
  processingDurationSeconds: number,
  status: 'success' | 'error' = 'success'
) {
  // Round audio duration to nearest 10 seconds for better grouping
  const audioDurationBucket = Math.round(audioDurationSeconds / 10) * 10;
  
  // Increment counter
  audioAnalysisCounter
    .labels(status, audioDurationBucket.toString())
    .inc();
  
  // Record processing duration
  audioAnalysisDuration
    .labels(audioDurationBucket.toString(), status)
    .observe(processingDurationSeconds);
}

/**
 * Helper to measure audio analysis processing time
 * Usage:
 * const timer = startAudioAnalysisTimer();
 * // ... do audio analysis ...
 * timer.end(audioDurationSeconds, 'success');
 */
export function startAudioAnalysisTimer() {
  const startTime = Date.now();
  
  return {
    end: (audioDurationSeconds: number, status: 'success' | 'error' = 'success') => {
      const processingDuration = (Date.now() - startTime) / 1000;
      trackAudioAnalysis(audioDurationSeconds, processingDuration, status);
    }
  };
}
