"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Phone, ArrowRight, CheckCircle2 } from "lucide-react";
import { localOTP, localAuth } from "@/lib/localStorage";
import { authService } from "@/lib/localStorageService";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
    const [step, setStep] = useState<"phone" | "otp">("phone");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Refs for OTP inputs to manage focus
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, ""); // Only allow numbers
        if (value.length <= 10) {
            setPhoneNumber(value);
        }
    };

    const handleSendOtp = async () => {
        if (!phoneNumber || phoneNumber.length !== 10) {
            toast.error("Please enter a valid 10-digit phone number");
            return;
        }

        setLoading(true);

        try {
            const formattedPhone = `+91${phoneNumber}`;

            // Generate random 6-digit OTP
            const randomOtp = localOTP.generate(formattedPhone);
            setGeneratedOtp(randomOtp);

            console.log("📱 OTP Generated:", randomOtp);
            console.log("🔔 Calling toast.success...");
            toast.success(`OTP sent to ${formattedPhone}`, {
                duration: 5000,
            });
            console.log("🔔 Calling toast.info...");
            toast.info(`Your OTP is: ${randomOtp}`, {
                duration: 10000, // Longer duration for user convenience
            });
            console.log("✅ Toast calls completed");

            setStep("otp");
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to send OTP: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) {
            // Handle paste or auto-fill (simplified for single char input mostly)
            value = value[value.length - 1];
        }

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Move focus to next input if value is entered
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        // Move focus to previous input on Backspace if current is empty
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifyOtp = async () => {
        const otpString = otp.join("");
        if (otpString.length !== 6) {
            toast.error("Please enter the complete 6-digit OTP");
            return;
        }

        setLoading(true);
        try {
            const formattedPhone = `+91${phoneNumber}`;

            // Verify OTP
            const isValid = localOTP.verify(formattedPhone, otpString);

            if (isValid || otpString === generatedOtp) {
                // Clear OTP and create auth session
                localOTP.clear(formattedPhone);
                localAuth.login(formattedPhone);
                authService.saveSession(formattedPhone);

                toast.success("Login Successful!");
                router.push("/loading");
            } else {
                toast.error("Incorrect OTP");
                // Shake animation could be added here
            }
        } catch (error: any) {
            console.error(error);
            toast.error("Invalid OTP");
        } finally {
            setLoading(false);
        }
    };

    // Auto-focus first OTP input when step changes
    useEffect(() => {
        if (step === "otp") {
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 100);
        }
    }, [step]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-transparent p-4 relative">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md"
            >
                <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="text-2xl text-center font-bold bg-gradient-to-r from-black to-gray-300 bg-clip-text text-transparent">
                            {step === "phone" ? "Welcome Back" : "Verify OTP"}
                        </CardTitle>
                        <CardDescription className="text-center text-gray-500">
                            {step === "phone"
                                ? "Enter your 10-digit mobile number"
                                : `Enter the code sent to +91 ${phoneNumber}`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <AnimatePresence mode="wait">
                                {step === "phone" ? (
                                    <motion.div
                                        key="phone-step"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-4"
                                    >
                                        <div className="relative group">
                                            <div className="absolute left-3 top-3 flex items-center gap-2 border-r pr-2 border-gray-300">
                                                <span className="text-sm font-semibold text-gray-500">🇮🇳 +91</span>
                                            </div>
                                            <Input
                                                placeholder="00000 00000"
                                                className="pl-24 h-12 text-lg tracking-widest transition-all border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                value={phoneNumber}
                                                onChange={handlePhoneChange}
                                                type="tel"
                                                maxLength={10}
                                            />
                                        </div>
                                        <Button
                                            className="w-full h-11 bg-gradient-to-r from-black to-gray-600 hover:from-black hover:to-fray-600 transition-all duration-300 shadow-lg hover:shadow-blue-500/25"
                                            onClick={handleSendOtp}
                                            disabled={loading || phoneNumber.length !== 10}
                                        >
                                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                                            Send OTP
                                        </Button>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="otp-step"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="flex justify-between gap-2">
                                            {otp.map((digit, index) => (
                                                <motion.div
                                                    key={index}
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ delay: index * 0.05 }}
                                                >
                                                    <Input
                                                        ref={(el) => { inputRefs.current[index] = el }}
                                                        value={digit}
                                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                        type="number"
                                                        className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold border-2 transition-all duration-200 ${digit
                                                                ? "border-gray-200 bg-blue-50 text-gray-600"
                                                                : "border-gray-200 focus:border-gray-500 focus:ring-4 focus:ring-purple-100"
                                                            }`}
                                                        maxLength={1}
                                                    />
                                                </motion.div>
                                            ))}
                                        </div>

                                        <Button
                                            className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-green-500/25"
                                            onClick={handleVerifyOtp}
                                            disabled={loading || otp.some(d => !d)}
                                        >
                                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                            Verify & Login
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            className="w-full text-gray-500 hover:text-gray-700"
                                            onClick={() => {
                                                setStep("phone");
                                                setOtp(["", "", "", "", "", ""]);
                                            }}
                                            disabled={loading}
                                        >
                                            Change Phone Number
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
