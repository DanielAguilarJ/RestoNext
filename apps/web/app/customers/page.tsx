"use client"

import { useState } from 'react';
import { CustomerList } from '../../components/crm/CustomerList';
import { CustomerProfile } from '../../components/crm/CustomerProfile';
import { Customer } from '../../lib/api';

export default function CustomersPage() {
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    return (
        <div className="h-screen w-full flex bg-slate-950 overflow-hidden">
            {/* Sidebar List */}
            <div className="w-1/3 min-w-[320px] max-w-[400px]">
                <CustomerList onSelectCustomer={setSelectedCustomer} />
            </div>

            {/* Main Profile View */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <CustomerProfile customer={selectedCustomer} />
            </div>
        </div>
    );
}
