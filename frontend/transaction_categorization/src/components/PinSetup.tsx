"use client";

import { useState, useEffect } from "react";
import { Check, Delete, Fingerprint } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface PinSetupProps {
    onPinComplete?: (pin: string) => void;
    title?: string;
    subtitle?: string;
    showBiometric?: boolean;
}

export default function PinSetup({
    onPinComplete,
    title = "Enter PIN",
    subtitle = "Enter your 4-digit PIN to unlock",
    showBiometric = true
}: PinSetupProps) {
    const [pin, setPin] = useState<string>("");
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricSupported, setBiometricSupported] = useState(false);

    useEffect(() => {
        // Check if biometric is supported
        if (typeof window !== 'undefined') {
            // Check for WebAuthn API (fingerprint/face ID)
            const isSupported = 'PublicKeyCredential' in window || 
                               'credentials' in navigator;
            setBiometricSupported(isSupported);
        }
    }, []);

    const handleNumberClick = (num: number) => {
        if (pin.length < 4) {
            const newPin = pin + num.toString();
            setPin(newPin);

            if (newPin.length === 4 && onPinComplete) {
                setTimeout(() => {
                    onPinComplete(newPin);
                }, 200);
            }
        }
    };

    const handleDelete = () => {
        setPin(pin.slice(0, -1));
    };

    const handleConfirm = () => {
        if (pin.length === 4 && onPinComplete) {
            onPinComplete(pin);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
            >
                {/* Title */}
                <h1 className="text-3xl font-bold text-[#1e3a8a] text-center mb-2">
                    {title}
                </h1>
                <p className="text-gray-500 text-center mb-8">
                    {subtitle}
                </p>

                {/* PIN Input Boxes */}
                <div className="flex justify-center gap-4 mb-8">
                    {[0, 1, 2, 3].map((index) => (
                        <motion.div
                            key={index}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all duration-200 ${index < pin.length
                                    ? "border-gray-400 bg-blue-50 text-gray-600 shadow-md scale-105"
                                    : "border-gray-200 bg-white text-gray-400"
                                }`}
                        >
                            {index < pin.length ? pin[index] : ""}
                        </motion.div>
                    ))}
                </div>

                {/* Biometric Toggle */}
                {showBiometric && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between bg-white rounded-xl p-4 mb-8 shadow-sm border border-gray-100"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-full">
                                <Fingerprint className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-700 font-medium">
                                    {biometricSupported ? 'Biometric Login' : 'Biometric Login (Coming Soon)'}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {biometricSupported ? 'Fingerprint or Face ID' : 'Feature coming soon'}
                                </span>
                            </div>
                        </div>
                        <Switch
                            checked={biometricEnabled}
                            onCheckedChange={(checked) => {
                                if (biometricSupported) {
                                    setBiometricEnabled(checked);
                                    if (checked) {
                                        toast.info("Biometric authentication coming soon!");
                                    }
                                } else {
                                    toast.info("Biometric authentication coming soon!");
                                }
                            }}
                            disabled={!biometricSupported}
                        />
                    </motion.div>
                )}

                {/* Numeric Keypad */}
                <div className="grid grid-cols-3 gap-4 px-4">
                    {/* Numbers 1-9 */}
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num)}
                            className="w-full aspect-square bg-white rounded-full shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center justify-center text-2xl font-semibold text-gray-700 border border-gray-100 hover:border-blue-200 hover:text-blue-700"
                        >
                            {num}
                        </button>
                    ))}

                    {/* Bottom Row: Delete, 0, Confirm */}
                    <button
                        onClick={handleDelete}
                        disabled={pin.length === 0}
                        className="w-full aspect-square bg-gray-50 rounded-full hover:bg-red-50 active:scale-95 transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed group"
                    >
                        <Delete className="w-6 h-6 text-gray-500 group-hover:text-red-500 transition-colors" />
                    </button>

                    <button
                        onClick={() => handleNumberClick(0)}
                        className="w-full aspect-square bg-white rounded-full shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center justify-center text-2xl font-semibold text-gray-700 border border-gray-100 hover:border-blue-200 hover:text-blue-700"
                    >
                        0
                    </button>

                    <button
                        onClick={handleConfirm}
                        disabled={pin.length !== 4}
                        className="w-full aspect-square bg-gray-500 rounded-full shadow-md hover:shadow-lg hover:bg-gray-600 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-200"
                    >
                        <Check className="w-6 h-6 text-white" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
