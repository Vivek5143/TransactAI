"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
} from "recharts";
import { useMemo } from "react";
import { Calendar } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#ff7300"];

// Professional gradient colors for bar chart
const GRADIENT_COLORS = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
];

const BAR_COLORS = [
    "#667eea", "#f5576c", "#4facfe", "#43e97b", 
    "#fa709a", "#30cfd0", "#a8edea", "#ff9a9e"
];

interface SummaryData {
    category_summary: Record<string, number>;
    daily_breakdown?: Array<{ date: string; total: number }>;
}

type TimePeriod = "today" | "weekly" | "monthly" | "yearly";

interface DashboardChartsProps {
    data: SummaryData;
    timePeriod?: TimePeriod;
    onTimePeriodChange?: (period: TimePeriod) => void;
}

export const DashboardCharts = memo(function DashboardCharts({ data, timePeriod = "monthly", onTimePeriodChange }: DashboardChartsProps) {
    const pieData = useMemo(() => {
        return Object.entries(data.category_summary || {})
            .map(([name, value]) => ({
                name,
                value: Number(value) || 0,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8); // Top 8 categories
    }, [data.category_summary]);

    // Use daily breakdown if available, otherwise generate mock data
    const barData = useMemo(() => {
        if (data.daily_breakdown && data.daily_breakdown.length > 0) {
            return data.daily_breakdown.map(item => ({
                name: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                amount: Number(item.total) || 0,
            }));
        }

        // Fallback: Generate sample data based on time period
        if (timePeriod === 'today') {
            const hours = Array.from({ length: 24 }, (_, i) => i);
            return hours.filter(h => h % 3 === 0).map(hour => {
                const date = new Date();
                date.setHours(hour, 0, 0, 0);
                const time12h = date.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                });
                return {
                    name: time12h,
                    amount: Math.floor(Math.random() * 2000) + 500,
                };
            });
        } else if (timePeriod === 'weekly') {
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            return days.map(day => ({
                name: day,
                amount: Math.floor(Math.random() * 5000) + 1000,
            }));
        } else if (timePeriod === 'yearly') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return months.map(month => ({
                name: month,
                amount: Math.floor(Math.random() * 10000) + 5000,
            }));
        } else {
            // Monthly default
            const days = Array.from({ length: 30 }, (_, i) => i + 1);
            return days.slice(0, 7).map(day => ({
                name: `Day ${day}`,
                amount: Math.floor(Math.random() * 3000) + 1000,
            }));
        }
    }, [data.daily_breakdown, timePeriod]);

    const chartTitle = useMemo(() => {
        switch (timePeriod) {
            case 'today':
                return 'Today\'s Spend';
            case 'weekly':
                return 'Weekly Spend';
            case 'yearly':
                return 'Yearly Spend';
            default:
                return 'Monthly Spend';
        }
    }, [timePeriod]);

    return (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-1 md:col-span-2 lg:col-span-4 hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-2 gap-2">
                    <CardTitle className="text-lg sm:text-xl">{chartTitle}</CardTitle>
                    {onTimePeriodChange && (
                        <Select value={timePeriod} onValueChange={(value) => onTimePeriodChange(value as TimePeriod)}>
                            <SelectTrigger className="w-full sm:w-[140px]">
                                <Calendar className="mr-2 h-4 w-4" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </CardHeader>
                <CardContent className="pl-0 sm:pl-2">
                    <ResponsiveContainer width="100%" height={300} className="sm:h-[350px]">
                        <BarChart 
                            data={barData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <XAxis
                                dataKey="name"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
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
                            <Bar 
                                dataKey="amount" 
                                radius={[8, 8, 0, 0]}
                            >
                                {barData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={BAR_COLORS[index % BAR_COLORS.length]}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card className="col-span-1 md:col-span-2 lg:col-span-3 hover:shadow-lg transition-shadow w-full">
                <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="text-lg sm:text-xl">Category Distribution</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6 pb-4 sm:pb-6">
                    {pieData.length > 0 ? (
                        <div className="w-full">
                            <ResponsiveContainer width="100%" height={280} className="sm:h-[350px]">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={75}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
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
                                        formatter={(value) => value}
                                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                                        iconType="circle"
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-[280px] sm:h-[350px] text-muted-foreground">
                            No category data available
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
});
