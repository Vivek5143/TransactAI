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
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { categoryService, authService } from "@/lib/localStorageService";
import { motion, AnimatePresence } from "framer-motion";

// AI Suggested Categories based on common spending patterns
const AI_SUGGESTED_CATEGORIES = [
    "Entertainment", "Education", "Insurance", "Investment", "Charity",
    "Home Improvement", "Pet Care", "Personal Care", "Gifts", "Taxes",
    "Utilities", "Rent", "Loan Payment", "Savings", "Emergency Fund"
];

export function AddCategoryDialog({ onCategoryAdded }: { onCategoryAdded?: () => void }) {
    const [open, setOpen] = useState(false);
    const [category, setCategory] = useState("");
    const [loading, setLoading] = useState(false);
    const [existingCategories, setExistingCategories] = useState<string[]>([]);
    const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);

    useEffect(() => {
        if (open) {
            fetchCategories();
        }
    }, [open]);

    useEffect(() => {
        if (open && existingCategories.length >= 0) {
            // Filter out already existing categories from suggestions
            const available = AI_SUGGESTED_CATEGORIES.filter(
                cat => !existingCategories.includes(cat)
            );
            setSuggestedCategories(available.slice(0, 6)); // Show top 6 suggestions
        }
    }, [open, existingCategories.length]);

    const fetchCategories = () => {
        try {
            const session = authService.getSession();
            const userId = session?.phone.replace(/\+/g, '');
            const categories = categoryService.getNames(userId);
            setExistingCategories(categories);
        } catch (error) {
            console.error("Failed to fetch categories:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!category.trim()) return;

        setLoading(true);
        try {
            const session = authService.getSession();
            const userId = session?.phone.replace(/\+/g, '');
            const categoryName = category.trim();
            const existing = categoryService.getNames(userId);
            if (existing.find(c => c.toLowerCase() === categoryName.toLowerCase())) {
                toast.error("Category already exists");
            } else {
                categoryService.add(categoryName, userId);
                toast.success("Category added successfully");
                setCategory("");
                setOpen(false);
                onCategoryAdded?.();
            }
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to add category");
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestionClick = async (suggestedCategory: string) => {
        setCategory(suggestedCategory);
        setLoading(true);
        try {
            const session = authService.getSession();
            const userId = session?.phone.replace(/\+/g, '');
            const existing = categoryService.getNames(userId);
            if (existing.find(c => c.toLowerCase() === suggestedCategory.toLowerCase())) {
                toast.error("Category already exists");
            } else {
                categoryService.add(suggestedCategory, userId);
                toast.success(`Category "${suggestedCategory}" added successfully`);
                setCategory("");
                setOpen(false);
                onCategoryAdded?.();
            }
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to add category");
        } finally {
            setLoading(false);
        }
    };

    const removeSuggestion = (categoryToRemove: string) => {
        setSuggestedCategories(prev => prev.filter(cat => cat !== categoryToRemove));
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Category
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add New Category</DialogTitle>
                    <DialogDescription>
                        Create a new category for your transactions or use AI suggestions.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* AI Suggested Categories */}
                        {suggestedCategories.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-yellow-500" />
                                    AI Suggested Categories
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    <AnimatePresence>
                                        {suggestedCategories.map((suggested) => (
                                            <motion.div
                                                key={suggested}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className="relative group"
                                            >
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleSuggestionClick(suggested)}
                                                    disabled={loading}
                                                    className="pr-8"
                                                >
                                                    {suggested}
                                                </Button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeSuggestion(suggested);
                                                    }}
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}

                        {/* Manual Input */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="col-span-3"
                                placeholder="e.g. Travel, Entertainment"
                                disabled={loading}
                            />
                        </div>

                        {/* Existing Categories Preview */}
                        {existingCategories.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Existing Categories</Label>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                                    {existingCategories.map((cat) => (
                                        <span
                                            key={cat}
                                            className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
                                        >
                                            {cat}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !category.trim()}>
                            {loading ? "Saving..." : "Save Category"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
