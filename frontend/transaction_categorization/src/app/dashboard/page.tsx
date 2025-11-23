"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { transactionService, categoryService, initializeData, Transaction, authService } from "@/lib/localStorageService";
import { AddCategoryDialog } from "@/components/AddCategoryDialog";
import { CategoriesDialog } from "@/components/CategoriesDialog";
import { TransactionList } from "@/components/TransactionList";
import { DashboardCharts } from "@/components/DashboardCharts";
import { NotificationSimulator } from "@/components/NotificationSimulator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IndianRupee, CreditCard, Activity, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import Link from "next/link";
import { pinService } from "@/lib/localStorageService";
import { Lock, X } from "lucide-react";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

type TimePeriod = "today" | "weekly" | "monthly" | "yearly";

export default function DashboardPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timePeriod, setTimePeriod] = useState<TimePeriod>("today");
    const [categories, setCategories] = useState<string[]>([]);
    const [showCategories, setShowCategories] = useState(false);
    const [showPinReminder, setShowPinReminder] = useState(false);
    const { theme } = useTheme();

    useEffect(() => {
        // Initialize data on mount for current user
        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, '');
        initializeData(userId);
        
        // Check if PIN is set
        if (userId) {
            const hasPin = pinService.exists(userId);
            setShowPinReminder(!hasPin);
        }
    }, []);

    const fetchData = useCallback(() => {
        try {
            setLoading(true);
            const session = authService.getSession();
            const userId = session?.phone.replace(/\+/g, '');
            const allTransactions = transactionService.getAll(userId);
            const allCategories = categoryService.getNames(userId);
            
            // Sort by date (newest first) and show recent 10
            const sortedTransactions = [...allTransactions].sort((a, b) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            setTransactions(sortedTransactions.slice(0, 10));
            
            // Calculate summary
            const now = new Date();
            let periodStart = new Date();
            
            switch (timePeriod) {
                case "today":
                    periodStart.setHours(0, 0, 0, 0);
                    break;
                case "weekly":
                    periodStart.setDate(now.getDate() - 7);
                    break;
                case "monthly":
                    periodStart.setMonth(now.getMonth() - 1);
                    break;
                case "yearly":
                    periodStart.setFullYear(now.getFullYear() - 1);
                    break;
            }

            const periodTransactions = allTransactions.filter(t => {
                const txDate = new Date(t.date);
                return txDate >= periodStart && txDate <= now;
            });

            const totalSpent = periodTransactions.reduce((sum, t) => sum + (t.type === 'debit' ? t.amount : 0), 0);
            const categorySummary: Record<string, number> = {};

            periodTransactions.forEach(t => {
                if (t.type === 'debit') {
                    categorySummary[t.category] = (categorySummary[t.category] || 0) + t.amount;
                }
            });

            const highestCategory = Object.entries(categorySummary).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

            setSummary({
                total_spent: totalSpent,
                total_transactions: periodTransactions.length,
                category_summary: categorySummary,
                highest_spending_category: highestCategory,
            });

            // Combine categories from service and summary
            const summaryCategories = Object.keys(categorySummary);
            const combined = [...new Set([...allCategories, ...summaryCategories])];
            setCategories(combined);
        } catch (error: any) {
            console.error("Failed to load data:", error);
            toast.error("Failed to load data");
            setTransactions([]);
            setSummary({
                total_spent: 0,
                total_transactions: 0,
                category_summary: {},
                highest_spending_category: null,
            });
        } finally {
            setLoading(false);
        }
    }, [timePeriod]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCategoryAdded = useCallback(() => {
        // Refresh categories list first
        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, '');
        const updatedCategories = categoryService.getNames(userId);
        setCategories(updatedCategories);
        // Then refresh data
        fetchData();
    }, [fetchData]);

    const categoryCount = useMemo(() => {
        return categories.length || Object.keys(summary?.category_summary || {}).length;
    }, [categories, summary]);

    if (loading && !summary) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Dashboard
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Welcome back! Here's your financial overview
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <NotificationSimulator onTransactionAdded={fetchData} />
                    <AddCategoryDialog onCategoryAdded={handleCategoryAdded} />
                    <Link href="/dashboard/transactions">
                        <Button variant="outline">
                            View All Transactions
                        </Button>
                    </Link>
                </div>
            </motion.div>

            {/* PIN Reminder Banner */}
            {showPinReminder && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-center justify-between gap-4"
                >
                    <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
                            <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                                Add PIN lock to secure your app
                            </h3>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                Set up a 4-digit PIN in Settings to protect your financial data
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/dashboard/settings">
                            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white">
                                Setup PIN
                            </Button>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setShowPinReminder(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Categories Dialog */}
            <CategoriesDialog 
                open={showCategories} 
                onOpenChange={setShowCategories}
                categories={categories}
            />

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            >
                <motion.div variants={item}>
                    <Card className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500 dark:border-l-blue-400">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Spent
                            </CardTitle>
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"
                            >
                                <IndianRupee className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </motion.div>
                        </CardHeader>
                        <CardContent>
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="text-2xl md:text-3xl font-bold"
                            >
                                ₹{summary?.total_spent?.toFixed(2) || "0.00"}
                            </motion.div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {timePeriod === 'today' ? 'Today' : 
                                 timePeriod === 'monthly' ? 'Last month' : 
                                 timePeriod === 'weekly' ? 'Last 7 days' : 'This year'}
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-500 dark:border-l-green-400">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Transactions
                            </CardTitle>
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: -5 }}
                                className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"
                            >
                                <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </motion.div>
                        </CardHeader>
                        <CardContent>
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="text-2xl md:text-3xl font-bold"
                            >
                                {summary?.total_transactions || 0}
                            </motion.div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Total processed transactions
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-purple-500 dark:border-l-purple-400">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Top Category
                            </CardTitle>
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg"
                            >
                                <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </motion.div>
                        </CardHeader>
                        <CardContent>
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="text-xl md:text-2xl font-bold truncate"
                            >
                                {summary?.highest_spending_category || "N/A"}
                            </motion.div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Highest spending category
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card 
                        className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-orange-500 dark:border-l-orange-400 cursor-pointer"
                        onClick={() => setShowCategories(!showCategories)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Categories
                            </CardTitle>
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: -5 }}
                                className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg"
                            >
                                <Activity className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            </motion.div>
                        </CardHeader>
                        <CardContent>
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="text-2xl md:text-3xl font-bold"
                            >
                                {categoryCount}
                            </motion.div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Click to view all categories
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                {summary && (
                    <DashboardCharts 
                        data={summary} 
                        timePeriod={timePeriod}
                        onTimePeriodChange={setTimePeriod}
                    />
                )}
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid gap-4"
            >
                <TransactionList transactions={transactions} />
            </motion.div>
        </div>
    );
}
