"use client"

import { useState, useEffect } from 'react';
import { customersApi, Customer } from '../../lib/api';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Search, Plus, User as UserIcon } from 'lucide-react';
import { useToast } from '../ui/use-toast';

interface CustomerListProps {
    onSelectCustomer: (customer: Customer) => void;
}

export function CustomerList({ onSelectCustomer }: CustomerListProps) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const fetchCustomers = async (searchTerm = '') => {
        setLoading(true);
        try {
            const data = await customersApi.list(searchTerm);
            setCustomers(data);
        } catch (error) {
            toast({
                title: "Error fetching customers",
                description: "Could not load customer list.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Debounce search could be added here
        fetchCustomers(search);
    }, [search]);

    return (
        <div className="h-full flex flex-col bg-slate-900/50 backdrop-blur-md border-r border-slate-700/50">
            <div className="p-4 border-b border-slate-700/50 space-y-4">
                <h2 className="text-xl font-bold text-white mb-2">Customers</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                        placeholder="Search name or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-slate-800 border-slate-700 text-white"
                    />
                </div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-2" /> New Customer
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="p-4 text-center text-slate-400">Loading...</div>
                ) : (
                    <div className="divide-y divide-slate-700/50">
                        {customers.map((customer) => (
                            <div
                                key={customer.id}
                                onClick={() => onSelectCustomer(customer)}
                                className="p-4 hover:bg-slate-800/50 cursor-pointer transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                        <UserIcon className="w-5 h-5 text-slate-300" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-white">{customer.name}</h3>
                                        <p className="text-sm text-slate-400">{customer.phone || customer.email}</p>
                                    </div>
                                    {customer.tier_level !== 'Bronze' && (
                                        <span className="ml-auto text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                            {customer.tier_level}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
