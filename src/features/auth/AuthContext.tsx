import {createContext, useContext, useState, type ReactNode} from 'react';

type User = {
    id: string;
    name: string;
    email: string;
};

type AuthState = {
    user: User | null;
    token: string | null;
};

const AuthContext = createContext<AuthState | null>(null);

type AuthProviderProps = {
    children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        token: null,
    });
    
    return (
        <AuthContext.Provider value={authState}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }  

    return context;
}