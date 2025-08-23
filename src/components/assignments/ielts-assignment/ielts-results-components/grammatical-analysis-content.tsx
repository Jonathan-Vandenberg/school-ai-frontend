"use client";

import React from 'react';
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
  modelAnswers: Record<string, { marked: string, clean: string }>;
  grammar_score: number;
}

interface GrammaticalAnalysisContentProps {
  grammar: GrammarCorrection;
  playCorrectedAnswer: (text: string) => void;
  isPlayingCorrected: boolean;
}

export default function GrammaticalAnalysisContent({ 
  grammar, 
  playCorrectedAnswer, 
  isPlayingCorrected 
}: GrammaticalAnalysisContentProps) {
  return (
    <div className="mb-4">
      {grammar.differences && grammar.differences.length === 0 ? (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
          <div className="flex items-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h5 className="text-green-700 font-medium">Perfect Grammar!</h5>
          </div>
          <p className="text-green-600">Congratulations! Your answer has no grammatical errors. Keep up the excellent work!</p>
        </div>
      ) : (
        <>
          {/* Original text with errors highlighted */}
          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Your Answer with Grammar Errors Highlighted</h5>
            <div className="bg-white md:p-3 rounded-lg md:border md:border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500">Hover over highlighted text to see corrections</span>
              </div>
              
              <div className="text-sm whitespace-pre-wrap">
                {(() => {
                  const taggedText: string = grammar.taggedText || '';
                  const parts: Array<string | React.ReactNode> = [];
                  let lastIndex = 0;
                  let match: RegExpExecArray | null;
                  
                  // Regular expression to find all grammar mistake tags
                  const grammarRegex = /<grammar-mistake correction="([^"]*)">([^<]*)<\/grammar-mistake>/g;
                  
                  while ((match = grammarRegex.exec(taggedText)) !== null) {
                    // Add text before the mistake
                    if (match.index > lastIndex) {
                      parts.push(taggedText.substring(lastIndex, match.index));
                    }
                    
                    const correction = match[1];
                    const mistake = match[2];
                    const displayCorrection = correction || '(remove)';
                    
                    // Add the mistake with highlighting and tooltip
                    parts.push(
                      <span key={match.index} className="relative group inline-block">
                        <span className="bg-red-100 text-red-800 px-1 rounded">
                          {mistake}
                        </span>
                        <span className="absolute bottom-full left-0 hidden group-hover:block bg-white p-2 rounded shadow-lg border border-gray-200 text-xs z-20 min-w-[150px]">
                          <span className="block font-medium mb-1 text-gray-700">Correction:</span>
                          <span className="block bg-green-50 p-1 rounded text-green-800">&quot;{displayCorrection}&quot;</span>
                        </span>
                      </span>
                    );
                    
                    lastIndex = match.index + match[0].length;
                  }
                  
                  // Add remaining text after the last mistake
                  if (lastIndex < taggedText.length) {
                    parts.push(taggedText.substring(lastIndex));
                  }
                  
                  return parts;
                })()}
              </div>
            </div>
          </div>
          
          {/* Corrected text */}
          {grammar.corrected_text && (
            <div className="mb-4">
              <div className="flex items-center mb-1">
                <h5 className="text-sm font-medium text-gray-700 mr-2">Corrected Answer</h5>
                <button 
                  onClick={() => playCorrectedAnswer(grammar.corrected_text)}
                  className="flex items-center text-xs text-green-700 hover:text-green-900 disabled:opacity-50"
                  disabled={isPlayingCorrected}
                >
                  <Volume2 size={14} className="mr-1" />
                  {isPlayingCorrected ? 'Loading...' : 'Listen'}
                </button>
              </div>
              <div 
                className="bg-green-50 p-3 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors relative group"
                onClick={() => playCorrectedAnswer(grammar.corrected_text)}
              >
                <p className="text-sm text-gray-800">{grammar.corrected_text}</p>
                {isPlayingCorrected && (
                  <div className="absolute right-2 top-2 text-green-700 flex items-center gap-1 animate-pulse">
                    {/* Optional: keep a subtle loading indicator on the text block too */}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
