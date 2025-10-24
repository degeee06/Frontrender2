
export interface Agendamento {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  data: string;
  horario: string;
  status: 'pendente' | 'confirmado' | 'cancelado';
  user_id?: string;
}

export interface HorariosFuncionamento {
  [key: string]: {
    inicio: string;
    fim: string;
  };
}

export interface HorarioBloqueado {
  tipo: 'recorrente' | 'data_especifica';
  inicio: string;
  fim: string;
  data?: string;
}

export interface PerfilNegocio {
  id?: number;
  nome_negocio: string;
  tipo_negocio: string;
  dias_funcionamento: string[];
  horarios_funcionamento: HorariosFuncionamento;
  horarios_bloqueados: HorarioBloqueado[];
}

export interface TrialStatus {
  hasTrial: boolean;
  isFreeTrial?: boolean;
  isPremiumTrial?: boolean;
  unlimited?: boolean;
  dailyUsagesLeft: number;
}
