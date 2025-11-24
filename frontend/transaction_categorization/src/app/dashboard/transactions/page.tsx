"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  transactionService,
  categoryService,
  Transaction,
  authService,
} from "@/lib/localStorageService";
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Filter,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { fetchTransactions } from "@/lib/api";

type TimePeriod = "today" | "weekly" | "monthly" | "yearly";
type ExportFormat = "csv" | "json" | "xlsx";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");

  // ---------------- BACKEND FETCH ----------------
  useEffect(() => {
    const load = async () => {
      try {
        const backend = await fetchTransactions();
        setTransactions(backend.transactions);
      } catch (err) {
        console.log("Backend fetch failed, using local storage fallback.");
        loadLocalTransactions();
      }
    };
    load();
  }, []);

  // ---------------- LOCAL STORAGE FALLBACK ----------------
  const loadLocalTransactions = () => {
    const session = authService.getSession();
    const userId = session?.phone?.replace(/\+/g, "") || "";
    const local = transactionService.getAll(userId);

    setTransactions(local);

    const cats = categoryService.getNames(userId);
    setCategories(cats);
  };

  // ---------------- FILTERING ----------------
  useEffect(() => {
    filterTransactions();
  }, [transactions, selectedCategory, selectedPeriod, searchQuery]);

  const filterTransactions = () => {
    let filtered = [...transactions];
    const now = new Date();
    const start = new Date();

    if (selectedCategory !== "all") {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    switch (selectedPeriod) {
      case "today":
        start.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        start.setDate(now.getDate() - 7);
        break;
      case "monthly":
        start.setMonth(now.getMonth() - 1);
        break;
      case "yearly":
        start.setFullYear(now.getFullYear() - 1);
        break;
    }

    filtered = filtered.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= now;
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.recipient?.toLowerCase().includes(q)
      );
    }

    filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setFilteredTransactions(filtered);
  };

  // ---------------- CATEGORY UPDATE ----------------
  const handleCategoryChange = (id: string, newCat: string) => {
    const session = authService.getSession();
    const userId = session?.phone?.replace(/\+/g, "") || "";

    transactionService.update(id, { category: newCat }, userId);
    loadLocalTransactions();
    toast.success("Category updated");
  };

  // ---------------- EXPORT ----------------
  const exportData = () => {
    const data = filteredTransactions.map((t) => ({
      Date: new Date(t.date).toLocaleDateString(),
      Description: t.description,
      Amount: `₹${t.amount.toFixed(2)}`,
      Category: t.category,
      Recipient: t.recipient ?? "N/A",
      Type: t.type || "debit",
    }));

    let content = "";
    let mime = "";
    let filename = "";

    switch (exportFormat) {
      case "csv":
        const headers = Object.keys(data[0] || {}).join(",");
        const rows = data.map((r) => Object.values(r).join(","));
        content = [headers, ...rows].join("\n");
        mime = "text/csv";
        filename = "transactions.csv";
        break;

      case "json":
        content = JSON.stringify(data, null, 2);
        mime = "application/json";
        filename = "transactions.json";
        break;

      case "xlsx":
        const xhead = Object.keys(data[0] || {}).join("\t");
        const xrow = data.map((r) => Object.values(r).join("\t"));
        content = [xhead, ...xrow].join("\n");
        mime = "application/vnd.ms-excel";
        filename = "transactions.xls";
        break;
    }

    const blob = new Blob([content], { type: mime });
    const link = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = link;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(link);

    toast.success(`Exported as ${exportFormat.toUpperCase()}`);
  };

  const getTotal = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );

  // ---------------- UI ----------------
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 min-h-screen">
      <h2 className="text-4xl font-bold">Transactions</h2>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Export</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {/* Search */}
            <div>
              <label>Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                <Input
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label>Category</label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time period */}
            <div>
              <label>Period</label>
              <Select
                value={selectedPeriod}
                onValueChange={(v) => setSelectedPeriod(v as TimePeriod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export */}
            <div>
              <label>Export</label>
              <div className="flex gap-2">
                <Select
                  value={exportFormat}
                  onValueChange={(v) => setExportFormat(v as ExportFormat)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="xlsx">Excel</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={exportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between">
              <span>Total Transactions:</span>
              <span>{filteredTransactions.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <span>₹{getTotal.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t, i) => (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b"
                  >
                    <td>{new Date(t.date).toLocaleDateString("en-IN")}</td>
                    <td>{t.description}</td>
                    <td>
                      <span
                        className={
                          t.type === "credit" ? "text-green-600" : "text-red-600"
                        }
                      >
                        {t.type === "credit" ? "+" : "-"}₹
                        {t.amount.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <Select
                        value={t.category}
                        onValueChange={(v) => handleCategoryChange(t.id, v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
