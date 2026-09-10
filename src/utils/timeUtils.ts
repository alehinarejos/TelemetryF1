/**
 * Time and Countdown formatting utilities
 */

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  hasEnded: boolean;
}

/**
 * Calculates remaining days, hours, minutes and seconds from target date/iso.
 */
export function getCountdownParts(targetIsoOrMs: string | number): CountdownParts {
  const targetTime = typeof targetIsoOrMs === 'number' 
    ? targetIsoOrMs 
    : new Date(targetIsoOrMs).getTime();
  const now = Date.now();
  const totalMs = Math.max(0, targetTime - now);

  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);

  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs,
    hasEnded: totalMs <= 0,
  };
}

/**
 * Formats countdown dynamically:
 * - If days > 0: "21d 13h 24m 14s"
 * - If days === 0 && hours > 0: "13h 24m 14s"
 * - If days === 0 && hours === 0 && minutes > 0: "24m 14s"
 * - If days === 0 && hours === 0 && minutes === 0: "14s"
 */
export function formatDynamicCountdown(parts: CountdownParts): {
  prefixText: string;
  secondsText: string;
  fullText: string;
} {
  const { days, hours, minutes, seconds } = parts;

  let prefixText = '';
  if (days > 0) {
    prefixText = `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m `;
  } else if (hours > 0) {
    prefixText = `${hours}h ${String(minutes).padStart(2, '0')}m `;
  } else if (minutes > 0) {
    prefixText = `${minutes}m `;
  }

  const secondsText = `${String(seconds).padStart(2, '0')}s`;
  const fullText = `${prefixText}${secondsText}`.trim();

  return { prefixText, secondsText, fullText };
}
