import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Patrocinador, Restaurante, RegistroCompraPatrocinador } from '../types';
import { 
  Building2, 
  Store, 
  Receipt,
  UploadCloud,
  Camera,
  Video as VideoIcon,
  CheckCircle2, 
  ArrowLeft, 
  ShieldCheck, 
  Lock, 
  FileText, 
  DollarSign, 
  AlertCircle, 
  RefreshCw, 
  UserCheck, 
  LogOut, 
  Calendar,
  Sparkles,
  ExternalLink,
  Eye,
  X,
  Image as ImageIcon
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  loginRestauranteCredenciales,
  registrarCompraPatrocinadorFirebase,
  convertImageToBase64
} from '../services/firebaseService';
import { validateFacturaOCR, preloadOCR } from '../services/ocrService';

interface SponsorCheckinViewProps {
  patrocinadorId: string;
  patrocinadores: Patrocinador[];
  restaurantes: Restaurante[];
  onBackToHome: () => void;
}

// Sesión del encargado con expiración reforzada (espejo del portal del comité)
const REST_SESSION_KEY = 'foodfest_rest_session';
const REST_LEGACY_KEY = 'sesion_restaurante_encargado_id';
const REST_IDLE_TIMEOUT_MS = 10 * 60 * 1000; // Logout tras 10 min sin actividad
const REST_ABS_TIMEOUT_MS = 30 * 60 * 1000;  // Máximo absoluto de 30 min de sesión
const ACTIVITY_WRITE_THROTTLE_MS = 4000;

interface RestSessionData {
  restId: string;
  expAbs: number;
  lastActivity: number;
}

export const SponsorCheckinView: React.FC<SponsorCheckinViewProps> = ({
  patrocinadorId,
  patrocinadores,
  restaurantes,
  onBackToHome
}) => {
  // Patrocinador target
  const patrocinador = patrocinadores.find(p => p.id === patrocinadorId);

  // Sesión de restaurante autenticado
  const [loggedRestaurante, setLoggedRestaurante] = useState<Restaurante | null>(null);
  const [idleMinutesLeft, setIdleMinutesLeft] = useState<number>(10);
  const lastActivityWriteRef = useRef<number>(0);

  // Formulario de login
  const [usuarioInput, setUsuarioInput] = useState('');
  const [claveInput, setClaveInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Formulario de compra / factura
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [facturaFotoFile, setFacturaFotoFile] = useState<File | null>(null);
  const [facturaFotoPreview, setFacturaFotoPreview] = useState<string | null>(null);
  const [facturaOcrTexto, setFacturaOcrTexto] = useState<string>('');

  // Cámara en vivo
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraCapturedUrl, setCameraCapturedUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Validación OCR en curso
  const [isValidandoFactura, setIsValidandoFactura] = useState(false);

  const [isSubmittingCompra, setIsSubmittingCompra] = useState(false);
  const [compraSuccessMsg, setCompraSuccessMsg] = useState<string | null>(null);
  const [compraError, setCompraError] = useState<string | null>(null);

  const readRestSession = (): RestSessionData | null => {
    try {
      const raw = sessionStorage.getItem(REST_SESSION_KEY);
      return raw ? JSON.parse(raw) as RestSessionData : null;
    } catch {
      return null;
    }
  };

  const writeRestSession = (session: RestSessionData) => {
    try {
      sessionStorage.setItem(REST_SESSION_KEY, JSON.stringify(session));
    } catch {}
  };

  const clearRestSession = () => {
    try {
      sessionStorage.removeItem(REST_SESSION_KEY);
    } catch {}
  };

  const handleForceLogoutSesion = useCallback(async (reason?: string) => {
    clearRestSession();
    try {
      sessionStorage.removeItem(REST_LEGACY_KEY);
    } catch {}
    setLoggedRestaurante(null);
    setIdleMinutesLeft(10);
    setCompraSuccessMsg(null);
    setCompraError(null);
    if (reason) {
      await Swal.fire({
        title: 'Sesión Finalizada',
        text: reason,
        icon: 'warning',
        iconColor: '#D6A44B',
        background: '#0F0F0F',
        color: '#FFF9ED',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#A40B03',
      });
    }
  }, []);

  // Restaurar sesión guardada (solo ventana viva via sessionStorage)
  useEffect(() => {
    // Migración: eliminar la sesión indefinida heredada en localStorage
    try {
      localStorage.removeItem(REST_LEGACY_KEY);
    } catch {}

    const stored = readRestSession();
    if (!stored) return;

    const now = Date.now();
    if (now > stored.expAbs || now - stored.lastActivity > REST_IDLE_TIMEOUT_MS) {
      clearRestSession();
      return;
    }

    // Revalidar que el restaurante siga inscrito y no descalificado
    const rest = restaurantes.find(r => r.id === stored.restId && !r.descalificado);
    if (rest) {
      setLoggedRestaurante(rest);
      writeRestSession({ ...stored, lastActivity: now });
    } else {
      clearRestSession();
    }
  }, [restaurantes]);

  // Monitoreo de expiración: inactividad (10 min) + máximo absoluto (30 min)
  useEffect(() => {
    if (!loggedRestaurante) return;

    const registerActivity = () => {
      const now = Date.now();
      if (now - lastActivityWriteRef.current < ACTIVITY_WRITE_THROTTLE_MS) return;
      lastActivityWriteRef.current = now;
      const stored = readRestSession();
      if (stored) {
        writeRestSession({ ...stored, lastActivity: now });
        setIdleMinutesLeft(10);
      }
    };

    const checkSessionIntegrity = () => {
      const stored = readRestSession();
      if (!stored) {
        void handleForceLogoutSesion('La sesión del encargado fue cerrada por seguridad.');
        return;
      }
      const now = Date.now();
      if (now > stored.expAbs) {
        void handleForceLogoutSesion('Se alcanzó el límite máximo de 30 minutos de sesión activa. Inicia sesión nuevamente para continuar.');
        return;
      }
      const idleElapsed = now - stored.lastActivity;
      if (idleElapsed > REST_IDLE_TIMEOUT_MS) {
        void handleForceLogoutSesion('Sesión cerrada automáticamente tras 10 minutos de inactividad.');
        return;
      }
      const remainingMin = Math.max(1, Math.ceil((REST_IDLE_TIMEOUT_MS - idleElapsed) / 60000));
      setIdleMinutesLeft(remainingMin);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const stored = readRestSession();
        if (!stored) {
          void handleForceLogoutSesion();
          return;
        }
        const now = Date.now();
        if (now > stored.expAbs) {
          void handleForceLogoutSesion('Tu sesión expiró (30 min máximo) mientras la pestaña estaba inactiva.');
          return;
        }
        if (now - stored.lastActivity > REST_IDLE_TIMEOUT_MS) {
          void handleForceLogoutSesion('Tu sesión expiró por inactividad mientras la pestaña estaba en segundo plano.');
          return;
        }
      }
    };

    window.addEventListener('mousemove', registerActivity, { passive: true });
    window.addEventListener('keydown', registerActivity, { passive: true });
    window.addEventListener('click', registerActivity, { passive: true });
    window.addEventListener('touchstart', registerActivity, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = window.setInterval(checkSessionIntegrity, 15000);

    return () => {
      window.removeEventListener('mousemove', registerActivity);
      window.removeEventListener('keydown', registerActivity);
      window.removeEventListener('click', registerActivity);
      window.removeEventListener('touchstart', registerActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(interval);
    };
  }, [loggedRestaurante, handleForceLogoutSesion]);

  // Revalidación en vivo: si el restaurante se descalifica mientras está conectado
  useEffect(() => {
    if (!loggedRestaurante || restaurantes.length === 0) return;
    const vigente = restaurantes.find(r => r.id === loggedRestaurante.id && !r.descalificado);
    if (!vigente) {
      void handleForceLogoutSesion('Tu restaurante se encuentra descalificado. Sesión cerrada por auditoría del comité.');
    }
  }, [loggedRestaurante, restaurantes, handleForceLogoutSesion]);

  // Previsualización de la foto seleccionada
  useEffect(() => {
    if (!facturaFotoFile) {
      setFacturaFotoPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(facturaFotoFile);
    setFacturaFotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [facturaFotoFile]);

  // Precargar modelo OCR al mostrar el formulario de factura (evita esperar al validar)
  useEffect(() => {
    if (loggedRestaurante) {
      preloadOCR().catch(() => {});
    }
  }, [loggedRestaurante]);

  // Cerrar y liberar la cámara al desmontar
  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Iniciar la cámara cuando se abre el modal
  useEffect(() => {
    if (!showCameraModal) return;
    let cancelled = false;

    const startCamera = async () => {
      setCameraError(null);
      setCameraCapturedUrl(null);

      // getUserMedia solo existe en orígenes seguros (https:// o localhost)
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          window.location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)
            ? 'La cámara solo funciona si accedes con https://. Usa la URL https que muestra el terminal al iniciar el servidor (acepta el aviso de certificado en tu teléfono).'
            : 'Este navegador no soporta acceso a la cámara. Actualiza tu navegador o sube la foto desde un archivo.'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        console.error(err);
        if (cancelled) return;
        const name = err?.name || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError(
            'Permiso de cámara denegado. Para activarlo: toca el ícono 🔒 (o ⓘ) en la barra de direcciones → Permisos → Cámara → Permitir, y vuelve a intentar.'
          );
        } else if (name === 'NotFoundError') {
          setCameraError('No se detectó ninguna cámara en este dispositivo. Sube la foto desde un archivo.');
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          setCameraError('La cámara está siendo usada por otra app. Ciérrala y vuelve a intentar.');
        } else {
          setCameraError('No se pudo acceder a la cámara. Intenta nuevamente o sube la foto desde un archivo.');
        }
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      if (!cameraStreamRef.current) return;
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    };
  }, [showCameraModal]);

  const cerrarModalCamera = () => {
    setShowCameraModal(false);
    setCameraCapturedUrl(null);
    setCameraError(null);
  };

  // Capture frame de video → File
  const handleCapturarDesdeCamara = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const rawWidth = video.videoWidth || 1280;
    const rawHeight = video.videoHeight || 720;
    // Limitar la captura a 1280px para aligerar archivo, OCR y compresión
    const scale = Math.min(1, 1280 / Math.max(rawWidth, rawHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(rawWidth * scale);
    canvas.height = Math.round(rawHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `factura_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      setCameraCapturedUrl(url);
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }, 'image/jpeg', 0.85);
  };

  // Verificación con OCR al confirmar la foto de la cámara
  const handleConfirmarFotoCamara = async () => {
    const url = cameraCapturedUrl;
    if (!url) return;
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `factura_${Date.now()}.jpg`, { type: 'image/jpeg' });
      cerrarModalCamera();
      await validarYAsignarFactura(file);
    } catch (err) {
      console.error(err);
      await Swal.fire({
        title: 'Error Inesperado',
        text: 'No se pudo procesar la foto capturada. Intenta nuevamente.',
        icon: 'error',
        background: '#0F0F0F',
        color: '#FFF9ED',
        confirmButtonColor: '#A40B03',
        confirmButtonText: 'Aceptar'
      });
    }
  };

  const handleReintentarCamara = () => {
    if (cameraCapturedUrl) URL.revokeObjectURL(cameraCapturedUrl);
    setCameraCapturedUrl(null);
    setCameraError(null);
    // El effect de showCameraModal solo corre al abrir → reintentamos el stream manualmente
    const startAgain = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        });
        cameraStreamRef.current = stream;
        setCameraError(null);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        const name = err?.name || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError(
            'El permiso sigue denegado. Si no aparece el aviso, cierra este modal y: toca el 🔒 en la barra de direcciones → Permisos → Cámara → Permitir (o borra el sitio y recarga la página).'
          );
        } else {
          setCameraError('No se pudo reiniciar la cámara. Cierra el modal e intenta de nuevo.');
        }
      }
    };
    void startAgain();
  };


  // Valida con OCR de la factura y si pasa, la asigna al formulario
  const validarYAsignarFactura = async (file: File) => {
    setIsValidandoFactura(true);
    setCompraError(null);
    try {
      const resultado = await validateFacturaOCR(file);
      if (!resultado.esFactura && !resultado.error) {
        setFacturaFotoFile(null);
        setFacturaFotoPreview(null);
        setFacturaOcrTexto('');
        await Swal.fire({
          title: 'Foto Rechazada',
          text: resultado.motivo || 'La foto no parece una factura o comprobante de compra. Solo se aceptan fotografías de facturas.',
          icon: 'warning',
          iconColor: '#f59e0b',
          background: '#0F0F0F',
          color: '#FFF9ED',
          confirmButtonColor: '#A40B03',
          confirmButtonText: 'Entendido'
        });
        return;
      }
      setFacturaFotoFile(file);
      setFacturaOcrTexto(resultado.texto);
      if (resultado.error) {
        await Swal.fire({
          title: 'Validación No Disponible',
          text: 'No pudimos validar la factura con el OCR (posible falta de conexión para descargar el verificador). La foto fue aceptada de forma provisional.',
          icon: 'info',
          background: '#0F0F0F',
          color: '#FFF9ED',
          confirmButtonColor: '#A40B03',
          confirmButtonText: 'Entendido'
        });
      }
    } finally {
      setIsValidandoFactura(false);
    }
  };

  const handleSeleccionarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    e.target.value = '';
    if (!file) return;
    await validarYAsignarFactura(file);
  };

  // Manejar Login de Restaurante
  const handleLoginRestaurante = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await loginRestauranteCredenciales(usuarioInput, claveInput);
      if (res.success && res.restaurante) {
        const now = Date.now();
        setLoggedRestaurante(res.restaurante);
        writeRestSession({
          restId: res.restaurante.id,
          expAbs: now + REST_ABS_TIMEOUT_MS,
          lastActivity: now
        });
        setUsuarioInput('');
        setClaveInput('');

        Swal.fire({
          title: '¡Sesión Iniciada!',
          html: `<p style="font-size: 13px; color: #d6d3d1;">Bienvenido, encargado de <strong style="color: #FFF9ED;">${res.restaurante.nombre}</strong>.<br/>Ya puedes registrar tus compras oficiales en esta tienda.<br/><strong style="color: #A40B03;">⏱ Tu sesión dura máximo 30 minutos (o 10 sin actividad).</strong></p>`,
          icon: 'success',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
          background: '#0F0F0F',
          color: '#FFF9ED'
        });
      } else {
        const errorText = res.error || 'Credenciales inválidas.';
        setLoginError(errorText);
        Swal.fire({
          title: res.lockedSeconds ? 'Acceso Bloqueado Temporalmente' : 'Credenciales Inválidas',
          text: errorText,
          icon: 'error',
          background: '#0F0F0F',
          color: '#FFF9ED',
          confirmButtonColor: '#A40B03',
          confirmButtonText: 'Reintentar'
        });
      }
    } catch (err: any) {
      const errText = err.message || 'Error al iniciar sesión.';
      setLoginError(errText);
      Swal.fire({
        title: 'Error de Conexión',
        text: errText,
        icon: 'error',
        background: '#0F0F0F',
        color: '#FFF9ED',
        confirmButtonColor: '#A40B03',
        confirmButtonText: 'Aceptar'
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogoutRestaurante = () => {
    clearRestSession();
    try {
      sessionStorage.removeItem(REST_LEGACY_KEY);
    } catch {}
    setLoggedRestaurante(null);
    setIdleMinutesLeft(10);
    setCompraSuccessMsg(null);
    setCompraError(null);
  };

  // Manejar Registro de Factura / Compra
  const handleSubmitCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompraError(null);
    setCompraSuccessMsg(null);

    if (!loggedRestaurante) {
      const errMsg = 'Debes iniciar sesión con las credenciales de tu restaurante.';
      setCompraError(errMsg);
      Swal.fire({
        title: 'Sesión Requerida',
        text: errMsg,
        icon: 'warning',
        background: '#0F0F0F',
        color: '#FFF9ED',
        confirmButtonColor: '#A40B03',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (!descripcion.trim() && !facturaFotoFile) {
      const errMsg = 'Debes ingresar una descripción detallada de la compra o subir la foto de la factura.';
      setCompraError(errMsg);
      Swal.fire({
        title: 'Información Requerida',
        text: errMsg,
        icon: 'warning',
        background: '#0F0F0F',
        color: '#FFF9ED',
        confirmButtonColor: '#A40B03',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    setIsSubmittingCompra(true);

    try {
      let facturaFotoUrl = '';
      if (facturaFotoFile) {
        facturaFotoUrl = await convertImageToBase64(facturaFotoFile, 1200);
      }

      const res = await registrarCompraPatrocinadorFirebase({
        patrocinadorId: patrocinadorId,
        patrocinadorNombre: patrocinador?.nombre || 'Patrocinador',
        restauranteId: loggedRestaurante.id,
        restauranteNombre: loggedRestaurante.nombre,
        restauranteNombreHamburguesa: loggedRestaurante.nombreHamburguesa,
        descripcion: descripcion.trim(),
        monto: monto.trim() || undefined,
        numeroFactura: numeroFactura.trim() || undefined,
        facturaFotoUrl: facturaFotoUrl || undefined,
        ocrValidado: facturaFotoFile ? true : undefined,
        ocrTexto: facturaOcrTexto || undefined
      });

      if (res.success && res.compra) {
        setCompraSuccessMsg('¡Compra registrada exitosamente! El comité ha auditado este registro de manera confidencial.');
        
        await Swal.fire({
          title: '¡Compra Registrada con Éxito!',
          html: `
            <div style="text-align: left; font-size: 13px; line-height: 1.6; color: #d6d3d1;">
              <p style="margin-bottom: 6px;">
                <strong style="color: #FFF9ED;">Restaurante:</strong> ${loggedRestaurante.nombre}
              </p>
              <p style="margin-bottom: 6px;">
                <strong style="color: #FFF9ED;">Hamburguesa:</strong> ${loggedRestaurante.nombreHamburguesa}
              </p>
              <p style="margin-bottom: 6px;">
                <strong style="color: #FFF9ED;">Tienda Patrocinadora:</strong> ${patrocinador?.nombre || ''}
              </p>
              ${monto.trim() ? `<p style="margin-bottom: 6px;"><strong style="color: #FFF9ED;">Monto:</strong> ${monto.trim()}</p>` : ''}
              ${numeroFactura.trim() ? `<p style="margin-bottom: 6px;"><strong style="color: #FFF9ED;">Nº Factura:</strong> ${numeroFactura.trim()}</p>` : ''}
              <div style="background: #1c1917; border: 1px solid #44403c; padding: 10px; border-radius: 8px; margin: 10px 0;">
                <span style="color: #fbbf24; font-weight: bold; font-size: 11px; text-transform: uppercase;">Detalle auditado:</span><br/>
                ${descripcion.trim() || 'Comprobante fotográfico adjunto'}
              </div>
              <p style="font-size: 12px; color: #10b981; font-weight: bold; margin-top: 8px;">
                🔒 Registro confidencial: enviado y respaldado directamente en el Panel del Comité Organizador 2026.
              </p>
            </div>
          `,
          icon: 'success',
          background: '#0F0F0F',
          color: '#FFF9ED',
          confirmButtonColor: '#A40B03',
          confirmButtonText: 'Aceptar'
        });

        setDescripcion('');
        setMonto('');
        setNumeroFactura('');
        setFacturaFotoFile(null);
        setFacturaFotoPreview(null);
      } else {
        const errorText = res.error || 'Error al guardar la compra.';
        setCompraError(errorText);
        Swal.fire({
          title: 'Error al Registrar',
          text: errorText,
          icon: 'error',
          background: '#0F0F0F',
          color: '#FFF9ED',
          confirmButtonColor: '#A40B03',
          confirmButtonText: 'Aceptar'
        });
      }
    } catch (err: any) {
      console.error(err);
      const errorText = err.message || 'Error procesando la factura.';
      setCompraError(errorText);
      Swal.fire({
        title: 'Error',
        text: errorText,
        icon: 'error',
        background: '#0F0F0F',
        color: '#FFF9ED',
        confirmButtonColor: '#A40B03',
        confirmButtonText: 'Aceptar'
      });
    } finally {
      setIsSubmittingCompra(false);
    }
  };

  // Si los datos de patrocinadores aún se están descargando de Firebase
  if (patrocinadores.length === 0) {
    return (
      <div className="min-h-[70vh] bg-black text-[#FFF9ED] flex flex-col items-center justify-center p-6 text-center space-y-3">
        <RefreshCw className="w-10 h-10 text-[#A40B03] animate-spin mb-1" />
        <h3 className="text-lg font-bold">Cargando tienda patrocinadora...</h3>
        <p className="text-stone-400 text-xs max-w-sm">
          Conectando con la base de datos oficial del Food Fest 2026 para validar este punto de venta.
        </p>
      </div>
    );
  }

  // Si el patrocinadorId no coincide con ningún patrocinador registrado
  if (!patrocinador) {
    return (
      <div className="min-h-[70vh] bg-black text-[#FFF9ED] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-600/50 flex items-center justify-center text-red-400 mb-1">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black font-['Cabinet_Grotesk',sans-serif]">Patrocinador no encontrado</h2>
        <p className="text-stone-400 text-xs sm:text-sm max-w-md">
          El código QR escaneado ({patrocinadorId}) no corresponde a ningún patrocinador registrado en el festival.
        </p>
        <button
          onClick={onBackToHome}
          className="mt-2 px-6 py-2.5 rounded-xl bg-[#A40B03] hover:bg-[#BF0E05] text-white text-xs font-bold transition-all shadow-lg"
        >
          ← Volver a la Web Principal
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#FFF9ED] py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        
        {/* Navigation & Back */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F0F0F] border border-stone-800 text-stone-300 hover:text-white hover:border-[#A40B03]/60 transition-all text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#A40B03]" />
            <span>Volver a la Web Principal</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Punto Oficial de Validación QR</span>
          </div>
        </div>

        {/* SPONSOR HEADER HERO CARD */}
        <div className="rounded-3xl bg-gradient-to-br from-[#1A0605] via-[#0F0F0F] to-black border-2 border-[#A40B03]/60 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#A40B03]/15 rounded-full blur-[90px] pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-black border-2 border-[#A40B03] p-2 shrink-0 flex items-center justify-center shadow-lg shadow-black/80">
              <img
                src={patrocinador.logoUrl}
                alt={patrocinador.nombre}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/80 border border-stone-800 text-[11px] font-extrabold uppercase tracking-wider text-[#A40B03]">
                <Building2 className="w-3.5 h-3.5" />
                <span>Tienda Oficial • {patrocinador.tipo}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-[#FFF9ED] font-['Cabinet_Grotesk',sans-serif] tracking-tight">
                {patrocinador.nombre}
              </h1>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-xl">
                {patrocinador.descripcion}
              </p>
              <div className="pt-1 flex items-center gap-2 text-xs text-stone-400">
                <Store className="w-4 h-4 text-[#A40B03]" />
                <span>Establecimiento comercial aliado Food Fest 2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* WORKFLOW CONTAINER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN: AUTHENTICATION OR INVOICE FORM (7 COLS) */}
          <div className="lg:col-span-7 space-y-6">

            {/* CASE A: RESTAURANT NOT LOGGED IN -> LOGIN PROMPT */}
            {!loggedRestaurante ? (
              <div className="p-6 sm:p-7 rounded-3xl bg-[#0F0F0F] border border-stone-800 space-y-5 shadow-xl">
                <div className="flex items-center gap-3 border-b border-stone-800/80 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#A40B03]/20 border border-[#A40B03]/50 text-[#A40B03] flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#FFF9ED]">
                      Paso 1: Identificación del Restaurante
                    </h3>
                    <p className="text-xs text-stone-400">
                      Ingresa el usuario y clave entregados a tu restaurante por el comité. La sesión dura máximo 30 minutos por seguridad.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleLoginRestaurante} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      Usuario del Restaurante
                    </label>
                    <input
                      type="text"
                      required
                      value={usuarioInput}
                      onChange={(e) => setUsuarioInput(e.target.value)}
                      placeholder="Ej: burger_el_tocuyo o nombre de tu restaurante"
                      className="w-full px-4 py-3 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      Clave de Acceso
                    </label>
                    <input
                      type="password"
                      required
                      value={claveInput}
                      onChange={(e) => setClaveInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03] transition-colors"
                    />
                  </div>

                  {loginError && (
                    <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-700/60 text-red-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3.5 rounded-xl bg-[#A40B03] hover:bg-[#BF0E05] text-[#FFF9ED] font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    {isLoggingIn ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verificando Credenciales...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Acceder como Encargado de Restaurante</span>
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-stone-500 text-center leading-relaxed">
                    🔒 Acceso exclusivo para representantes de los restaurantes participantes en Food Fest 2026.
                  </p>
                </form>
              </div>
            ) : (
              /* CASE B: LOGGED IN -> REGISTER PURCHASE / INVOICE FORM */
              <div className="p-6 sm:p-7 rounded-3xl bg-[#0F0F0F] border border-stone-800 space-y-5 shadow-xl">
                
                {/* Active Session Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-stone-900 to-black border border-emerald-500/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={loggedRestaurante.logoUrl}
                      alt={loggedRestaurante.nombre}
                      className="w-11 h-11 rounded-xl object-cover border border-emerald-500/50 shrink-0"
                    />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Encargado Conectado
                      </span>
                      <h4 className="text-sm font-black text-[#FFF9ED] truncate">
                        {loggedRestaurante.nombre}
                      </h4>
                      <p className="text-[11px] text-stone-400">
                        {loggedRestaurante.nombreHamburguesa}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleLogoutRestaurante}
                    className="px-3 py-1.5 rounded-xl bg-black border border-stone-800 text-stone-400 hover:text-red-400 text-[11px] font-semibold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    title="Cerrar sesión de este restaurante"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cambiar</span>
                  </button>
                </div>

                <div className="border-b border-stone-800 pb-3">
                  <h3 className="text-base font-extrabold text-[#FFF9ED] flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#A40B03]" />
                    <span>Paso 2: Registrar Factura de Compra</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Sube la fotografía de la factura o comprobante emitido por <strong>{patrocinador.nombre}</strong>.
                  </p>
                </div>

                <form onSubmit={handleSubmitCompra} className="space-y-4">
                  
                  {/* Photo Upload Area */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-2">
                      Foto de la Factura / Ticket de Compra
                    </label>

                    <div className="border-2 border-dashed border-stone-800 hover:border-[#A40B03]/60 rounded-2xl p-5 text-center bg-black transition-colors relative">
                      {facturaFotoPreview ? (
                        <div className="space-y-3">
                          <div className="relative inline-block max-h-48 overflow-hidden rounded-xl border border-stone-800">
                            <img
                              src={facturaFotoPreview}
                              alt="Vista previa factura"
                              className="max-h-48 w-auto object-contain mx-auto"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFacturaFotoFile(null);
                                setFacturaOcrTexto('');
                                setFacturaFotoPreview(null);
                              }}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-stone-300 hover:text-white border border-stone-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Foto lista para cargar
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-3 py-4">
                          {isValidandoFactura ? (
                            <div className="flex flex-col items-center space-y-2">
                              <RefreshCw className="w-8 h-8 text-[#A40B03] animate-spin" />
                              <div className="text-xs text-amber-400 font-bold">
                                Validando que sea factura con OCR...
                              </div>
                              <div className="text-[11px] text-stone-500">
                                Esto puede tardar algunos segundos la primera vez.
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-2xl bg-[#A40B03]/15 text-[#A40B03] border border-[#A40B03]/30 flex items-center justify-center shadow-md">
                                <Receipt className="w-6 h-6" />
                              </div>
                              <div className="text-xs text-stone-300 font-semibold text-center">
                                Sube únicamente la foto de la factura o ticket de compra
                              </div>
                              <div className="text-[11px] text-stone-500 text-center">
                                Se verifica con OCR que la imagen sea una factura real (PNG, JPG o WEBP)
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-xs pt-1">
                                <button
                                  type="button"
                                  onClick={() => setShowCameraModal(true)}
                                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#A40B03] hover:bg-[#BF0E05] text-[#FFF9ED] text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                                >
                                  <Camera className="w-4 h-4" />
                                  <span>Tomar Foto</span>
                                </button>
                                <label className="flex-1 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                                  <ImageIcon className="w-4 h-4" />
                                  <span>Subir Archivo</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleSeleccionarArchivo}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">
                        Monto de Compra (Opcional)
                      </label>
                      <div className="relative">
                        <DollarSign className="w-3.5 h-3.5 text-stone-500 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          value={monto}
                          onChange={(e) => setMonto(e.target.value)}
                          placeholder="Ej: $45.00 o Bs"
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03] font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">
                        N° de Factura / Control (Opcional)
                      </label>
                      <input
                        type="text"
                        value={numeroFactura}
                        onChange={(e) => setNumeroFactura(e.target.value)}
                        placeholder="Ej: FACT-0492"
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03] font-mono"
                      />
                    </div>
                  </div>

                  {/* Description / Items purchased */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Descripción de lo Comprado / Detalle del Consumo *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Detalla qué insumos o productos compraron en esta tienda patrocinadora (ej: 50 panes brioche, 12 salsas BBQ especiales, bandejas de carne, etc.)."
                      className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03] resize-none"
                    />
                    <p className="text-[11px] text-stone-500 mt-1">
                      💡 Indispensable si no cuentas con fotografía legible en este momento.
                    </p>
                  </div>

                  {compraError && (
                    <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-700/60 text-red-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{compraError}</span>
                    </div>
                  )}

                  {compraSuccessMsg && (
                    <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg">
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                      <div>
                        <span className="font-bold block">¡Comprobante Registrado!</span>
                        <span>{compraSuccessMsg}</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingCompra}
                    className="w-full py-4 rounded-xl bg-[#A40B03] hover:bg-[#BF0E05] text-[#FFF9ED] font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-xl border border-[#FFF9ED]/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingCompra ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Subiendo Factura & Guardando Registro...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Registrar Compra Oficial ante el Comité</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: CONFIDENCIALIDAD, GUÍA Y SESIÓN ACTIVA (5 COLS) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* RESTAURANTE SESIÓN ACTIVA CARD */}
            {loggedRestaurante && (
              <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1F0706] to-[#0F0F0F] border border-[#A40B03]/60 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>Restaurante Autenticado</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold whitespace-nowrap">
                    Sesión Activa · {idleMinutesLeft} min
                  </span>
                </div>

                <div className="flex items-center gap-3.5">
                  <img
                    src={loggedRestaurante.logoUrl}
                    alt={loggedRestaurante.nombre}
                    className="w-12 h-12 rounded-xl object-contain bg-black border border-stone-800 p-1 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-[#FFF9ED] text-sm truncate">
                      {loggedRestaurante.nombreHamburguesa}
                    </h4>
                    <p className="text-xs text-stone-400 truncate">
                      {loggedRestaurante.nombre}
                    </p>
                    <span className="inline-block mt-1 font-mono text-[10px] text-stone-400 bg-black px-2 py-0.5 rounded border border-stone-800">
                      👤 {loggedRestaurante.usuarioAcceso || loggedRestaurante.nombre.toLowerCase().replace(/[^a-z0-9]/g, '')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-900 flex items-center justify-between">
                  <span className="text-[11px] text-stone-400">
                    ¿Deseas registrar con otro restaurante?
                  </span>
                  <button
                    type="button"
                    onClick={handleLogoutRestaurante}
                    className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-red-950/60 text-stone-300 hover:text-red-300 border border-stone-800 hover:border-red-500/40 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}

            {/* CONFIDENCIALIDAD Y AUDITORÍA EXCLUSIVA CARD */}
            <div className="p-6 rounded-3xl bg-[#0F0F0F] border border-stone-800 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-stone-800 pb-3">
                <ShieldCheck className="w-4 h-4 text-[#A40B03]" />
                <span>Privacidad y Auditoría Exclusiva</span>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed">
                Todo restaurante participante en <strong>The Best Burger 2026</strong> debe cumplir con la regla oficial de adquirir insumos en los comercios patrocinadores del festival.
              </p>

              <div className="p-4 rounded-2xl bg-black border border-stone-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#FFF9ED]">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Confidencialidad Garantizada</span>
                </div>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Por estrictas normas de competencia leal, <strong>ningún restaurante puede ver las compras ni facturas de los demás competidores</strong>. Los registros viajan de forma segura y son auditados exclusivamente por el Comité Organizador en el Panel Superadministrador.
                </p>
              </div>
            </div>

            {/* GUÍA DE REGISTRO RÁPIDO CARD */}
            <div className="p-6 rounded-3xl bg-[#0F0F0F] border border-stone-800 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400 border-b border-stone-800 pb-3">
                <FileText className="w-4 h-4 text-[#A40B03]" />
                <span>Instrucciones para el Encargado</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#A40B03]/20 border border-[#A40B03]/40 text-[#A40B03] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-stone-300 leading-relaxed">
                    Inicia sesión con el <strong>usuario y contraseña</strong> asignados a tu restaurante por el comité.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#A40B03]/20 border border-[#A40B03]/40 text-[#A40B03] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-stone-300 leading-relaxed">
                    Toma una fotografía nítida de la <strong>factura o ticket de compra</strong> entregado por esta tienda.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#A40B03]/20 border border-[#A40B03]/40 text-[#A40B03] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-stone-300 leading-relaxed">
                    Describe los <strong>insumos adquiridos</strong> (ej: panes, carnes, salsas, bebidas) para asegurar el respaldo oficial.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#A40B03]/20 border border-[#A40B03]/40 text-[#A40B03] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </div>
                  <p className="text-stone-300 leading-relaxed">
                    Presiona el botón de registro y recibirás tu <strong>confirmación inmediata</strong> auditada.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* MODAL: Cámara en vivo para capturar la factura */}
      {showCameraModal && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex sm:items-center sm:justify-center sm:p-4">
          <div className="w-full h-full max-w-lg sm:max-h-[90vh] sm:h-auto sm:rounded-3xl bg-[#0F0F0F] border border-stone-800 overflow-hidden shadow-2xl flex flex-col">
            <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-stone-800">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#FFF9ED]">
                <Camera className="w-5 h-5 text-[#A40B03]" />
                <span>Fotografiar Factura</span>
              </div>
              <button
                onClick={cerrarModalCamera}
                className="p-1.5 rounded-full bg-stone-900 text-stone-400 hover:text-white border border-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative flex-1 min-h-0 bg-black flex items-center justify-center">
              {!cameraCapturedUrl && !cameraError && (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-4 border-2 border-dashed border-white/30 rounded-2xl" />
                  <div className="pointer-events-none absolute bottom-3 left-0 right-0 text-center">
                    <span className="px-3 py-1 rounded-full bg-black/70 border border-white/20 text-[10px] text-stone-300 font-semibold">
                      Encaja la factura dentro del recuadro
                    </span>
                  </div>
                </>
              )}

              {cameraCapturedUrl && (
                <img src={cameraCapturedUrl} alt="Foto capturada" className="max-w-full max-h-full object-contain p-3" />
              )}

              {cameraError && (
                <div className="p-6 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                  <p className="text-xs text-stone-300 leading-relaxed">{cameraError}</p>
                  <button
                    onClick={handleReintentarCamara}
                    className="mt-1 px-4 py-2 rounded-xl bg-[#A40B03] hover:bg-[#BF0E05] text-[#FFF9ED] text-[11px] font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Dar Permisos de Nuevo</span>
                  </button>
                </div>
              )}
            </div>

            <div
              className="shrink-0 px-5 pt-4 border-t border-stone-800 bg-[#0F0F0F] flex gap-2.5"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
            >
              {cameraCapturedUrl ? (
                <>
                  <button
                    onClick={handleReintentarCamara}
                    className="flex-1 px-4 py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reintentar</span>
                  </button>
                  <button
                    onClick={handleConfirmarFotoCamara}
                    className="flex-1 px-4 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar y Validar</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleCapturarDesdeCamara}
                  disabled={!!cameraError}
                  className="w-full px-4 py-3.5 rounded-xl bg-[#A40B03] hover:bg-[#BF0E05] disabled:opacity-40 text-[#FFF9ED] text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capturar Foto de la Factura</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
