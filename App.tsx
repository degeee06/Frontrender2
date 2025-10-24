

import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode, FC, useRef, useMemo } from 'react';
import { supabase, signInWithGoogle, signOut, getSession } from './services/supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { Agendamento, TrialStatus, PerfilNegocio } from './types';
import { 
    Calendar, Check, ChevronRight, Clock, Download, FileText, Filter, Link as LinkIcon, 
    Lock, LogOut, Mail, MoreVertical, Phone, Plus, RefreshCw, Search, Settings, 
    Shield, Star, Trash2, TrendingUp, User as UserIcon, X, Zap, Loader2, ArrowRight
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
}
const AuthContext = createContext<AuthContextType>({ session: null, user: null, loading: true });
export const useAuth = () => useContext(AuthContext);

const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setAuthData = (session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
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

  const value = { session, user, loading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- HELPER FUNCTIONS ---
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

// --- UI COMPONENTS ---

const Spinner: FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <Loader2 className={`animate-spin ${className}`} />
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'premium' | 'danger' | 'ghost';
    isLoading?: boolean;
    icon?: React.ElementType;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ children, variant = 'secondary', isLoading = false, icon: Icon, className, ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center font-semibold rounded-xl px-4 py-3 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black-absolute focus:ring-silver-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none";
    
    const variantClasses = {
        primary: "bg-silver-accent text-black-absolute hover:bg-white-ice shadow-soft hover:shadow-deep hover:-translate-y-0.5",
        secondary: "bg-black-light text-white-ice border border-gray-steel hover:bg-gray-steel hover:border-silver-accent shadow-soft hover:shadow-deep hover:-translate-y-0.5",
        premium: "bg-gradient-to-r from-amber-500 to-orange-500 text-white-pure font-bold hover:from-amber-600 hover:to-orange-600 shadow-soft hover:shadow-deep hover:-translate-y-0.5",
        danger: "bg-red-600 text-white-pure hover:bg-red-700 shadow-soft hover:shadow-deep hover:-translate-y-0.5",
        ghost: "bg-transparent text-white-ice hover:bg-black-light",
    };

    return (
        <button ref={ref} className={`${baseClasses} ${variantClasses[variant]} ${className}`} disabled={isLoading} {...props}>
            {isLoading ? <Spinner /> : (
                <>
                    {Icon && <Icon className="w-5 h-5 mr-2" />}
                    {children}
                </>
            )}
        </button>
    );
});


interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
}

const Card: FC<CardProps> = ({ children, className, ...props }) => {
    return (
        <div className={`bg-black-medium border border-black-light rounded-2xl shadow-soft transition-all duration-300 relative overflow-hidden ${className}`} {...props}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-silver-accent/30 to-transparent" />
            {children}
        </div>
    );
};

// --- MAIN APP ---
export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

function MainApp() {
    const { session, loading } = useAuth();
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(localStorage.getItem('termsAccepted') === 'true');

    useEffect(() => {
      if (!loading && !session && !termsAccepted) {
        setIsTermsModalOpen(true);
      }
    }, [session, loading, termsAccepted]);

    const handleAcceptTerms = () => {
        localStorage.setItem('termsAccepted', 'true');
        setTermsAccepted(true);
        setIsTermsModalOpen(false);
    }
    
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
            {session ? <Dashboard /> : <LoginScreen isTermsAccepted={termsAccepted} onOpenTerms={() => setIsTermsModalOpen(true)}/>}
            <TermsModal isOpen={isTermsModalOpen} onAccept={handleAcceptTerms} onDecline={() => setIsTermsModalOpen(false)} />
        </div>
    );
}

// --- LOGIN SCREEN ---
interface LoginScreenProps {
  isTermsAccepted: boolean;
  onOpenTerms: () => void;
}
const LoginScreen: FC<LoginScreenProps> = ({ isTermsAccepted, onOpenTerms }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!isTermsAccepted) {
            alert("Você precisa aceitar os Termos de Uso para continuar.");
            return;
        }
        setIsLoading(true);
        try {
            await signInWithGoogle();
        } catch (error) {
            alert("Ocorreu um erro ao tentar fazer login. Tente novamente.");
            console.error(error);
            setIsLoading(false);
        }
    };

    return (
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
                    
                    <div className="text-center p-4 bg-black-deep rounded-2xl border border-black-light">
                        <p className="text-white-ice text-sm flex items-center justify-center gap-2">
                            <Shield className="w-4 h-4 text-silver-accent" />
                            <span className="font-medium">Login 100% seguro</span>
                            <span className="text-gray-steel">•</span>
                            <span>Seus dados protegidos</span>
                        </p>
                    </div>
                    
                    <div className="text-center text-sm text-gray-steel">
                        Ao continuar, você concorda com nossos{' '}
                        <button onClick={onOpenTerms} className="underline hover:text-white-ice">
                            Termos de Uso
                        </button>.
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- DASHBOARD ---
const Dashboard: FC = () => {
    const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
    const { session } = useAuth();
    
    const fetchAgendamentos = useCallback(async () => {
        if (!session) return;
        try {
            const res = await fetch(`${API_BASE_URL}/agendamentos`, {
                headers: { "Authorization": `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAgendamentos(data.agendamentos || []);
            }
        } catch (error) {
            console.error("Failed to fetch agendamentos", error);
        }
    }, [session]);

    useEffect(() => {
        fetchAgendamentos();
    }, [fetchAgendamentos]);
    
    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Header */}
            <header className="bg-black-medium border border-black-light rounded-2xl p-6 text-center mb-8 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-silver-accent/30 to-transparent" />
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-white-pure to-silver-accent text-transparent bg-clip-text">
                        Sua Agenda
                    </h1>
                     <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="secondary" icon={LinkIcon} className="text-xs sm:text-sm">Gerar Link</Button>
                        <Button variant="secondary" icon={Settings} className="text-xs sm:text-sm">Configurações</Button>
                        <Button onClick={signOut} icon={LogOut} variant="danger" className="text-xs sm:text-sm">Sair</Button>
                    </div>
                </div>
                <p className="text-sm sm:text-lg text-white-ice max-w-2xl mx-auto mt-4">
                    Gerencie seus compromissos com uma interface intuitiva e elegante.
                </p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna Esquerda: Formulário e IA */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Appointment Form */}
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4 text-center">Novo Agendamento</h2>
                        <form className="space-y-4">
                             <div>
                                <label htmlFor="nome" className="block text-sm font-medium text-white-ice mb-1">Nome</label>
                                <IMaskInput
                                    mask={/.*/}
                                    id="nome"
                                    name="nome"
                                    placeholder="Nome do cliente"
                                    className="w-full px-3 py-2 rounded-lg bg-black-deep border border-black-light focus:outline-none focus:border-silver-accent"
                                />
                            </div>
                            <div>
                                <label htmlFor="telefone" className="block text-sm font-medium text-white-ice mb-1">Telefone</label>
                                <IMaskInput
                                    mask="(00) 00000-0000"
                                    id="telefone"
                                    name="telefone"
                                    placeholder="(00) 00000-0000"
                                    className="w-full px-3 py-2 rounded-lg bg-black-deep border border-black-light focus:outline-none focus:border-silver-accent"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="data" className="block text-sm font-medium text-white-ice mb-1">Data</label>
                                    <input type="date" id="data" name="data" className="w-full px-3 py-2 rounded-lg bg-black-deep border border-black-light focus:outline-none focus:border-silver-accent" />
                                </div>
                                <div>
                                    <label htmlFor="horario" className="block text-sm font-medium text-white-ice mb-1">Horário</label>
                                    <input type="time" id="horario" name="horario" className="w-full px-3 py-2 rounded-lg bg-black-deep border border-black-light focus:outline-none focus:border-silver-accent" />
                                </div>
                            </div>
                            <Button type="submit" variant="primary" className="w-full" icon={Plus}>Agendar</Button>
                        </form>
                    </Card>
                     {/* AI Sections */}
                    <Card className="p-6">
                         <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Zap className="text-yellow-400"/> Sugestões da IA</h3>
                         <Button variant="secondary" className="w-full mb-4">Sugerir Horários Livres</Button>
                         <Button variant="secondary" className="w-full">Ver Estatísticas</Button>
                    </Card>
                </div>
                {/* Coluna Direita: Filtros e Lista */}
                <div className="lg:col-span-2">
                     {/* Filters */}
                     <Card className="p-4 mb-6">
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                           <div className="relative flex-grow w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-steel"/>
                                <input type="text" placeholder="Pesquisar..." className="w-full pl-10 pr-4 py-2 rounded-lg bg-black-deep border border-black-light focus:outline-none focus:border-silver-accent"/>
                           </div>
                           <div className="relative w-full md:w-auto">
                               <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-steel"/>
                               <select className="w-full md:w-48 appearance-none pl-10 pr-4 py-2 rounded-lg bg-black-deep border border-black-light text-white-ice focus:outline-none focus:border-silver-accent">
                                    <option value="">Todos</option>
                                    <option value="pendente">Pendente</option>
                                    <option value="confirmado">Confirmado</option>
                                    <option value="cancelado">Cancelado</option>
                               </select>
                           </div>
                           <Button variant="ghost" icon={Download}><span className="hidden md:inline">Exportar</span></Button>
                        </div>
                     </Card>
                     {/* Appointments List */}
                     <div className="space-y-4">
                        {agendamentos.length > 0 ? agendamentos.map(ag => (
                            <Card key={ag.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-4">
                                        <div className="text-center">
                                           <p className="font-bold text-lg">{ag.horario}</p>
                                           <p className="text-xs text-gray-steel">{formatData(ag.data)}</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold">{ag.nome}</p>
                                            <p className="text-sm text-gray-steel">{ag.telefone}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                     <span className={`px-2 py-1 text-xs font-medium rounded-full ${ag.status === 'confirmado' ? 'bg-green-500/20 text-green-400' : ag.status === 'pendente' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {ag.status}
                                    </span>
                                    <Button variant="ghost" className="!p-2"><MoreVertical size={18}/></Button>
                                </div>
                            </Card>
                        )) : (
                            <Card className="p-8 text-center text-gray-steel">
                                <Calendar className="mx-auto w-12 h-12 mb-4"/>
                                Nenhum agendamento encontrado.
                            </Card>
                        )}
                     </div>
                </div>
            </div>
        </div>
    );
};


// --- MODALS ---

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    title: string;
}
const Modal: FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <Card className="w-full max-w-lg animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">{title}</h2>
                        <Button variant="ghost" className="!p-2" onClick={onClose}><X/></Button>
                    </div>
                    {children}
                </div>
            </Card>
        </div>
    );
}

interface TermsModalProps {
    isOpen: boolean;
    onAccept: () => void;
    onDecline: () => void;
}
const TermsModal: FC<TermsModalProps> = ({ isOpen, onAccept, onDecline }) => (
    <Modal isOpen={isOpen} onClose={onDecline} title="📝 Termos de Uso">
         <div className="bg-black-deep rounded-lg p-4 mb-6 max-h-60 overflow-y-auto custom-scrollbar text-sm space-y-3 text-white-ice">
            <strong>Data de criação: 2025</strong>

            <h4 className="font-semibold text-silver-accent">1. Aceitação dos Termos</h4>
            <p>Ao utilizar nosso sistema de agendamentos, você concorda com estes Termos de Uso e nossa Política de Privacidade.</p>

            <h4 className="font-semibold text-silver-accent">2. Uso do Serviço</h4>
            <p>Você concorda em usar a plataforma apenas para fins legítimos de agendamento de serviços, sendo responsável por todas as informações cadastradas.</p>

            <h4 className="font-semibold text-silver-accent">3. Privacidade e Dados</h4>
            <p>Seus dados de agendamento são armazenados com segurança. Não compartilhamos suas informações com terceiros não autorizados.</p>
            
            <p className="text-xs text-gray-steel mt-4">🔒 <strong>Proteção de Dados:</strong> Este sistema segue as melhores práticas de segurança e proteção de dados pessoais.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="secondary" className="w-full" onClick={onDecline}>Recusar</Button>
            <Button variant="primary" className="w-full" onClick={onAccept} icon={Check}>Aceitar e Continuar</Button>
        </div>
    </Modal>
);