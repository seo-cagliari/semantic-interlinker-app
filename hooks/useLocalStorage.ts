import { useState, useEffect } from 'react';

function useLocalStorage<T>(key: string | null, initialValue: T): [T, (value: T | null) => void] {
  // Lo stato viene inizializzato con il valore di default.
  // Questo garantisce che il rendering del server e il rendering iniziale del client siano identici, evitando errori di idratazione.
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // useEffect viene eseguito solo sul client dopo il montaggio del componente.
  useEffect(() => {
    // Non fare nulla se siamo sul server o se la chiave non è fornita.
    if (typeof window === 'undefined' || !key) {
      // Se la chiave diventa null, potremmo voler resettare il valore allo stato iniziale.
      if (!key) {
        setStoredValue(initialValue);
      }
      return;
    }

    try {
      const item = window.localStorage.getItem(key);
      // Se un elemento viene trovato, lo analizza e aggiorna lo stato.
      // Questo attiverà un secondo rendering con il valore idratato.
      const valueFromStorage = item ? JSON.parse(item) : initialValue;
      setStoredValue(valueFromStorage);
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      // In caso di errore (es. parsing), torna al valore iniziale.
      setStoredValue(initialValue);
    }
  // Esegui nuovamente l'effetto se la chiave cambia. `initialValue` è incluso per coerenza.
  }, [key, initialValue]);

  const setValue = (value: T | null) => {
    // Non fare nulla se siamo sul server o se la chiave non è fornita.
    if (typeof window === 'undefined' || !key) {
      return;
    }
    
    try {
      // Permetti a 'value' di essere una funzione per avere la stessa API di useState.
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Aggiorna lo stato.
      setStoredValue(valueToStore);
      
      // Persisti su localStorage.
      if (valueToStore === undefined || valueToStore === null) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  };

  return [storedValue, setValue];
}

export default useLocalStorage;
