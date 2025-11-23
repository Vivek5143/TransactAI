"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface CategoriesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: string[];
}

export function CategoriesDialog({ open, onOpenChange, categories }: CategoriesDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        All Categories
                    </DialogTitle>
                    <DialogDescription>
                        View all transaction categories in your account
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {categories.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                            {categories.map((cat, index) => (
                                <motion.div
                                    key={cat}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 hover:bg-primary/20 transition-colors"
                                >
                                    {cat}
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No categories found. Add categories to organize your transactions.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

