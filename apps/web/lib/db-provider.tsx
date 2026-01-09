'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDatabase, RxRestoDatabase } from './db';

const DBContext = createContext<RxRestoDatabase | null>(null);

export const RxDBProvider = ({ children }: { children: React.ReactNode }) => {
    const [db, setDb] = useState<RxRestoDatabase | null>(null);

    useEffect(() => {
        const initDB = async () => {
            const _db = await getDatabase();
            setDb(_db);
        };
        initDB();
    }, []);

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
