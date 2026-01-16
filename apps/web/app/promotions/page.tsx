"use client"

import { useState, useEffect } from 'react';
import { promotionsApi, Promotion } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Tag, Sparkles, Plus } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';

export default function PromotionsPage() {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        loadPromotions();
    }, []);

    const loadPromotions = async () => {
        try {
            const data = await promotionsApi.listActive();
            setPromotions(data);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-8 h-screen w-full bg-slate-950 overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="text-purple-500" /> Promotions Engine
                    </h1>
                    <p className="text-slate-400">Configure discounts, happy hours, and special offers</p>
                </div>
                <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="mr-2 h-4 w-4" /> Create Promotion
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Placeholder for 'Create New' quick card */}
                <Card className="bg-slate-900 border-dashed border-2 border-slate-800 flex flex-col items-center justify-center p-6 cursor-pointer hover:border-purple-500/50 hover:bg-slate-900/80 transition-all group">
                    <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-purple-500/20 flex items-center justify-center mb-4 transition-colors">
                        <Plus className="w-6 h-6 text-slate-500 group-hover:text-purple-500" />
                    </div>
                    <h3 className="font-medium text-slate-300 group-hover:text-white">New Promotion Rule</h3>
                </Card>

                {promotions.length === 0 && (
                    <Card className="bg-slate-900 border-slate-800 opacity-70">
                        <CardHeader>
                            <CardTitle className="text-white">Example: Happy Hour</CardTitle>
                            <CardDescription>2x1 on Beers (Mon-Thu)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Badge variant="outline" className="border-green-500 text-green-500">Active Example</Badge>
                        </CardContent>
                    </Card>
                )}

                {promotions.map((promo) => (
                    <Card key={promo.id} className="bg-slate-900 border-slate-800">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-white text-lg">{promo.name}</CardTitle>
                                <Switch checked={promo.is_active} />
                            </div>
                            <CardDescription>{promo.description || "No description provided"}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <Badge className="bg-slate-800 text-slate-300">
                                    {promo.effect?.type === 'discount_percentage' ? `${promo.effect.value}% OFF` : 'Special Offer'}
                                </Badge>
                                {promo.rules?.time_start && (
                                    <Badge variant="outline" className="border-slate-700 text-slate-400">
                                        {promo.rules.time_start} - {promo.rules.time_end}
                                    </Badge>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
