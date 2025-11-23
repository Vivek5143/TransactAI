"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { initializeData, authService, userService } from "@/lib/localStorageService";

export default function LoadingPage() {
    const router = useRouter();
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Initialize data on first load for current user
        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, '');
        initializeData(userId);

        const timer = setInterval(() => {
            setProgress((oldProgress) => {
                if (oldProgress >= 100) {
                    clearInterval(timer);
                    return 100;
                }
                const diff = Math.random() * 10;
                return Math.min(oldProgress + diff, 100);
            });
        }, 200);

        return () => {
            clearInterval(timer);
        };
    }, []);

    // Separate effect for navigation
    useEffect(() => {
        if (progress >= 100) {
            const timeout = setTimeout(() => {
                router.push("/setup");
            }, 500); // Small delay to ensure smooth transition

            return () => clearTimeout(timeout);
        }
    }, [progress, router]);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-background p-6">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center w-full max-w-md"
            >
                <div className="relative w-32 h-32 mb-8">
                    <motion.div
                        className="absolute inset-0 border-4 border-primary rounded-full"
                        animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 180, 360],
                            borderRadius: ["50%", "40%", "50%"],
                        }}
                        transition={{
                            duration: 2,
                            ease: "easeInOut",
                            times: [0, 0.5, 1],
                            repeat: Infinity,
                        }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary">AI</span>
                    </div>
                </div>

                <h2 className="text-2xl font-bold mb-2 text-center">
                    Analyzing your Finance Dashboard...
                </h2>
                <p className="text-muted-foreground mb-8 text-center">
                    Categorizing transactions and setting up your profile.
                </p>

                <Progress value={progress} className="w-full h-2" />
                <p className="mt-2 text-sm text-muted-foreground">{Math.round(progress)}%</p>
            </motion.div>
        </div>
    );
}
