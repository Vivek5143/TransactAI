"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { categoryService, authService } from "@/lib/localStorageService";
import { motion } from "framer-motion";

interface CategorizeTransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    amount: number;
    receiver: string;
    onCategorized: (category: string) => void;
}

export function CategorizeTransactionDialog({
    open,
    onOpenChange,
    amount,
    receiver,
    onCategorized,
}: CategorizeTransactionDialogProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [newCategory, setNewCategory] = useState<string>("");
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        if (open) {
            const session = authService.getSession();
            const userId = session?.phone.replace(/\+/g, '');
            const allCategories = categoryService.getNames(userId);
            setCategories(allCategories);
            setSelectedCategory("");
            setNewCategory("");
            setShowAddCategory(false);
        }
    }, [open]);

    const handleAddCategory = () => {
        if (!newCategory.trim()) {
            toast.error("Please enter a category name");
            return;
        }

        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, '');
        const categoryName = newCategory.trim();
        const existing = categoryService.getNames(userId);
        
        if (existing.find(c => c.toLowerCase() === categoryName.toLowerCase())) {
            toast.error("Category already exists");
            return;
        }

        categoryService.add(categoryName, userId);
        const updated = categoryService.getNames();
        setCategories(updated);
        setSelectedCategory(categoryName);
        setNewCategory("");
        setShowAddCategory(false);
        toast.success("Category added successfully");
    };

    const handleCategorize = () => {
        if (!selectedCategory) {
            toast.error("Please select or add a category");
            return;
        }

        onCategorized(selectedCategory);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Categorize Transaction</DialogTitle>
                    <DialogDescription>
                        Paid ₹{amount.toFixed(2)} to {receiver}. Select a category or add a new one.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Select Category</Label>
                        <div className="flex gap-2">
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Choose a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                            {cat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowAddCategory(!showAddCategory)}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add New
                            </Button>
                        </div>
                    </div>

                    {showAddCategory && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2 p-4 border rounded-lg bg-muted/50"
                        >
                            <Label className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-yellow-500" />
                                New Category Name
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    placeholder="e.g. Travel, Entertainment"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddCategory();
                                        }
                                    }}
                                />
                                <Button type="button" onClick={handleAddCategory}>
                                    Add
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleCategorize} disabled={!selectedCategory}>
                        Categorize
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

