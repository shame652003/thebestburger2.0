import { 
  doc, 
  runTransaction, 
  serverTimestamp, 
  collection, 
  getDocs, 
  addDoc, 
  getDoc,
  setDoc,
  writeBatch,
  query,
  orderBy,
  limit,
  increment
} from "firebase/firestore";
import { db, storage } from "../../firebase"; 
import { Voto, CriteriosVoto, Restaurante, Patrocinador, EstadisticasEvento, CodigoVoto } from "../types";
export const convertImageToBase64 = (file: File, maxWidth = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Comprimir a JPEG con calidad 0.7 para que pese muy poco (ideal para Firestore)
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Definimos FraudLog aquí para independizarnos de votingEngine
export interface FraudLogType {
  id: string;
  codigoIntentado: string;
  restauranteId: string;
  motivo: string;
  fecha: string;
  ipSimulada: string;
  creadoEn?: any;
}

const STATS_DOC_ID = "global_stats";

// ==========================================
// 1. VOTACIÓN Y TRANSACCIONES ANTIFRAUDE
// ==========================================

export const emitirVotoConTransaccion = async (
  codigoIngresado: string,
  restauranteId: string,
  ratingGeneral: number,
  criterios: CriteriosVoto,
  comentario: string = ""
): Promise<{ success: boolean; message: string }> => {
  const codigoTrimmed = codigoIngresado.trim().toUpperCase();
  const codigoRef = doc(db, "codigos", codigoTrimmed);
  const restauranteRef = doc(db, "restaurantes", restauranteId);
  const nuevoVotoRef = doc(db, "votos", crypto.randomUUID());
  const statsRef = doc(db, "estadisticas", STATS_DOC_ID);

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Validar Código
      const codigoDoc = await transaction.get(codigoRef);
      if (!codigoDoc.exists()) {
        await logFraudAttempt("CÓDIGO_INEXISTENTE", codigoTrimmed, restauranteId);
        throw new Error("El código ingresado no existe o no es válido.");
      }

      const codigoData = codigoDoc.data() as CodigoVoto;

      if (codigoData.usado) {
        await logFraudAttempt("CÓDIGO_YA_USADO", codigoTrimmed, restauranteId);
        throw new Error("Este código ya ha sido utilizado para votar.");
      }

      if (codigoData.restauranteId && codigoData.restauranteId !== restauranteId) {
        await logFraudAttempt("MISMATCH_RESTAURANTE", codigoTrimmed, restauranteId);
        throw new Error("Este código no pertenece a este restaurante.");
      }

      // 2. Leer Restaurante
      const restauranteDoc = await transaction.get(restauranteRef);
      if (!restauranteDoc.exists()) {
        throw new Error("El restaurante especificado no existe.");
      }

      const restauranteData = restauranteDoc.data() as Restaurante;
      const currentVotosCount = restauranteData.votosCount || 0;
      const currentPromedio = restauranteData.promedioRating || 0;
      
      const nuevoVotosCount = currentVotosCount + 1;
      const nuevoPromedio = Number((((currentPromedio * currentVotosCount) + ratingGeneral) / nuevoVotosCount).toFixed(2));

      // 3. Leer Estadísticas (Si no existen, se crearán por defecto luego, pero asumimos que existen)
      const statsDoc = await transaction.get(statsRef);
      let globalStats = statsDoc.exists() 
        ? statsDoc.data() as EstadisticasEvento 
        : { totalVotos: 0, totalCodigosUsados: 0, promedioGlobal: 0, totalCodigosGenerados: 0, intentosFraudeBloqueados: 0 };
        
      const newGlobalVotos = (globalStats.totalVotos || 0) + 1;
      const newGlobalPromedio = Number(((((globalStats.promedioGlobal || 0) * (globalStats.totalVotos || 0)) + ratingGeneral) / newGlobalVotos).toFixed(2));

      // 4. Escribir Atómicamente
      transaction.update(codigoRef, {
        usado: true,
        usadoEn: serverTimestamp(),
      });

      transaction.update(restauranteRef, {
        votosCount: nuevoVotosCount,
        promedioRating: nuevoPromedio
      });

      transaction.set(nuevoVotoRef, {
        codigo: codigoTrimmed,
        restauranteId,
        ratingGeneral,
        criterios,
        comentario,
        creadoEn: serverTimestamp()
      });

      transaction.set(statsRef, {
        ...globalStats,
        totalVotos: newGlobalVotos,
        totalCodigosUsados: (globalStats.totalCodigosUsados || 0) + 1,
        promedioGlobal: newGlobalPromedio
      }, { merge: true });
    });

    return { success: true, message: "¡Voto registrado exitosamente!" };

  } catch (error: any) {
    console.error("Error procesando el voto: ", error);
    return { success: false, message: error.message || "Ocurrió un error al procesar el voto." };
  }
};

const logFraudAttempt = async (motivo: string, codigo: string, restauranteId: string) => {
  try {
    await addDoc(collection(db, "fraud_logs"), {
      codigoIntentado: codigo,
      restauranteId,
      motivo,
      fecha: new Date().toISOString(),
      ipSimulada: "IP_REGISTRADA_POR_SEGURIDAD",
      creadoEn: serverTimestamp()
    });
    
    // Incrementar stats de fraude
    const statsRef = doc(db, "estadisticas", STATS_DOC_ID);
    await setDoc(statsRef, { intentosFraudeBloqueados: increment(1) }, { merge: true });
  } catch (e) {
    console.error("Error registrando log de fraude:", e);
  }
};

// ==========================================
// 2. GESTIÓN DE RESTAURANTES
// ==========================================

export const getRestaurantesFirebase = async (): Promise<Restaurante[]> => {
  try {
    const q = query(collection(db, "restaurantes"));
    const querySnapshot = await getDocs(q);
    const restaurantes: Restaurante[] = [];
    
    querySnapshot.forEach((doc) => {
      restaurantes.push({ id: doc.id, ...doc.data() } as Restaurante);
    });
    
    return restaurantes;
  } catch (error) {
    console.error("Error obteniendo restaurantes: ", error);
    return [];
  }
};

export const addRestauranteFirebase = async (nuevoRestaurante: Omit<Restaurante, "id">): Promise<Restaurante | null> => {
  try {
    const docRef = await addDoc(collection(db, "restaurantes"), nuevoRestaurante);
    return {
      id: docRef.id,
      ...nuevoRestaurante
    };
  } catch (error) {
    console.error("Error agregando restaurante: ", error);
    return null;
  }
};

// ==========================================
// 3. ESTADÍSTICAS Y LOGS
// ==========================================

export const getStatsFirebase = async (): Promise<EstadisticasEvento> => {
  try {
    const statsRef = doc(db, "estadisticas", STATS_DOC_ID);
    const docSnap = await getDoc(statsRef);
    if (docSnap.exists()) {
      return docSnap.data() as EstadisticasEvento;
    } else {
      // Valor por defecto si no existe
      const defaultStats: EstadisticasEvento = {
        totalVotos: 0,
        totalCodigosGenerados: 0,
        totalCodigosUsados: 0,
        promedioGlobal: 0,
        intentosFraudeBloqueados: 0
      };
      await setDoc(statsRef, defaultStats);
      return defaultStats;
    }
  } catch (error) {
    console.error("Error obteniendo stats: ", error);
    return { totalVotos: 0, totalCodigosGenerados: 0, totalCodigosUsados: 0, promedioGlobal: 0, intentosFraudeBloqueados: 0 };
  }
};

export const getFraudLogsFirebase = async (): Promise<FraudLogType[]> => {
  try {
    const q = query(collection(db, "fraud_logs"), orderBy("creadoEn", "desc"), limit(50));
    const querySnapshot = await getDocs(q);
    const logs: FraudLogType[] = [];
    querySnapshot.forEach(doc => {
      logs.push({ id: doc.id, ...doc.data() } as FraudLogType);
    });
    return logs;
  } catch (e) {
    console.error("Error obteniendo logs de fraude:", e);
    return [];
  }
};

// ==========================================
// 4. GENERADOR DE CÓDIGOS (BATCH WRITES)
// ==========================================

export const generateBatchCodesFirebase = async (params: {
  restauranteId: string;
  restauranteNombre: string;
  cantidad: number;
  prefijoLote?: string;
}): Promise<CodigoVoto[]> => {
  try {
    const nuevosCodigos: CodigoVoto[] = [];
    const prefijo = params.prefijoLote || 'TOCUYO';
    
    // Chunk array into pieces of 400 to respect Firestore's 500 limit per batch
    const CHUNK_SIZE = 400;
    const totalBatches = Math.ceil(params.cantidad / CHUNK_SIZE);
    
    for (let b = 0; b < totalBatches; b++) {
      const batch = writeBatch(db);
      const currentChunkSize = Math.min(CHUNK_SIZE, params.cantidad - (b * CHUNK_SIZE));
      
      for (let i = 0; i < currentChunkSize; i++) {
        const randomPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const randomPart2 = Math.random().toString(36).substring(2, 5).toUpperCase();
        const codeString = `${prefijo}-${randomPart1}-${randomPart2}`;
        
        const newCodeRef = doc(db, "codigos", codeString);
        
        const nuevoCodigo: CodigoVoto = {
          id: codeString,
          codigo: codeString,
          restauranteId: params.restauranteId,
          restauranteNombre: params.restauranteNombre,
          usado: false,
          creadoEn: new Date().toISOString()
        };
        
        batch.set(newCodeRef, nuevoCodigo);
        nuevosCodigos.push(nuevoCodigo);
      }
      
      // En el último batch actualizamos el contador de estadísticas
      if (b === totalBatches - 1) {
        const statsRef = doc(db, "estadisticas", STATS_DOC_ID);
        batch.set(statsRef, { totalCodigosGenerados: increment(params.cantidad) }, { merge: true });
      }
      
      await batch.commit();
    }
    
    return nuevosCodigos;
  } catch (error) {
    console.error("Error generando lote de códigos:", error);
    return [];
  }
};

export const getCodigosFirebase = async (): Promise<CodigoVoto[]> => {
  try {
    const q = query(collection(db, "codigos"), limit(500)); // Limitar a 500 para UI
    const snapshot = await getDocs(q);
    const codigos: CodigoVoto[] = [];
    snapshot.forEach(doc => {
      codigos.push({ id: doc.id, ...doc.data() } as CodigoVoto);
    });
    // Ordenar localmente por creadoEn descendente
    return codigos.sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime());
  } catch (e) {
    console.error("Error obteniendo códigos:", e);
    return [];
  }
};

// ==========================================
// 5. PATROCINADORES
// ==========================================

export const getPatrocinadoresFirebase = async (): Promise<Patrocinador[]> => {
  try {
    const q = query(collection(db, "patrocinadores"));
    const snapshot = await getDocs(q);
    const patroc: Patrocinador[] = [];
    snapshot.forEach(doc => {
      patroc.push({ id: doc.id, ...doc.data() } as Patrocinador);
    });
    return patroc;
  } catch (e) {
    console.error("Error obteniendo patrocinadores:", e);
    return [];
  }
};

export const addPatrocinadorFirebase = async (nuevoPatrocinador: Omit<Patrocinador, "id">): Promise<Patrocinador | null> => {
  try {
    const docRef = await addDoc(collection(db, "patrocinadores"), nuevoPatrocinador);
    return {
      id: docRef.id,
      ...nuevoPatrocinador
    };
  } catch (error) {
    console.error("Error agregando patrocinador: ", error);
    return null;
  }
};
