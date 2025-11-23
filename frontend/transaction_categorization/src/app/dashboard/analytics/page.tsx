"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { transactionService, categoryService, initializeData, Transaction, authService } from "@/lib/localStorageService";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    AreaChart,
    Area,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Activity } from "lucide-react";
import { toast } from "sonner";

const COLORS = [
    "#667eea", "#f5576c", "#4facfe", "#43e97b", 
    "#fa709a", "#30cfd0", "#a8edea", "#ff9a9e",
    "#0088FE", "#00C49F", "#FFBB28", "#FF8042"
];

export default function AnalyticsPage() {
    const [monthlyData, setMonthlyData] = useState<any>(null);
    const [weeklyData, setWeeklyData] = useState<any>(null);
    const [trendsData, setTrendsData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState("today");

    const fetchAnalytics = useCallback(() => {
        try {
            setLoading(true);
            const session = authService.getSession();
            const userId = session?.phone.replace(/\+/g, '');
            const allTransactions = transactionService.getAll(userId);
            
            // Calculate today's data
            const now = new Date();
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const todayTransactions = allTransactions.filter(t => {
                const txDate = new Date(t.date);
                return txDate >= todayStart && txDate <= now;
            });

            const todaySummary: Record<string, number> = {};
            todayTransactions.forEach(t => {
                if (t.type === 'debit') {
                    todaySummary[t.category] = (todaySummary[t.category] || 0) + t.amount;
                }
            });

            const todayTotal = todayTransactions.reduce((sum, t) => 
                sum + (t.type === 'debit' ? t.amount : 0), 0
            );

            // Calculate monthly data
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthlyTransactions = allTransactions.filter(t => 
                new Date(t.date) >= monthStart && new Date(t.date) <= now
            );
            
            const monthlySummary: Record<string, number> = {};
            monthlyTransactions.forEach(t => {
                if (t.type === 'debit') {
                    monthlySummary[t.category] = (monthlySummary[t.category] || 0) + t.amount;
                }
            });

            const monthlyTotal = monthlyTransactions.reduce((sum, t) => 
                sum + (t.type === 'debit' ? t.amount : 0), 0
            );

            // Calculate weekly data
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - 7);
            const weeklyTransactions = allTransactions.filter(t => {
                const txDate = new Date(t.date);
                return txDate >= weekStart && txDate <= now;
            });

            const weeklySummary: Record<string, number> = {};
            weeklyTransactions.forEach(t => {
                if (t.type === 'debit') {
                    weeklySummary[t.category] = (weeklySummary[t.category] || 0) + t.amount;
                }
            });

            const weeklyTotal = weeklyTransactions.reduce((sum, t) => 
                sum + (t.type === 'debit' ? t.amount : 0), 0
            );

            // Generate daily breakdown for today (hourly)
            const todayHourlyBreakdown: Array<{ date: string; total: number }> = [];
            for (let i = 0; i < 24; i += 3) {
                const hourStart = new Date(now);
                hourStart.setHours(i, 0, 0, 0);
                const hourEnd = new Date(now);
                hourEnd.setHours(i + 3, 0, 0, 0);
                const hourTransactions = todayTransactions.filter(t => {
                    const txDate = new Date(t.date);
                    return txDate >= hourStart && txDate < hourEnd;
                });
                const hourTotal = hourTransactions.reduce((sum, t) => 
                    sum + (t.type === 'debit' ? t.amount : 0), 0
                );
                todayHourlyBreakdown.push({
                    date: hourStart.toISOString(),
                    total: hourTotal,
                });
            }

            // Generate daily breakdown for monthly
            const dailyBreakdown: Array<{ date: string; total: number }> = [];
            for (let i = 0; i < 30; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dayTransactions = monthlyTransactions.filter(t => {
                    const txDate = new Date(t.date);
                    return txDate.toDateString() === date.toDateString();
                });
                const dayTotal = dayTransactions.reduce((sum, t) => 
                    sum + (t.type === 'debit' ? t.amount : 0), 0
                );
                dailyBreakdown.push({
                    date: date.toISOString().split('T')[0],
                    total: dayTotal,
                });
            }
            dailyBreakdown.reverse();

            // Generate trends data (last 6 months)
            const trendsMonths: Array<{ month: string; total: number }> = [];
            for (let i = 5; i >= 0; i--) {
                const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
                const monthTransactions = allTransactions.filter(t => {
                    const txDate = new Date(t.date);
                    return txDate >= monthDate && txDate <= monthEnd;
                });
                const monthTotal = monthTransactions.reduce((sum, t) => 
                    sum + (t.type === 'debit' ? t.amount : 0), 0
                );
                trendsMonths.push({
                    month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    total: monthTotal,
                });
            }

            // Set monthly data
            setMonthlyData({
                total_spent: monthlyTotal,
                total_transactions: monthlyTransactions.length,
                category_summary: monthlySummary,
                daily_breakdown: dailyBreakdown,
            });
            
            // Update weekly data
            setWeeklyData({
                total_spent: weeklyTotal,
                total_transactions: weeklyTransactions.length,
                category_summary: weeklySummary,
            });

            setTrendsData({
                months: trendsMonths,
            });
        } catch (error) {
            console.error("Failed to load analytics:", error);
            toast.error("Failed to load analytics data");
        } finally {
            setLoading(false);
        }
    }, [selectedPeriod]);

    useEffect(() => {
        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, '');
        initializeData(userId);
        fetchAnalytics();
    }, [fetchAnalytics]);

    // Recalculate current data based on selected period
    const currentData = useMemo(() => {
        if (selectedPeriod === "today") {
            const session = authService.getSession();
            const userId = session?.phone.replace(/\+/g, '');
            const allTransactions = transactionService.getAll(userId);
            const now = new Date();
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const todayTransactions = allTransactions.filter(t => {
                const txDate = new Date(t.date);
                return txDate >= todayStart && txDate <= now;
            });
            const todaySummary: Record<string, number> = {};
            todayTransactions.forEach(t => {
                if (t.type === 'debit') {
                    todaySummary[t.category] = (todaySummary[t.category] || 0) + t.amount;
                }
            });
            const todayTotal = todayTransactions.reduce((sum, t) => 
                sum + (t.type === 'debit' ? t.amount : 0), 0
            );
            const todayHourlyBreakdown: Array<{ date: string; total: number }> = [];
            for (let i = 0; i < 24; i += 3) {
                const hourStart = new Date(now);
                hourStart.setHours(i, 0, 0, 0);
                const hourEnd = new Date(now);
                hourEnd.setHours(i + 3, 0, 0, 0);
                const hourTransactions = todayTransactions.filter(t => {
                    const txDate = new Date(t.date);
                    return txDate >= hourStart && txDate < hourEnd;
                });
                const hourTotal = hourTransactions.reduce((sum, t) => 
                    sum + (t.type === 'debit' ? t.amount : 0), 0
                );
                todayHourlyBreakdown.push({
                    date: hourStart.toISOString(),
                    total: hourTotal,
                });
            }
            return {
                total_spent: todayTotal,
                total_transactions: todayTransactions.length,
                category_summary: todaySummary,
                daily_breakdown: todayHourlyBreakdown,
            };
        }
        const data = selectedPeriod === "monthly" ? monthlyData : weeklyData;
        return data || {
            total_spent: 0,
            total_transactions: 0,
            category_summary: {},
            daily_breakdown: [],
        };
    }, [selectedPeriod, monthlyData, weeklyData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Analytics
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Deep insights into your spending patterns
                    </p>
                </div>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-[140px]">
                        <Calendar className="mr-2 h-4 w-4" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                </Select>
            </motion.div>

            {/* Summary Cards */}
            {currentData && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid gap-4 md:grid-cols-3"
                >
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{currentData.total_spent?.toFixed(2) || "0.00"}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {selectedPeriod === "today" ? "Today" :
                                 selectedPeriod === "monthly" ? "This month" : "Last 7 days"}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{currentData.total_transactions || 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">Total transactions</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Categories</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {Object.keys(currentData.category_summary || {}).length}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Active categories</p>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Charts Grid */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {/* Daily/Weekly Breakdown */}
                {currentData?.daily_breakdown && currentData.daily_breakdown.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <CardTitle>Daily Spending Trend</CardTitle>
                                <CardDescription>
                                    {selectedPeriod === "today" ? "Hourly breakdown for today" :
                                     selectedPeriod === "monthly" ? "Daily breakdown for this month" : 
                                     "Daily breakdown for last 7 days"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={280} className="sm:h-[300px]">
                                    <AreaChart data={currentData.daily_breakdown?.map((item: any) => ({
                                        date: selectedPeriod === "today" 
                                            ? new Date(item.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                                            : new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                                        total: item.total
                                    })) || []}>
                                        <defs>
                                            <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis
                                            dataKey="date"
                                            stroke="hsl(var(--muted-foreground))"
                                            fontSize={12}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            stroke="hsl(var(--muted-foreground))"
                                            fontSize={12}
                                            tickLine={false}
                                            tickFormatter={(value) => `₹${value}`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--background))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '8px',
                                            }}
                                            formatter={(value: any) => [`₹${value.toFixed(2)}`, 'Spent']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="total"
                                            stroke="hsl(var(--primary))"
                                            fillOpacity={1}
                                            fill="url(#colorSpend)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Category Distribution */}
                {currentData?.category_summary && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="hover:shadow-lg transition-shadow w-full">
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle className="text-lg sm:text-xl">Category Breakdown</CardTitle>
                                <CardDescription>Spending by category</CardDescription>
                            </CardHeader>
                            <CardContent className="px-2 sm:px-6 pb-4 sm:pb-6">
                                <div className="w-full">
                                    <ResponsiveContainer width="100%" height={280} className="sm:h-[300px]">
                                        <PieChart>
                                            <Pie
                                                data={Object.entries(currentData.category_summary).map(([name, value]) => ({
                                                    name,
                                                    value: Number(value) || 0,
                                                }))}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={85}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {Object.entries(currentData.category_summary).map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'hsl(var(--background))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: '8px',
                                                }}
                                                formatter={(value: any) => [`₹${value.toFixed(2)}`, 'Amount']}
                                            />
                                            <Legend 
                                                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                                                iconType="circle"
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Category Comparison Bar Chart */}
                {currentData?.category_summary && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="md:col-span-2"
                    >
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <CardTitle>Category Comparison</CardTitle>
                                <CardDescription>Compare spending across all categories</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300} className="sm:h-[350px]">
                                    <BarChart
                                        data={Object.entries(currentData.category_summary)
                                            .map(([name, value]) => ({
                                                name,
                                                amount: Number(value) || 0,
                                            }))
                                            .sort((a, b) => b.amount - a.amount)
                                            .slice(0, 10)}
                                    >
                                        <XAxis
                                            dataKey="name"
                                            stroke="hsl(var(--muted-foreground))"
                                            fontSize={12}
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                        />
                                        <YAxis
                                            stroke="hsl(var(--muted-foreground))"
                                            fontSize={12}
                                            tickFormatter={(value) => `₹${value}`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--background))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '8px',
                                            }}
                                            formatter={(value: any) => [`₹${value.toFixed(2)}`, 'Amount']}
                                        />
                                        <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                                            {Object.entries(currentData.category_summary)
                                                .map(([name, value]) => ({
                                                    name,
                                                    amount: Number(value) || 0,
                                                }))
                                                .sort((a, b) => b.amount - a.amount)
                                                .slice(0, 10)
                                                .map((entry, index) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={COLORS[index % COLORS.length]}
                                                    />
                                                ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Trends Chart */}
                {trendsData?.months && trendsData.months.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="md:col-span-2"
                    >
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <CardTitle>6-Month Trend</CardTitle>
                                <CardDescription>Monthly spending trends over the last 6 months</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300} className="sm:h-[350px]">
                                    <LineChart data={trendsData.months}>
                                        <XAxis
                                            dataKey="month"
                                            stroke="hsl(var(--muted-foreground))"
                                            fontSize={12}
                                        />
                                        <YAxis
                                            stroke="hsl(var(--muted-foreground))"
                                            fontSize={12}
                                            tickFormatter={(value) => `₹${value}`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--background))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '8px',
                                            }}
                                            formatter={(value: any) => [`₹${value.toFixed(2)}`, 'Spent']}
                                        />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="total"
                                            stroke="hsl(var(--primary))"
                                            strokeWidth={2}
                                            dot={{ fill: "hsl(var(--primary))", r: 4 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </div>

            {/* Insights Section */}
            {currentData && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="grid gap-4 md:grid-cols-2"
                >
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle>Key Insights</CardTitle>
                            <CardDescription>AI-powered spending analysis</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4">
                                <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                                    <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                                    <div>
                                        <p className="font-medium">Top Spending Category</p>
                                        <p className="text-sm text-muted-foreground">
                                            {Object.entries(currentData.category_summary || {})
                                                .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || "N/A"}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            ₹{(() => {
                                                const topCategory = Object.entries(currentData.category_summary || {})
                                                    .sort(([, a], [, b]) => (b as number) - (a as number))[0];
                                                return topCategory ? Number(topCategory[1]).toFixed(2) : "0.00";
                                            })()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800">
                                    <DollarSign className="h-5 w-5 text-blue-500 mt-0.5" />
                                    <div>
                                        <p className="font-medium">Average per Transaction</p>
                                        <p className="text-sm text-muted-foreground">
                                            ₹{currentData.total_transactions > 0
                                                ? (currentData.total_spent / currentData.total_transactions).toFixed(2)
                                                : "0.00"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800">
                                    <Activity className="h-5 w-5 text-purple-500 mt-0.5" />
                                    <div>
                                        <p className="font-medium">Transaction Frequency</p>
                                        <p className="text-sm text-muted-foreground">
                                            {currentData.total_transactions || 0} transactions
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {selectedPeriod === "monthly" ? "This month" : "Last 7 days"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800">
                                    <TrendingDown className="h-5 w-5 text-orange-500 mt-0.5" />
                                    <div>
                                        <p className="font-medium">Categories Active</p>
                                        <p className="text-sm text-muted-foreground">
                                            {Object.keys(currentData.category_summary || {}).length} categories
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Spending Patterns Card */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle>Spending Patterns</CardTitle>
                            <CardDescription>Detailed breakdown and trends</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <p className="text-sm font-medium mb-2">Total Spending</p>
                                    <p className="text-2xl font-bold">₹{currentData.total_spent?.toFixed(2) || "0.00"}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {selectedPeriod === "monthly" ? "This month" : "Last 7 days"}
                                    </p>
                                </div>
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <p className="text-sm font-medium mb-2">Category Distribution</p>
                                    <div className="space-y-2 mt-3">
                                        {Object.entries(currentData.category_summary || {})
                                            .sort(([, a], [, b]) => (b as number) - (a as number))
                                            .slice(0, 5)
                                            .map(([name, value]) => {
                                                const percentage = ((Number(value) / currentData.total_spent) * 100).toFixed(1);
                                                return (
                                                    <div key={name} className="space-y-1">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="font-medium">{name}</span>
                                                            <span className="text-muted-foreground">{percentage}%</span>
                                                        </div>
                                                        <div className="w-full bg-muted rounded-full h-2">
                                                            <div 
                                                                className="bg-primary h-2 rounded-full transition-all"
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </div>
    );
}
