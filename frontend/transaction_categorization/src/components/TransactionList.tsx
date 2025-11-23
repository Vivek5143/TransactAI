"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Transaction } from "@/lib/localStorageService";
import { motion } from "framer-motion";

export const TransactionList = memo(function TransactionList({ transactions }: { transactions: Transaction[] }) {
    if (transactions.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                        No transactions found.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {transactions.map((txn, index) => (
                            <motion.div
                                key={txn.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border-b last:border-0"
                            >
                                <div className="flex flex-col flex-1">
                                    <span className="font-medium text-sm md:text-base">
                                        {txn.description || txn.recipient || "Unknown"}
                                    </span>
                                    <span className="text-xs text-muted-foreground mt-1">
                                        {format(new Date(txn.date), "MMM d, yyyy h:mm a")}
                                    </span>
                                </div>
                                <div className="flex flex-col items-end ml-4">
                                    <span className={`font-bold text-sm md:text-base ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                        {txn.type === 'credit' ? '+' : '-'}₹{txn.amount?.toFixed(2) || "0.00"}
                                    </span>
                                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary mt-1">
                                        {txn.category}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </CardContent>
        </Card>
    );
});
