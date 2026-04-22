import { useState, useEffect, useRef, useCallback } from 'react';
import { createProvider } from '../lib/providers';

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [breakpoint]);
  return isMobile;
}

export function useLiveRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref;
}

export function useApiRefs(base: string, apiKey: string) {
  return { baseR: useLiveRef(base), keyR: useLiveRef(apiKey) };
}

export function useProvider(base: string, apiKey: string, providerConfig?: any) {
  const { baseR, keyR } = useApiRefs(base, apiKey);
  const configR = useLiveRef(providerConfig);
  const getProvider = useCallback(
    () => createProvider(baseR.current, keyR.current, configR.current),
    [baseR, keyR, configR]
  );
  return { baseR, keyR, getProvider };
}
