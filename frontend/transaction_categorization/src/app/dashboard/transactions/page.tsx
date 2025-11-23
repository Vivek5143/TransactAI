"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { transactionService, categoryService, Transaction, authService } from "@/lib/localStorageService";
import { Download, FileText, FileSpreadsheet, FileJson, Filter, Search } from "lucide-react";
import { toast } from "sonner";

type TimePeriod = "today" | "weekly" | "monthly" | "yearly";
type ExportFormat = "csv" | "json" | "xlsx";

// Add this to fetch and display transactions from backend
useEffect(() => {
  const loadTransactions = async () => {
    const data = await fetchTransactions();
    setTransactions(data.transactions);
  };
  loadTransactions();
}, []);

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("today");
    const [searchQuery, setSearchQuery] = useState("");
    const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, '');
        const allCategories = categoryService.getNames(userId);
        setCategories(allCategories);
        loadTransactions();
    }, []);

    useEffect(() => {
        filterTransactions();
    }, [transactions, selectedCategory, selectedPeriod, searchQuery]);

    const loadTransactions = () => {
        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, '');
        const allTransactions = transactionService.getAll(userId);
        setTransactions(allTransactions);
    };

    const filterTransactions = () => {
        let filtered = [...transactions];

        // Filter by category
        if (selectedCategory !== "all") {
            filtered = filtered.filter(t => t.category === selectedCategory);
        }

        // Filter by time period
        const now = new Date();
        const periodStart = new Date();
        
        switch (selectedPeriod) {
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

        filtered = filtered.filter(t => {
            const txDate = new Date(t.date);
            return txDate >= periodStart && txDate <= now;
        });

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.description.toLowerCase().includes(query) ||
                t.category.toLowerCase().includes(query) ||
                t.recipient?.toLowerCase().includes(query)
            );
        }

        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setFilteredTransactions(filtered);
    };

    const handleCategoryChange = (transactionId: string, newCategory: string) => {
        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, '');
        transactionService.update(transactionId, { category: newCategory }, userId);
        loadTransactions();
        toast.success("Category updated successfully");
    };

    const exportData = () => {
        const data = filteredTransactions.map(t => ({
            Date: new Date(t.date).toLocaleDateString(),
            Description: t.description,
            Amount: `₹${t.amount.toFixed(2)}`,
            Category: t.category,
            Recipient: t.recipient || "N/A",
            Type: t.type || "debit",
        }));

        let content = "";
        let mimeType = "";
        let filename = "";

        switch (exportFormat) {
            case "csv":
                const headers = Object.keys(data[0] || {}).join(",");
                const rows = data.map(row => Object.values(row).join(","));
                content = [headers, ...rows].join("\n");
                mimeType = "text/csv";
                filename = `transactions_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`;
                break;
            case "json":
                content = JSON.stringify(data, null, 2);
                mimeType = "application/json";
                filename = `transactions_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.json`;
                break;
            case "xlsx":
                // For XLSX, we'll create a CSV that Excel can open
                const xlsxHeaders = Object.keys(data[0] || {}).join("\t");
                const xlsxRows = data.map(row => Object.values(row).join("\t"));
                content = [xlsxHeaders, ...xlsxRows].join("\n");
                mimeType = "application/vnd.ms-excel";
                filename = `transactions_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.xls`;
                break;
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(`Data exported as ${exportFormat.toUpperCase()}`);
    };

    const getTotalAmount = useMemo(() => {
        return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    }, [filteredTransactions]);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Transactions
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Manage and categorize your transactions
                    </p>
                </div>
            </motion.div>

            {/* Filters and Export */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filters & Export
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Search</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search transactions..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Category</label>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Time Period</label>
                                <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as TimePeriod)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="today">Today</SelectItem>
                                        <SelectItem value="weekly">Last 7 Days</SelectItem>
                                        <SelectItem value="monthly">Last Month</SelectItem>
                                        <SelectItem value="yearly">Last Year</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Export Format</label>
                                <div className="flex gap-2">
                                    <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="csv">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4" />
                                                    CSV
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="json">
                                                <div className="flex items-center gap-2">
                                                    <FileJson className="h-4 w-4" />
                                                    JSON
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="xlsx">
                                                <div className="flex items-center gap-2">
                                                    <FileSpreadsheet className="h-4 w-4" />
                                                    Excel
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={exportData} className="px-4">
                                        <Download className="h-4 w-4 mr-2" />
                                        Export
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Total Transactions:</span>
                                <span className="text-lg font-bold">{filteredTransactions.length}</span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-sm font-medium">Total Amount:</span>
                                <span className="text-lg font-bold">₹{getTotalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Transactions Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle>Transaction List</CardTitle>
                        <CardDescription>
                            Click on category dropdown to change transaction category
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                                        <th className="text-left py-3 px-4 font-semibold text-sm">Description</th>
                                        <th className="text-left py-3 px-4 font-semibold text-sm">Amount</th>
                                        <th className="text-left py-3 px-4 font-semibold text-sm">Category</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-8 text-muted-foreground">
                                                No transactions found
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTransactions.map((transaction, index) => (
                                            <motion.tr
                                                key={transaction.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.02 }}
                                                className="border-b hover:bg-muted/50 transition-colors"
                                            >
                                                <td className="py-3 px-4">
                                                    {new Date(transaction.date).toLocaleDateString('en-IN', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </td>
                                                <td className="py-3 px-4 font-medium">
                                                    {transaction.description}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`font-semibold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Select
                                                        value={transaction.category}
                                                        onValueChange={(value) => handleCategoryChange(transaction.id, value)}
                                                    >
                                                        <SelectTrigger className="w-[180px]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {categories.map(cat => (
                                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}

