import { useMemo, useState } from 'react';
import { GREETINGS, QUOTES } from '../data/constants';

export default function useGreeting(now, name) {
  const [seed] = useState(Math.random());
  const h = now.getHours();
  const period = h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 19 ? 'afternoon' : 'evening';
  const greeting = useMemo(() => {
    const l = GREETINGS[period];
    return l[Math.floor(seed * l.length)].replace('{n}', name && seed > 0.35 ? `, ${name}` : '');
  }, [period, name, seed]);
  const day = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
  const quote = QUOTES[(day * 7919 + 13) % QUOTES.length]; // salto primo: días seguidos nunca repiten ni van en orden
  return { period, greeting, quote };
}
