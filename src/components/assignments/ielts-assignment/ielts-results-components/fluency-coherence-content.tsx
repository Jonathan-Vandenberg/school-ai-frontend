"use client";

import React, { useMemo } from 'react';
import { LineChart, Line, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';

interface Metrics {
  speech_rate: number;
  speech_rate_over_time: number[];
  pauses: number;
  filler_words: number;
  discourse_markers: Array<{
    text: string;
    start_index: number;
    end_index: number;
    description: string;
  }>;
  filler_words_per_min: number;
  pause_details: any[];
  repetitions: any[];
  filler_words_details: Array<{
    text: string;
    start_index: number;
    end_index: number;
    phonemes: string;
  }>;
}

interface FluencyCoherenceContentProps {
  metrics: Metrics;
}

export default function FluencyCoherenceContent({ metrics }: FluencyCoherenceContentProps) {
  // Extract speech rate over time data for the chart
  const speechRateData = useMemo(() => {
    try {
      let rateOverTime: number[] = [];
      
      if (metrics.speech_rate_over_time) {
        rateOverTime = metrics.speech_rate_over_time;
      }
      
      // If no data or only one point, return an empty array instead of creating dummy data
      if (!rateOverTime || rateOverTime.length <= 1) {
        return [];
      }
      
      // Convert to chart data format
      return rateOverTime.map((rate, index) => ({
        segment: index + 1,
        rate: rate
      }));
    } catch (error) {
      console.error('Error processing speech rate data:', error);
      return [];
    }
  }, [metrics]);

  // Calculate average speech rate for the reference line
  const averageSpeechRate = useMemo(() => {
    try {
      if (speechRateData.length === 0) return 0;
      const sum = speechRateData.reduce((acc, data) => acc + data.rate, 0);
      return Math.round(sum / speechRateData.length);
    } catch (error) {
      console.error('Error calculating average speech rate:', error);
      return 0;
    }
  }, [speechRateData]);

  return (
    <div className="mb-4">
      <h5 className="text-sm font-medium text-gray-700 mb-2">Speech Metrics</h5>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <span className="text-sm text-gray-500 block">Speech Rate</span>
          <span className="text-lg font-medium">{metrics.speech_rate} WPM</span>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <span className="text-sm text-gray-500 block">Pauses</span>
          <span className="text-lg font-medium">{metrics.pauses}</span>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <span className="text-sm text-gray-500 block">Filler Words</span>
          <span className="text-lg font-medium">{metrics.filler_words}</span>
        </div>
      </div>
      
      {/* Speech Rate Over Time Chart */}
      {speechRateData.length > 1 && (
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Speech Rate Over Time</h5>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={speechRateData}
                  margin={{
                    top: 10,
                    right: 50,
                    left: 20,
                    bottom: 30,
                  }}
                >
                  <defs>
                    <linearGradient id="colorSpeechRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#dbeafe" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <YAxis 
                    label={{ 
                      value: 'Words per Minute', 
                      angle: -90, 
                      position: 'insideLeft',
                      offset: 5,
                      style: { textAnchor: 'middle', fill: '#6b7280' } 
                    }} 
                    domain={[0, 'dataMax + 30']}
                    tick={{ fill: '#6b7280' }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}
                    labelFormatter={(label) => `Segment ${label}`}
                    formatter={(value) => [`${value} words/min`, 'Speaking Rate']}
                  />
                  {/* IELTS target range (120-150 WPM) */}
                  <svg>
                    <defs>
                      <pattern id="targetRange" width="100%" height="100%" patternUnits="userSpaceOnUse">
                        <rect width="100%" height="100%" fill="#16a34a" fillOpacity="0.15" />
                      </pattern>
                    </defs>
                  </svg>
                  <ReferenceArea y1={120} y2={150} fill="url(#targetRange)" />
                  
                  {/* Speech rate line */}
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={false}
                  />
                  
                  {/* Average user rate line */}
                  <ReferenceLine 
                    y={averageSpeechRate}
                    strokeDasharray="8 4"
                    stroke="#3b82f6"
                    label={{
                      position: 'right',
                      value: `${averageSpeechRate}`,
                      fill: '#3b82f6',
                      fontSize: 12
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-xs text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-100">
              <p className="mb-2">This chart shows how your speaking rate changed throughout your answer. Consistent rates without major drops or spikes indicate fluent speech.</p>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">IELTS target:</span> 120-150 words per minute (shown as green band)
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Filler Words Details */}
      {metrics.filler_words_details && metrics.filler_words_details.length > 0 && (
        <div className="mb-4">
          <h6 className="text-sm font-medium text-gray-700 mb-1">Filler Words Used</h6>
          <div className="flex flex-wrap gap-2">
            {metrics.filler_words_details.map((filler, index) => (
              <span key={index} className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-sm border border-orange-200">
                &quot;{filler.text}&quot;
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Filler words per minute: {metrics.filler_words_per_min.toFixed(1)}
          </p>
        </div>
      )}
      
      {/* Discourse Markers */}
      {metrics.discourse_markers && metrics.discourse_markers.length > 0 && (
        <div className="mb-4">
          <h6 className="text-sm font-medium text-gray-700 mb-1">Discourse Markers</h6>
          <div className="space-y-2">
            {metrics.discourse_markers.map((marker, index) => (
              <div key={index} className="bg-blue-50 p-2 rounded border border-blue-200">
                <span className="font-medium text-blue-800">&quot;{marker.text}&quot;</span>
                <span className="text-sm text-blue-600 ml-2">- {marker.description}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Discourse markers help organize your speech and improve coherence.
          </p>
        </div>
      )}

      {/* Repetitions (if any) */}
      {metrics.repetitions && metrics.repetitions.length > 0 && (
        <div className="mb-4">
          <h6 className="text-sm font-medium text-gray-700 mb-1">Repetitions</h6>
          <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
            <p className="text-sm text-yellow-800">
              {metrics.repetitions.length} repetition(s) detected. Reducing repetitions can improve fluency.
            </p>
          </div>
        </div>
      )}

      {/* Speech Fluency Tips */}
      <div className="bg-blue-50 p-3 rounded border border-blue-200">
        <h6 className="text-sm font-medium text-blue-800 mb-1">Fluency Tips</h6>
        <ul className="text-xs text-blue-700 list-disc pl-4 space-y-1">
          <li>Maintain a steady speaking rate between 120-150 words per minute</li>
          <li>Use discourse markers to connect ideas smoothly</li>
          <li>Minimize filler words and unnecessary pauses</li>
          <li>Practice speaking in complete, connected thoughts</li>
        </ul>
      </div>
    </div>
  );
}
