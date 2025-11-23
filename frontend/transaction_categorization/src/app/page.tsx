"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService, onboardingService, pinService, userService } from "@/lib/localStorageService";

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check authentication and onboarding status
    const checkAuthFlow = () => {
      // 1. Check if onboarding is complete
      const hasSeenOnboarding = onboardingService.isComplete();
      
      if (!hasSeenOnboarding) {
        // New device/user - start with onboarding
        router.replace("/onboarding");
        return;
      }

      // 2. Check if user has a session (logged in)
      const session = authService.getSession();
      
      if (!session) {
        // Onboarding done but not logged in - go to login
        router.replace("/login");
        return;
      }

      // 3. Check if profile is complete
      const userId = session.phone.replace(/\+/g, '');
      const profile = userService.getProfile(userId);
      
      if (!profile || !profile.fullName) {
        // Logged in but profile not complete - go to setup
        router.replace("/setup");
        return;
      }

      // 4. Check if PIN is set
      const hasPin = pinService.exists(userId);
      
      if (hasPin) {
        // PIN exists - check if already unlocked in this session
        const unlockKey = `app_unlocked_${userId}`;
        const isUnlocked = typeof window !== 'undefined' ? sessionStorage.getItem(unlockKey) : null;
        
        if (!isUnlocked) {
          // PIN set but not unlocked - go to unlock
          router.replace("/unlock");
          return;
        }
      }

      // All checks passed - go to dashboard
      router.replace("/dashboard");
    };

    // Small delay to ensure localStorage is available
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        checkAuthFlow();
        setIsChecking(false);
      }, 100);
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground">Loading TransactAI...</p>
      </div>
    </div>
  );
}
