"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import PinSetup from "@/components/PinSetup";
import { authService, pinService } from "@/lib/localStorageService";
import { useRouter } from "next/navigation";

export function PinLock({ children }: { children: React.ReactNode }) {
    const [isLocked, setIsLocked] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const session = authService.getSession();
        if (session) {
            const phone = session.phone.replace(/\+/g, "");
            setUserId(phone);
            
            // Check if PIN exists for this specific user
            if (pinService.exists(phone)) {
                // Check if session is already unlocked for this user
                const unlockKey = `app_unlocked_${phone}`;
                const isUnlocked = sessionStorage.getItem(unlockKey);
                if (!isUnlocked) {
                    setIsLocked(true);
                    // Redirect to unlock page
                    router.replace("/unlock");
                }
            }
        } else {
            // No session - redirect to login
            router.replace("/login");
        }
    }, [router]);

    if (isLocked) {
        return null; // Let unlock page handle it
    }

    return <>{children}</>;
}
