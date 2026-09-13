export interface CriteriosVoto {
  saborCarne: number;
  calidadPan: number;
  salsasYToppings: number;
  creatividad: number;
}

export interface Restaurante {
  id: string;
  nombre: string;
  nombreHamburguesa: string;
  slogan: string;
  descripcion: string;
  ingredientes: string[];
  precio: string;
  fotoUrl: string;
  logoUrl: string;
  direccion: string;
  votosCount: number;
  promedioRating: number;
  rankingAnonimoTag: string; // e.g., "Competidor Alpha", "Hamburguesa #1"
  instagram: string;
  activo: boolean;
}

export interface CodigoVoto {
  id: string; // usually same as code uppercase
  codigo: string;
  restauranteId: string;
  restauranteNombre?: string;
  usado: boolean;
  usadoEn?: string;
  creadoEn: string;
  meseroOMesa?: string;
}

export interface Voto {
  id: string;
  codigo: string;
  restauranteId: string;
  ratingGeneral: number;
  criterios: CriteriosVoto;
  comentario?: string;
  creadoEn: string;
}

export interface Patrocinador {
  id: string;
  nombre: string;
  logoUrl: string;
  tipo: 'Principal' | 'Aliado Gourmet' | 'Patrocinador Oficial';
  descripcion: string;
  url?: string;
}

export interface EstadisticasEvento {
  totalVotos: number;
  totalCodigosGenerados: number;
  totalCodigosUsados: number;
  promedioGlobal: number;
  intentosFraudeBloqueados: number;
}
