import { useEffect, useState } from "react";

// Simple localStorage-backed state hook (no SSR concerns in this app)
export function useLocalStorage<T>(
  key: string,
  initial: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      // ignore JSON/Storage errors
      void 0;
    }
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage errors
      void 0;
    }
  }, [key, value]);

  return [value, setValue];
}
