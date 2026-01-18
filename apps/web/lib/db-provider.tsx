'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDatabase, RxRestoDatabase } from './db';

const DBContext = createContext<RxRestoDatabase | null>(null);

/**
 * RxDB Provider for offline-first functionality.
 * 
 * IMPORTANT: This provider is non-blocking. If RxDB fails to initialize,
 * the app will still render and function normally (just without offline support).
 * This prevents the "Initializing Database..." screen from freezing the UI
 * when there are issues with IndexedDB or the browser environment.
 */
export const RxDBProvider = ({ children }: { children: React.ReactNode }) => {
    const [db, setDb] = useState<RxRestoDatabase | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let isMounted = true;

        const initDB = async () => {
            try {
                // Add a timeout to prevent infinite waiting
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error('RxDB initialization timed out after 10s')), 10000);
                });

                const dbPromise = getDatabase();
                const _db = await Promise.race([dbPromise, timeoutPromise]);

                if (isMounted) {
                    setDb(_db);
                    console.log('[RxDB] Database initialized successfully');
                }
            } catch (err: any) {
                console.warn('[RxDB] Failed to initialize local database:', err?.message || err);
                if (isMounted) {
                    setError(err);
                    // Don't block the UI - app can still work without RxDB
                }
            } finally {
                if (isMounted) {
                    setIsInitializing(false);
                }
            }
        };

        initDB();

        return () => {
            isMounted = false;
        };
    }, []);

    // Show a brief loading state only for the first second
    // After that, render children anyway to prevent blocking
    if (isInitializing) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto mb-3"></div>
                    <p className="text-sm text-gray-500">Cargando...</p>
                </div>
            </div>
        );
    }

    // If there's an error, show a dismissible warning but still render children
    // This allows the app to function without offline support
    if (error && !db) {
        return (
            <DBContext.Provider value={null}>
                {/* Optional: Show a subtle warning banner */}
                <div className="fixed top-0 left-0 right-0 bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800 text-center z-50">
                    ⚠️ Modo offline no disponible. La aplicación funcionará normalmente con conexión a internet.
                    <button
                        onClick={() => setError(null)}
                        className="ml-4 text-yellow-600 hover:text-yellow-800 underline"
                    >
                        Cerrar
                    </button>
                </div>
                {children}
            </DBContext.Provider>
        );
    }

    return (
        <DBContext.Provider value={db}>
            {children}
        </DBContext.Provider>
    );
};

/**
 * Hook to access the RxDB database.
 * 
 * NOTE: This hook returns null if RxDB is not available (e.g., initialization failed).
 * Components should check for null and gracefully degrade to online-only mode.
 */
export const useRxDB = (): RxRestoDatabase | null => {
    return useContext(DBContext);
};

/**
 * Hook that throws if RxDB is required but not available.
 * Use this only in components that absolutely require offline support.
 */
export const useRequiredRxDB = (): RxRestoDatabase => {
    const db = useContext(DBContext);
    if (!db) {
        throw new Error('RxDB is required but not available. Check RxDBProvider initialization.');
    }
    return db;
};

