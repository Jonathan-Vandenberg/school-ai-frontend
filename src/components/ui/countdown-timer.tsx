"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  startedAt: string | Date;
  timeLimitMinutes: number;
  isActive?: boolean;
  className?: string;
  showIcon?: boolean;
  warningThreshold?: number; // seconds when to show warning color
  onTimeUp?: () => void;
}

export function CountdownTimer({
  startedAt,
  timeLimitMinutes,
  isActive = true,
  className = "",
  showIcon = true,
  warningThreshold = 300, // 5 minutes
  onTimeUp
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!isActive || !timeLimitMinutes || timeLimitMinutes <= 0) {
      setTimeRemaining(null);
      return;
    }

    const calculateTimeRemaining = () => {
      const sessionStartTime = new Date(startedAt).getTime();
      const sessionDuration = timeLimitMinutes * 60 * 1000;
      const elapsed = Date.now() - sessionStartTime;
      const remaining = Math.max(0, sessionDuration - elapsed);
      
      // Debug logging
      console.log('CountdownTimer calculation:', {
        startedAt,
        timeLimitMinutes,
        sessionStartTime: new Date(sessionStartTime).toISOString(),
        sessionDuration,
        elapsed,
        remaining: Math.floor(remaining / 1000)
      });
      
      return Math.floor(remaining / 1000);
    };

    // Initial calculation
    const initialTime = calculateTimeRemaining();
    setTimeRemaining(initialTime);

    if (initialTime <= 0 && onTimeUp) {
      onTimeUp();
      return;
    }

    // Update timer every second
    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        if (onTimeUp) {
          onTimeUp();
        }
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startedAt, timeLimitMinutes, isActive, onTimeUp]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive || timeRemaining === null) {
    return null;
  }

  const isWarning = timeRemaining <= warningThreshold;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {showIcon && (
        <Clock className={`h-4 w-4 ${isWarning ? 'text-red-500' : ''}`} />
      )}
      <span 
        className={`font-mono ${isWarning ? 'text-red-500 font-semibold' : ''}`}
      >
        {formatTime(timeRemaining)}
      </span>
    </div>
  );
} 