"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { onboardingService } from "@/lib/localStorageService";

const slides = [
    {
        id: 1,
        title: "Track Your Expenses",
        description: "Automatically categorize your financial transactions with AI.",
        image: "/track_exp-Photoroom.png", // Placeholder
    },
    {
        id: 2,
        title: "Smart Insights",
        description: "Get detailed analytics and insights into your spending habits.",
        image: "/smart_ins-Photoroom.png", // Placeholder
    },
    {
        id: 3,
        title: "Secure & Private",
        description: "Your financial data is encrypted and stored securely.",
        image: "/sec&pri-Photoroom.png", // Placeholder
    },
];

export default function IntroSlider() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const router = useRouter();

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            // Mark onboarding as complete before navigating to login
            onboardingService.markComplete();
            router.push("/login");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-transparent p-6 relative">
            <div className="w-full max-w-md flex-1 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={slides[currentIndex].id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center text-center"
                    >
                        <div className="w-75 h-75 mb-8 rounded-2xl overflow-hidden">
                            {/* Using a colored div as placeholder if image fails, or actual image */}
                            <img
                                src={slides[currentIndex].image}
                                alt={slides[currentIndex].title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <h2 className="text-3xl font-bold mb-4 text-foreground">
                            {slides[currentIndex].title}
                        </h2>
                        <p className="text-muted-foreground text-lg">
                            {slides[currentIndex].description}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="w-full max-w-md mt-8 flex flex-col items-center">
                {/* Pagination Dots */}
                <div className="flex space-x-2 mb-8">
                    {slides.map((_, index) => (
                        <div
                            key={index}
                            className={`h-2 w-2 rounded-full transition-colors duration-300 ${index === currentIndex ? "bg-primary w-6" : "bg-muted-foreground/30"
                                }`}
                        />
                    ))}
                </div>

                <Button
                    onClick={handleNext}
                    className="w-full text-lg py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                    {currentIndex === slides.length - 1 ? (
                        <span className="flex items-center">
                            Get Started <Check className="ml-2 h-5 w-5" />
                        </span>
                    ) : (
                        <span className="flex items-center">
                            Next <ArrowRight className="ml-2 h-5 w-5" />
                        </span>
                    )}
                </Button>
            </div>
        </div>
    );
}
