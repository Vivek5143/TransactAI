"use client";

import PinSetup from "@/components/PinSetup";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authService, pinService } from "@/lib/localStorageService";

export default function PinSetupPage() {
    const router = useRouter();

    const handlePinComplete = (pin: string) => {
        try {
            // Get current user ID from session
            const session = authService.getSession();
            const userId = session?.phone.replace(/\+/g, "") || "default";

            // Store PIN in localStorage (per user)
            pinService.save(pin, userId);
            toast.success("PIN set successfully!");

            // Set session flag (per user)
            const unlockKey = `app_unlocked_${userId}`;
            sessionStorage.setItem(unlockKey, "true");

            // Redirect to dashboard after a short delay
            setTimeout(() => {
                router.push("/dashboard");
            }, 1000);
        } catch (error) {
            console.error("Error saving PIN:", error);
            toast.error("Failed to save PIN. Please try again.");
        }
    };

    return (
        <PinSetup
            title="Set Your PIN"
            subtitle="Create a 4-digit PIN to secure your app"
            onPinComplete={handlePinComplete}
        />
    );
}
