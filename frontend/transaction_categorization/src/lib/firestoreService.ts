import { app, isSimulationMode } from "./firebase";

// Initialize Firestore only if Firebase is available
let firestore: any = null;

if (!isSimulationMode && app && typeof window !== 'undefined') {
    try {
        const { getFirestore } = require("firebase/firestore");
        firestore = getFirestore(app);
    } catch (error) {
        console.warn("Firestore not available");
    }
}

// Re-export firestore functions with fallbacks
const getFirestoreFunctions = () => {
    if (isSimulationMode || !firestore) {
        return {
            doc: () => ({}),
            setDoc: async () => ({ success: false }),
            getDoc: async () => ({ exists: () => false }),
            updateDoc: async () => ({ success: false }),
            collection: () => ({}),
            query: () => ({}),
            where: () => ({}),
            getDocs: async () => ({ docs: [] }),
        };
    }
    const firestoreModule = require("firebase/firestore");
    return {
        doc: firestoreModule.doc,
        setDoc: firestoreModule.setDoc,
        getDoc: firestoreModule.getDoc,
        updateDoc: firestoreModule.updateDoc,
        collection: firestoreModule.collection,
        query: firestoreModule.query,
        where: firestoreModule.where,
        getDocs: firestoreModule.getDocs,
        Timestamp: firestoreModule.Timestamp,
    };
};

const {
    doc: docFn,
    setDoc: setDocFn,
    getDoc: getDocFn,
    updateDoc: updateDocFn,
    collection: collectionFn,
    query: queryFn,
    where: whereFn,
    getDocs: getDocsFn,
    Timestamp
} = getFirestoreFunctions();

// User Profile Operations
export const firestoreService = {
    // Save user profile
    async saveUserProfile(userId: string, profileData: any) {
        if (isSimulationMode || !firestore) {
            localStorage.setItem("user_profile", JSON.stringify(profileData));
            return { success: true, source: "localStorage" };
        }
        try {
            const userRef = docFn(firestore, "users", userId);
            await setDocFn(userRef, {
                ...profileData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            console.log("✅ Profile saved to Firestore");
            return { success: true };
        } catch (error) {
            console.error("❌ Firestore save error:", error);
            localStorage.setItem("user_profile", JSON.stringify(profileData));
            return { success: false, error };
        }
    },

    // Get user profile
    async getUserProfile(userId: string) {
        if (isSimulationMode || !firestore) {
            const localData = localStorage.getItem("user_profile");
            if (localData) {
                return { success: true, data: JSON.parse(localData), source: "localStorage" };
            }
            return { success: false, error: "No profile found" };
        }
        try {
            const userRef = docFn(firestore, "users", userId);
            const docSnap = await getDocFn(userRef);

            if (docSnap.exists()) {
                console.log("✅ Profile loaded from Firestore");
                return { success: true, data: docSnap.data() };
            } else {
                const localData = localStorage.getItem("user_profile");
                if (localData) {
                    return { success: true, data: JSON.parse(localData), source: "localStorage" };
                }
                return { success: false, error: "No profile found" };
            }
        } catch (error) {
            console.error("❌ Firestore get error:", error);
            const localData = localStorage.getItem("user_profile");
            if (localData) {
                return { success: true, data: JSON.parse(localData), source: "localStorage" };
            }
            return { success: false, error };
        }
    },

    // Update user profile
    async updateUserProfile(userId: string, updates: any) {
        if (isSimulationMode || !firestore) {
            const localData = localStorage.getItem("user_profile");
            if (localData) {
                const profile = JSON.parse(localData);
                localStorage.setItem("user_profile", JSON.stringify({ ...profile, ...updates }));
                return { success: true };
            }
            return { success: false, error: "No profile found" };
        }
        try {
            const userRef = docFn(firestore, "users", userId);
            await updateDocFn(userRef, {
                ...updates,
                updatedAt: Timestamp.now(),
            });
            console.log("✅ Profile updated in Firestore");
            return { success: true };
        } catch (error) {
            console.error("❌ Firestore update error:", error);
            return { success: false, error };
        }
    },

    // Save PIN
    async savePIN(userId: string, pin: string) {
        localStorage.setItem("app_pin", pin);
        if (isSimulationMode || !firestore) {
            return { success: true, source: "localStorage" };
        }
        try {
            const pinRef = docFn(firestore, "pins", userId);
            await setDocFn(pinRef, {
                pin: pin, // In production, hash this!
                createdAt: Timestamp.now(),
            });
            console.log("✅ PIN saved to Firestore");
            return { success: true };
        } catch (error) {
            console.error("❌ Firestore PIN save error:", error);
            return { success: false, error };
        }
    },

    // Verify PIN
    async verifyPIN(userId: string, pin: string) {
        const localPin = localStorage.getItem("app_pin");
        if (isSimulationMode || !firestore) {
            return { success: true, isValid: localPin === pin, source: "localStorage" };
        }
        try {
            const pinRef = docFn(firestore, "pins", userId);
            const docSnap = await getDocFn(pinRef);

            if (docSnap.exists()) {
                const storedPin = docSnap.data().pin;
                return { success: true, isValid: storedPin === pin };
            } else {
                return { success: true, isValid: localPin === pin, source: "localStorage" };
            }
        } catch (error) {
            console.error("❌ Firestore PIN verify error:", error);
            return { success: true, isValid: localPin === pin, source: "localStorage" };
        }
    },

    // Check if Firestore is available
    async isFirestoreAvailable() {
        if (isSimulationMode || !firestore) {
            return false;
        }
        try {
            const testRef = docFn(firestore, "_test", "connection");
            await getDocFn(testRef);
            return true;
        } catch (error) {
            console.warn("⚠️ Firestore not available, using localStorage fallback");
            return false;
        }
    }
};
