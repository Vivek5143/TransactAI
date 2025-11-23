import Sidebar from "@/components/Sidebar";
import { PinLock } from "@/components/PinLock";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-full relative">
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900">
                <Sidebar />
            </div>
            <main className="md:pl-72 pb-10 relative">
                <Sidebar /> {/* Mobile Sidebar Trigger is inside here but handled via fixed position */}
                <PinLock>
                    {children}
                </PinLock>
            </main>
        </div>
    );
}
