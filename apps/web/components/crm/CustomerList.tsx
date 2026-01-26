"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { customersApi, Customer } from '../../lib/api';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Search, Plus, User as UserIcon, ArrowLeft } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import { CreateCustomerModal } from './CreateCustomerModal';

interface CustomerListProps {
    onSelectCustomer: (customer: Customer) => void;
}

export function CustomerList({ onSelectCustomer }: CustomerListProps) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
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
        // Debounce search
        const timer = setTimeout(() => {
            fetchCustomers(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const handleCustomerCreated = () => {
        fetchCustomers(search);
        toast({
            title: "Cliente creado",
            description: "El cliente se ha agregado correctamente.",
        });
    };

    return (
        <>
            <div className="h-full flex flex-col bg-slate-900/50 backdrop-blur-md border-r border-slate-700/50">
                <div className="p-4 border-b border-slate-700/50 space-y-4">
                    {/* Header with back button */}
                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard"
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </Link>
                        <h2 className="text-xl font-bold text-white">Clientes</h2>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            placeholder="Buscar por nombre o teléfono..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-slate-800 border-slate-700 text-white"
                        />
                    </div>
                    <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus className="w-4 h-4 mr-2" /> Nuevo Cliente
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-slate-400">Cargando...</div>
                    ) : customers.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <UserIcon className="w-8 h-8 text-slate-600" />
                            </div>
                            <p className="text-slate-400 mb-2">
                                {search ? 'No se encontraron clientes' : 'Sin clientes aún'}
                            </p>
                            <p className="text-slate-500 text-sm">
                                {search ? 'Intenta con otra búsqueda' : 'Agrega tu primer cliente'}
                            </p>
                        </div>
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
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-white truncate">{customer.name}</h3>
                                            <p className="text-sm text-slate-400 truncate">{customer.phone || customer.email || 'Sin contacto'}</p>
                                        </div>
                                        {customer.tier_level && customer.tier_level !== 'Bronze' && (
                                            <span className={`text-xs px-2 py-1 rounded-full border ${customer.tier_level === 'Gold'
                                                    ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                                                    : 'bg-slate-300/20 text-slate-300 border-slate-300/30'
                                                }`}>
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

            <CreateCustomerModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleCustomerCreated}
            />
        </>
    );
}
