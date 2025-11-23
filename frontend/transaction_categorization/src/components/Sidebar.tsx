"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    PieChart,
    Settings,
    LogOut,
    Menu,
    Receipt,
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { authService } from "@/lib/localStorageService";
import { useRouter } from "next/navigation";

const routes = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/dashboard",
        color: "text-sky-500",
    },
    {
        label: "Transactions",
        icon: Receipt,
        href: "/dashboard/transactions",
        color: "text-green-500",
    },
    {
        label: "Analytics",
        icon: PieChart,
        href: "/dashboard/analytics",
        color: "text-violet-500",
    },
    {
        label: "Settings",
        icon: Settings,
        href: "/dashboard/settings",
        color: "text-pink-700",
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = () => {
        const session = authService.getSession();
        if (session) {
            // Clear user-specific unlock flag
            const phone = session.phone.replace(/\+/g, "");
            const unlockKey = `app_unlocked_${phone}`;
            sessionStorage.removeItem(unlockKey);
        }
        authService.clearSession();
        router.push("/login");
    };

    return (
        <>
            {/* Mobile Sidebar */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="md:hidden fixed top-4 right-4 z-50 bg-background/95 backdrop-blur-sm border shadow-lg hover:bg-background dark:bg-gray-900 dark:border-gray-700"
                        aria-label="Open menu"
                    >
                        <Menu className="h-6 w-6 text-foreground" />
                    </Button>
                </SheetTrigger>
                <SheetContent 
                    side="right" 
                    className="p-0 w-72 bg-gray-900 text-black data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
                >
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                    <SidebarContent pathname={pathname} onLogout={handleLogout} setIsOpen={setIsOpen} />
                </SheetContent>
            </Sheet>

            {/* Desktop Sidebar */}
            <div className="hidden md:flex h-full w-72 flex-col fixed inset-y-0 z-50 bg-gray-900 text-white">
                <SidebarContent pathname={pathname} onLogout={handleLogout} />
            </div>
        </>
    );
}

function SidebarContent({ pathname, onLogout, setIsOpen }: { pathname: string; onLogout: () => void; setIsOpen?: (open: boolean) => void }) {
    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-[#ffffff] text-black">
            <div className="px-3 py-2 flex-1">
                <Link href="/dashboard" className="flex items-center pl-3 mb-14">
                    <div className="relative w-8 h-8 mr-4">
                        {/* Logo placeholder */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-pink-500 to-violet-500 rounded-lg" />
                    </div>
                    <h1 className="text-2xl font-bold">TransactAI</h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            onClick={() => setIsOpen?.(false)}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                pathname === route.href ? "text-black/40 bg-white" : "text-zinc-400"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            <div className="px-3 py-2">
                <Button
                    onClick={onLogout}
                    variant="ghost"
                    className="w-full justify-start text-zinc-400 hover:text-white hover:bg-white/10"
                >
                    <LogOut className="h-5 w-5 mr-3 text-red-500" />
                    Logout
                </Button>
            </div>
        </div>
    );
}
