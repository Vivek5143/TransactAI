"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { transactionService, categoryService, authService } from "@/lib/localStorageService";
import { TransactionCategorizeNotification } from "./TransactionCategorizeNotification";

export function NotificationSimulator({ onTransactionAdded }: { onTransactionAdded?: () => void }) {
    const [showCategorizeDialog, setShowCategorizeDialog] = useState(false);
    const [pendingTransaction, setPendingTransaction] = useState<{ amount: number; receiver: string } | null>(null);

    const simulateTransaction = () => {
        const isBusiness = Math.random() > 0.5;
        const amount = Math.floor(Math.random() * 5000) + 100;
        const receiver = isBusiness ? "Amazon India" : "Ramesh Kumar";

        // Simulate receiving a transaction
        // In a real app, this would come from a background service reading SMS

        if (isBusiness) {
            toast.success(`Transaction Categorized Successfully`, {
                description: `Paid ₹${amount} to ${receiver}. Category: Shopping`,
                action: {
                    label: "View",
                    onClick: () => console.log("View transaction"),
                },
            });
            // Auto-save to backend simulation
            saveTransaction(amount, receiver, "Shopping");
        } else {
            // Show dialog for personal transactions
            setPendingTransaction({ amount, receiver });
            setShowCategorizeDialog(true);
        }
    };

    const saveTransaction = (amount: number, receiver: string, category: string) => {
        try {
            const session = authService.getSession();
            const userId = session?.phone.replace(/\+/g, '');
            
            // Check if category exists, if not add it
            const categories = categoryService.getNames(userId);
            if (!categories.find(c => c.toLowerCase() === category.toLowerCase())) {
                categoryService.add(category, userId);
            }

            // Create transaction
            const transaction = {
                id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                description: `Payment to ${receiver}`,
                amount,
                category,
                date: new Date().toISOString(),
                recipient: receiver,
                type: 'debit' as const,
            };

            transactionService.save(transaction, userId);
            toast.success(`Transaction saved: ₹${amount} to ${receiver} (${category})`);
            // Force refresh
            if (onTransactionAdded) {
                setTimeout(() => {
                    onTransactionAdded();
                }, 100);
            }
        } catch (e) {
            console.error("Failed to save transaction", e);
            toast.error("Failed to save transaction");
        }
    };

    const handleCategorized = (category: string) => {
        if (pendingTransaction) {
            saveTransaction(pendingTransaction.amount, pendingTransaction.receiver, category);
            setPendingTransaction(null);
        }
    };

    return (
        <>
            <Button variant="outline" onClick={simulateTransaction}>
                <Bell className="mr-2 h-4 w-4" /> Simulate Transaction
            </Button>
            {pendingTransaction && (
                <TransactionCategorizeNotification
                    open={showCategorizeDialog}
                    amount={pendingTransaction.amount}
                    receiver={pendingTransaction.receiver}
                    onCategorized={handleCategorized}
                    onDismiss={() => {
                        setShowCategorizeDialog(false);
                        setPendingTransaction(null);
                    }}
                />
            )}
        </>
    );
}
