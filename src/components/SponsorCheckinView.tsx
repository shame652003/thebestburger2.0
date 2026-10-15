import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Patrocinador, Restaurante, RegistroCompraPatrocinador } from '../types';
import { 
  Building2, 
  Store, 
  Receipt, 
  UploadCloud, 
  Camera, 
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
  X
} from 'lucide-react';
import Swal from 'sweetalert2';
import { 
  loginRestauranteCredenciales, 
  registrarCompraPatrocinadorFirebase, 
  convertImageToBase64 
} from '../services/firebaseService';

interface SponsorCheckinViewProps {
  patrocinadorId: string;
  patrocinadores: Patrocinador[];
  restaurantes: Restaurante[];
  onBackToHome: () => void;
}

export const SponsorCheckinView: React.FC<SponsorCheckinViewProps> = ({
  patrocinadorId,
  patrocinadores,
  restaurantes,
  onBackToHome
}) => {
  // Patrocinador target
  const patrocinador = patrocinadores.find(p => p.id === patrocinadorId);

  // Sesión de restaurante autenticado (guardada localmente para agilidad)
  const [loggedRestaurante, setLoggedRestaurante] = useState<Restaurante | null>(null);

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

  const [isSubmittingCompra, setIsSubmittingCompra] = useState(false);
  const [compraSuccessMsg, setCompraSuccessMsg] = useState<string | null>(null);
  const [compraError, setCompraError] = useState<string | null>(null);

  // Recuperar sesión guardada de encargado de restaurante
  useEffect(() => {
    const savedRestId = localStorage.getItem('sesion_restaurante_encargado_id');
    if (savedRestId && restaurantes.length > 0) {
      const rest = restaurantes.find(r => r.id === savedRestId && !r.descalificado);
      if (rest) {
        setLoggedRestaurante(rest);
      }
    }
  }, [restaurantes]);

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

  // Manejar Login de Restaurante
  const handleLoginRestaurante = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await loginRestauranteCredenciales(usuarioInput, claveInput);
      if (res.success && res.restaurante) {
        setLoggedRestaurante(res.restaurante);
        localStorage.setItem('sesion_restaurante_encargado_id', res.restaurante.id);
        setUsuarioInput('');
        setClaveInput('');

        Swal.fire({
          title: '¡Sesión Iniciada!',
          html: `<p style="font-size: 13px; color: #d6d3d1;">Bienvenido, encargado de <strong style="color: #FFF9ED;">${res.restaurante.nombre}</strong>.<br/>Ya puedes registrar tus compras oficiales en esta tienda.</p>`,
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
          title: 'Credenciales Inválidas',
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
    setLoggedRestaurante(null);
    localStorage.removeItem('sesion_restaurante_encargado_id');
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
        facturaFotoUrl: facturaFotoUrl || undefined
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
                <span>Establecimiento comercial aliado The Best Burger 2026</span>
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
                      Ingresa el usuario y clave entregados a tu restaurante por el comité.
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
                    🔒 Acceso exclusivo para representantes de los restaurantes participantes en The Best Burger 2026.
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
                        <label className="cursor-pointer flex flex-col items-center justify-center space-y-2 py-4">
                          <div className="w-12 h-12 rounded-2xl bg-[#A40B03]/15 text-[#A40B03] border border-[#A40B03]/30 flex items-center justify-center shadow-md">
                            <Camera className="w-6 h-6" />
                          </div>
                          <div className="text-xs text-stone-300 font-semibold">
                            Haz clic para tomar foto con la cámara o seleccionar archivo
                          </div>
                          <div className="text-[11px] text-stone-500">
                            PNG, JPG o WEBP (Foto nítida de la factura física o ticket)
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => setFacturaFotoFile(e.target.files ? e.target.files[0] : null)}
                            className="hidden"
                          />
                        </label>
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
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold">
                    Sesión Activa
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

    </div>
  );
};
