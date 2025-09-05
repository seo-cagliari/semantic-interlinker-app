import { useState, useEffect } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Lo stato viene inizializzato solo una volta con una funzione, 
  // che viene eseguita solo sul client.
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Questo codice viene eseguito solo sul client, evitando errori SSR
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;

      // Blocco try/catch per l'auto-correzione
      try {
        return JSON.parse(item);
      } catch (error) {
        console.warn(`Error parsing localStorage key “${key}”:`, error);
        // Auto-correzione: rimuove la chiave corrotta
        window.localStorage.removeItem(key);
        return initialValue;
      }
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      // Permetti a 'value' di essere una funzione per avere la stessa API di useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        if (valueToStore === undefined || valueToStore === null) {
            window.localStorage.removeItem(key);
        } else {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      }
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  };

  return [storedValue, setValue];
}

export default useLocalStorage;
