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
  increment,
  updateDoc
} from "firebase/firestore";
import { db, storage, auth, googleProvider } from "../../firebase"; 
import { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import { Voto, CriteriosVoto, Restaurante, Patrocinador, EstadisticasEvento, CodigoVoto, UsuarioAuth, RegistroCompraPatrocinador } from "../types";
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
// 0. AUTENTICACIÓN GOOGLE (GMAIL) MULTIDISPOSITIVO
// ==========================================

const LOCAL_STORAGE_USER_KEY = "foodfest_comensal_user";
const authSubscribers: Array<(user: UsuarioAuth | null) => void> = [];

const notifyAuthSubscribers = (user: UsuarioAuth | null) => {
  authSubscribers.forEach((cb) => {
    try { cb(user); } catch (e) { console.error(e); }
  });
};

export const getStoredComensalUser = (): UsuarioAuth | null => {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_USER_KEY) : null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredComensalUser = (user: UsuarioAuth | null): void => {
  try {
    if (typeof localStorage !== 'undefined') {
      if (user) {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      }
    }
  } catch {}
};

export const loginWithGoogle = async (preferRedirect = false): Promise<{ success: boolean; user?: UsuarioAuth; error?: string; code?: string }> => {
  const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|CriOS/i.test(navigator.userAgent);

  try {
    // Si es móvil o se solicita explícitamente, usar redirección completa para no depender de popups bloqueados
    if (preferRedirect || isMobile) {
      await signInWithRedirect(auth, googleProvider);
      return { success: true };
    }

    const result = await signInWithPopup(auth, googleProvider);
    const u = result.user;
    const usuarioAuth: UsuarioAuth = {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName || u.email?.split('@')[0] || "Comensal Food Fest",
      photoURL: u.photoURL
    };
    setStoredComensalUser(usuarioAuth);
    notifyAuthSubscribers(usuarioAuth);
    return { success: true, user: usuarioAuth };
  } catch (error: any) {
    console.error("Error en loginWithGoogle:", error);
    const errorCode = error.code || '';
    let userFriendlyMessage = error.message || 'No se pudo iniciar sesión con Google.';

    if (errorCode === 'auth/operation-not-allowed') {
      userFriendlyMessage = 'El proveedor Google no está habilitado en Firebase. Ve a Firebase Console > Authentication > Sign-in method y activa "Google".';
    } else if (errorCode === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
      userFriendlyMessage = `El dominio "${currentHost}" no está autorizado en Firebase. Agrégalo en Firebase Console > Authentication > Settings > Dominios autorizados.`;
    } else if (errorCode === 'auth/popup-closed-by-user' || errorCode === 'auth/cancelled-popup-request') {
      userFriendlyMessage = 'La ventana de inicio de sesión se cerró. Esto ocurre en navegadores que bloquean ventanas emergentes o si Google no está activo en Firebase. Puedes acceder con redirección o registrar tu correo Gmail directamente abajo.';
    } else if (errorCode === 'auth/popup-blocked') {
      userFriendlyMessage = 'Tu navegador bloqueó la ventana emergente de Google. Usa la opción de acceso con redirección.';
    }

    return { success: false, error: userFriendlyMessage, code: errorCode };
  }
};

export const loginWithGoogleRedirect = async (): Promise<void> => {
  await signInWithRedirect(auth, googleProvider);
};

export const loginWithEmailAndPasswordFirebase = async (
  email: string, 
  password: string
): Promise<{ success: boolean; user?: UsuarioAuth; error?: string; code?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { success: false, error: "Por favor ingresa un correo electrónico válido." };
  }
  if (!password || password.length < 6) {
    return { success: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const u = cred.user;
    const usuarioAuth: UsuarioAuth = {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName || u.email?.split('@')[0] || "Comensal Food Fest",
      photoURL: u.photoURL
    };
    setStoredComensalUser(usuarioAuth);
    notifyAuthSubscribers(usuarioAuth);
    return { success: true, user: usuarioAuth };
  } catch (error: any) {
    console.error("Error en loginWithEmailAndPasswordFirebase:", error);
    const code = error.code || '';
    let message = "Error al iniciar sesión con correo.";

    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      message = "Correo o contraseña incorrectos, o la cuenta aún no existe.";
    } else if (code === 'auth/wrong-password') {
      message = "Contraseña incorrecta. Verifica e intenta nuevamente.";
    } else if (code === 'auth/invalid-email') {
      message = "El formato de correo no es válido.";
    } else if (code === 'auth/too-many-requests') {
      message = "Demasiados intentos fallidos. Por favor espera unos minutos.";
    } else if (code === 'auth/user-disabled') {
      message = "Esta cuenta ha sido deshabilitada.";
    }

    return { success: false, error: message, code };
  }
};

export const registerWithEmailAndPasswordFirebase = async (
  email: string, 
  password: string,
  displayName?: string
): Promise<{ success: boolean; user?: UsuarioAuth; error?: string; code?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { success: false, error: "Por favor ingresa un correo electrónico válido." };
  }
  if (!password || password.length < 6) {
    return { success: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const u = cred.user;
    const finalName = displayName?.trim() || cleanEmail.split('@')[0];
    
    try {
      await updateProfile(u, { displayName: finalName });
    } catch {}

    const usuarioAuth: UsuarioAuth = {
      uid: u.uid,
      email: u.email,
      displayName: finalName,
      photoURL: u.photoURL
    };
    setStoredComensalUser(usuarioAuth);
    notifyAuthSubscribers(usuarioAuth);
    return { success: true, user: usuarioAuth };
  } catch (error: any) {
    console.error("Error en registerWithEmailAndPasswordFirebase:", error);
    const code = error.code || '';
    let message = "Error al registrar la cuenta.";

    if (code === 'auth/email-already-in-use') {
      message = "Este correo ya está registrado. Por favor selecciona 'Iniciar Sesión'.";
    } else if (code === 'auth/weak-password') {
      message = "La contraseña es muy débil. Debe tener al menos 6 caracteres.";
    } else if (code === 'auth/invalid-email') {
      message = "El formato del correo es inválido.";
    } else if (code === 'auth/operation-not-allowed') {
      message = "El proveedor de Correo/Contraseña no está habilitado en Firebase Console.";
    }

    return { success: false, error: message, code };
  }
};

export const resetPasswordFirebase = async (
  email: string
): Promise<{ success: boolean; error?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { success: false, error: "Por favor ingresa un correo electrónico válido." };
  }

  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    return { success: true };
  } catch (error: any) {
    console.error("Error en resetPasswordFirebase:", error);
    const code = error.code || '';
    let message = "No se pudo enviar el correo de recuperación.";
    if (code === 'auth/user-not-found') {
      message = "No existe ninguna cuenta registrada con este correo.";
    } else if (code === 'auth/invalid-email') {
      message = "El formato de correo no es válido.";
    } else if (code === 'auth/too-many-requests') {
      message = "Demasiados intentos. Espera unos minutos antes de volver a solicitar.";
    }
    return { success: false, error: message };
  }
};

export const logoutFirebase = async (): Promise<void> => {
  try {
    setStoredComensalUser(null);
    notifyAuthSubscribers(null);
    await signOut(auth);
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
};

export const onAuthChange = (callback: (user: UsuarioAuth | null) => void) => {
  authSubscribers.push(callback);

  // 1. Notificar inmediatamente si ya hay un usuario guardado localmente
  const stored = getStoredComensalUser();
  if (stored) {
    callback(stored);
  }

  // 2. Comprobar resultado de redirección de Firebase (si regresó de Google en móvil)
  if (typeof window !== 'undefined') {
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        const u = result.user;
        const usuarioAuth: UsuarioAuth = {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || u.email?.split('@')[0] || "Comensal Food Fest",
          photoURL: u.photoURL
        };
        setStoredComensalUser(usuarioAuth);
        notifyAuthSubscribers(usuarioAuth);
      }
    }).catch((err) => {
      console.warn("getRedirectResult info/error:", err);
    });
  }

  // 3. Escuchar cambios de estado en Firebase Auth
  const unsubscribeFirebase = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      const usuarioAuth: UsuarioAuth = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "Comensal Food Fest",
        photoURL: firebaseUser.photoURL
      };
      setStoredComensalUser(usuarioAuth);
      callback(usuarioAuth);
    } else {
      const currentStored = getStoredComensalUser();
      if (!currentStored) {
        callback(null);
      }
    }
  });

  return () => {
    const idx = authSubscribers.indexOf(callback);
    if (idx > -1) authSubscribers.splice(idx, 1);
    unsubscribeFirebase();
  };
};

export const hasUserVotedForRestaurant = async (
  userId: string, 
  restauranteId: string, 
  userEmail?: string | null
): Promise<boolean> => {
  if (!userId || !restauranteId) return false;
  try {
    // 1. Verificar por UID de Firebase
    const docUidRef = doc(db, "votos_usuarios", `${userId}_${restauranteId}`);
    const snapUid = await getDoc(docUidRef);
    if (snapUid.exists()) return true;

    // 2. Verificar por Correo Normalizado (evita duplicidad entre Google y Correo/Clave)
    if (userEmail) {
      const cleanEmail = userEmail.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (cleanEmail) {
        const docEmailRef = doc(db, "votos_usuarios", `email_${cleanEmail}_${restauranteId}`);
        const snapEmail = await getDoc(docEmailRef);
        if (snapEmail.exists()) return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error verificando voto previo del usuario:", error);
    return false;
  }
};

// ==========================================
// 1. VOTACIÓN Y TRANSACCIONES ANTIFRAUDE
// ==========================================

export const emitirVotoConTransaccion = async (
  codigoIngresado: string,
  restauranteId: string,
  ratingGeneral: number,
  criterios: CriteriosVoto,
  comentario: string = "",
  user: UsuarioAuth
): Promise<{ success: boolean; message: string }> => {
  if (!user || !user.uid) {
    return { success: false, message: "Debes identificarte con tu cuenta antes de emitir tu voto." };
  }

  const normalizedEmail = (user.email || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  const codigoTrimmed = codigoIngresado.trim().toUpperCase();
  const codigoRef = doc(db, "codigos", codigoTrimmed);
  const restauranteRef = doc(db, "restaurantes", restauranteId);
  const nuevoVotoRef = doc(db, "votos", crypto.randomUUID());
  const statsRef = doc(db, "estadisticas", STATS_DOC_ID);
  const votoUsuarioRef = doc(db, "votos_usuarios", `${user.uid}_${restauranteId}`);
  const votoEmailRef = normalizedEmail ? doc(db, "votos_usuarios", `email_${normalizedEmail}_${restauranteId}`) : null;

  try {
    await runTransaction(db, async (transaction) => {
      // 0. Validación de Unicidad: 1 voto por cuenta / correo por restaurante
      const votoUsuarioDoc = await transaction.get(votoUsuarioRef);
      if (votoUsuarioDoc.exists()) {
        await logFraudAttempt("VOTO_DUPLICADO_USUARIO", codigoTrimmed, restauranteId);
        throw new Error("Ya has emitido tu voto para este restaurante con tu cuenta. Cada comensal puede votar una sola vez en cada restaurante.");
      }

      if (votoEmailRef) {
        const votoEmailDoc = await transaction.get(votoEmailRef);
        if (votoEmailDoc.exists()) {
          await logFraudAttempt("VOTO_DUPLICADO_EMAIL", codigoTrimmed, restauranteId);
          throw new Error(`Ya se registró un voto para este restaurante con el correo (${user.email}). Cada persona puede votar una sola vez en cada restaurante.`);
        }
      }

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
      if (restauranteData.descalificado) {
        await logFraudAttempt("VOTO_RESTAURANTE_DESCALIFICADO", codigoTrimmed, restauranteId);
        throw new Error("Este restaurante ha sido descalificado de la competición. No se permiten votos.");
      }

      const currentVotosCount = restauranteData.votosCount || 0;
      const currentPromedio = restauranteData.promedioRating || 0;
      
      const nuevoVotosCount = currentVotosCount + 1;
      const nuevoPromedio = Number((((currentPromedio * currentVotosCount) + ratingGeneral) / nuevoVotosCount).toFixed(2));

      // 3. Leer Estadísticas
      const statsDoc = await transaction.get(statsRef);
      let globalStats = statsDoc.exists() 
        ? statsDoc.data() as EstadisticasEvento 
        : { totalVotos: 0, totalCodigosUsados: 0, promedioGlobal: 0, totalCodigosGenerados: 0, intentosFraudeBloqueados: 0 };
        
      const newGlobalVotos = (globalStats.totalVotos || 0) + 1;
      const newGlobalPromedio = Number(((((globalStats.promedioGlobal || 0) * (globalStats.totalVotos || 0)) + ratingGeneral) / newGlobalVotos).toFixed(2));

      // 4. Escribir Atómicamente
      // A) Registrar voto del usuario para este restaurante (bloquea duplicados permanentemente por UID)
      transaction.set(votoUsuarioRef, {
        userId: user.uid,
        userEmail: user.email || "",
        userName: user.displayName || "",
        restauranteId,
        codigo: codigoTrimmed,
        ratingGeneral,
        creadoEn: serverTimestamp()
      });

      // A2) Registrar voto por correo normalizado (bloquea duplicados por correo sin importar el método de login)
      if (votoEmailRef) {
        transaction.set(votoEmailRef, {
          userId: user.uid,
          userEmail: user.email || "",
          userName: user.displayName || "",
          restauranteId,
          codigo: codigoTrimmed,
          ratingGeneral,
          creadoEn: serverTimestamp()
        });
      }

      // B) Quemar el código único de mesa
      transaction.update(codigoRef, {
        usado: true,
        usadoPor: user.email || user.uid,
        usadoEn: serverTimestamp(),
      });

      // C) Actualizar estadísticas del restaurante
      transaction.update(restauranteRef, {
        votosCount: nuevoVotosCount,
        promedioRating: nuevoPromedio
      });

      // D) Registrar voto oficial en la colección de auditoría
      transaction.set(nuevoVotoRef, {
        codigo: codigoTrimmed,
        restauranteId,
        ratingGeneral,
        criterios,
        comentario,
        userId: user.uid,
        userEmail: user.email || "",
        userName: user.displayName || "",
        creadoEn: serverTimestamp()
      });

      // E) Actualizar estadísticas globales del festival
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

export const updateRestauranteVideoFirebase = async (restauranteId: string, videoUrl: string): Promise<boolean> => {
  try {
    const docRef = doc(db, "restaurantes", restauranteId);
    await updateDoc(docRef, { videoUrl: videoUrl.trim() });
    return true;
  } catch (error) {
    console.error("Error actualizando video del restaurante: ", error);
    return false;
  }
};

export const updateRestauranteFirebase = async (
  restauranteId: string, 
  datos: Partial<Restaurante>
): Promise<boolean> => {
  try {
    const docRef = doc(db, "restaurantes", restauranteId);
    
    // Saneamiento estricto: eliminar cualquier valor undefined para evitar que Firestore rechace la operación
    const cleanDatos: Record<string, any> = {};
    Object.entries(datos).forEach(([key, val]) => {
      if (val !== undefined) {
        cleanDatos[key] = val;
      }
    });

    await setDoc(docRef, cleanDatos, { merge: true });
    return true;
  } catch (error) {
    console.error("Error actualizando información del restaurante en Firestore: ", error);
    return false;
  }
};

export const toggleDescalificarRestauranteFirebase = async (
  restauranteId: string, 
  descalificado: boolean, 
  motivo: string = ""
): Promise<boolean> => {
  try {
    const docRef = doc(db, "restaurantes", restauranteId);
    await setDoc(docRef, {
      descalificado,
      motivoDescalificacion: motivo.trim() || (descalificado ? "Incumplimiento de las reglas oficiales del evento." : "")
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error cambiando estado de descalificación en Firestore: ", error);
    return false;
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

export const setPatrocinadorPrincipalFirebase = async (patrocinadorId: string): Promise<boolean> => {
  try {
    const q = query(collection(db, "patrocinadores"));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot.forEach((docSnap) => {
      const isSelected = docSnap.id === patrocinadorId;
      const data = docSnap.data();
      batch.update(docSnap.ref, {
        esPrincipal: isSelected,
        tipo: isSelected ? 'Principal' : (data.tipo === 'Principal' ? 'Patrocinador Oficial' : (data.tipo || 'Patrocinador Oficial'))
      });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error actualizando patrocinador principal en Firebase:", error);
    return false;
  }
};

// ==========================================
// 6. CONTROL Y AUDITORÍA DE COMPRAS EN PATROCINADORES
// ==========================================

export const loginRestauranteCredenciales = async (
  usuario: string,
  clave: string
): Promise<{ success: boolean; restaurante?: Restaurante; error?: string }> => {
  try {
    const cleanUser = usuario.trim().toLowerCase();
    const cleanPass = clave.trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, error: "Por favor ingresa usuario y clave de acceso." };
    }

    const restaurantes = await getRestaurantesFirebase();
    
    // Buscar coincidencia directa por usuarioAcceso y claveAcceso, con fallback intuitivo
    const match = restaurantes.find(r => {
      const defaultUser = r.nombre.toLowerCase().replace(/[^a-z0-9]/g, '');
      const u = (r.usuarioAcceso || defaultUser).toLowerCase();
      const p = (r.claveAcceso || 'burger2026');
      return u === cleanUser && p === cleanPass;
    });

    if (!match) {
      return { success: false, error: "Credenciales inválidas. Verifica tu usuario y clave asignados por el comité." };
    }

    if (match.descalificado) {
      return { success: false, error: "Tu restaurante se encuentra temporalmente descalificado de la competición." };
    }

    return { success: true, restaurante: match };
  } catch (error: any) {
    console.error("Error validando credenciales de restaurante:", error);
    return { success: false, error: "Error en el servidor de validación." };
  }
};

export const registrarCompraPatrocinadorFirebase = async (
  compra: Omit<RegistroCompraPatrocinador, 'id' | 'fecha'>
): Promise<{ success: boolean; compra?: RegistroCompraPatrocinador; error?: string }> => {
  try {
    const fechaActual = new Date().toISOString();
    const nuevaCompraData: any = {
      ...compra,
      fecha: fechaActual,
      creadoEn: serverTimestamp()
    };

    // Asegurar que no pasemos undefined a Firestore
    const cleanData: Record<string, any> = {};
    Object.entries(nuevaCompraData).forEach(([k, v]) => {
      if (v !== undefined) cleanData[k] = v;
    });

    const docRef = await addDoc(collection(db, "compras_patrocinadores"), cleanData);
    
    return {
      success: true,
      compra: {
        id: docRef.id,
        ...nuevaCompraData
      }
    };
  } catch (error: any) {
    console.error("Error registrando compra en patrocinador:", error);
    return { success: false, error: error.message || "Error al registrar la compra en la base de datos." };
  }
};

export const getComprasPatrocinadoresFirebase = async (): Promise<RegistroCompraPatrocinador[]> => {
  try {
    const q = query(collection(db, "compras_patrocinadores"));
    const snapshot = await getDocs(q);
    const compras: RegistroCompraPatrocinador[] = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      compras.push({
        id: docSnap.id,
        patrocinadorId: data.patrocinadorId || '',
        patrocinadorNombre: data.patrocinadorNombre || '',
        restauranteId: data.restauranteId || '',
        restauranteNombre: data.restauranteNombre || '',
        restauranteNombreHamburguesa: data.restauranteNombreHamburguesa || '',
        descripcion: data.descripcion || '',
        monto: data.monto || '',
        numeroFactura: data.numeroFactura || '',
        facturaFotoUrl: data.facturaFotoUrl || '',
        fecha: data.fecha || new Date().toISOString()
      });
    });

    return compras.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  } catch (e) {
    console.error("Error obteniendo compras de patrocinadores:", e);
    return [];
  }
};

