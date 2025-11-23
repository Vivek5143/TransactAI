// Comprehensive LocalStorage Service for TransactAI
// All data is stored locally - no Firebase or backend required

export interface UserProfile {
    phone: string;
    name?: string;
    fullName?: string;
    gender?: string;
    email?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Transaction {
    id: string;
    description: string;
    amount: number;
    category: string;
    date: string;
    recipient?: string;
    type?: 'debit' | 'credit';
}

export interface Category {
    name: string;
    createdAt: string;
}

// Helper to get user-specific storage key
const getUserKey = (baseKey: string, userId?: string): string => {
    if (userId) {
        return `${baseKey}_${userId}`;
    }
    // Try to get from session if not provided (only on client side)
    if (typeof window === 'undefined') {
        return baseKey;
    }
    try {
        const session = localStorage.getItem('transactai_auth_session');
        if (session) {
            const parsed = JSON.parse(session);
            const phone = parsed.phone?.replace(/\+/g, '') || 'default';
            return `${baseKey}_${phone}`;
        }
    } catch (e) {
        // Ignore
    }
    return baseKey;
};

const STORAGE_KEYS = {
    USER_PROFILE: 'transactai_user_profile',
    TRANSACTIONS: 'transactai_transactions',
    CATEGORIES: 'transactai_categories',
    PIN: 'transactai_pin',
    AUTH_SESSION: 'transactai_auth_session',
    ONBOARDING_COMPLETE: 'transactai_onboarding_complete',
};

// User Profile Operations
export const userService = {
    saveProfile(profile: UserProfile, userId?: string): void {
        if (typeof window === 'undefined') return;
        const data = {
            ...profile,
            updatedAt: new Date().toISOString(),
        };
        const key = getUserKey(STORAGE_KEYS.USER_PROFILE, userId || profile.phone?.replace(/\+/g, ''));
        localStorage.setItem(key, JSON.stringify(data));
    },

    getProfile(userId?: string): UserProfile | null {
        if (typeof window === 'undefined') return null;
        const key = getUserKey(STORAGE_KEYS.USER_PROFILE, userId);
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    updateProfile(updates: Partial<UserProfile>, userId?: string): void {
        const current = this.getProfile(userId);
        if (current) {
            this.saveProfile({ ...current, ...updates }, userId);
        }
    },
};

// Transaction Operations
export const transactionService = {
    getAll(userId?: string): Transaction[] {
        if (typeof window === 'undefined') return [];
        const key = getUserKey(STORAGE_KEYS.TRANSACTIONS, userId);
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },

    save(transaction: Transaction, userId?: string): void {
        if (typeof window === 'undefined') return;
        const transactions = this.getAll(userId);
        transactions.push(transaction);
        const key = getUserKey(STORAGE_KEYS.TRANSACTIONS, userId);
        localStorage.setItem(key, JSON.stringify(transactions));
    },

    saveMany(transactions: Transaction[], userId?: string): void {
        if (typeof window === 'undefined') return;
        const key = getUserKey(STORAGE_KEYS.TRANSACTIONS, userId);
        localStorage.setItem(key, JSON.stringify(transactions));
    },

    update(id: string, updates: Partial<Transaction>, userId?: string): void {
        if (typeof window === 'undefined') return;
        const transactions = this.getAll(userId);
        const index = transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            transactions[index] = { ...transactions[index], ...updates };
            const key = getUserKey(STORAGE_KEYS.TRANSACTIONS, userId);
            localStorage.setItem(key, JSON.stringify(transactions));
        }
    },

    delete(id: string, userId?: string): void {
        if (typeof window === 'undefined') return;
        const transactions = this.getAll(userId);
        const filtered = transactions.filter(t => t.id !== id);
        const key = getUserKey(STORAGE_KEYS.TRANSACTIONS, userId);
        localStorage.setItem(key, JSON.stringify(filtered));
    },

    getByCategory(category: string, userId?: string): Transaction[] {
        return this.getAll(userId).filter(t => t.category === category);
    },

    getByDateRange(startDate: string, endDate: string, userId?: string): Transaction[] {
        return this.getAll(userId).filter(t => {
            const date = new Date(t.date);
            return date >= new Date(startDate) && date <= new Date(endDate);
        });
    },
};

// Category Operations
export const categoryService = {
    getAll(userId?: string): Category[] {
        if (typeof window === 'undefined') return [];
        const key = getUserKey(STORAGE_KEYS.CATEGORIES, userId);
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },

    add(categoryName: string, userId?: string): void {
        if (typeof window === 'undefined') return;
        const categories = this.getAll(userId);
        if (!categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())) {
            categories.push({
                name: categoryName,
                createdAt: new Date().toISOString(),
            });
            const key = getUserKey(STORAGE_KEYS.CATEGORIES, userId);
            localStorage.setItem(key, JSON.stringify(categories));
        }
    },

    remove(categoryName: string, userId?: string): void {
        if (typeof window === 'undefined') return;
        const categories = this.getAll(userId);
        const filtered = categories.filter(c => c.name !== categoryName);
        const key = getUserKey(STORAGE_KEYS.CATEGORIES, userId);
        localStorage.setItem(key, JSON.stringify(filtered));
    },

    getNames(userId?: string): string[] {
        return this.getAll(userId).map(c => c.name);
    },
};

// PIN Operations (per user)
export const pinService = {
    save(pin: string, userId?: string): void {
        if (typeof window === 'undefined') return;
        const key = userId ? `${STORAGE_KEYS.PIN}_${userId}` : STORAGE_KEYS.PIN;
        localStorage.setItem(key, pin);
    },

    verify(pin: string, userId?: string): boolean {
        if (typeof window === 'undefined') return false;
        const key = userId ? `${STORAGE_KEYS.PIN}_${userId}` : STORAGE_KEYS.PIN;
        const savedPin = localStorage.getItem(key);
        return savedPin === pin;
    },

    exists(userId?: string): boolean {
        if (typeof window === 'undefined') return false;
        const key = userId ? `${STORAGE_KEYS.PIN}_${userId}` : STORAGE_KEYS.PIN;
        return !!localStorage.getItem(key);
    },

    remove(userId?: string): void {
        if (typeof window === 'undefined') return;
        const key = userId ? `${STORAGE_KEYS.PIN}_${userId}` : STORAGE_KEYS.PIN;
        localStorage.removeItem(key);
    },

    get(userId?: string): string | null {
        if (typeof window === 'undefined') return null;
        const key = userId ? `${STORAGE_KEYS.PIN}_${userId}` : STORAGE_KEYS.PIN;
        return localStorage.getItem(key);
    },
};

// Auth Session Operations
export const authService = {
    saveSession(phone: string): void {
        if (typeof window === 'undefined') return;
        const session = {
            phone,
            timestamp: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
    },

    getSession(): { phone: string; timestamp: string } | null {
        if (typeof window === 'undefined') return null;
        const data = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
        return data ? JSON.parse(data) : null;
    },

    clearSession(): void {
        if (typeof window === 'undefined') return;
        const session = this.getSession();
        if (session) {
            // Clear user-specific unlock flag
            const phone = session.phone.replace(/\+/g, "");
            const unlockKey = `app_unlocked_${phone}`;
            sessionStorage.removeItem(unlockKey);
        }
        localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    },
};

// Onboarding Operations
export const onboardingService = {
    markComplete(): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
    },

    isComplete(): boolean {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE) === 'true';
    },

    reset(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    },
};

// Generate Simulated Transaction Data
export const generateSimulatedTransactions = (count: number = 50): Transaction[] => {
    const categories = [
        'Food & Dining', 'Shopping', 'Transportation', 'Bills & Utilities',
        'Entertainment', 'Healthcare', 'Education', 'Travel', 'Groceries',
        'Personal Care', 'Gifts', 'Insurance', 'Investment', 'Savings'
    ];

    const descriptions = [
        'Payment to', 'Transfer to', 'Purchase at', 'Bill payment for',
        'Subscription for', 'Refund from', 'Cashback from', 'Payment received from'
    ];

    const merchants = [
        'Amazon', 'Flipkart', 'Swiggy', 'Zomato', 'Uber', 'Ola', 'Paytm',
        'PhonePe', 'Google Pay', 'Netflix', 'Spotify', 'Prime Video',
        'BigBasket', 'DMart', 'Reliance', 'Tata', 'ICICI Bank', 'HDFC Bank'
    ];

    const transactions: Transaction[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
        const daysAgo = Math.floor(Math.random() * 90); // Last 90 days
        const date = new Date(now);
        date.setDate(date.getDate() - daysAgo);
        date.setHours(Math.floor(Math.random() * 24));
        date.setMinutes(Math.floor(Math.random() * 60));

        const category = categories[Math.floor(Math.random() * categories.length)];
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const amount = Math.floor(Math.random() * 50000) + 100; // ₹100 to ₹50,000

        transactions.push({
            id: `txn_${Date.now()}_${i}`,
            description: `${description} ${merchant}`,
            amount,
            category,
            date: date.toISOString(),
            recipient: merchant,
            type: Math.random() > 0.1 ? 'debit' : 'credit',
        });
    }

    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return transactions;
};

// Initialize with simulated data if no data exists (per user)
export const initializeData = (userId?: string) => {
    if (typeof window === 'undefined') return;
    if (transactionService.getAll(userId).length === 0) {
        const simulated = generateSimulatedTransactions(50);
        transactionService.saveMany(simulated, userId);
    }

    // Add default categories if none exist
    if (categoryService.getAll(userId).length === 0) {
        const defaultCategories = [
            'Food & Dining', 'Shopping', 'Transportation', 'Bills & Utilities',
            'Entertainment', 'Healthcare', 'Education', 'Travel', 'Groceries'
        ];
        defaultCategories.forEach(cat => categoryService.add(cat, userId));
    }
};

