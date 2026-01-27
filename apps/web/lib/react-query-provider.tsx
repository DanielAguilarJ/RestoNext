"use client";

/**
 * React Query Provider
 * Provides QueryClient context for all child components
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

interface ReactQueryProviderProps {
    children: ReactNode;
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
    // Create a QueryClient instance inside useState to avoid SSR issues
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // 1 minute
                        retry: 1,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
