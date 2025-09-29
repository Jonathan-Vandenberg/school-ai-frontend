"use client";

import { useMemo, useState, useRef, useCallback } from 'react';
import { Volume2 } from 'lucide-react';
import GrammaticalAnalysisContent from './ielts-results-components/grammatical-analysis-content';
import LexicalResourceContent from './ielts-results-components/lexical-resource-content';
import FluencyCoherenceContent from './ielts-results-components/fluency-coherence-content';
import PronunciationContent from './ielts-results-components/pronunciation-content';

// Response types based on the audio-analysis API
interface PhonemeScore {
  ipa_label: string;
  phoneme_score: number;
}

interface WordScore {
  word_text: string;
  word_score: number;
  phonemes: PhonemeScore[];
  start_time?: number;
  end_time?: number;
}

interface PronunciationAssessmentResponse {
  overall_score: number;
  words: WordScore[];
  lowest_scoring_phonemes?: PhonemeScore[];
  recognized_phonemes?: string[];  // Actual phonemes detected from audio
  processing_time_ms?: number;
}

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

interface RelevanceAnalysis {
  relevance_score: number;
  explanation: string;
  key_points_covered: string[];
  missing_points: string[];
}

interface IELTSScore {
  overall_band: number;
  fluency_coherence: number;
  lexical_resource: number;
  grammatical_range: number;
  pronunciation: number;
  explanation: string;
}

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

interface FreestyleSpeechResponse {
  transcribed_text: string;
  pronunciation: PronunciationAssessmentResponse;
  relevance: RelevanceAnalysis;
  grammar: GrammarCorrection;
  ielts_score?: IELTSScore;
  metrics: Metrics;
  processing_time_ms: number;
  confidence_level: number;
}

interface IELTSResultsProps {
  response: FreestyleSpeechResponse | PronunciationAssessmentResponse;
  type: 'question-answer' | 'pronunciation' | 'reading';
  className?: string;
  accent: string;
}

export default function IELTSResults({ 
  response,
  type,
  className = '',
  accent = 'us'
}: IELTSResultsProps) {
  const [showPhoneticInfo, setShowPhoneticInfo] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isPlayingCorrected, setIsPlayingCorrected] = useState(false);
  const correctedAudioRef = useRef<HTMLAudioElement>(null);
  const [correctedAudioSrc, setCorrectedAudioSrc] = useState('');

  // Determine if this is a freestyle (Q&A) response
  const isFreestyleResponse = (resp: any): resp is FreestyleSpeechResponse => {
    return 'transcribed_text' in resp && 'grammar' in resp;
  };

  // Extract IELTS score
  const ieltsScore = useMemo(() => {
    if (isFreestyleResponse(response) && response.ielts_score) {
      return response.ielts_score;
    }
    return null;
  }, [response]);

  // Extract words for pronunciation analysis
  const words = useMemo(() => {
    if (isFreestyleResponse(response) && response.pronunciation?.words) {
      return response.pronunciation.words;
    } else if ('words' in response) {
      return response.words;
    }
    return [];
  }, [response]);

  // Extract lowest scoring phonemes
  const lowestScoringPhonemes = useMemo(() => {
    if (isFreestyleResponse(response) && response.pronunciation?.lowest_scoring_phonemes) {
      return response.pronunciation.lowest_scoring_phonemes;
    } else if ('lowest_scoring_phonemes' in response && response.lowest_scoring_phonemes) {
      return response.lowest_scoring_phonemes;
    }
    
    // Fallback: manually create from all phonemes if available
    if (words.length > 0) {
      const allPhonemes: PhonemeScore[] = [];
      
      words.forEach(word => {
        if (word.phonemes) {
          word.phonemes.forEach(phoneme => {
            allPhonemes.push({
              ipa_label: phoneme.ipa_label,
              phoneme_score: phoneme.phoneme_score
            });
          });
        }
      });
      
      // Sort by score and take the lowest 3
      return allPhonemes
        .sort((a, b) => a.phoneme_score - b.phoneme_score)
        .slice(0, 3);
    }
    
    return [];
  }, [response, words]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Function to play corrected text
  const playCorrectedAnswer = useCallback(async (text: string) => {
    try {
      if (isPlayingCorrected) return;
      
      if (correctedAudioSrc && correctedAudioRef.current) {
        correctedAudioRef.current.currentTime = 0;
        setIsPlayingCorrected(true);
        
        const playPromise = correctedAudioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Play failed:", error);
            setIsPlayingCorrected(false);
          });
        }
        return;
      }
      
      setIsPlayingCorrected(true);
      
      const audioResponse = await fetch('/api/text-to-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          accent: accent
        }),
      });
      
      if (!audioResponse.ok) {
        throw new Error('Failed to get audio');
      }
      
      const data = await audioResponse.json();
      const url = `data:audio/mp3;base64,${data.audio}`;
      setCorrectedAudioSrc(url);
      
      if (correctedAudioRef.current) {
        const audio = correctedAudioRef.current;
        
        const playWhenReady = () => {
          audio.play().catch(err => {
            console.error("Error playing audio:", err);
            setIsPlayingCorrected(false);
          });
          audio.removeEventListener('canplaythrough', playWhenReady);
        };
        
        audio.addEventListener('canplaythrough', playWhenReady);
        audio.load();
      } else {
        setIsPlayingCorrected(false);
      }
    } catch (error) {
      console.error('Error playing pronunciation:', error);
      setIsPlayingCorrected(false);
    }
  }, [isPlayingCorrected, correctedAudioSrc, accent]);

  // Category scores for the 4 IELTS criteria
  const categoryScores = useMemo(() => {
    const scores: {
      [key: string]: { 
        ielts?: number | null, 
        color: string
      }
    } = {};
    
    if (isFreestyleResponse(response) && response.ielts_score) {
      scores["Grammatical Range and Accuracy"] = {
        ielts: response.ielts_score.grammatical_range,
        color: '#4ade80' // green-400
      };
      
      scores["Lexical Resource"] = {
        ielts: response.ielts_score.lexical_resource,
        color: '#facc15' // yellow-400
      };
      
      scores["Fluency and Coherence"] = {
        ielts: response.ielts_score.fluency_coherence,
        color: '#60a5fa' // blue-400
      };
      
      scores["Pronunciation"] = {
        ielts: response.ielts_score.pronunciation,
        color: '#f97316' // orange-500
      };
    }
    
    return scores;
  }, [response]);

  return (
    <div className={`bg-white rounded-lg ${className}`}>
      {/* IELTS Score Section */}
      {ieltsScore && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">IELTS Equivalent Score</h4>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between gap-2 md:gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Disclaimer: This score estimate is not an official IELTS score.</p>
              </div>
              <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 border-2 md:border-4 border-blue-800 rounded-full bg-white aspect-square">
                <span className="text-xl md:text-3xl font-bold text-blue-800">
                  {ieltsScore.overall_band === 9 
                    ? '8-9'
                    : Number.isInteger(ieltsScore.overall_band) 
                      ? ieltsScore.overall_band 
                      : `${Math.floor(ieltsScore.overall_band)}-${Math.ceil(ieltsScore.overall_band)}`}
                </span>
              </div>
            </div>
            {ieltsScore.explanation && (
              <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm text-blue-800">{ieltsScore.explanation}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transcription */}
      {isFreestyleResponse(response) && response.transcribed_text && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">Your Answer</h4>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-gray-800">{response.transcribed_text}</p>
          </div>
        </div>
      )}

      {/* Category Breakdown with Dropdowns */}
      {Object.keys(categoryScores).length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">Category Breakdown</h4>
          <div className="space-y-2">
            {Object.entries(categoryScores).map(([category, scores]) => (
              <div 
                key={category}
                className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
                style={expandedCategories[category] ? { borderColor: scores.color, borderWidth: '2px' } : {}}
              >
                      <button 
                  onClick={() => toggleCategory(category)}
                  className="w-full text-left p-4 flex items-center justify-between cursor-pointer"
                  style={{ borderLeftColor: scores.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-center">
                    <h5 className="font-medium text-gray-700 text-lg">{category}</h5>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {scores.ielts && (
                      <div className="flex items-center bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                        <span className="font-bold text-xl whitespace-nowrap" style={{ color: scores.color }}>
                          {scores.ielts === 9 
                            ? '8-9'
                            : Number.isInteger(scores.ielts) 
                              ? scores.ielts 
                              : `${Math.floor(scores.ielts)}-${Math.ceil(scores.ielts)}`}
                        </span>
                        <span className="text-xs ml-1 text-gray-500">IELTS</span>
                      </div>
                    )}
                    
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-5 w-5 text-gray-500 transition-transform ${expandedCategories[category] ? 'transform rotate-180' : ''}`} 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </button>
                
                {expandedCategories[category] && (
                  <div className="p-4 pt-4 border-t border-gray-100" style={{ borderTopColor: scores.color }}>
                    {/* Category-specific content */}
                    {category === 'Grammatical Range and Accuracy' && isFreestyleResponse(response) && response.grammar && (
                      <GrammaticalAnalysisContent 
                        grammar={response.grammar} 
                        playCorrectedAnswer={playCorrectedAnswer}
                        isPlayingCorrected={isPlayingCorrected}
                      />
                    )}
                    
                    {category === 'Lexical Resource' && isFreestyleResponse(response) && response.grammar && (
                      <LexicalResourceContent 
                        grammar={response.grammar} 
                        playCorrectedAnswer={playCorrectedAnswer}
                        isPlayingCorrected={isPlayingCorrected}
                        accent={accent}
                      />
                    )}
                    
                    {category === 'Fluency and Coherence' && isFreestyleResponse(response) && response.metrics && (
                      <FluencyCoherenceContent 
                        metrics={response.metrics} 
                        relevance={response.relevance}
                      />
                    )}
                    
                    {category === 'Pronunciation' && (
                      <PronunciationContent 
                        words={words}
                        lowestScoringPhonemes={lowestScoringPhonemes}
                        accent={accent}
                        showPhoneticInfo={showPhoneticInfo}
                        setShowPhoneticInfo={setShowPhoneticInfo}
                      />
                    )}

                    {/* Task Achievement for reading/relevance */}
                    {category === 'Task Achievement' && isFreestyleResponse(response) && response.relevance && (
                      <TaskAchievementContent relevance={response.relevance} />
                    )}
                </div>
                )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Hidden audio element for corrected answer */}
      {correctedAudioSrc && (
        <audio 
          ref={correctedAudioRef}
          onPlay={() => setIsPlayingCorrected(true)}
          onEnded={() => setIsPlayingCorrected(false)}
          onError={() => setIsPlayingCorrected(false)}
          src={correctedAudioSrc}
        />
      )}
    </div>
  );
}

// Task Achievement Content Component (for relevance analysis)
function TaskAchievementContent({ relevance }: { relevance: RelevanceAnalysis }) {
  return (
    <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium">Relevance Score</p>
          <p className="text-xs text-gray-600">{relevance.explanation}</p>
              </div>
              <div className="flex items-center justify-center w-16 h-16 border-4 border-blue-500 rounded-full">
                <span className="text-xl font-bold text-blue-600">
            {relevance.relevance_score}%
                </span>
        </div>
      </div>

      {relevance.key_points_covered.length > 0 && (
              <div className="mb-3">
                <h6 className="text-sm font-medium text-green-700 mb-1">Key Points Covered</h6>
                <ul className="text-sm text-gray-600 list-disc pl-5">
            {relevance.key_points_covered.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
        </div>
      )}
      
      {relevance.missing_points.length > 0 && (
              <div>
                <h6 className="text-sm font-medium text-orange-700 mb-1">Areas for Improvement</h6>
                <ul className="text-sm text-gray-600 list-disc pl-5">
            {relevance.missing_points.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
      )}
    </div>
  );
} 