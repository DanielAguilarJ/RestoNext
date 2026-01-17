'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDatabase, RxRestoDatabase } from './db';

const DBContext = createContext<RxRestoDatabase | null>(null);

export const RxDBProvider = ({ children }: { children: React.ReactNode }) => {
    const [db, setDb] = useState<RxRestoDatabase | null>(null);

    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const initDB = async () => {
            try {
                const _db = await getDatabase();
                setDb(_db);
            } catch (err: any) {
                console.error("Failed to initialize RxDB:", err);
                setError(err);
            }
        };
        initDB();
    }, []);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
                <h2 className="text-xl font-bold text-red-500 mb-2">Database Error</h2>
                <p className="text-gray-600 mb-4">Error initializing local database.</p>
                <div className="bg-gray-100 p-4 rounded overflow-auto max-w-lg mb-4 text-left">
                    <code className="text-xs text-red-800">{error.message || JSON.stringify(error)}</code>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!db) {
        return <div className="flex items-center justify-center h-screen">Initializing Database...</div>;
    }

    return (
        <DBContext.Provider value={db}>
            {children}
        </DBContext.Provider>
    );
};

export const useRxDB = () => {
    const db = useContext(DBContext);
    if (!db) {
        throw new Error('useRxDB must be used within an RxDBProvider');
    }
    return db;
};
