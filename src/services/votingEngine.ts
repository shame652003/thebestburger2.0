import { Restaurante, CodigoVoto, Voto, CriteriosVoto, EstadisticasEvento } from '../types';
import { RESTAURANTES_INICIALES, PATROCINADORES_INICIALES, CODIGOS_DEMO, ESTADISTICAS_INICIALES } from '../data/mockData';

const STORAGE_KEYS = {
  RESTAURANTES: 'tocuyo_burgers_restaurantes',
  CODIGOS: 'tocuyo_burgers_codigos',
  VOTOS: 'tocuyo_burgers_votos',
  STATS: 'tocuyo_burgers_stats',
  FRAUD_LOGS: 'tocuyo_burgers_fraud_logs',
};

export interface FraudLog {
  id: string;
  codigoIntentado: string;
  restauranteId: string;
  motivo: string;
  fecha: string;
  ipSimulada: string;
}

export class VotingEngine {
  private static load<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  }

  private static save<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving to storage', e);
    }
  }

  public static getRestaurantes(): Restaurante[] {
    return this.load<Restaurante[]>(STORAGE_KEYS.RESTAURANTES, RESTAURANTES_INICIALES);
  }

  public static getCodigos(): CodigoVoto[] {
    return this.load<CodigoVoto[]>(STORAGE_KEYS.CODIGOS, CODIGOS_DEMO);
  }

  public static getVotos(): Voto[] {
    return this.load<Voto[]>(STORAGE_KEYS.VOTOS, []);
  }

  public static getStats(): EstadisticasEvento {
    return this.load<EstadisticasEvento>(STORAGE_KEYS.STATS, ESTADISTICAS_INICIALES);
  }

  public static getFraudLogs(): FraudLog[] {
    return this.load<FraudLog[]>(STORAGE_KEYS.FRAUD_LOGS, [
      {
        id: 'f-1',
        codigoIntentado: 'TOCUYO-USED-01',
        restauranteId: 'rest-tocuyo-1',
        motivo: 'CÓDIGO_YA_CANJEADO: El código ya fue utilizado previamente.',
        fecha: 'Hace 15 minutos',
        ipSimulada: '190.205.88.12',
      },
      {
        id: 'f-2',
        codigoIntentado: 'HACK-BURGER-999',
        restauranteId: 'rest-tocuyo-2',
        motivo: 'CÓDIGO_INEXISTENTE: Código no generado por la plataforma oficial.',
        fecha: 'Hace 42 minutos',
        ipSimulada: '186.92.14.7',
      },
    ]);
  }

  public static async executeAtomicVoteTransaction(params: {
    codigoRaw: string;
    restauranteId: string;
    ratingGeneral: number;
    criterios: CriteriosVoto;
    comentario?: string;
  }): Promise<{ success: boolean; message: string; votoId?: string }> {
    // Artificial latency to simulate cloud Firestore network roundtrip
    await new Promise((resolve) => setTimeout(resolve, 850));

    const codigoSanitizado = params.codigoRaw.trim().toUpperCase();
    const codigos = this.getCodigos();
    const restaurantes = this.getRestaurantes();
    const stats = this.getStats();

    // 1. Transaction Read Phase: Verify Code
    const codeDoc = codigos.find((c) => c.codigo.toUpperCase() === codigoSanitizado);

    if (!codeDoc) {
      this.logFraudAttempt(codigoSanitizado, params.restauranteId, 'CÓDIGO_INEXISTENTE: El código no está registrado en la base de datos.');
      throw new Error('El código ingresado no existe o no es válido para este concurso.');
    }

    if (codeDoc.usado) {
      this.logFraudAttempt(codigoSanitizado, params.restauranteId, `CÓDIGO_YA_USADO: Canjeado el ${codeDoc.usadoEn || 'previamente'}.`);
      throw new Error('Este código ya fue utilizado para votar. Cada código solo permite un único voto válido.');
    }

    if (codeDoc.restauranteId !== params.restauranteId) {
      this.logFraudAttempt(codigoSanitizado, params.restauranteId, `MISMATCH_RESTAURANTE: Código asignado a ${codeDoc.restauranteId} pero usado para ${params.restauranteId}.`);
      throw new Error('Este código pertenece a otro restaurante participante. Verifica la hamburguesa que estás evaluando.');
    }

    // Target restaurant check
    const restIndex = restaurantes.findIndex((r) => r.id === params.restauranteId);
    if (restIndex === -1) {
      throw new Error('El restaurante seleccionado no está activo o registrado.');
    }

    // 2. Transaction Write Phase (Atomic):
    // a) Mark code as used
    codeDoc.usado = true;
    codeDoc.usadoEn = new Date().toISOString();

    // b) Create vote record
    const nuevoVotoId = 'voto-' + Math.random().toString(36).substring(2, 9);
    const nuevoVoto: Voto = {
      id: nuevoVotoId,
      codigo: codigoSanitizado,
      restauranteId: params.restauranteId,
      ratingGeneral: params.ratingGeneral,
      criterios: params.criterios,
      comentario: params.comentario?.trim() || undefined,
      creadoEn: new Date().toISOString(),
    };

    const votosActuales = this.getVotos();
    votosActuales.unshift(nuevoVoto);

    // c) Recalculate restaurant running stats atomically
    const rest = restaurantes[restIndex];
    const prevCount = rest.votosCount;
    const prevScore = rest.promedioRating;
    const newCount = prevCount + 1;
    const newAverage = Number(((prevScore * prevCount + params.ratingGeneral) / newCount).toFixed(2));

    restaurantes[restIndex] = {
      ...rest,
      votosCount: newCount,
      promedioRating: newAverage,
    };

    // Update global stats
    const newStats: EstadisticasEvento = {
      ...stats,
      totalVotos: stats.totalVotos + 1,
      totalCodigosUsados: stats.totalCodigosUsados + 1,
      promedioGlobal: Number(((stats.promedioGlobal * stats.totalVotos + params.ratingGeneral) / (stats.totalVotos + 1)).toFixed(2)),
    };

    // Commit changes
    this.save(STORAGE_KEYS.CODIGOS, codigos);
    this.save(STORAGE_KEYS.VOTOS, votosActuales);
    this.save(STORAGE_KEYS.RESTAURANTES, restaurantes);
    this.save(STORAGE_KEYS.STATS, newStats);

    return {
      success: true,
      message: '¡Voto verificado y registrado exitosamente!',
      votoId: nuevoVotoId,
    };
  }

  private static logFraudAttempt(codigo: string, restauranteId: string, motivo: string): void {
    const logs = this.getFraudLogs();
    const newLog: FraudLog = {
      id: 'fraud-' + Date.now(),
      codigoIntentado: codigo,
      restauranteId,
      motivo,
      fecha: 'Hace un momento',
      ipSimulada: `190.20${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 250)}`,
    };
    logs.unshift(newLog);
    this.save(STORAGE_KEYS.FRAUD_LOGS, logs.slice(0, 50));

    const stats = this.getStats();
    this.save(STORAGE_KEYS.STATS, {
      ...stats,
      intentosFraudeBloqueados: stats.intentosFraudeBloqueados + 1,
    });
  }

  public static generateBatchCodes(params: {
    restauranteId: string;
    cantidad: number;
    prefijoLote?: string;
    identificadorMesa?: string;
  }): CodigoVoto[] {
    const codigos = this.getCodigos();
    const restaurantes = this.getRestaurantes();
    const rest = restaurantes.find((r) => r.id === params.restauranteId);
    const prefijo = params.prefijoLote || 'TOCUYO';

    const nuevos: CodigoVoto[] = [];
    for (let i = 0; i < params.cantidad; i++) {
      const randomPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const randomPart2 = Math.random().toString(36).substring(2, 5).toUpperCase();
      const codeString = `${prefijo}-${randomPart1}-${randomPart2}`;

      const nuevoCodigo: CodigoVoto = {
        id: codeString,
        codigo: codeString,
        restauranteId: params.restauranteId,
        restauranteNombre: rest?.nombre || 'Restaurante Tocuyo',
        usado: false,
        creadoEn: new Date().toISOString(),
        meseroOMesa: params.identificadorMesa || 'Lote Mesoneros #1',
      };
      nuevos.push(nuevoCodigo);
    }

    const todos = [...nuevos, ...codigos];
    this.save(STORAGE_KEYS.CODIGOS, todos);

    const stats = this.getStats();
    this.save(STORAGE_KEYS.STATS, {
      ...stats,
      totalCodigosGenerados: stats.totalCodigosGenerados + params.cantidad,
    });

    return nuevos;
  }

  public static addRestaurante(nuevo: Omit<Restaurante, 'id' | 'votosCount' | 'promedioRating' | 'rankingAnonimoTag'>): Restaurante {
    const list = this.getRestaurantes();
    const nextNumber = list.length + 1;
    const item: Restaurante = {
      ...nuevo,
      id: `rest-tocuyo-${Date.now()}`,
      votosCount: 0,
      promedioRating: 5.0,
      rankingAnonimoTag: `Hamburguesa Secreta #${nextNumber}`,
      activo: true,
    };
    list.push(item);
    this.save(STORAGE_KEYS.RESTAURANTES, list);
    return item;
  }

  public static resetToDefaults(): void {
    localStorage.removeItem(STORAGE_KEYS.RESTAURANTES);
    localStorage.removeItem(STORAGE_KEYS.CODIGOS);
    localStorage.removeItem(STORAGE_KEYS.VOTOS);
    localStorage.removeItem(STORAGE_KEYS.STATS);
    localStorage.removeItem(STORAGE_KEYS.FRAUD_LOGS);
  }
}
