import React, { createContext, useContext, useEffect, useState } from 'react';
import type * as SQLite from 'expo-sqlite';
import { getDb } from '../db/client';

interface DbContextValue {
  db: SQLite.SQLiteDatabase | null;
  isReady: boolean;
  error: Error | null;
}

const DbContext = createContext<DbContextValue>({ db: null, isReady: false, error: null });

export function DbProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DbContextValue>({ db: null, isReady: false, error: null });

  useEffect(() => {
    let cancelled = false;
    getDb()
      .then((db) => {
        if (!cancelled) setState({ db, isReady: true, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ db: null, isReady: false, error });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <DbContext.Provider value={state}>{children}</DbContext.Provider>;
}

export function useDbState(): DbContextValue {
  return useContext(DbContext);
}

/** Returns the ready database instance, or null while still initialising/seeding. */
export function useDb(): SQLite.SQLiteDatabase | null {
  return useContext(DbContext).db;
}
