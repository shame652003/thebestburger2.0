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
  videoUrl?: string;
  activo: boolean;
  descalificado?: boolean;
  motivoDescalificacion?: string;
  usuarioAcceso?: string;
  claveAcceso?: string;
}

export interface RegistroCompraPatrocinador {
  id: string;
  patrocinadorId: string;
  patrocinadorNombre: string;
  restauranteId: string;
  restauranteNombre: string;
  restauranteNombreHamburguesa: string;
  descripcion: string;
  monto?: string;
  numeroFactura?: string;
  facturaFotoUrl?: string;
  fecha: string;
  creadoEn?: any;
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

export interface UsuarioAuth {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

export interface VotoUsuarioRegistro {
  id: string; // Composite key: `${userId}_${restauranteId}`
  userId: string;
  userEmail: string;
  userName: string;
  restauranteId: string;
  codigo: string;
  creadoEn: any;
}

export interface Voto {
  id: string;
  codigo: string;
  restauranteId: string;
  ratingGeneral: number;
  criterios: CriteriosVoto;
  comentario?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  creadoEn: string;
}

export interface Patrocinador {
  id: string;
  nombre: string;
  logoUrl: string;
  tipo: 'Principal' | 'Aliado Gourmet' | 'Patrocinador Oficial';
  descripcion: string;
  url?: string;
  esPrincipal?: boolean;
}

export interface EstadisticasEvento {
  totalVotos: number;
  totalCodigosGenerados: number;
  totalCodigosUsados: number;
  promedioGlobal: number;
  intentosFraudeBloqueados: number;
}
