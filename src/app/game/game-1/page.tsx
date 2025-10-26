'use client';

import React, { useState, useEffect } from 'react';
import { Heart, Zap, Coffee, Star, Trophy, Gift } from 'lucide-react';

interface PetStats {
  hunger: number;
  happiness: number;
  energy: number;
  level: number;
  experience: number;
  name: string;
  type: 'egg' | 'baby' | 'teen' | 'adult';
  lastFed: number;
  lastPlayed: number;
  lastRested: number;
}

interface PetGameProps {
  assignmentPoints?: number;
}

export default function PetCareGame({ assignmentPoints = 0 }: PetGameProps) {
  const [pet, setPet] = useState<PetStats>({
    hunger: 80,
    happiness: 70,
    energy: 90,
    level: 1,
    experience: 0,
    name: 'Buddy',
    type: 'egg',
    lastFed: Date.now(),
    lastPlayed: Date.now(),
    lastRested: Date.now(),
  });

  const [showPoints, setShowPoints] = useState(false);
  const [points, setPoints] = useState(0);
  const [messages, setMessages] = useState<string[]>([]);
  const [petAnimation, setPetAnimation] = useState<'idle' | 'happy' | 'eating' | 'playing' | 'sleeping' | 'sad'>('idle');
  const [particles, setParticles] = useState<Array<{id: number, type: string, x: number, y: number}>>([]);

  // Add points from assignment completion
  useEffect(() => {
    if (assignmentPoints > 0) {
      setPoints(prev => prev + assignmentPoints);
      setShowPoints(true);
      addMessage(`🎉 Great job! You earned ${assignmentPoints} care points!`);
      setTimeout(() => setShowPoints(false), 3000);
    }
  }, [assignmentPoints]);

  // Pet needs decay over time
  useEffect(() => {
    const interval = setInterval(() => {
      setPet(prev => ({
        ...prev,
        hunger: Math.max(0, prev.hunger - 1),
        happiness: Math.max(0, prev.happiness - 0.5),
        energy: Math.max(0, prev.energy - 0.8),
      }));
    }, 30000); // Decay every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Auto-update pet animation based on mood
  useEffect(() => {
    const avg = (pet.hunger + pet.happiness + pet.energy) / 3;
    if (avg >= 80) {
      setPetAnimation('happy');
    } else if (avg >= 40) {
      setPetAnimation('idle');
    } else {
      setPetAnimation('sad');
    }
  }, [pet.hunger, pet.happiness, pet.energy]);

  // Particle cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => prev.filter(p => Date.now() - p.id < 2000));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Check for pet evolution
  useEffect(() => {
    const experienceNeeded = pet.level * 100;
    if (pet.experience >= experienceNeeded) {
      setPet(prev => ({
        ...prev,
        level: prev.level + 1,
        experience: prev.experience - experienceNeeded,
        type: getPetType(prev.level + 1),
      }));
      addMessage(`🌟 ${pet.name} evolved to level ${pet.level + 1}!`);
    }
  }, [pet.experience, pet.level, pet.name]);

  const getPetType = (level: number): PetStats['type'] => {
    if (level < 3) return 'egg';
    if (level < 6) return 'baby';
    if (level < 10) return 'teen';
    return 'adult';
  };

  const getPetEmoji = (type: PetStats['type']) => {
    switch (type) {
      case 'egg': return '🥚';
      case 'baby': return '🐣';
      case 'teen': return '🐥';
      case 'adult': return '🐓';
      default: return '🥚';
    }
  };

  const getPetMood = () => {
    const avg = (pet.hunger + pet.happiness + pet.energy) / 3;
    if (avg >= 80) return '😊';
    if (avg >= 60) return '😐';
    if (avg >= 40) return '😕';
    return '😢';
  };

  const addMessage = (message: string) => {
    setMessages(prev => [message, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setMessages(prev => prev.slice(0, -1));
    }, 5000);
  };

  const createParticles = (type: string, count: number = 5) => {
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      type,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setParticles(prev => [...prev, ...newParticles]);
  };

  const getAnimationClass = () => {
    switch (petAnimation) {
      case 'happy': return 'animate-float animate-glow';
      case 'eating': return 'animate-wiggle';
      case 'playing': return 'animate-spin';
      case 'sleeping': return 'animate-pulse opacity-70';
      case 'sad': return 'animate-pulse opacity-50';
      default: return 'animate-float';
    }
  };

  const feedPet = () => {
    if (points < 10) {
      addMessage('❌ Not enough points to feed! Complete more assignments!');
      return;
    }
    
    setPetAnimation('eating');
    createParticles('🍎', 3);
    
    setPet(prev => ({
      ...prev,
      hunger: Math.min(100, prev.hunger + 20),
      happiness: Math.min(100, prev.happiness + 5),
      experience: prev.experience + 10,
      lastFed: Date.now(),
    }));
    setPoints(prev => prev - 10);
    addMessage('🍎 Yummy! Your pet is well fed!');
    
    setTimeout(() => setPetAnimation('idle'), 2000);
  };

  const playWithPet = () => {
    if (points < 15) {
      addMessage('❌ Not enough points to play! Complete more assignments!');
      return;
    }
    
    setPetAnimation('playing');
    createParticles('🎾', 4);
    createParticles('💖', 2);
    
    setPet(prev => ({
      ...prev,
      happiness: Math.min(100, prev.happiness + 25),
      energy: Math.max(0, prev.energy - 10),
      experience: prev.experience + 15,
      lastPlayed: Date.now(),
    }));
    setPoints(prev => prev - 15);
    addMessage('🎾 Playtime! Your pet is so happy!');
    
    setTimeout(() => setPetAnimation('idle'), 3000);
  };

  const restPet = () => {
    if (points < 5) {
      addMessage('❌ Not enough points to rest! Complete more assignments!');
      return;
    }
    
    setPetAnimation('sleeping');
    createParticles('😴', 2);
    createParticles('💤', 3);
    
    setPet(prev => ({
      ...prev,
      energy: Math.min(100, prev.energy + 30),
      happiness: Math.min(100, prev.happiness + 5),
      experience: prev.experience + 5,
      lastRested: Date.now(),
    }));
    setPoints(prev => prev - 5);
    addMessage('😴 Rest time! Your pet feels refreshed!');
    
    setTimeout(() => setPetAnimation('idle'), 2500);
  };

  const getStatColor = (value: number) => {
    if (value >= 80) return 'text-green-500';
    if (value >= 60) return 'text-yellow-500';
    if (value >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getStatBarColor = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-yellow-500';
    if (value >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <>
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(5deg); }
          75% { transform: rotate(-5deg); }
        }
        
        @keyframes glow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
        }
        
        @keyframes particle-float {
          0% { 
            transform: translateY(0px) scale(1);
            opacity: 1;
          }
          100% { 
            transform: translateY(-50px) scale(0.5);
            opacity: 0;
          }
        }
        
        .animate-float {
          animation: float 2s ease-in-out infinite;
        }
        
        .animate-wiggle {
          animation: wiggle 0.5s ease-in-out infinite;
        }
        
        .animate-glow {
          animation: glow 1s ease-in-out infinite;
        }
        
        .animate-particle {
          animation: particle-float 2s ease-out forwards;
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🐾 Virtual Pet Care
          </h1>
          <p className="text-gray-600">
            Take care of your pet by completing assignments and earning care points!
          </p>
        </div>

        {/* Points Display */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Star className="w-6 h-6 text-yellow-500" />
                <span className="text-2xl font-bold text-gray-800">
                  {points}
                </span>
                <span className="text-gray-600">Care Points</span>
              </div>
              {showPoints && (
                <div className="animate-bounce text-green-500 font-bold">
                  +{assignmentPoints} points!
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Pet Level</div>
              <div className="text-2xl font-bold text-purple-600">
                {pet.level}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pet Display */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center relative">
              {/* Particle Effects */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {particles.map((particle) => (
                  <div
                    key={particle.id}
                    className="absolute text-2xl animate-particle"
                    style={{
                      left: `${particle.x}%`,
                      top: `${particle.y}%`,
                      animationDelay: `${Math.random() * 0.5}s`,
                    }}
                  >
                    {particle.type}
                  </div>
                ))}
              </div>
              
              {/* Pet with Animation */}
              <div className={`text-8xl mb-4 transition-all duration-300 ${getAnimationClass()}`}>
                {getPetEmoji(pet.type)}
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {pet.name} {getPetMood()}
              </h2>
              <p className="text-gray-600 mb-4">
                Level {pet.level} • {pet.type.charAt(0).toUpperCase() + pet.type.slice(1)}
              </p>
              
              {/* Experience Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Experience</span>
                  <span>{pet.experience}/{pet.level * 100}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(pet.experience / (pet.level * 100)) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center">
                      <Heart className="w-4 h-4 mr-1" />
                      Hunger
                    </span>
                    <span className={getStatColor(pet.hunger)}>{pet.hunger}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${getStatBarColor(pet.hunger)} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${pet.hunger}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center">
                      <Trophy className="w-4 h-4 mr-1" />
                      Happiness
                    </span>
                    <span className={getStatColor(pet.happiness)}>{pet.happiness}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${getStatBarColor(pet.happiness)} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${pet.happiness}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center">
                      <Zap className="w-4 h-4 mr-1" />
                      Energy
                    </span>
                    <span className={getStatColor(pet.energy)}>{pet.energy}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${getStatBarColor(pet.energy)} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${pet.energy}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-6">
            {/* Care Actions */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Take Care of {pet.name}
              </h3>
              <div className="space-y-4">
                <button
                  onClick={feedPet}
                  disabled={points < 10}
                  className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🍎</span>
                    <div className="text-left">
                      <div className="font-semibold">Feed Pet</div>
                      <div className="text-sm text-gray-600">+20 Hunger, +5 Happiness</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-bold">10</span>
                  </div>
                </button>

                <button
                  onClick={playWithPet}
                  disabled={points < 15}
                  className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🎾</span>
                    <div className="text-left">
                      <div className="font-semibold">Play</div>
                      <div className="text-sm text-gray-600">+25 Happiness, -10 Energy</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-bold">15</span>
                  </div>
                </button>

                <button
                  onClick={restPet}
                  disabled={points < 5}
                  className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">😴</span>
                    <div className="text-left">
                      <div className="font-semibold">Rest</div>
                      <div className="text-sm text-gray-600">+30 Energy, +5 Happiness</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-bold">5</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Pet Messages
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-gray-500 italic">No messages yet...</p>
                ) : (
                  messages.map((message, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                      {message}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Development Controls */}
            <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="text-2xl mr-2">🛠️</span>
                Development Controls
              </h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => setPoints(prev => prev + 50)}
                  className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-semibold transition-colors"
                >
                  +50 Points
                </button>
                <button
                  onClick={() => setPoints(prev => prev + 100)}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-semibold transition-colors"
                >
                  +100 Points
                </button>
                <button
                  onClick={() => setPoints(prev => prev + 200)}
                  className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm font-semibold transition-colors"
                >
                  +200 Points
                </button>
                <button
                  onClick={() => setPoints(0)}
                  className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-semibold transition-colors"
                >
                  Reset Points
                </button>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Test Animations:</h4>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPetAnimation('happy')}
                    className="px-2 py-1 bg-yellow-400 hover:bg-yellow-500 text-white rounded text-xs transition-colors"
                  >
                    Happy
                  </button>
                  <button
                    onClick={() => setPetAnimation('eating')}
                    className="px-2 py-1 bg-orange-400 hover:bg-orange-500 text-white rounded text-xs transition-colors"
                  >
                    Eating
                  </button>
                  <button
                    onClick={() => setPetAnimation('playing')}
                    className="px-2 py-1 bg-blue-400 hover:bg-blue-500 text-white rounded text-xs transition-colors"
                  >
                    Playing
                  </button>
                  <button
                    onClick={() => setPetAnimation('sleeping')}
                    className="px-2 py-1 bg-indigo-400 hover:bg-indigo-500 text-white rounded text-xs transition-colors"
                  >
                    Sleeping
                  </button>
                  <button
                    onClick={() => setPetAnimation('sad')}
                    className="px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-xs transition-colors"
                  >
                    Sad
                  </button>
                  <button
                    onClick={() => setPetAnimation('idle')}
                    className="px-2 py-1 bg-green-400 hover:bg-green-500 text-white rounded text-xs transition-colors"
                  >
                    Idle
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Test Particles:</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => createParticles('🍎', 5)}
                    className="px-2 py-1 bg-red-300 hover:bg-red-400 text-white rounded text-xs transition-colors"
                  >
                    Apple Particles
                  </button>
                  <button
                    onClick={() => createParticles('💖', 5)}
                    className="px-2 py-1 bg-pink-300 hover:bg-pink-400 text-white rounded text-xs transition-colors"
                  >
                    Heart Particles
                  </button>
                  <button
                    onClick={() => createParticles('🎾', 5)}
                    className="px-2 py-1 bg-green-300 hover:bg-green-400 text-white rounded text-xs transition-colors"
                  >
                    Ball Particles
                  </button>
                  <button
                    onClick={() => createParticles('⭐', 5)}
                    className="px-2 py-1 bg-yellow-300 hover:bg-yellow-400 text-white rounded text-xs transition-colors"
                  >
                    Star Particles
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Pet Stats:</h4>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPet(prev => ({ ...prev, hunger: Math.min(100, prev.hunger + 20) }))}
                    className="px-2 py-1 bg-green-300 hover:bg-green-400 text-white rounded text-xs transition-colors"
                  >
                    +Hunger
                  </button>
                  <button
                    onClick={() => setPet(prev => ({ ...prev, happiness: Math.min(100, prev.happiness + 20) }))}
                    className="px-2 py-1 bg-blue-300 hover:bg-blue-400 text-white rounded text-xs transition-colors"
                  >
                    +Happiness
                  </button>
                  <button
                    onClick={() => setPet(prev => ({ ...prev, energy: Math.min(100, prev.energy + 20) }))}
                    className="px-2 py-1 bg-purple-300 hover:bg-purple-400 text-white rounded text-xs transition-colors"
                  >
                    +Energy
                  </button>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Gift className="w-5 h-5 mr-2" />
                Tips
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Complete assignments to earn care points</li>
                <li>• Keep all stats above 40% for a happy pet</li>
                <li>• Your pet evolves as it gains experience</li>
                <li>• Higher level pets need more care but give better rewards</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
