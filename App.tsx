
import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode, FC, useRef } from 'react';
import { supabase, signInWithGoogle, signOut, getSession } from './services/supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { Agendamento, TrialStatus, PerfilNegocio } from './types';
import { 
    Calendar, Check, ChevronRight, Clock, Download, FileText, Filter, Link as LinkIcon, 
    Lock, LogOut, Mail, MoreVertical, Phone, Plus, RefreshCw, Search, Settings, 
    Shield, Star, Trash2, TrendingUp, User as UserIcon, X, Zap, Loader2, Info, CheckCircle, AlertCircle
} from 'lucide-react';
import { IMaskInput } from 'react-imask';
import { jsPDF } from "jspdf";

// --- API CONFIG ---
const API_BASE_URL = "https://agendamento-ynxr.onrender.com";

// --- AUTH CONTEXT ---
interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  token: string | null;
}
const AuthContext = createContext<AuthContextType>({ session: null, user: null, loading: true, token: null });
export const useAuth = () => useContext(AuthContext);

const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setAuthData = (session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        setToken(session?.access_token ?? null);
        setLoading(false);
    }
    
    getSession().then(session => setAuthData(session));

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setAuthData(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = { session, user, loading, token };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- HELPER FUNCTIONS & COMPONENTS ---

const formatData = (data: string) => {
    if (!data) return '';
    const [y, m, d] = data.split("-");
    return `${d}/${m}/${y}`;
};

const debounce = <T extends (...args: any[]) => void>(func: T, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const Spinner: FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <Loader2 className={`animate-spin ${className}`} />
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'premium' | 'danger' | 'ghost' | 'action';
    isLoading?: boolean;
    icon?: React.ElementType;
    size?: 'sm' | 'md' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ children, variant = 'secondary', isLoading = false, icon: Icon, size = 'md', className, ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black-absolute focus:ring-silver-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none";
    
    const sizeClasses = {
        sm: 'px-3 py-2 text-xs',
        md: 'px-4 py-3 text-sm',
        lg: 'px-6 py-4 text-base'
    };

    const variantClasses = {
        primary: "bg-silver-accent text-black-absolute hover:bg-white-ice shadow-soft hover:shadow-deep hover:-translate-y-0.5",
        secondary: "bg-black-light text-white-ice border border-gray-steel hover:bg-gray-steel hover:border-silver-accent shadow-soft hover:shadow-deep hover:-translate-y-0.5",
        premium: "bg-gradient-to-r from-amber-500 to-orange-500 text-white-pure font-bold hover:from-amber-600 hover:to-orange-600 shadow-soft hover:shadow-deep hover:-translate-y-0.5",
        danger: "bg-red-600 text-white-pure hover:bg-red-700 shadow-soft hover:shadow-deep hover:-translate-y-0.5",
        ghost: "bg-transparent text-white-ice hover:bg-black-light",
        action: "bg-blue-600 text-white-pure hover:bg-blue-700",
    };

    return (
        <button ref={ref} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} disabled={isLoading} {...props}>
            {isLoading ? <Spinner /> : (
                <>
                    {Icon && <Icon className="w-4 h-4 mr-2" />}
                    {children}
                </>
            )}
        </button>
    );
});


const Card: FC<{ children: ReactNode; className?: string }> = ({ children, className, ...props }) => (
    <div className={`bg-black-medium border border-black-light rounded-2xl shadow-soft transition-all duration-300 relative overflow-hidden ${className}`} {...props}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-silver-accent/30 to-transparent" />
        {children}
    </div>
);

const ToastContainer: FC = () => <div id="toast-container" className="fixed top-4 right-4 space-y-2 z-[9999]"></div>;

const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = "success") => {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const icons = { success: CheckCircle, error: AlertCircle, info: Info, warning: AlertCircle };
    const colors = {
        success: "bg-gradient-to-r from-green-500 to-teal-400",
        error: "bg-gradient-to-r from-red-500 to-pink-500",
        info: "bg-gradient-to-r from-blue-500 to-cyan-400",
        warning: "bg-gradient-to-r from-yellow-500 to-amber-400"
    };
    
    const Icon = icons[type];

    const toast = document.createElement("div");
    toast.className = `p-4 rounded-lg shadow-lg text-white font-medium ${colors[type]} opacity-0 translate-x-5 transition-all duration-300 flex items-center gap-3`;
    
    const iconContainer = document.createElement('div');
    iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${type==='success' ? 'check-circle' : 'alert-circle'}"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    
    const text = document.createElement('span');
    text.textContent = message;
    
    toast.appendChild(iconContainer.firstChild!);
    toast.appendChild(text);

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove("opacity-0", "translate-x-5");
        toast.classList.add("opacity-100", "translate-x-0");
    });

    setTimeout(() => {
        toast.classList.add("opacity-0", "translate-x-5");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// --- APP ---
export default function App() {
  return (
    <AuthProvider>
        <MainApp />
        <ToastContainer />
    </AuthProvider>
  );
}

function MainApp() {
    const { session, loading } = useAuth();

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black-absolute flex flex-col items-center justify-center text-white-ice">
                <Spinner className="w-10 h-10" />
                <p className="mt-4 text-lg">Carregando...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black-absolute font-sans text-white-ice">
            {session ? <Dashboard /> : <LoginScreen />}
        </div>
    );
}

// --- LOGIN SCREEN ---
const LoginScreen: FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(localStorage.getItem('termsAccepted') === 'true');
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

    const handleLogin = async () => {
        if (!termsAccepted) {
            showToast("Você precisa aceitar os Termos de Uso.", "warning");
            return;
        }
        setIsLoading(true);
        try {
            await signInWithGoogle();
        } catch (error) {
            showToast("Ocorreu um erro ao tentar fazer login.", "error");
            console.error(error);
            setIsLoading(false);
        }
    };

    const handleAcceptTerms = () => {
        localStorage.setItem('termsAccepted', 'true');
        setTermsAccepted(true);
        setIsTermsModalOpen(false);
        showToast("Termos aceitos com sucesso!", "success");
    };

    return (
        <>
            <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
                <Card className="p-8 md:p-10 w-full max-w-md animate-fade-in">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-black-light border border-gray-steel shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
                            <Lock className="w-10 h-10 text-white-ice" />
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-white-pure to-silver-accent text-transparent bg-clip-text mb-3">
                            Acesso ao Sistema
                        </h1>
                        <p className="text-white-ice text-lg">Entre com sua conta Google</p>
                    </div>

                    <div className="space-y-6">
                        <Button
                            variant="secondary"
                            className="w-full !py-4 !text-base group"
                            onClick={handleLogin}
                            isLoading={isLoading}
                        >
                            {!isLoading && (
                                <>
                                    <svg className="w-6 h-6 mr-4 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    <span>Continuar com Google</span>
                                </>
                            )}
                        </Button>
                        <div className="p-4 bg-black-deep rounded-lg border border-black-light">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={termsAccepted}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setIsTermsModalOpen(true);
                                        } else {
                                            setTermsAccepted(false);
                                            localStorage.removeItem('termsAccepted');
                                        }
                                    }}
                                    className="mt-1 rounded bg-black-medium border-gray-steel focus:ring-2 focus:ring-silver-accent"
                                />
                                <span className="text-sm text-white-ice">
                                    Concordo com os{' '}
                                    <button type="button" onClick={() => setIsTermsModalOpen(true)} className="text-silver-accent hover:text-white-pure underline">
                                        Termos de Uso
                                    </button>
                                </span>
                            </label>
                        </div>
                        <div className="text-center p-4 bg-black-deep rounded-2xl border border-black-light">
                            <p className="text-white-ice text-sm flex items-center justify-center gap-2">
                                <Shield className="w-4 h-4 text-silver-accent" />
                                <span className="font-medium">Login 100% seguro</span>
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
            <TermsModal isOpen={isTermsModalOpen} onAccept={handleAcceptTerms} onDecline={() => setIsTermsModalOpen(false)} />
        </>
    );
};

// --- DASHBOARD ---
const Dashboard: FC = () => {
    // This is a monster component, reflecting the original vanilla JS structure.
    // In a real refactor, this would be broken down into many smaller components.
    const { token } = useAuth();
    const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
    const [filteredAgendamentos, setFilteredAgendamentos] = useState<Agendamento[]>([]);
    const [loadingAgendamentos, setLoadingAgendamentos] = useState(true);
    
    // Filters State
    const [diaSelecionado, setDiaSelecionado] = useState<number>(new Date().getDay());
    const [searchInput, setSearchInput] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const fetchAgendamentos = useCallback(async () => {
        if (!token) return;
        setLoadingAgendamentos(true);
        try {
            const res = await fetch(`${API_BASE_URL}/agendamentos`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAgendamentos(data.agendamentos || []);
            } else if (res.status === 401) {
                await signOut();
                showToast("Sessão expirada. Faça login novamente.", "error");
            }
        } catch (error) {
            console.error("Failed to fetch agendamentos", error);
            showToast("Erro ao carregar agendamentos.", "error");
        } finally {
            setLoadingAgendamentos(false);
        }
    }, [token]);

    useEffect(() => {
        fetchAgendamentos();
    }, [fetchAgendamentos]);

     useEffect(() => {
        const lowercasedFilter = searchInput.toLowerCase();
        const filtered = agendamentos.filter(a => {
            const matchesSearch = a.nome.toLowerCase().includes(lowercasedFilter) || (a.email && a.email.toLowerCase().includes(lowercasedFilter));
            const matchesStatus = !statusFilter || a.status === statusFilter;
            
            // Date filtering logic from original script
            const dataAgendamento = new Date(`${a.data}T${a.horario}`);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            let matchesDate = false;
            if (diaSelecionado >= 0 && diaSelecionado <= 6) {
                matchesDate = dataAgendamento.getDay() === diaSelecionado && dataAgendamento >= hoje;
            } else {
                 const hojeFim = new Date();
                 hojeFim.setHours(23, 59, 59, 999);
                if (diaSelecionado === -1) { // Semana passada
                    const umaSemanaAtras = new Date();
                    umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);
                    umaSemanaAtras.setHours(0, 0, 0, 0);
                    matchesDate = dataAgendamento >= umaSemanaAtras && dataAgendamento <= hojeFim;
                }
                // ... other past date filters can be added here
            }

            return matchesSearch && matchesStatus && matchesDate;
        }).sort((a, b) => new Date(`${a.data}T${a.horario}`).getTime() - new Date(`${b.data}T${b.horario}`).getTime());

        setFilteredAgendamentos(filtered);
    }, [agendamentos, searchInput, statusFilter, diaSelecionado]);
    
    // --- FORM SUBMISSION ---
    const handleAgendamentoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!token) return;
        
        const formData = new FormData(e.currentTarget);
        const dataToSend = Object.fromEntries(formData.entries());

        if(!dataToSend.nome || !dataToSend.telefone || !dataToSend.data || !dataToSend.horario) {
            showToast("Preencha todos os campos obrigatórios", "warning");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/agendar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${token}` },
                body: JSON.stringify(dataToSend)
            });
            const result = await response.json();
            if (response.ok) {
                showToast("Agendado com sucesso!", "success");
                e.currentTarget.reset();
                fetchAgendamentos(); // Refresh list
            } else {
                showToast(result.msg || "Erro ao agendar", "error");
            }
        } catch (error) {
            showToast("Erro de conexão ao agendar", "error");
        }
    };
    
    // --- UI RENDER ---
    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <header className="bg-black-medium border border-black-light rounded-2xl p-6 text-center mb-8 animate-fade-in relative overflow-hidden">
                <div className="absolute top-