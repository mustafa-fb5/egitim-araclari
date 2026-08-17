"use client";

import { useState, useEffect } from "react";

export function usePersistentState<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [state, setState] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        setState(JSON.parse(item));
      }
    } catch (e) {
      console.warn(`Error reading localStorage key "${key}":`, e);
    }
    setHydrated(true);
  }, [key]);

  const setPersistentState = (value: T | ((val: T) => T)) => {
    setState((prev) => {
      const next = typeof value === "function" ? (value as (val: T) => T)(prev) : value;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch (e) {
        console.warn(`Error setting localStorage key "${key}":`, e);
      }
      return next;
    });
  };

  return [state, setPersistentState];
}
