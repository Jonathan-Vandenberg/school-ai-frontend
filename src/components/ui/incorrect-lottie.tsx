'use client'

import { useEffect, useRef } from 'react';
import lottie, { AnimationItem } from 'lottie-web';

interface IncorrectLottieProps {
  onComplete?: () => void;
}

const IncorrectLottie = ({ onComplete }: IncorrectLottieProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref up to date
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous animation if it exists
    if (animationRef.current) {
      animationRef.current.destroy();
      animationRef.current = null;
    }

    // Load the animation
    animationRef.current = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: false, // Play once
      autoplay: true,
      path: '/incorrect.json', // Path to the JSON file in public folder
    });

    // Listen for animation complete event
    const handleComplete = () => {
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    };

    animationRef.current.addEventListener('complete', handleComplete);

    return () => {
      // Cleanup on unmount
      if (animationRef.current) {
        animationRef.current.removeEventListener('complete', handleComplete);
        animationRef.current.destroy();
        animationRef.current = null;
      }
    };
  }, []);

  return (
    <div className='flex items-center justify-center h-full w-full'>
      <div 
        ref={containerRef} 
        style={{ width: '120px', height: '120px', transform: 'translateY(-8px)' }}
      />
    </div>
  );
};

export default IncorrectLottie;

