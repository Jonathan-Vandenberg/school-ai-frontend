"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Info } from 'lucide-react';
import { createPortal } from 'react-dom';

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

interface PronunciationContentProps {
  words: WordScore[];
  lowestScoringPhonemes: PhonemeScore[];
  accent: string;
  showPhoneticInfo: boolean;
  setShowPhoneticInfo: (show: boolean) => void;
}

// Enhanced Word Display Component with tooltips and audio
function WordDisplay({ word, accent }: { word: WordScore, accent: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSrc, setAudioSrc] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const audioRef = useRef<HTMLAudioElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const getWordContainerColor = () => {
    const score = word.word_score;
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getPhonemeColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Position the tooltip when visible
  useEffect(() => {
    if (showTooltip && wordRef.current) {
      const rect = wordRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 10,
        left: rect.left + rect.width / 2
      });
    }
  }, [showTooltip]);

  const playWordPronunciation = async () => {
    try {
      if (isPlaying) return;
      
      if (audioSrc && audioRef.current) {
        audioRef.current.currentTime = 0;
        setIsPlaying(true);
        
        await audioRef.current.play();
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
        audio.src = url;
        await audio.play();
      } else {
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error playing pronunciation:', error);
      setIsPlaying(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Set fallback timeout when playing starts
  useEffect(() => {
    if (isPlaying) {
      timeoutRef.current = setTimeout(() => {
        setIsPlaying(false);
      }, 10000); // 10 second fallback
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, [isPlaying]);

  // Tooltip component
  const TooltipContent = () => {
    if (!showTooltip) return null;
    
    return createPortal(
      <div 
        className="fixed bg-gray-800 text-white p-0 rounded-lg text-xs z-[9999] w-48 shadow-lg"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          transform: 'translate(-50%, -100%)',
        }}
      >
        <div className="flex flex-col max-h-[300px] overflow-y-auto">
          <div className="p-3 pb-2">
            <span className="font-semibold">Word Score: {Math.round(word.word_score)}</span>
            {word.phonemes && word.phonemes.length > 0 && (
              <>
                <span className="block mt-2 font-semibold">Phoneme Scores:</span>
                <div className="flex flex-col space-y-1 mt-1">
                  {word.phonemes.map((p: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className={getPhonemeColor(p.phoneme_score)}>{p.ipa_label}</span>
                      <span>{Math.round(p.phoneme_score)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {isPlaying && (
              <div className="text-blue-300 flex items-center gap-1 mt-2 animate-pulse">
                <Volume2 size={14} />
                <span>Playing...</span>
              </div>
            )}
          </div>
        </div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-t-8 border-l-8 border-r-8 border-gray-800 border-l-transparent border-r-transparent"></div>
      </div>,
      document.body
    );
  };

  const microphoneCursorStyle = {
    cursor: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='11 5 6 9 2 9 2 15 6 15 11 19 11 5'></polygon><path d='M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07'></path></svg>"), pointer`,
  };

  return (
    <div 
      ref={wordRef}
      className={`text-sm border px-2 py-1 rounded-md relative group ${getWordContainerColor()} hover:bg-opacity-80 transition-all`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={playWordPronunciation}
      style={microphoneCursorStyle}
    >
      <span>{word.word_text}</span>
      
      <audio 
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
        preload="none"
        className="hidden"
      />
      
      <TooltipContent />
    </div>
  );
}

export default function PronunciationContent({ 
  words, 
  lowestScoringPhonemes, 
  accent, 
  showPhoneticInfo, 
  setShowPhoneticInfo 
}: PronunciationContentProps) {
  return (
    <div className="mb-4">
      {/* Word-level analysis */}
      {words.length > 0 && (
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Word-Level Analysis</h5>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-4">
              This analysis shows your pronunciation score for each word. Click on a word to hear its correct pronunciation.
            </p>
            <div className="flex flex-wrap gap-2">
              {words.map((word, index) => (
                <WordDisplay key={index} word={word} accent={accent} />
              ))}
            </div>
          </div>
        </div>
      )}



      {/* Lowest scoring phonemes */}
      {lowestScoringPhonemes.length > 0 && (
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            Pronunciation Challenges
            <button 
              onClick={() => setShowPhoneticInfo(!showPhoneticInfo)}
              className="ml-2 text-black hover:text-gray-700 focus:outline-none"
              aria-label="Show information about phonetic system"
            >
              <Info className="w-4 h-4" />
            </button>
          </h5>
          
          {/* Phonetic System Info */}
          {showPhoneticInfo && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-md mb-4">
              <div className="mb-2">
                <h5 className="text-sm font-semibold text-blue-800">About the Phonetic System</h5>
                <p className="text-xs text-blue-700 mt-1">
                  Our speech assessment uses the Oxford English IPA (International Phonetic Alphabet) system to analyze your pronunciation.
                  This standardized system represents the speech sounds that make up words, with variations for US and UK English accents.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                <div className="bg-white p-2 rounded border border-blue-100">
                  <h6 className="text-xs font-medium text-blue-800">Consonants</h6>
                  <p className="text-xs text-gray-600">
                    Speech sounds produced with complete or partial closure of the vocal tract (b, p, t, d, etc.)
                  </p>
                </div>
                <div className="bg-white p-2 rounded border border-blue-100">
                  <h6 className="text-xs font-medium text-blue-800">Vowels</h6>
                  <p className="text-xs text-gray-600">
                    Speech sounds produced with an open vocal tract (a, e, i, o, u, etc.)
                  </p>
                </div>
                <div className="bg-white p-2 rounded border border-blue-100">
                  <h6 className="text-xs font-medium text-blue-800">Diphthongs</h6>
                  <p className="text-xs text-gray-600">
                    Vowel sounds that involve a change in quality within a single syllable (aɪ, aʊ, eɪ, etc.)
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2 mb-4">
            {lowestScoringPhonemes.map((phoneme, index) => (
              <div key={index} className="bg-red-50 px-3 py-1 rounded-md border border-red-200 text-sm">
                <span className="font-medium">{phoneme.ipa_label}</span>
                <span className="ml-2 text-xs text-gray-500">({Math.round(phoneme.phoneme_score)})</span>
              </div>
            ))}
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              These are the sounds you need to practice the most to improve your pronunciation:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {lowestScoringPhonemes.map((phoneme, index) => (
                <div key={index} className="flex flex-col bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-mono bg-red-50 px-2 py-1 rounded text-red-800">{phoneme.ipa_label}</span>
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <path
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="3"
                          strokeDasharray="100, 100"
                        />
                        <path
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke={phoneme.phoneme_score > 0 ? 
                                  (phoneme.phoneme_score >= 80 ? "#10b981" : 
                                  phoneme.phoneme_score >= 60 ? "#f59e0b" : "#ef4444") : 
                                  "#ef4444"}
                          strokeWidth="3"
                          strokeDasharray={`${phoneme.phoneme_score || 0}, 100`}
                        />
                        <text x="18" y="20.5" textAnchor="middle" fontSize="10" fill="#374151">
                          {Math.round(phoneme.phoneme_score || 0)}
                        </text>
                      </svg>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {phoneme.phoneme_score <= 0 ? "Critical focus needed" :
                    phoneme.phoneme_score < 60 ? "Needs significant improvement" : 
                    phoneme.phoneme_score < 80 ? "Needs some practice" : 
                    "Almost there!"}
                  </span>
                  
                  {/* Phoneme examples */}
                  <div className="mt-2 text-xs text-gray-600">
                    <p>Example sounds like in:</p>
                    
                    {/* Consonants, vowels, and diphthongs examples */}
                    {phoneme.ipa_label === 'b' && <span>&quot;buy&quot;</span>}
                    {phoneme.ipa_label === 'ʧ' && <span>&quot;China&quot;</span>}
                    {phoneme.ipa_label === 'd' && <span>&quot;day&quot;</span>}
                    {phoneme.ipa_label === 'ð' && <span>&quot;the&quot;</span>}
                    {phoneme.ipa_label === 'f' && <span>&quot;fish&quot;</span>}
                    {phoneme.ipa_label === 'g' && <span>&quot;go&quot;</span>}
                    {phoneme.ipa_label === 'h' && <span>&quot;help&quot;</span>}
                    {phoneme.ipa_label === 'ʤ' && <span>&quot;jump&quot;</span>}
                    {phoneme.ipa_label === 'k' && <span>&quot;cup&quot;</span>}
                    {phoneme.ipa_label === 'l' && <span>&quot;like&quot;</span>}
                    {phoneme.ipa_label === 'm' && <span>&quot;mom&quot;</span>}
                    {phoneme.ipa_label === 'n' && <span>&quot;no&quot;</span>}
                    {phoneme.ipa_label === 'ŋ' && <span>&quot;sing&quot;</span>}
                    {phoneme.ipa_label === 'p' && <span>&quot;pan&quot;</span>}
                    {phoneme.ipa_label === 'r' && <span>&quot;red&quot;</span>}
                    {phoneme.ipa_label === 's' && <span>&quot;sit&quot;</span>}
                    {phoneme.ipa_label === 'ʃ' && <span>&quot;shop&quot;</span>}
                    {phoneme.ipa_label === 't' && <span>&quot;top&quot;</span>}
                    {phoneme.ipa_label === 'θ' && <span>&quot;thin&quot;</span>}
                    {phoneme.ipa_label === 'v' && <span>&quot;very&quot;</span>}
                    {phoneme.ipa_label === 'w' && <span>&quot;win&quot;</span>}
                    {phoneme.ipa_label === 'j' && <span>&quot;yes&quot;</span>}
                    {phoneme.ipa_label === 'z' && <span>&quot;zero&quot;</span>}
                    {phoneme.ipa_label === 'ʒ' && <span>&quot;vision&quot;</span>}
                    
                    {/* Vowels */}
                    {phoneme.ipa_label === 'ɛ' && <span>&quot;bed&quot;</span>}
                    {phoneme.ipa_label === 'ə' && <span>&quot;about&quot;</span>}
                    {phoneme.ipa_label === 'ɪ' && <span>&quot;sit&quot;</span>}
                    {phoneme.ipa_label === 'i' && <span>&quot;see&quot;</span>}
                    {phoneme.ipa_label === 'ʊ' && <span>&quot;put&quot;</span>}
                    {phoneme.ipa_label === 'ɑ' && <span>&quot;father&quot;</span>}
                    {phoneme.ipa_label === 'ɔ' && <span>&quot;caught&quot;</span>}
                    {phoneme.ipa_label === 'æ' && <span>&quot;cat&quot;</span>}
                    {phoneme.ipa_label === 'u' && <span>&quot;blue&quot;</span>}
                    {phoneme.ipa_label === 'a' && <span>&quot;sky&quot;</span>}
                    {phoneme.ipa_label === 'ɒ' && <span>&quot;hot&quot;</span>}
                    {phoneme.ipa_label === 'ʌ' && <span>&quot;cup&quot;</span>}
                    
                    {/* Diphthongs */}
                    {phoneme.ipa_label === 'aʊ' && <span>&quot;now&quot;</span>}
                    {phoneme.ipa_label === 'eɪ' && <span>&quot;say&quot;</span>}
                    {phoneme.ipa_label === 'ɔɪ' && <span>&quot;boy&quot;</span>}
                    {phoneme.ipa_label === 'aɪ' && <span>&quot;my&quot;</span>}
                    {phoneme.ipa_label === 'oʊ' && <span>&quot;go&quot;</span>}
                    
                    {/* Default message if no examples are available */}
                    {!/[bʧdðfghʤklmnŋprsʃtθvwjzʒɛəɪiʊɑɔæuaɒʌaʊeɪɔɪaɪoʊ]/.test(phoneme.ipa_label) && 
                      <span>Examples not available for this sound</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
