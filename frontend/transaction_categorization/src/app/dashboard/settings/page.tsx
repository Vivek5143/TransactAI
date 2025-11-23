"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { pinService, userService, authService } from "@/lib/localStorageService";
import { ArrowLeft } from "lucide-react";

export default function SettingsPage() {
    const router = useRouter();
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [isPinEnabled, setIsPinEnabled] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, "");
        if (userId && pinService.exists(userId)) {
            setIsPinEnabled(true);
        }
    }, []);

    const handleSavePin = async () => {
        if (pin.length !== 4) {
            toast.error("PIN must be 4 digits");
            return;
        }
        if (pin !== confirmPin) {
            toast.error("PINs do not match");
            return;
        }

        try {
            const session = authService.getSession();
            const userId = session?.phone.replace(/\+/g, "") || "default";
            pinService.save(pin, userId);
            setIsPinEnabled(true);
            toast.success("App Lock enabled successfully");
            setPin("");
            setConfirmPin("");
            // Refresh the page to update PIN reminder on dashboard
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (error) {
            console.error("Error saving PIN:", error);
            toast.error("Failed to save PIN");
        }
    };

    const handleDisablePin = () => {
        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, "") || "default";
        pinService.remove(userId);
        setIsPinEnabled(false);
        toast.success("App Lock disabled");
    };

    if (!mounted) return null;

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Security Settings */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Security</CardTitle>
                        <CardDescription>
                            Manage your app security settings.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">App Lock</Label>
                                <p className="text-sm text-muted-foreground">
                                    Require a PIN to access the app
                                </p>
                            </div>
                            <Button
                                variant={isPinEnabled ? "destructive" : "default"}
                                onClick={isPinEnabled ? handleDisablePin : () => { }}
                            >
                                {isPinEnabled ? "Disable" : "Enable below"}
                            </Button>
                        </div>

                        {!isPinEnabled && (
                            <div className="space-y-4 pt-4 border-t">
                                <div className="grid gap-2">
                                    <Label htmlFor="pin">Set 4-digit PIN</Label>
                                    <Input
                                        id="pin"
                                        type="password"
                                        maxLength={4}
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="confirm-pin">Confirm PIN</Label>
                                    <Input
                                        id="confirm-pin"
                                        type="password"
                                        maxLength={4}
                                        value={confirmPin}
                                        onChange={(e) => setConfirmPin(e.target.value)}
                                    />
                                </div>
                                <Button onClick={handleSavePin}>Save PIN</Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Back to Dashboard Button */}
                <Card className="col-span-2">
                    <CardContent className="pt-6">
                        <Button
                            onClick={() => router.push("/dashboard")}
                            variant="outline"
                            className="w-full"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
