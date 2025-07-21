"use client";

import { useMemo, useState, useRef, useCallback } from 'react';
import { Volume2, Info } from 'lucide-react';

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
  processing_time_ms?: number;
}

interface GrammarCorrection {
  original_text: string;
  corrected_text: string;
  differences: Array<{
    type: string;
    original: string;
    corrected: string;
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

interface FreestyleSpeechResponse {
  transcribed_text: string;
  pronunciation: PronunciationAssessmentResponse;
  relevance: RelevanceAnalysis;
  grammar: GrammarCorrection;
  ielts_score?: IELTSScore;
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
      
      const response = await fetch('/api/text-to-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          accent: accent
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get audio');
      }
      
      const data = await response.json();
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

  return (
    <div className={`bg-white rounded-lg ${className}`}>
      {/* IELTS Score (for Q&A assignments) */}
      {ieltsScore && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">IELTS Score</h4>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Overall Band Score</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-xs text-gray-500 block">Fluency & Coherence</span>
                    <span className="font-medium">{ieltsScore.fluency_coherence}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-xs text-gray-500 block">Lexical Resource</span>
                    <span className="font-medium">{ieltsScore.lexical_resource}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-xs text-gray-500 block">Grammar</span>
                    <span className="font-medium">{ieltsScore.grammatical_range}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-xs text-gray-500 block">Pronunciation</span>
                    <span className="font-medium">{ieltsScore.pronunciation}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center w-20 h-20 border-4 border-blue-800 rounded-full bg-white">
                <span className="text-3xl font-bold text-blue-800">
                  {ieltsScore.overall_band}
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

      {/* Transcription (for Q&A assignments) */}
      {isFreestyleResponse(response) && response.transcribed_text && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">Your Answer</h4>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-gray-800">{response.transcribed_text}</p>
          </div>
        </div>
      )}

      {/* Grammar Analysis (for Q&A assignments) */}
      {isFreestyleResponse(response) && response.grammar && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">Grammar Analysis</h4>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            {response.grammar.differences && response.grammar.differences.length > 0 ? (
              <>
                {/* Corrected text */}
                {response.grammar.corrected_text && (
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <h5 className="text-sm font-medium text-green-700 mr-2">Corrected Answer</h5>
                      <button 
                        onClick={() => playCorrectedAnswer(response.grammar.corrected_text)}
                        className="flex items-center text-xs text-green-700 hover:text-green-900 disabled:opacity-50"
                        disabled={isPlayingCorrected}
                      >
                        <Volume2 size={14} className="mr-1" />
                        {isPlayingCorrected ? 'Loading...' : 'Listen'}
                      </button>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-800">{response.grammar.corrected_text}</p>
                    </div>
                  </div>
                )}

                {/* Grammar errors */}
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Grammar Errors ({response.grammar.differences.length})</h5>
                  <div className="space-y-2">
                    {response.grammar.differences.map((diff, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex items-start space-x-2">
                          <div className="bg-red-50 p-2 rounded-md flex-grow">
                            <div className="text-xs text-red-700 mb-1">Original</div>
                            <div className="text-sm text-red-800 font-medium">"{diff.original}"</div>
                          </div>
                          <div className="text-gray-500 self-center">→</div>
                          <div className="bg-green-50 p-2 rounded-md flex-grow">
                            <div className="text-xs text-green-700 mb-1">Correction</div>
                            <div className="text-sm text-green-800 font-medium">"{diff.corrected}"</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center mb-2">
                  <div className="w-5 h-5 text-green-600 mr-2">✓</div>
                  <h5 className="text-green-700 font-medium">Perfect Grammar!</h5>
                </div>
                <p className="text-green-600">Congratulations! Your answer has no grammatical errors.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Relevance Analysis (for Q&A assignments) */}
      {isFreestyleResponse(response) && response.relevance && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">Relevance Analysis</h4>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium">Relevance Score</p>
                <p className="text-xs text-gray-600">{response.relevance.explanation}</p>
              </div>
              <div className="flex items-center justify-center w-16 h-16 border-4 border-blue-500 rounded-full">
                <span className="text-xl font-bold text-blue-600">
                  {response.relevance.relevance_score}%
                </span>
              </div>
            </div>
            
            {response.relevance.key_points_covered.length > 0 && (
              <div className="mb-3">
                <h6 className="text-sm font-medium text-green-700 mb-1">Key Points Covered</h6>
                <ul className="text-sm text-gray-600 list-disc pl-5">
                  {response.relevance.key_points_covered.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {response.relevance.missing_points.length > 0 && (
              <div>
                <h6 className="text-sm font-medium text-orange-700 mb-1">Areas for Improvement</h6>
                <ul className="text-sm text-gray-600 list-disc pl-5">
                  {response.relevance.missing_points.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Word-Level Pronunciation Analysis */}
      {words.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">Pronunciation Analysis</h4>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-4">
              Click on words to hear their correct pronunciation. Colors indicate pronunciation accuracy.
            </p>
            <div className="flex flex-wrap gap-2">
              {words.map((word, index) => (
                <WordDisplay key={index} word={word} accent={accent} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pronunciation Challenges */}
      {lowestScoringPhonemes.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            Pronunciation Challenges
            <button 
              onClick={() => setShowPhoneticInfo(!showPhoneticInfo)}
              className="ml-2 text-gray-600 hover:text-gray-800 focus:outline-none"
            >
              <Info className="w-4 h-4" />
            </button>
          </h4>
          
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            {showPhoneticInfo && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-md mb-4">
                <h5 className="text-sm font-semibold text-blue-800">About Phonetic Analysis</h5>
                <p className="text-xs text-blue-700 mt-1">
                  This analysis uses the International Phonetic Alphabet (IPA) to identify specific sounds 
                  that need improvement in your pronunciation.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {lowestScoringPhonemes.map((phoneme, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-mono bg-red-50 px-2 py-1 rounded text-red-800">
                      {phoneme.ipa_label}
                    </span>
                    <span className="text-sm font-medium">
                      {Math.round(phoneme.phoneme_score)}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {phoneme.phoneme_score < 60 ? "Needs significant improvement" : 
                     phoneme.phoneme_score < 80 ? "Needs some practice" : 
                     "Almost there!"}
                  </span>
                </div>
              ))}
            </div>
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

// Component to display individual words with pronunciation scores
function WordDisplay({ word, accent }: { word: WordScore, accent: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSrc, setAudioSrc] = useState('');
  const [showPhonemes, setShowPhonemes] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const getWordColor = () => {
    const score = word.word_score;
    if (score >= 80) return 'bg-green-50 border-green-200 text-green-800';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-red-50 border-red-200 text-red-800';
  };

  const getPhonemeColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const playWordPronunciation = async () => {
    try {
      if (isPlaying) return;
      
      if (audioSrc && audioRef.current) {
        audioRef.current.currentTime = 0;
        setIsPlaying(true);
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Play failed:", error);
            setIsPlaying(false);
          });
        }
        return;
      }
      
      setIsPlaying(true);
      
      const response = await fetch('/api/text-to-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: word.word_text,
          accent: accent
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get audio');
      }
      
      const data = await response.json();
      const url = `data:audio/mp3;base64,${data.audio}`;
      setAudioSrc(url);
      
      if (audioRef.current) {
        const audio = audioRef.current;
        
        const playWhenReady = () => {
          audio.play().catch(err => {
            console.error("Error playing audio:", err);
            setIsPlaying(false);
          });
          audio.removeEventListener('canplaythrough', playWhenReady);
        };
        
        audio.addEventListener('canplaythrough', playWhenReady);
        audio.load();
      } else {
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error playing pronunciation:', error);
      setIsPlaying(false);
    }
  };

  return (
    <div className={`text-sm border rounded-md hover:bg-opacity-80 transition-all ${getWordColor()}`}>
      {/* Word header with score and controls */}
      <div 
        className="px-2 py-1 cursor-pointer flex items-center justify-between"
        onClick={playWordPronunciation}
        title={`Score: ${Math.round(word.word_score)}% - Click to hear pronunciation`}
      >
        <span>{word.word_text}</span>
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium">{Math.round(word.word_score)}%</span>
          {isPlaying && <span className="text-xs">🔊</span>}
          {word.phonemes && word.phonemes.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPhonemes(!showPhonemes);
              }}
              className="text-xs text-gray-500 hover:text-gray-700 ml-1"
              title="Show phoneme breakdown"
            >
              {showPhonemes ? '▼' : '▶'}
            </button>
          )}
        </div>
      </div>

      {/* Phoneme breakdown */}
      {showPhonemes && word.phonemes && word.phonemes.length > 0 && (
        <div className="px-2 pb-2 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600 mb-1 mt-1">Phoneme Breakdown:</div>
          <div className="flex flex-wrap gap-1">
            {word.phonemes.map((phoneme, index) => (
              <span
                key={index}
                className={`text-xs px-1 py-0.5 rounded font-mono ${getPhonemeColor(phoneme.phoneme_score)}`}
                title={`${phoneme.ipa_label}: ${Math.round(phoneme.phoneme_score * 100)}%`}
              >
                {phoneme.ipa_label}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Only render audio element when src is not empty */}
      {audioSrc && (
        <audio 
          ref={audioRef}
          src={audioSrc} 
          onEnded={() => setIsPlaying(false)}
          onError={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
    </div>
  );
} 