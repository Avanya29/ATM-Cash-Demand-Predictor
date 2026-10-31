import { useState, useEffect } from 'react';

/**
 * Custom hook to smoothly animate numbers from 0 to target value.
 * Respects prefers-reduced-motion.
 */
export function useAnimatedCounter(targetValue, duration = 1200) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const end = Number(targetValue);

    if (isNaN(end)) {
      setDisplayValue(targetValue);
      return;
    }

    if (prefersReducedMotion || duration <= 0) {
      setDisplayValue(end);
      return;
    }

    let startTime = null;
    let animationFrameId = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(easedProgress * end));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [targetValue, duration]);

  return displayValue;
}
