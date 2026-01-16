"use client"

import { useState } from 'react';
import { Customer, customersApi } from '../../lib/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input'; // Assuming we edit or add address
import { MapPin, Wallet, Award, Phone, Mail } from 'lucide-react';

interface CustomerProfileProps {
    customer: Customer | null;
    onUpdate?: () => void;
}

export function CustomerProfile({ customer, onUpdate }: CustomerProfileProps) {
    if (!customer) {
        return (
            <div className="flex-1 flex items-center justify-center text-slate-400">
                Select a customer to view details
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{customer.name}</h1>
                    <div className="flex gap-4 text-slate-400">
                        {customer.phone && (
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" /> {customer.phone}
                            </div>
                        )}
                        {customer.email && (
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" /> {customer.email}
                            </div>
                        )}
                    </div>
                </div>
                <Badge className={`text-lg px-4 py-1 
            ${customer.tier_level === 'Gold' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500' :
                        customer.tier_level === 'Silver' ? 'bg-slate-300/20 text-slate-300 border-slate-300' :
                            'bg-orange-700/20 text-orange-700 border-orange-700'}`}>
                    {customer.tier_level} Member
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Loyalty Card */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Loyalty Points</CardTitle>
                        <Award className="w-5 h-5 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{customer.loyalty_points.toFixed(0)} pts</div>
                        <p className="text-xs text-slate-500 mt-1">Next reward at 1000 pts</p>
                    </CardContent>
                </Card>

                {/* Wallet Card */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Wallet Balance</CardTitle>
                        <Wallet className="w-5 h-5 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">${customer.wallet_balance.toFixed(2)}</div>
                        <p className="text-xs text-slate-500 mt-1">Available for redemption</p>
                    </CardContent>
                </Card>
            </div>

            {/* Addresses Section */}
            <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <MapPin className="w-5 h-5" /> Delivery Addresses
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {customer.addresses.length === 0 ? (
                        <p className="text-slate-500 italic">No addresses saved.</p>
                    ) : (
                        customer.addresses.map((addr, idx) => (
                            <div key={idx} className="p-3 rounded bg-slate-700/30 border border-slate-600/30 flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-white">{addr.label}</p>
                                    <p className="text-sm text-slate-400">{addr.address}</p>
                                    {addr.instructions && <p className="text-xs text-slate-500 mt-1">Note: {addr.instructions}</p>}
                                </div>
                            </div>
                        ))
                    )}
                    <Button variant="outline" size="sm" className="w-full border-dashed border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700">
                        + Add New Address
                    </Button>
                </CardContent>
            </Card>

            {/* Recent Activity Placeholder */}
            <div className="space-y-2">
                <h3 className="font-semibold text-white">Recent Activity</h3>
                <div className="p-4 rounded bg-slate-800/30 text-slate-500 text-sm italic text-center">
                    Transaction history will appear here.
                </div>
            </div>
        </div>
    );
}
