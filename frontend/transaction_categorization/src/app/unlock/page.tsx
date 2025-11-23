"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PinSetup from "@/components/PinSetup";
import { toast } from "sonner";
import { authService, pinService } from "@/lib/localStorageService";

export default function UnlockPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [showLoading, setShowLoading] = useState(false);

    useEffect(() => {
        // Check if user is logged in via localStorage
        const session = authService.getSession();
        if (!session) {
            // If no session, redirect to login
            router.replace("/login");
            return;
        }

        // If session exists, we are ready to unlock
        const phone = session.phone.replace(/\+/g, "");
        setUserId(phone);
        setLoading(false);
    }, [router]);

    const handlePinComplete = (pin: string) => {
        if (!userId) return;

        try {
            // Verify PIN using localStorage service (userId is the phone number)
            const isValid = pinService.verify(pin, userId);

            if (isValid) {
                // Set session flag to prevent PinLock from triggering again (per user)
                const unlockKey = `app_unlocked_${userId}`;
                sessionStorage.setItem(unlockKey, "true");
                toast.success("Unlocked successfully!");
                
                // Show loading screen
                setShowLoading(true);
                
                // Navigate to dashboard after loading screen
                setTimeout(() => {
                    router.replace("/dashboard");
                }, 1500);
            } else {
                toast.error("Incorrect PIN");
            }
        } catch (error) {
            console.error("Unlock error:", error);
            toast.error("Failed to verify PIN");
        }
    };

    if (loading) return null;

    if (showLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <PinSetup
            title="Welcome Back"
            subtitle="Enter your PIN to continue"
            onPinComplete={handlePinComplete}
            showBiometric={true}
        />
    );
}
