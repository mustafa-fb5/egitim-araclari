import { useState, useEffect, useCallback } from "react";

function getActiveUserPrefix(): string {
  if (typeof window === "undefined") return "guest";
  try {
    const raw = localStorage.getItem("egitim_araclari_user_session");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.uid) return String(parsed.uid);
      if (parsed?.email) return String(parsed.email).replace(/[^a-zA-Z0-9]/g, "_");
    }
  } catch {
    // ignore
  }
  return "guest";
}

export function usePersistentState<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [state, setState] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  const scopedKey = `${getActiveUserPrefix()}__${key}`;

  useEffect(() => {
    try {
      const item = localStorage.getItem(scopedKey);
      if (item !== null) {
        setState(JSON.parse(item));
      }
    } catch (e) {
      console.warn(`Error reading localStorage key "${scopedKey}":`, e);
    }
    setHydrated(true);
  }, [scopedKey]);

  const setPersistentState = useCallback((value: T | ((val: T) => T)) => {
    setState((prev) => {
      const next = typeof value === "function" ? (value as (val: T) => T)(prev) : value;
      try {
        localStorage.setItem(scopedKey, JSON.stringify(next));
      } catch (e) {
        console.warn(`Error setting localStorage key "${scopedKey}":`, e);
      }
      return next;
    });
  }, [scopedKey]);

  return [state, setPersistentState];
}
