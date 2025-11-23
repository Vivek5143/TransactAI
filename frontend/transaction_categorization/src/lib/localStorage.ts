// LocalStorage-based authentication and data management
// This completely bypasses Firebase for the prototype

export interface UserProfile {
    firstName: string;
    lastName: string;
    gender: string;
    email?: string;
    phone: string;
    createdAt: string;
}

export interface AuthSession {
    phone: string;
    isAuthenticated: boolean;
    timestamp: string;
}

// Authentication functions
export const localAuth = {
    // Store authentication session
    login: (phone: string) => {
        const session: AuthSession = {
            phone,
            isAuthenticated: true,
            timestamp: new Date().toISOString(),
        };
        localStorage.setItem('auth_session', JSON.stringify(session));
        return session;
    },

    // Check if user is authenticated
    isAuthenticated: (): boolean => {
        const session = localStorage.getItem('auth_session');
        return !!session;
    },

    // Get current session
    getSession: (): AuthSession | null => {
        const session = localStorage.getItem('auth_session');
        return session ? JSON.parse(session) : null;
    },

    // Logout
    logout: () => {
        localStorage.removeItem('auth_session');
        localStorage.removeItem('user_profile');
    },
};

// User profile functions
export const localProfile = {
    // Save user profile
    save: (profile: UserProfile) => {
        localStorage.setItem('user_profile', JSON.stringify(profile));
    },

    // Get user profile
    get: (): UserProfile | null => {
        const profile = localStorage.getItem('user_profile');
        return profile ? JSON.parse(profile) : null;
    },

    // Check if profile exists
    exists: (): boolean => {
        return !!localStorage.getItem('user_profile');
    },
};

// OTP management (for simulation)
export const localOTP = {
    // Generate and store OTP
    generate: (phone: string): string => {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        localStorage.setItem(`otp_${phone}`, JSON.stringify({
            otp,
            timestamp: new Date().toISOString(),
        }));
        return otp;
    },

    // Verify OTP
    verify: (phone: string, otp: string): boolean => {
        const stored = localStorage.getItem(`otp_${phone}`);
        if (!stored) return false;

        const { otp: storedOtp } = JSON.parse(stored);
        return otp === storedOtp;
    },

    // Clear OTP after verification
    clear: (phone: string) => {
        localStorage.removeItem(`otp_${phone}`);
    },
};
