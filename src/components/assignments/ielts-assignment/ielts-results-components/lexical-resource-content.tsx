"use client";

import React, { useState, useRef } from 'react';
import { Volume2 } from 'lucide-react';

interface GrammarCorrection {
  original_text: string;
  corrected_text: string;
  differences: Array<{
    type: string;
    original: string;
    corrected: string | null;
    position: number;
  }>;
  taggedText: string;
  lexical_analysis: string;
  strengths: string[];
  improvements: string[];
  lexical_band_score: number;
  modelAnswers: Record<string, string>;
  grammar_score: number;
}

interface LexicalResourceContentProps {
  grammar: GrammarCorrection;
  playCorrectedAnswer: (text: string) => void;
  isPlayingCorrected: boolean;
  accent?: string;
}

// Model Answers Display Component
function ModelAnswersDisplay({ modelAnswers, accent }: { modelAnswers: Record<string, string>, accent: string }) {
  const [playingBand, setPlayingBand] = useState<string | null>(null);
  const [audioSources, setAudioSources] = useState<Record<string, string>>({});
  const audioRef = useRef<HTMLAudioElement>(null);

  const playBandExample = async (bandKey: string, text: string) => {
    try {
      if (playingBand === bandKey && audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setPlayingBand(null);
        return;
      }
      
      if (audioSources[bandKey] && audioRef.current) {
        setPlayingBand(bandKey);
        audioRef.current.src = audioSources[bandKey];
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        return;
      }
      
      setPlayingBand(bandKey);
      
      const response = await fetch('/api/text-to-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, accent: accent }),
      });
      
      if (!response.ok) throw new Error('Failed to get audio');
      
      const data = await response.json();
      const url = `data:audio/mp3;base64,${data.audio}`;
      setAudioSources(prev => ({ ...prev, [bandKey]: url }));
      
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
      } else {
        setPlayingBand(null);
      }
    } catch (error) {
      console.error('Error playing band example:', error);
      setPlayingBand(null);
    }
  };

  const renderMarkedText = (text: string) => {
    if (!text) return '';
    const markRegex = /<mark type="([^"]+)"(?:\s+class="[^"]*")?\s*explanation="([^"]+)">([^<]+)<\/mark>/g;
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    let match;
    
    const getFeatureColor = (featureType: string) => {
      const colorMap: Record<string, string> = {
        // Vocabulary Types (Blues to Purples)
        basic_vocab: 'bg-blue-100 border-blue-300 text-blue-800',           // Simple vocabulary - blue
        range_vocab: 'bg-green-100 border-green-300 text-green-800',        // Good range - green  
        advanced_vocab: 'bg-purple-100 border-purple-300 text-purple-800',  // Sophisticated - purple
        expert_vocab: 'bg-violet-100 border-violet-300 text-violet-800',    // Expert level - dark purple
        
        // Grammar Types (Oranges to Reds)
        simple_grammar: 'bg-cyan-100 border-cyan-300 text-cyan-800',        // Basic structures - light blue
        complex_grammar: 'bg-orange-100 border-orange-300 text-orange-800', // Complex structures - orange
        advanced_grammar: 'bg-red-100 border-red-300 text-red-800',         // Advanced structures - red
        
        // Language Features (Teals to Pinks)
        collocation: 'bg-teal-100 border-teal-300 text-teal-800',           // Natural combinations - teal
        idiom: 'bg-pink-100 border-pink-300 text-pink-800',                 // Idiomatic expressions - pink
        discourse_marker: 'bg-yellow-100 border-yellow-300 text-yellow-800', // Linking words - yellow
        precision: 'bg-indigo-100 border-indigo-300 text-indigo-800',       // Precise language - indigo
        
        // Legacy mappings for backwards compatibility
        academic_vocabulary: 'bg-emerald-100 border-emerald-300 text-emerald-800',
        cohesive_device: 'bg-rose-100 border-rose-300 text-rose-800',
        conditional: 'bg-amber-100 border-amber-300 text-amber-800',
        passive_voice: 'bg-sky-100 border-sky-300 text-sky-800',
        noun_phrase: 'bg-lime-100 border-lime-300 text-lime-800',
        adverbial_phrase: 'bg-slate-100 border-slate-300 text-slate-800',
        basic_vocabulary: 'bg-blue-100 border-blue-300 text-blue-800',      // Redirect to basic_vocab
        simple_structure: 'bg-cyan-100 border-cyan-300 text-cyan-800',      // Redirect to simple_grammar
      };
      return colorMap[featureType.toLowerCase()] || 'bg-gray-100 border-gray-300 text-gray-800';
    };
    
    while ((match = markRegex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.substring(lastIndex, match.index));
      const [, featureType, explanation, content] = match;
      const colorClass = getFeatureColor(featureType);
      parts.push(
        <span key={match.index} className={`relative inline-block border-b ${colorClass} rounded px-0.5 cursor-help group`}>
          {content}
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-48 p-2 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
            <strong>{featureType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}:</strong> {explanation}
          </span>
        </span>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push(text.substring(lastIndex));
    return <>{parts}</>;
  };

  const renderBandExample = (bandKey: string, bandNum: string, exampleText: string) => {
    if (!exampleText) return null;
    
    const isLoading = playingBand === bandKey && !audioSources[bandKey];
    const isCurrentlyPlaying = playingBand === bandKey && audioSources[bandKey] && audioRef.current && !audioRef.current.paused;

    return (
      <div key={bandKey} className="bg-white p-3 rounded-md">
        <div className="flex items-center mb-2">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 border-2 border-blue-700 rounded-full bg-white mr-3 shrink-0">
              <span className="text-lg font-bold text-blue-700">{bandNum}</span>
            </div>
            <h5 className="text-sm font-medium text-gray-800">Band {bandNum} Example</h5>
          </div>
          <button 
            onClick={() => playBandExample(bandKey, exampleText)}
            className="flex items-center text-xs text-blue-700 hover:text-blue-900 disabled:opacity-50 shrink-0 ml-3"
            disabled={isLoading}
          >
            <Volume2 size={14} className="mr-1" />
            {isLoading ? 'Loading...' : isCurrentlyPlaying ? 'Playing...' : 'Listen'}
          </button>
        </div>
        <p className="text-sm text-gray-700 pl-11">{renderMarkedText(exampleText)}</p>
      </div>
    );
  };

  return (
    <div className="mb-4">
      <h4 className="text-lg font-medium mb-2">Model Answers by Band Score</h4>
      
      {/* Intermediate Level Examples (Bands 4-6) */}
      {(modelAnswers.band4 || modelAnswers.band5 || modelAnswers.band6) && (
        <div className="mb-6">
          <h5 className="text-sm font-medium mb-2 border-b pb-1">Intermediate Level (Bands 4-6)</h5>
          <div className="space-y-3">
            {modelAnswers.band4 && renderBandExample('band4', '4', modelAnswers.band4)}
            {modelAnswers.band5 && renderBandExample('band5', '5', modelAnswers.band5)}
            {modelAnswers.band6 && renderBandExample('band6', '6', modelAnswers.band6)}
          </div>
        </div>
      )}
      
      {/* Advanced Level Examples (Bands 7-9) */}
      {(modelAnswers.band7 || modelAnswers.band8 || modelAnswers.band9) && (
        <div className="mb-4">
          <h5 className="text-sm font-medium mb-2 border-b pb-1">Advanced Level (Bands 7-9)</h5>
          <div className="space-y-3">
            {modelAnswers.band7 && renderBandExample('band7', '7', modelAnswers.band7)}
            {modelAnswers.band8 && renderBandExample('band8', '8', modelAnswers.band8)}
            {modelAnswers.band9 && renderBandExample('band9', '9', modelAnswers.band9)}
          </div>
        </div>
      )}
      
      {/* Color Legend */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <h5 className="text-sm font-medium text-gray-800 mb-2">Language Feature Color Guide:</h5>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-blue-100 border border-blue-300 rounded mr-2"></span>
            <span>Basic Vocabulary</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-green-100 border border-green-300 rounded mr-2"></span>
            <span>Range Vocabulary</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-purple-100 border border-purple-300 rounded mr-2"></span>
            <span>Advanced Vocabulary</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-violet-100 border border-violet-300 rounded mr-2"></span>
            <span>Expert Vocabulary</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-cyan-100 border border-cyan-300 rounded mr-2"></span>
            <span>Simple Grammar</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-orange-100 border border-orange-300 rounded mr-2"></span>
            <span>Complex Grammar</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-red-100 border border-red-300 rounded mr-2"></span>
            <span>Advanced Grammar</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-teal-100 border border-teal-300 rounded mr-2"></span>
            <span>Collocations</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-pink-100 border border-pink-300 rounded mr-2"></span>
            <span>Idioms</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-yellow-100 border border-yellow-300 rounded mr-2"></span>
            <span>Discourse Markers</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-indigo-100 border border-indigo-300 rounded mr-2"></span>
            <span>Precision</span>
          </div>
        </div>
      </div>
      
      <audio 
        ref={audioRef}
        onEnded={() => setPlayingBand(null)}
        onError={() => setPlayingBand(null)}
        onPause={() => setPlayingBand(null)}
        preload="auto"
        className="hidden"
      />
    </div>
  );
}

export default function LexicalResourceContent({ 
  grammar, 
  playCorrectedAnswer, 
  isPlayingCorrected,
  accent = 'us'
}: LexicalResourceContentProps) {
  return (
    <div className="mb-4">
      {/* Corrected Answer section */}
      {grammar.corrected_text && (
        <div className="mb-4">
          <div className="flex items-center mb-1">
            <h5 className="text-sm font-medium text-blue-800 mr-2">Corrected Answer:</h5>
            <button 
              onClick={() => playCorrectedAnswer(grammar.corrected_text)}
              className="flex items-center text-xs text-blue-700 hover:text-blue-900 disabled:opacity-50"
              disabled={isPlayingCorrected}
            >
              <Volume2 size={14} className="mr-1" />
              {isPlayingCorrected ? 'Loading...' : 'Listen'}
            </button>
          </div>
          <div 
            className="p-3 bg-blue-50 rounded-md text-sm relative group cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => playCorrectedAnswer(grammar.corrected_text)}
          >
            {grammar.corrected_text}
          </div>
        </div>
      )}
      
      {/* Lexical Analysis */}
      {grammar.lexical_analysis && (
        <div className="mb-4">
          <h5 className="text-sm font-medium text-indigo-700 mb-1">Vocabulary Analysis</h5>
          <p className="text-sm text-indigo-600 bg-white p-3 rounded-md border border-indigo-100">
            {grammar.lexical_analysis}
          </p>
        </div>
      )}
      
      {/* Strengths */}
      {grammar.strengths && grammar.strengths.length > 0 && (
        <div className="mb-4">
          <h5 className="text-sm font-medium mb-1 ml-2">Strengths</h5>
          <ul className="text-sm bg-white p-3 rounded-md list-disc pl-5 space-y-1">
            {grammar.strengths.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Improvements */}
      {grammar.improvements && grammar.improvements.length > 0 && (
        <div className="mb-2">
          <h5 className="text-sm font-medium mb-1 ml-2">Areas for Improvement</h5>
          <ul className="text-sm bg-white p-3 rounded-md list-disc pl-5 space-y-1">
            {grammar.improvements.map((improvement, index) => (
              <li key={index}>{improvement}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Model Answers */}
      {grammar.modelAnswers && Object.keys(grammar.modelAnswers).length > 0 && (
        <ModelAnswersDisplay modelAnswers={grammar.modelAnswers} accent={accent} />
      )}
    </div>
  );
}
