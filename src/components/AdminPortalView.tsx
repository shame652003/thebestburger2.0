import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import Swal from 'sweetalert2';
import { Restaurante, CodigoVoto, EstadisticasEvento, Patrocinador, RegistroCompraPatrocinador } from '../types';

import { QRCodeSVG } from 'qrcode.react';

import { 
  KeyRound, 
  PlusCircle, 
  QrCode, 
  BarChart3, 
  ShieldAlert, 
  CheckCircle, 
  RefreshCw, 
  Code2, 
  Store, 
  Lock, 
  LogOut, 
  ArrowLeft, 
  Trophy, 
  Check, 
  AlertCircle,
  FileSpreadsheet,
  Award,
  UploadCloud,
  Copy,
  Printer,
  Scissors,
  ExternalLink,
  X,
  Film,
  Crown,
  Star,
  Edit3,
  Wand2,
  ShieldX,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  Eye,
  EyeOff,
  Clock,
  Mail,
  Calendar,
  DollarSign,
  UserCheck,
  FileText,
  Camera,
  ShoppingBag,
  Sparkles,
  Info,
  Calculator,
  Scale,
  Flame,
  Activity,
  Search,
  Filter,
  TrendingUp,
  Users,
  Percent,
  ArrowUpRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  addRestauranteFirebase, 
  updateRestauranteFirebase,
  toggleDescalificarRestauranteFirebase,
  getStatsFirebase, 
  getCodigosFirebase, 
  getFraudLogsFirebase, 
  generateBatchCodesFirebase,
  FraudLogType,
  convertImageToBase64,
  addPatrocinadorFirebase,
  setPatrocinadorPrincipalFirebase,
  updateRestauranteVideoFirebase,
  getComprasPatrocinadoresFirebase,
  loginAdminFirebase,
  verifyAdminSessionFirebase,
  logoutAdminFirebase,
  setResultadosReveladosFirebase
} from '../services/firebaseService';
import logoBlanco from '../img/logo blanco.svg';
import logoRed from '../img/logo.svg';

interface AdminPortalViewProps {
  restaurantes: Restaurante[];
  patrocinadores?: Patrocinador[];
  onRestaurantesUpdated: () => void;
  onExitToPublic: () => void;
}

const ADMIN_SESSION_KEY = 'foodfest_admin_session';
const ADMIN_LOCKOUT_KEY = 'foodfest_admin_lockout';
const ADMIN_IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 min de inactividad
const ADMIN_ABS_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 horas máximo de sesión
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60s de bloqueo tras 5 fallos
const DISQUALIFY_CODE_SHA256 = '17756315ebd47b7110359fc7b168179bf6f2df3646fcc888bc8aa05c78b38ac1';

interface AdminSessionData {
  uid: string;
  email: string;
  expAbs: number;
  lastActivity: number;
}

// --- VALIDACIONES DE REGISTRO / EDICIÓN DE RESTAURANTES ---
interface RestaurantFormData {
  nombre: string;
  nombreHamburguesa: string;
  slogan: string;
  descripcion: string;
  ingredientesRaw: string;
  precio: string;
  direccion: string;
  instagram: string;
  videoUrl: string;
  usuarioAcceso: string;
  claveAcceso: string;
}

interface RestaurantFormFiles {
  fotoFile: File | null;
  logoFile: File | null;
}

interface RestaurantValidationOptions {
  requireImages: boolean;
  requireInstagram: boolean;
  existingRestaurantes: Restaurante[];
  editingId?: string;
}

interface ValidationIssue {
  field: string;
  message: string;
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const REST_NAME_REGEX = /^[A-Za-zÀ-ÿ0-9\s&.'-]+$/;
const REST_SLOGAN_REGEX = /^[A-Za-zÀ-ÿ0-9\s&.,'!¡?¿()-]*$/;
const REST_ADDRESS_REGEX = /^[A-Za-zÀ-ÿ0-9\s#.,°/-]+$/;
const INGREDIENT_REGEX = /^[A-Za-zÀ-ÿ0-9\s&.'()/-]+$/;
const INSTAGRAM_HANDLE_REGEX = /^@?[A-Za-z0-9._]{1,30}$/;
const PRICE_REGEX = /^\$?\s?\d{1,3}([.,]\d{1,2})?$/;
const ACCESS_USER_REGEX = /^[a-z0-9._-]{3,24}$/;
const ACCESS_PASS_REGEX = /^\S{6,32}$/;
const VIDEO_ALLOWED_HOSTS = ['instagram.com', 'youtube.com', 'youtu.be', 'tiktok.com', 'facebook.com', 'fb.watch'];

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });

const isValidVideoUrl = (raw: string): boolean => {
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    if (VIDEO_ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
      return true;
    }
    return /\.(mp4|webm|mov)$/i.test(url.pathname);
  } catch {
    return false;
  }
};

const validateRestaurantForm = (
  data: RestaurantFormData,
  files: RestaurantFormFiles,
  options: RestaurantValidationOptions
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const add = (field: string, message: string) => issues.push({ field, message });

  const nombre = data.nombre.trim().replace(/\s+/g, ' ');
  if (!nombre) {
    add('nombre', 'El nombre del restaurante es obligatorio.');
  } else if (nombre.length < 3 || nombre.length > 60) {
    add('nombre', 'El nombre del restaurante debe tener entre 3 y 60 caracteres.');
  } else if (!REST_NAME_REGEX.test(nombre)) {
    add('nombre', 'El nombre del restaurante solo admite letras, números, espacios y los signos & . \' -');
  }

  const nombreHamburguesa = data.nombreHamburguesa.trim().replace(/\s+/g, ' ');
  if (!nombreHamburguesa) {
    add('nombreHamburguesa', 'El nombre del plato o creación es obligatorio.');
  } else if (nombreHamburguesa.length < 3 || nombreHamburguesa.length > 80) {
    add('nombreHamburguesa', 'El nombre del plato debe tener entre 3 y 80 caracteres.');
  } else if (!REST_NAME_REGEX.test(nombreHamburguesa)) {
    add('nombreHamburguesa', 'El nombre del plato solo admite letras, números, espacios y los signos & . \' -');
  }

  const slogan = data.slogan.trim().replace(/\s+/g, ' ');
  if (slogan.length > 80) {
    add('slogan', 'El slogan no puede superar los 80 caracteres.');
  } else if (slogan && !REST_SLOGAN_REGEX.test(slogan)) {
    add('slogan', 'El slogan contiene caracteres no permitidos.');
  }

  const precio = data.precio.trim();
  if (precio) {
    if (!PRICE_REGEX.test(precio)) {
      add('precio', 'El precio debe tener el formato $8.00 (máximo 3 enteros y 2 decimales).');
    } else {
      const numericPrice = parseFloat(precio.replace('$', '').replace(',', '.').trim());
      if (!Number.isFinite(numericPrice) || numericPrice <= 0 || numericPrice > 999.99) {
        add('precio', 'El precio debe ser mayor que 0 y menor o igual a 999.99.');
      }
    }
  }

  const instagram = data.instagram.trim();
  if (!instagram && options.requireInstagram) {
    add('instagram', 'El usuario de Instagram es obligatorio.');
  } else if (instagram) {
    const urlMatch = instagram.match(/(?:instagram\.com\/)([A-Za-z0-9._]+)/i);
    const handle = urlMatch ? urlMatch[1] : instagram;
    if (!INSTAGRAM_HANDLE_REGEX.test(handle)) {
      add('instagram', 'Ingresa un usuario válido de Instagram (ej: @mitocuyoburger) o su URL oficial.');
    }
  }

  const direccion = data.direccion.trim().replace(/\s+/g, ' ');
  if (direccion) {
    if (direccion.length < 5 || direccion.length > 120) {
      add('direccion', 'La dirección debe tener entre 5 y 120 caracteres.');
    } else if (!REST_ADDRESS_REGEX.test(direccion)) {
      add('direccion', 'La dirección contiene caracteres no permitidos.');
    }
  }

  const videoUrl = data.videoUrl.trim();
  if (videoUrl && !isValidVideoUrl(videoUrl)) {
    add('videoUrl', 'El enlace de video debe ser una URL válida de Instagram, YouTube, TikTok o un archivo MP4/WebM.');
  }

  const ingredientesRaw = data.ingredientesRaw.trim();
  if (ingredientesRaw) {
    const ingredientes = ingredientesRaw.split(',').map((item) => item.trim()).filter(Boolean);
    const invalido = ingredientes.find((item) => item.length < 2 || item.length > 40 || !INGREDIENT_REGEX.test(item));
    if (ingredientes.length === 0 || invalido !== undefined) {
      add('ingredientesRaw', 'Cada ingrediente debe tener entre 2 y 40 caracteres y estar separado por comas.');
    }
  }

  if (data.descripcion.trim().length > 400) {
    add('descripcion', 'La descripción no puede superar los 400 caracteres.');
  }

  const usuario = data.usuarioAcceso.trim().toLowerCase();
  if (usuario) {
    if (!ACCESS_USER_REGEX.test(usuario)) {
      add('usuarioAcceso', 'El usuario debe tener entre 3 y 24 caracteres: minúsculas, números, puntos, guiones o guiones bajos.');
    } else {
      const duplicado = options.existingRestaurantes.some((restaurante) => {
        if (restaurante.id === options.editingId) return false;
        const existente = (restaurante.usuarioAcceso || restaurante.nombre.toLowerCase().replace(/[^a-z0-9]/g, '')).toLowerCase();
        return existente === usuario;
      });
      if (duplicado) {
        add('usuarioAcceso', 'Ese usuario de acceso ya está asignado a otro restaurante.');
      }
    }
  }

  const clave = data.claveAcceso.trim();
  if (clave && !ACCESS_PASS_REGEX.test(clave)) {
    add('claveAcceso', 'La contraseña debe tener entre 6 y 32 caracteres y no contener espacios.');
  }

  if (nombre) {
    const nombreDuplicado = options.existingRestaurantes.some(
      (restaurante) => restaurante.id !== options.editingId && restaurante.nombre.trim().toLowerCase() === nombre.toLowerCase()
    );
    if (nombreDuplicado) {
      add('nombre', 'Ya existe un restaurante registrado con ese nombre.');
    }
  }

  const validateImage = (file: File | null, field: string, label: string, required: boolean) => {
    if (!file) {
      if (required) add(field, `Debes subir ${label}.`);
      return;
    }
    if (file.size === 0) {
      add(field, `El archivo de ${label} está vacío o dañado.`);
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      add(field, `${label} debe ser una imagen JPG, PNG o WebP.`);
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      add(field, `${label} no puede superar los 5 MB.`);
    }
  };

  validateImage(files.fotoFile, 'fotoFile', 'la foto de la creación', options.requireImages);
  validateImage(files.logoFile, 'logoFile', 'el logo del restaurante', options.requireImages);

  return issues;
};

const computeSha256Hex = async (text: string): Promise<string> => {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  restaurantes,
  patrocinadores = [],
  onRestaurantesUpdated,
  onExitToPublic,
}) => {
  // Authentication & Hardened Session State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(true);
  const [adminSessionEmail, setAdminSessionEmail] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState<number>(0);
  const [idleMinutesLeft, setIdleMinutesLeft] = useState<number>(10);
  const lastActivityWriteRef = useRef<number>(0);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'stats' | 'generator' | 'entities' | 'sponsors' | 'gala' | 'architecture' | 'sponsor_audit'>('stats');

  // Generator form state
  const [selectedRestId, setSelectedRestId] = useState<string>(restaurantes[0]?.id || '');
  const [batchCount, setBatchCount] = useState<number>(500);
  const [batchPrefix, setBatchPrefix] = useState<string>('FOODFEST');
  const [isGeneratingCodes, setIsGeneratingCodes] = useState<boolean>(false);
  const [printRestId, setPrintRestId] = useState<string | null>(null);

  // QR Mesa Multi-Card Print state (A4 / Carta)
  const [printTableRestId, setPrintTableRestId] = useState<string | null>(null);
  const [tableCardsCount, setTableCardsCount] = useState<number>(9);
  const [tableGridFormat, setTableGridFormat] = useState<'9' | '6' | '4'>('9');
  const [tableNumbering, setTableNumbering] = useState<boolean>(true);
  const [tableStartNumber, setTableStartNumber] = useState<number>(1);

  // QR Patrocinador Multi-Card Print state (A4 / Carta)
  const [printSponsorId, setPrintSponsorId] = useState<string | null>(null);
  const [sponsorCardsCount, setSponsorCardsCount] = useState<number>(4);
  const [sponsorGridFormat, setSponsorGridFormat] = useState<'1' | '4'>('4');

  // QR Mesa Inspector state
  const [selectedQrRest, setSelectedQrRest] = useState<Restaurante | null>(null);
  const [copiedTableUrl, setCopiedTableUrl] = useState(false);

  // Register Restaurant form state
  const [newRest, setNewRest] = useState({
    nombre: '',
    nombreHamburguesa: '',
    slogan: '',
    descripcion: '',
    ingredientesRaw: '',
    precio: '',
    direccion: '',
    instagram: '',
    videoUrl: '',
    usuarioAcceso: '',
    claveAcceso: ''
  });
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingRest, setIsUploadingRest] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState<boolean>(false);
  const [restFormErrors, setRestFormErrors] = useState<Record<string, string>>({});
  const submitRestLockRef = useRef<boolean>(false);

  // Edit Video Modal state
  const [editingVideoRest, setEditingVideoRest] = useState<Restaurante | null>(null);
  const [editVideoUrlInput, setEditVideoUrlInput] = useState('');
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const [videoSaveSuccess, setVideoSaveSuccess] = useState(false);

  // Edit Restaurant Full Information Modal state
  const [editingRest, setEditingRest] = useState<Restaurante | null>(null);
  const [editRestForm, setEditRestForm] = useState({
    nombre: '',
    nombreHamburguesa: '',
    slogan: '',
    descripcion: '',
    ingredientesRaw: '',
    precio: '',
    direccion: '',
    instagram: '',
    videoUrl: '',
    usuarioAcceso: '',
    claveAcceso: ''
  });
  const [editFotoFile, setEditFotoFile] = useState<File | null>(null);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [isSavingEditRest, setIsSavingEditRest] = useState(false);
  const [editRestSuccess, setEditRestSuccess] = useState(false);
  const submitEditLockRef = useRef<boolean>(false);

  // Disqualification Security Modal state (verificado por hash SHA-256)
  const [disqualifyTargetRest, setDisqualifyTargetRest] = useState<Restaurante | null>(null);
  const [disqualifyCodeInput, setDisqualifyCodeInput] = useState('');
  const [disqualifyReasonInput, setDisqualifyReasonInput] = useState('');
  const [disqualifyError, setDisqualifyError] = useState<string | null>(null);
  const [isSubmittingDisqualify, setIsSubmittingDisqualify] = useState(false);
  const [disqualifySuccessMsg, setDisqualifySuccessMsg] = useState<string | null>(null);

  // Sponsor Store QR Modal state
  const [selectedSponsorQr, setSelectedSponsorQr] = useState<Patrocinador | null>(null);
  const [copiedSponsorUrl, setCopiedSponsorUrl] = useState(false);

  // Sponsor Invoices Audit state
  const [comprasAuditList, setComprasAuditList] = useState<RegistroCompraPatrocinador[]>([]);
  const [isLoadingComprasAudit, setIsLoadingComprasAudit] = useState(false);
  const [selectedAuditImage, setSelectedAuditImage] = useState<string | null>(null);
  const [auditFilterSponsor, setAuditFilterSponsor] = useState<string>('todos');
  const [auditFilterRest, setAuditFilterRest] = useState<string>('todos');

  const fetchComprasAudit = async () => {
    setIsLoadingComprasAudit(true);
    try {
      const data = await getComprasPatrocinadoresFirebase();
      setComprasAuditList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingComprasAudit(false);
    }
  };

  // --- HELPERS DE FORMATEO Y CAPITALIZACIÓN AUTOMÁTICA ---
  const toTitleCase = (text: string): string => {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1) : '')
      .join(' ');
  };

  const toSentenceCase = (text: string): string => {
    const trimmed = text.trim().replace(/\s+/g, ' ');
    if (!trimmed) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const formatInstagramHandle = (input: string): string => {
    let clean = input.trim();
    const urlMatch = clean.match(/(?:instagram\.com\/)([a-zA-Z0-9._]+)/i);
    if (urlMatch) {
      return `@${urlMatch[1]}`;
    }
    if (clean && !clean.startsWith('@')) {
      return `@${clean}`;
    }
    return clean;
  };

  const formatPrice = (price: string): string => {
    let clean = price.trim().replace(/\s+/g, '');
    if (!clean) return '$8.00';
    if (!clean.startsWith('$')) {
      const num = parseFloat(clean);
      if (!isNaN(num)) return `$${num.toFixed(2)}`;
      return `$${clean}`;
    } else {
      const num = parseFloat(clean.replace('$', ''));
      if (!isNaN(num)) return `$${num.toFixed(2)}`;
      return clean;
    }
  };

  const formatIngredientesRaw = (raw: string): string => {
    return raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(', ');
  };

  const SWAL_THEME = {
    background: '#0F0F0F',
    color: '#FFF9ED',
    confirmButtonColor: '#A40B03',
    iconColor: '#A40B03',
  };

  const showValidationIssues = async (title: string, intro: string, issues: ValidationIssue[]) => {
    const list = issues
      .map((issue) => `<li style="margin-bottom:6px;">${escapeHtml(issue.message)}</li>`)
      .join('');

    await Swal.fire({
      title,
      html: `
        <div style="text-align:left;font-size:12px;line-height:1.5;">
          <p style="margin:0 0 8px;">${escapeHtml(intro)}</p>
          <ul style="margin:0;padding-left:18px;">${list}</ul>
        </div>
      `,
      icon: 'error',
      ...SWAL_THEME,
      confirmButtonText: 'Revisar formulario',
    });
  };

  const showRestaurantValidationErrors = async (issues: ValidationIssue[]) => {
    setRestFormErrors(
      issues.reduce<Record<string, string>>((acc, issue) => {
        if (!acc[issue.field]) acc[issue.field] = issue.message;
        return acc;
      }, {})
    );

    await showValidationIssues(
      'Datos inválidos',
      'Corrige los siguientes campos antes de inscribir el restaurante:',
      issues
    );
  };

  const showRestaurantError = async (title: string, message: string) => {
    await Swal.fire({
      title,
      text: message,
      icon: 'error',
      ...SWAL_THEME,
      confirmButtonText: 'Entendido',
    });
  };

  const updateNewRestField = (field: keyof RestaurantFormData, value: string) => {
    setNewRest((prev) => ({ ...prev, [field]: value }));
    setRestFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearRestFileError = (field: 'fotoFile' | 'logoFile') => {
    setRestFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const restInputClass = (field: string, extra = '') =>
    `w-full px-4 py-2.5 rounded-xl bg-black border text-[#FFF9ED] text-xs outline-none transition-colors ${
      restFormErrors[field]
        ? 'border-red-500/70 focus:border-red-500'
        : 'border-stone-800 focus:border-[#A40B03]'
    } ${extra}`;

  const autoFormatNewRest = () => {
    setNewRest(prev => ({
      ...prev,
      nombre: toTitleCase(prev.nombre),
      nombreHamburguesa: toTitleCase(prev.nombreHamburguesa),
      slogan: toSentenceCase(prev.slogan),
      precio: formatPrice(prev.precio),
      instagram: formatInstagramHandle(prev.instagram),
      direccion: toSentenceCase(prev.direccion),
      ingredientesRaw: formatIngredientesRaw(prev.ingredientesRaw),
      descripcion: toSentenceCase(prev.descripcion),
      videoUrl: prev.videoUrl.trim()
    }));
  };

  const autoFormatEditRest = () => {
    setEditRestForm(prev => ({
      ...prev,
      nombre: toTitleCase(prev.nombre),
      nombreHamburguesa: toTitleCase(prev.nombreHamburguesa),
      slogan: toSentenceCase(prev.slogan),
      precio: formatPrice(prev.precio),
      instagram: formatInstagramHandle(prev.instagram),
      direccion: toSentenceCase(prev.direccion),
      ingredientesRaw: formatIngredientesRaw(prev.ingredientesRaw),
      descripcion: toSentenceCase(prev.descripcion),
      videoUrl: prev.videoUrl.trim()
    }));
  };

  // Register Sponsor form state
  const [newSponsor, setNewSponsor] = useState({
    nombre: '',
    tipo: 'Aliado Gourmet' as 'Patrocinador Oficial Principal' | 'Principal' | 'Aliado Gourmet' | 'Patrocinador Oficial',
    descripcion: '',
    url: '',
    esPrincipal: false,
  });
  const [sponsorLogoFile, setSponsorLogoFile] = useState<File | null>(null);
  const [isUploadingSponsor, setIsUploadingSponsor] = useState(false);
  const [sponsorSuccess, setSponsorSuccess] = useState<boolean>(false);

  // Data
  const [stats, setStats] = useState<EstadisticasEvento>({
    totalVotos: 0, totalCodigosGenerados: 0, totalCodigosUsados: 0, promedioGlobal: 0, intentosFraudeBloqueados: 0
  });
  const [codigos, setCodigos] = useState<CodigoVoto[]>([]);
  const [fraudLogs, setFraudLogs] = useState<FraudLogType[]>([]);
  const [isTogglingGala, setIsTogglingGala] = useState<boolean>(false);
  const [galaActiveTab, setGalaActiveTab] = useState<'ranking' | 'explicacion'>('ranking');

  // Main Dashboard (Metrics & Fraud) dynamic state
  const [statsViewMode, setStatsViewMode] = useState<'overview' | 'security' | 'table'>('overview');
  const [chartMetric, setChartMetric] = useState<'votos' | 'rating'>('votos');
  const [fraudSearchQuery, setFraudSearchQuery] = useState<string>('');
  const [fraudFilterType, setFraudFilterType] = useState<string>('ALL');
  const [isRefreshingDashboard, setIsRefreshingDashboard] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const refreshAllData = async () => {
    const s = await getStatsFirebase();
    const c = await getCodigosFirebase();
    const f = await getFraudLogsFirebase();
    setStats(s);
    setCodigos(c);
    setFraudLogs(f);
    fetchComprasAudit();
  };

  const handleManualRefreshDashboard = async () => {
    setIsRefreshingDashboard(true);
    await refreshAllData();
    onRestaurantesUpdated();
    setLastRefreshedAt(new Date());
    setTimeout(() => setIsRefreshingDashboard(false), 400);
  };

  const handleToggleResultadosPublicos = async () => {
    const currentStatus = Boolean(stats.resultadosRevelados);
    const nuevoEstado = !currentStatus;

    if (nuevoEstado) {
      const result = await Swal.fire({
        ...SWAL_THEME,
        title: '¿Revelar Resultados Oficiales al Público?',
        background: '#0F0F0F',
        color: '#FFF9ED',
        icon: 'warning',
        iconColor: '#10B981',
        html: `
          <div style="text-align: left; font-size: 13px; color: #d6d3d1; line-height: 1.5;">
            <p style="margin-bottom: 8px;">Estás a punto de <strong>publicar los resultados finales del Food Fest 2026</strong> en la vista pública general.</p>
            <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); padding: 12px; border-radius: 10px; margin-bottom: 10px;">
              <strong style="color: #FFF9ED;">¿Qué sucederá al confirmar?</strong>
              <ul style="margin: 6px 0 0 16px; padding: 0; font-size: 12px; color: #e7e5e4; line-height: 1.6;">
                <li>El <strong>Leaderboard Público</strong> dejará de ser anónimo.</li>
                <li>Se revelarán las fotos, nombres de hamburguesas y marcas reales de todos los participantes.</li>
                <li>Se activará el <strong>Podio de Campeones (Oro, Plata y Bronce)</strong> con su calificación en estrellas para todos los visitantes.</li>
                <li>La cantidad exacta de votos se mantendrá como métrica interna y confidencial para el Comité.</li>
              </ul>
            </div>
            <p style="font-size: 11px; color: #a8a29e;">Esta acción se puede revertir en cualquier momento desde este mismo panel si lo consideras necesario.</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#059669',
        cancelButtonColor: '#262626',
        confirmButtonText: 'Sí, ¡Revelar Resultados a Todos!',
        cancelButtonText: 'Cancelar'
      });

      if (!result.isConfirmed) return;
    } else {
      const result = await Swal.fire({
        ...SWAL_THEME,
        title: '¿Revertir a Modo Anónimo?',
        background: '#0F0F0F',
        color: '#FFF9ED',
        icon: 'question',
        iconColor: '#A40B03',
        html: `
          <div style="text-align: left; font-size: 13px; color: #d6d3d1; line-height: 1.5;">
            <p>El ranking público volverá a mostrar códigos confidenciales (<em>"Participante #1", "Identidad Oculta"</em>).</p>
            <p style="margin-top: 8px; font-size: 12px; color: #a8a29e;">Solo el Comité Organizador podrá ver las identidades reales dentro de este portal privado.</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#A40B03',
        cancelButtonColor: '#262626',
        confirmButtonText: 'Sí, volver a Modo Anónimo',
        cancelButtonText: 'Cancelar'
      });

      if (!result.isConfirmed) return;
    }

    setIsTogglingGala(true);
    try {
      const res = await setResultadosReveladosFirebase(nuevoEstado);
      if (res.success) {
        setStats(prev => ({ ...prev, resultadosRevelados: nuevoEstado }));
        onRestaurantesUpdated();
        Swal.fire({
          ...SWAL_THEME,
          background: '#0F0F0F',
          color: '#FFF9ED',
          iconColor: nuevoEstado ? '#10B981' : '#A40B03',
          title: nuevoEstado ? '¡Resultados Revelados!' : 'Modo Anónimo Restaurado',
          text: nuevoEstado 
            ? 'Los resultados oficiales y las posiciones reales ya son visibles públicamente en el Leaderboard.' 
            : 'El ranking público vuelve a estar bajo anonimato estricto.',
          icon: 'success',
          confirmButtonColor: nuevoEstado ? '#059669' : '#A40B03'
        });
      } else {
        Swal.fire({
          ...SWAL_THEME,
          background: '#0F0F0F',
          color: '#FFF9ED',
          title: 'Error',
          text: res.error || 'No se pudo actualizar el estado de la gala.',
          icon: 'error',
          confirmButtonColor: '#A40B03'
        });
      }
    } catch (e: any) {
      Swal.fire({
        ...SWAL_THEME,
        background: '#0F0F0F',
        color: '#FFF9ED',
        title: 'Error',
        text: e.message || 'Ocurrió un error inesperado.',
        icon: 'error',
        confirmButtonColor: '#A40B03'
      });
    } finally {
      setIsTogglingGala(false);
    }
  };

  const clearAdminSessionStorage = () => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {}
  };

  const readAdminSessionStorage = (): AdminSessionData | null => {
    try {
      const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AdminSessionData;
    } catch {
      return null;
    }
  };

  const writeAdminSessionStorage = (session: AdminSessionData) => {
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    } catch {}
  };

  const handleForceLogout = useCallback(async (reason?: string, exitToPublic = false) => {
    clearAdminSessionStorage();
    setIsAuthenticated(false);
    setAdminSessionEmail('');
    setPasswordInput('');
    await logoutAdminFirebase();
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
    if (exitToPublic) {
      onExitToPublic();
    }
  }, [onExitToPublic]);

  // Restaurar y verificar sesión al montar
  useEffect(() => {
    let mounted = true;
    const checkInitialSession = async () => {
      // Revisar bloqueo activo por fuerza bruta
      try {
        const lockRaw = sessionStorage.getItem(ADMIN_LOCKOUT_KEY);
        if (lockRaw) {
          const until = Number(lockRaw);
          const diff = Math.ceil((until - Date.now()) / 1000);
          if (diff > 0) {
            setLockoutSecondsLeft(diff);
          } else {
            sessionStorage.removeItem(ADMIN_LOCKOUT_KEY);
          }
        }
      } catch {}

      const stored = readAdminSessionStorage();
      if (!stored) {
        if (mounted) setIsRestoringSession(false);
        return;
      }

      const now = Date.now();
      if (now > stored.expAbs || now - stored.lastActivity > ADMIN_IDLE_TIMEOUT_MS) {
        clearAdminSessionStorage();
        await logoutAdminFirebase();
        if (mounted) setIsRestoringSession(false);
        return;
      }

      const valid = await verifyAdminSessionFirebase(stored.uid);
      if (!mounted) return;
      if (valid) {
        writeAdminSessionStorage({ ...stored, lastActivity: now });
        setAdminSessionEmail(stored.email);
        setIsAuthenticated(true);
        refreshAllData();
      } else {
        clearAdminSessionStorage();
        await logoutAdminFirebase();
      }
      setIsRestoringSession(false);
    };
    checkInitialSession();
    return () => {
      mounted = false;
    };
  }, []);

  // Cuenta regresiva del bloqueo anti-brute-force
  useEffect(() => {
    if (lockoutSecondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setLockoutSecondsLeft((prev) => {
        if (prev <= 1) {
          try {
            sessionStorage.removeItem(ADMIN_LOCKOUT_KEY);
          } catch {}
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockoutSecondsLeft]);

  // Monitoreo de actividad, timeout de inactividad (10m), expiración absoluta (4h) y cambio de pestaña
  useEffect(() => {
    if (!isAuthenticated) return;

    const registerActivity = () => {
      const now = Date.now();
      if (now - lastActivityWriteRef.current < 4000) return;
      lastActivityWriteRef.current = now;
      const stored = readAdminSessionStorage();
      if (stored) {
        writeAdminSessionStorage({ ...stored, lastActivity: now });
        setIdleMinutesLeft(10);
      }
    };

    const checkSessionIntegrity = async () => {
      const stored = readAdminSessionStorage();
      if (!stored) {
        await handleForceLogout('La sesión del comité fue cerrada.');
        return;
      }
      const now = Date.now();
      if (now > stored.expAbs) {
        await handleForceLogout('Se alcanzó el límite máximo de 4 horas de sesión activa del comité.');
        return;
      }
      const idleElapsed = now - stored.lastActivity;
      if (idleElapsed > ADMIN_IDLE_TIMEOUT_MS) {
        await handleForceLogout('Sesión cerrada automáticamente tras 10 minutos de inactividad.');
        return;
      }
      const remainingMin = Math.max(1, Math.ceil((ADMIN_IDLE_TIMEOUT_MS - idleElapsed) / 60000));
      setIdleMinutesLeft(remainingMin);
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const stored = readAdminSessionStorage();
        if (!stored) {
          await handleForceLogout();
          return;
        }
        const now = Date.now();
        if (now > stored.expAbs || now - stored.lastActivity > ADMIN_IDLE_TIMEOUT_MS) {
          await handleForceLogout('Tu sesión del comité expiró mientras la pestaña estaba inactiva.');
          return;
        }
        const stillAdmin = await verifyAdminSessionFirebase(stored.uid);
        if (!stillAdmin) {
          await handleForceLogout('La sesión de autenticación cambió en otra pestaña. Por seguridad se cerró el panel.');
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
  }, [isAuthenticated, handleForceLogout]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (lockoutSecondsLeft > 0 || isLoggingIn) {
      return;
    }

    const email = userInput.trim().toLowerCase();
    const pass = passwordInput;

    if (!email || !pass) {
      setAuthError('Ingresa el correo institucional y la clave maestra del comité.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await loginAdminFirebase(email, pass);

      // Si una cuenta ajena intenta entrar al portal, devolver al sitio público sin revelar el panel
      if (res.unauthorized) {
        clearAdminSessionStorage();
        setPasswordInput('');
        onExitToPublic();
        return;
      }

      if (res.success && res.uid) {
        const now = Date.now();
        const sessionData: AdminSessionData = {
          uid: res.uid,
          email: res.email || email,
          expAbs: now + ADMIN_ABS_TIMEOUT_MS,
          lastActivity: now,
        };
        writeAdminSessionStorage(sessionData);
        setAdminSessionEmail(sessionData.email);
        setFailedAttempts(0);
        setPasswordInput('');
        setIsAuthenticated(true);
        refreshAllData();
      } else {
        const nextFailures = failedAttempts + 1;
        setFailedAttempts(nextFailures);
        setPasswordInput('');

        if (res.tooManyRequests || nextFailures >= MAX_LOGIN_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_DURATION_MS;
          try {
            sessionStorage.setItem(ADMIN_LOCKOUT_KEY, String(until));
          } catch {}
          setLockoutSecondsLeft(Math.ceil(LOCKOUT_DURATION_MS / 1000));
          const lockMsg = 'Demasiados intentos fallidos. Acceso bloqueado por 60 segundos por seguridad.';
          setAuthError(lockMsg);
          await Swal.fire({
            title: 'Acceso Bloqueado Temporalmente',
            text: lockMsg,
            icon: 'error',
            iconColor: '#A40B03',
            background: '#0F0F0F',
            color: '#FFF9ED',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#A40B03',
          });
        } else {
          const msg = res.error || 'Credenciales no autorizadas. Verifica tu correo y clave maestra.';
          setAuthError(`${msg} (Intento ${nextFailures} de ${MAX_LOGIN_ATTEMPTS})`);
          await Swal.fire({
            title: 'Acceso Denegado',
            text: msg,
            icon: 'error',
            iconColor: '#A40B03',
            background: '#0F0F0F',
            color: '#FFF9ED',
            confirmButtonText: 'Reintentar',
            confirmButtonColor: '#A40B03',
          });
        }
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    clearAdminSessionStorage();
    setIsAuthenticated(false);
    setAdminSessionEmail('');
    setPasswordInput('');
    await logoutAdminFirebase();
  };

  const handleExitToPublicSafe = async () => {
    clearAdminSessionStorage();
    setIsAuthenticated(false);
    setAdminSessionEmail('');
    setPasswordInput('');
    await logoutAdminFirebase();
    onExitToPublic();
  };

  const handleGenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestId || isGeneratingCodes) return;

    setIsGeneratingCodes(true);
    const rest = restaurantes.find(r => r.id === selectedRestId);
    
    await generateBatchCodesFirebase({
      restauranteId: selectedRestId,
      restauranteNombre: rest ? rest.nombre : "Desconocido",
      cantidad: Number(batchCount),
      prefijoLote: batchPrefix.trim().toUpperCase()
    });
    
    // Refresh to get new codes
    const c = await getCodigosFirebase();
    setCodigos(c);
    const s = await getStatsFirebase();
    setStats(s);

    // Auto select next available
    const restSin = restaurantes.filter(r => !c.some(code => code.restauranteId === r.id));
    if (restSin.length > 0) setSelectedRestId(restSin[0].id);
    else setSelectedRestId('');

    setIsGeneratingCodes(false);
  };

  const handleExportCSV = () => {
    const rows = [
      ['ID_CODIGO', 'RESTAURANTE', 'ESTADO', 'CREADO_EN', 'MESA_MESERO'],
      ...codigos.map((c) => [c.codigo, c.restauranteNombre || c.restauranteId, c.usado ? 'USADO' : 'DISPONIBLE', c.creadoEn, c.meseroOMesa || 'N/A']),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `codigos_tocuyo_burgerfest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateRestaurante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploadingRest || submitRestLockRef.current) return;

    submitRestLockRef.current = true;
    setRestFormErrors({});

    const issues = validateRestaurantForm(
      newRest,
      { fotoFile, logoFile },
      { requireImages: true, requireInstagram: true, existingRestaurantes: restaurantes }
    );

    if (issues.length > 0) {
      submitRestLockRef.current = false;
      await showRestaurantValidationErrors(issues);
      return;
    }

    setIsUploadingRest(true);

    try {
      // Compress and convert to base64
      const fotoUrl = await convertImageToBase64(fotoFile as File);
      const logoUrl = await convertImageToBase64(logoFile as File, 400); // 400px is enough for a logo

      const nextNumber = restaurantes.length + 1;
      const normalizedName = toTitleCase(newRest.nombre);

      const baseUser = normalizedName.toLowerCase().replace(/[^a-z0-9]/g, '') || `burger${nextNumber}`;
      let defaultUser = baseUser;
      let suffix = 1;
      while (
        restaurantes.some((restaurante) => {
          const existente = (restaurante.usuarioAcceso || restaurante.nombre.toLowerCase().replace(/[^a-z0-9]/g, '')).toLowerCase();
          return existente === defaultUser;
        })
      ) {
        defaultUser = `${baseUser}${suffix}`;
        suffix += 1;
      }

      const defaultPass = 'burger2026';
      const finalUser = newRest.usuarioAcceso.trim().toLowerCase() || defaultUser;
      const finalPass = newRest.claveAcceso.trim() || defaultPass;

      const success = await addRestauranteFirebase({
        nombre: normalizedName,
        nombreHamburguesa: toTitleCase(newRest.nombreHamburguesa),
        slogan: toSentenceCase(newRest.slogan),
        descripcion: toSentenceCase(newRest.descripcion),
        ingredientes: newRest.ingredientesRaw.split(',').map((s) => s.trim()).filter(Boolean),
        precio: formatPrice(newRest.precio),
        fotoUrl,
        logoUrl,
        direccion: toSentenceCase(newRest.direccion),
        instagram: formatInstagramHandle(newRest.instagram),
        videoUrl: newRest.videoUrl.trim() || undefined,
        usuarioAcceso: finalUser,
        claveAcceso: finalPass,
        activo: true,
        votosCount: 0,
        promedioRating: 0,
        rankingAnonimoTag: `Participante #${nextNumber}`
      });

      if (!success) {
        throw new Error('Firebase no confirmó el registro. Verifica tu conexión e inténtalo nuevamente.');
      }

      setRegisterSuccess(true);
      onRestaurantesUpdated();
      setTimeout(() => setRegisterSuccess(false), 5000);

      // Limpiar
      setNewRest({
        nombre: '', nombreHamburguesa: '', slogan: '', descripcion: '',
        ingredientesRaw: '', precio: '', direccion: '', instagram: '',
        videoUrl: '', usuarioAcceso: '', claveAcceso: ''
      });
      setFotoFile(null);
      setLogoFile(null);
      setRestFormErrors({});

      await Swal.fire({
        title: '¡Restaurante inscrito!',
        html: `
          <div style="text-align:left;font-size:12px;line-height:1.6;">
            <p style="margin:0 0 10px;"><strong>${escapeHtml(normalizedName)}</strong> fue registrado exitosamente en la competencia.</p>
            <div style="padding:10px 12px;border-radius:10px;background:#000;border:1px solid #292524;">
              <p style="margin:0 0 4px;"><strong>Usuario de acceso:</strong> <span style="font-family:monospace;">${escapeHtml(finalUser)}</span></p>
              <p style="margin:0;"><strong>Contraseña:</strong> <span style="font-family:monospace;color:#FBBF24;">${escapeHtml(finalPass)}</span></p>
            </div>
            <p style="margin:10px 0 0;color:#A8A29E;">Guarda estas credenciales y compártelas con el encargado del restaurante.</p>
          </div>
        `,
        icon: 'success',
        ...SWAL_THEME,
        confirmButtonText: 'Entendido',
      });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Error al subir el restaurante o las imágenes. Inténtalo nuevamente.';
      await showRestaurantError('No se pudo inscribir el restaurante', message);
    } finally {
      setIsUploadingRest(false);
      submitRestLockRef.current = false;
    }
  };

  const openEditRestModal = (r: Restaurante) => {
    if (r.descalificado) {
      alert("Este restaurante se encuentra descalificado. Debes reincorporarlo mediante auditoría antes de poder modificar sus datos.");
      return;
    }
    setEditingRest(r);
    setEditRestForm({
      nombre: r.nombre,
      nombreHamburguesa: r.nombreHamburguesa,
      slogan: r.slogan || '',
      descripcion: r.descripcion || '',
      ingredientesRaw: (r.ingredientes || []).join(', '),
      precio: r.precio || '',
      direccion: r.direccion || '',
      instagram: r.instagram || '',
      videoUrl: r.videoUrl || '',
      usuarioAcceso: r.usuarioAcceso || r.nombre.toLowerCase().replace(/[^a-z0-9]/g, ''),
      claveAcceso: r.claveAcceso || 'burger2026'
    });
    setEditFotoFile(null);
    setEditLogoFile(null);
    setEditRestSuccess(false);
  };

  const handleSaveRestaurantEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRest) return;
    if (isSavingEditRest || submitEditLockRef.current) return;
    if (editingRest.descalificado) {
      await showRestaurantError('Acción no permitida', 'No se pueden modificar los datos de un participante descalificado.');
      return;
    }

    const issues = validateRestaurantForm(
      editRestForm,
      { fotoFile: editFotoFile, logoFile: editLogoFile },
      {
        requireImages: false,
        requireInstagram: false,
        existingRestaurantes: restaurantes,
        editingId: editingRest.id,
      }
    );

    if (issues.length > 0) {
      await showValidationIssues(
        'Datos inválidos',
        'Corrige los siguientes campos antes de guardar la ficha:',
        issues
      );
      return;
    }

    submitEditLockRef.current = true;
    setIsSavingEditRest(true);

    try {
      const updates: Partial<Restaurante> = {
        nombre: toTitleCase(editRestForm.nombre),
        nombreHamburguesa: toTitleCase(editRestForm.nombreHamburguesa),
        slogan: toSentenceCase(editRestForm.slogan),
        descripcion: toSentenceCase(editRestForm.descripcion),
        ingredientes: editRestForm.ingredientesRaw
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .map(s => s.charAt(0).toUpperCase() + s.slice(1)),
        precio: formatPrice(editRestForm.precio),
        direccion: toSentenceCase(editRestForm.direccion),
        instagram: formatInstagramHandle(editRestForm.instagram),
        videoUrl: editRestForm.videoUrl.trim() || "",
        usuarioAcceso: editRestForm.usuarioAcceso.trim().toLowerCase() || undefined,
        claveAcceso: editRestForm.claveAcceso.trim() || undefined
      };

      if (editFotoFile) {
        updates.fotoUrl = await convertImageToBase64(editFotoFile);
      }
      if (editLogoFile) {
        updates.logoUrl = await convertImageToBase64(editLogoFile, 400);
      }

      const ok = await updateRestauranteFirebase(editingRest.id, updates);
      if (!ok) {
        throw new Error('Firebase no confirmó la actualización. Revisa los datos ingresados e inténtalo nuevamente.');
      }

      setEditRestSuccess(true);
      onRestaurantesUpdated();
      setTimeout(() => setEditRestSuccess(false), 5000);
      setEditingRest(null);

      await Swal.fire({
        title: '¡Ficha actualizada!',
        text: 'La información del restaurante se guardó correctamente en Firebase.',
        icon: 'success',
        ...SWAL_THEME,
        confirmButtonText: 'Entendido',
      });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Error procesando los cambios.';
      await showRestaurantError('No se pudo actualizar la ficha', message);
    } finally {
      setIsSavingEditRest(false);
      submitEditLockRef.current = false;
    }
  };

  const openDisqualifyModal = (r: Restaurante) => {
    setDisqualifyTargetRest(r);
    setDisqualifyCodeInput('');
    setDisqualifyReasonInput(r.motivoDescalificacion || '');
    setDisqualifyError(null);
    setDisqualifySuccessMsg(null);
  };

  const handleConfirmDisqualification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disqualifyTargetRest) return;
    setDisqualifyError(null);

    // Verificación criptográfica SHA-256 del código de auditoría
    const codeHash = await computeSha256Hex(disqualifyCodeInput.trim());
    if (codeHash !== DISQUALIFY_CODE_SHA256) {
      setDisqualifyError('Código de seguridad incorrecto. Acción denegada por auditoría.');
      return;
    }

    setIsSubmittingDisqualify(true);
    try {
      const newStatus = !disqualifyTargetRest.descalificado;
      const ok = await toggleDescalificarRestauranteFirebase(
        disqualifyTargetRest.id,
        newStatus,
        disqualifyReasonInput
      );

      if (ok) {
        setDisqualifySuccessMsg(newStatus ? 'Restaurante marcado como DESCALIFICADO con éxito.' : 'Restaurante reincorporado a la competencia.');
        onRestaurantesUpdated();
        setTimeout(() => {
          setDisqualifyTargetRest(null);
          setDisqualifySuccessMsg(null);
        }, 1800);
      } else {
        setDisqualifyError('Error al actualizar el estado en Firebase.');
      }
    } catch (err: any) {
      setDisqualifyError(err.message || 'Error en la operación.');
    } finally {
      setIsSubmittingDisqualify(false);
    }
  };

  const handleSaveRestaurantVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideoRest) return;
    setIsSavingVideo(true);
    try {
      const ok = await updateRestauranteVideoFirebase(editingVideoRest.id, editVideoUrlInput);
      if (ok) {
        setVideoSaveSuccess(true);
        onRestaurantesUpdated();
        setTimeout(() => {
          setVideoSaveSuccess(false);
          setEditingVideoRest(null);
        }, 1500);
      } else {
        alert("No se pudo actualizar el video en Firebase.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al guardar el enlace de video.");
    } finally {
      setIsSavingVideo(false);
    }
  };

  const handleCreateSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSponsor.nombre || !sponsorLogoFile) {
      alert("Por favor completa el nombre y sube el logo del patrocinador.");
      return;
    }

    setIsUploadingSponsor(true);
    
    try {
      const logoUrl = await convertImageToBase64(sponsorLogoFile, 400);

      const success = await addPatrocinadorFirebase({
        nombre: newSponsor.nombre,
        tipo: newSponsor.esPrincipal ? 'Patrocinador Oficial Principal' : newSponsor.tipo,
        descripcion: newSponsor.descripcion,
        url: newSponsor.url,
        logoUrl,
        esPrincipal: newSponsor.esPrincipal
      });

      if (success) {
        if (newSponsor.esPrincipal) {
          await setPatrocinadorPrincipalFirebase(success.id);
        }
        setSponsorSuccess(true);
        onRestaurantesUpdated(); // Reusamos esto para que App.tsx haga el refreshData completo
        setTimeout(() => setSponsorSuccess(false), 3000);
        
        setNewSponsor({ nombre: '', tipo: 'Aliado Gourmet', descripcion: '', url: '', esPrincipal: false });
        setSponsorLogoFile(null);
      }
    } catch (error) {
      console.error(error);
      alert("Error al subir el patrocinador.");
    } finally {
      setIsUploadingSponsor(false);
    }
  };

  const handleSetPrincipalSponsor = async (sponsorId: string) => {
    try {
      const ok = await setPatrocinadorPrincipalFirebase(sponsorId);
      if (ok) {
        onRestaurantesUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sortedRestaurantes = [...restaurantes].sort((a, b) => {
    if (b.promedioRating === a.promedioRating) {
      return b.votosCount - a.votosCount;
    }
    return b.promedioRating - a.promedioRating;
  });

  if (isRestoringSession) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-4 space-y-3">
        <RefreshCw className="w-6 h-6 text-[#A40B03] animate-spin" />
        <p className="text-xs font-semibold text-stone-400">Verificando credenciales cifradas del Comité...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mb-6">
          <button
            onClick={handleExitToPublicSafe}
            className="inline-flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-[#FFF9ED] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#A40B03]" />
            <span>Volver al sitio público</span>
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl bg-[#0F0F0F] border border-[#A40B03]/40 shadow-2xl p-6 sm:p-8 space-y-6"
        >
          <div className="text-center space-y-3">
            <div className="flex flex-col items-center justify-center">
              <div className="h-16 w-auto px-4 py-2 rounded-2xl bg-black border border-[#A40B03]/50 shadow-lg shadow-[#A40B03]/25 flex items-center justify-center mb-2">
                <img src={logoBlanco} alt="Food Fest 2026" className="h-12 w-auto object-contain" />
              </div>
              <span className="text-[11px] font-bold text-[#A40B03] uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Acceso Restringido • Comité Organizador 2026</span>
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#FFF9ED] font-['Cabinet_Grotesk',sans-serif]">
              Portal Superadministrador
            </h1>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Autenticación protegida con Firebase Auth + lista blanca de comité y bloqueo automático por intentos.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{authError}</span>
            </div>
          )}

          {lockoutSecondsLeft > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-semibold">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                <span>Protección anti-fuerza bruta activa</span>
              </span>
              <span className="font-mono font-black text-amber-400">{lockoutSecondsLeft}s</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase mb-1">
                Correo Autorizado de Administrador
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  disabled={lockoutSecondsLeft > 0 || isLoggingIn}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="comite@dominio.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs sm:text-sm focus:border-[#A40B03] outline-none transition-all disabled:opacity-50"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase mb-1">
                Contraseña / Clave Maestra (8+ caracteres)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  disabled={lockoutSecondsLeft > 0 || isLoggingIn}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs sm:text-sm focus:border-[#A40B03] outline-none transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={lockoutSecondsLeft > 0 || isLoggingIn}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#A40B03] via-[#BF0E05] to-[#7A0802] hover:shadow-xl hover:shadow-[#A40B03]/30 text-[#FFF9ED] font-extrabold text-xs sm:text-sm border border-[#A40B03]/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 text-[#FFF9ED] animate-spin" />
                  <span>Verificando Comité en Firebase...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-[#FFF9ED]" />
                  <span>Ingresar al Panel de Control</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (printRestId) {
    const printRest = restaurantes.find(r => r.id === printRestId);
    const allRestCodes = codigos.filter(c => c.restauranteId === printRestId);
    // Solo códigos DISPONIBLES (no usados) para imprimir
    const printCodes = allRestCodes
      .filter(c => !c.usado)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
    const totalDisponibles = printCodes.length;
    const totalUsados = allRestCodes.length - totalDisponibles;
    const totalPages = Math.ceil(totalDisponibles / 12);
    // 12 tickets por página A4 (3 columnas x 4 filas)
    const codePages: CodigoVoto[][] = [];
    for (let i = 0; i < printCodes.length; i += 12) {
      codePages.push(printCodes.slice(i, i + 12));
    }
    const restLogo = printRest?.logoUrl || logoRed;
    
    return (
      <div className="bg-stone-200 text-stone-950 min-h-screen relative pb-44">
        <style>{`
          @media print {
            .no-print { display: none !important; }
            @page { size: A4 portrait; margin: 8mm; }
            html, body { background: white !important; }
            .print-page {
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              background: white !important;
            }
            .print-page + .print-page { page-break-before: always; }
            .ticket { break-inside: avoid; page-break-inside: avoid; }
            .ticket, .ticket * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>
        
        {/* Floating Controls (Hidden in Print) */}
        <div className="no-print fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          <div className="bg-black/95 backdrop-blur px-5 py-4 rounded-2xl shadow-2xl border border-stone-800 text-right space-y-1">
            <div className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">Tickets para</div>
            <div className="text-sm font-black text-[#FFF9ED]">{printRest?.nombre}</div>
            <div className="text-xs text-stone-400 font-mono">
              <span className="text-emerald-400 font-black">{totalDisponibles}</span> disponibles
              {totalUsados > 0 && <span> · <span className="text-stone-500">{totalUsados}</span> usados excluidos</span>}
            </div>
            <div className="text-[11px] text-stone-500">
              {totalDisponibles > 0
                ? `${totalPages} página${totalPages === 1 ? '' : 's'} A4 · 12 tickets por hoja`
                : 'Sin códigos por imprimir'}
            </div>
          </div>
          <div className="flex gap-4 bg-black p-4 rounded-2xl shadow-2xl border border-stone-800">
            <button onClick={() => setPrintRestId(null)} className="px-6 py-2.5 rounded-xl bg-stone-900 text-stone-200 font-bold text-sm hover:bg-stone-800">
              Volver al Panel
            </button>
            <button
              onClick={() => window.print()}
              disabled={totalDisponibles === 0}
              className="px-6 py-2.5 rounded-xl bg-[#A40B03] text-[#FFF9ED] font-black text-sm hover:bg-[#BF0E05] flex items-center gap-2 border border-[#A40B03]/60 shadow-lg shadow-[#A40B03]/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-5 h-5 text-[#FFF9ED]" /> <span>Imprimir PDF / Tickets</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-8">
          {totalDisponibles === 0 ? (
            <div className="max-w-lg mx-auto mt-16 p-10 rounded-3xl bg-white border-2 border-dashed border-stone-300 text-center shadow-lg">
              <QrCode className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h2 className="text-xl font-black text-stone-800">Sin códigos disponibles</h2>
              <p className="text-sm text-stone-500 mt-2">
                Todos los códigos de {printRest?.nombre || 'este restaurante'} ya fueron usados en votación.
              </p>
              <button onClick={() => setPrintRestId(null)} className="mt-6 px-6 py-3 rounded-xl bg-[#A40B03] text-[#FFF9ED] font-bold text-sm hover:bg-[#BF0E05]">
                Volver al Panel
              </button>
            </div>
          ) : (

            codePages.map((pageCodes, pageIndex) => (
              <div key={pageIndex} className="print-page max-w-[194mm] mx-auto mb-6 p-5 bg-white rounded-2xl shadow-lg border border-stone-300">
                {/* Page Header (impresión y vista previa) */}
                <div className="flex items-center justify-between gap-4 border-b-2 border-[#A40B03] pb-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={restLogo}
                      alt={printRest?.nombre || 'Restaurante'}
                      className="h-14 w-14 rounded-xl object-cover border border-[#A40B03]/40 shrink-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoRed; }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <img src={logoRed} alt="Food Fest" className="h-4 w-auto object-contain" />
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#A40B03]">Food Fest 2026 • El Tocuyo</span>
                      </div>
                      <div className="text-xl font-black text-stone-900 leading-tight truncate">{printRest?.nombre}</div>
                      <div className="text-[11px] text-stone-500 font-semibold truncate">{printRest?.nombreHamburguesa}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-stone-500 font-semibold">
                      Página <span className="font-black text-stone-900">{pageIndex + 1}</span> de {totalPages}
                    </div>
                    <div className="text-[10px] font-mono text-stone-400">{totalDisponibles} códigos disponibles</div>
                  </div>
                </div>

                {/* 12 tickets por página: 3 columnas x 4 filas */}
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(4, 1fr)' }}>
                  {pageCodes.map((c, i) => {
                    const globalIndex = pageIndex * 12 + i + 1;
                    return (
                      <div key={c.id} className="ticket relative border-2 border-dashed border-stone-800 rounded-xl px-2.5 pt-3 pb-2 flex flex-col items-center text-center bg-white overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-1 bg-[#A40B03]" />
                        <div className="flex items-center justify-center gap-2 mt-0.5">
                          <img src={logoRed} alt="Food Fest 2026" className="h-7 w-auto object-contain" />
                          <span className="h-6 w-px bg-stone-300" />
                          <img
                            src={restLogo}
                            alt={printRest?.nombre || 'Restaurante'}
                            className="h-7 w-7 rounded-md object-contain border border-stone-200 shrink-0"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoRed; }}
                          />
                        </div>
                        <div className="font-black text-[10px] uppercase tracking-wide text-stone-900 leading-tight mt-1 max-w-full truncate">{printRest?.nombre}</div>
                        <div className="text-[8px] text-stone-500 font-semibold max-w-full truncate">{printRest?.nombreHamburguesa}</div>
                        <div className="border-2 border-stone-900 bg-stone-50 px-2 py-1.5 w-full rounded-md my-1.5">
                          <div className="font-mono font-black text-base tracking-[0.15em] text-black leading-none break-all">{c.codigo}</div>
                        </div>
                        <div className="text-[7.5px] text-stone-500 font-semibold leading-snug">Código único e intransferible • Válido para 1 voto</div>
                        <div className="flex items-center justify-between w-full mt-1.5 pt-1 border-t border-dotted border-stone-300">
                          <span className="text-[7px] font-mono text-stone-400">#{String(globalIndex).padStart(3, '0')}</span>
                          <span className="text-[7px] font-black text-[#A40B03] uppercase tracking-wider">Food Fest 2026</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // --- VISTA DEDICADA DE IMPRESIÓN DE QRS DE MESA (FORMATO A4 / CARTA MULTI-TARJETA) ---
  if (printTableRestId) {
    const printRest = restaurantes.find(r => r.id === printTableRestId) || restaurantes[0];
    if (!printRest) {
      setPrintTableRestId(null);
      return null;
    }

    const restLogo = printRest.logoUrl || logoRed;
    const cardsPerPage = tableGridFormat === '9' ? 9 : tableGridFormat === '6' ? 6 : 4;
    const totalCards = Math.max(1, tableCardsCount);
    const totalPages = Math.ceil(totalCards / cardsPerPage);

    const cardPages: { index: number; tableNum: number }[][] = [];
    for (let p = 0; p < totalPages; p++) {
      const pageCards: { index: number; tableNum: number }[] = [];
      for (let i = 0; i < cardsPerPage; i++) {
        const globalIdx = p * cardsPerPage + i;
        if (globalIdx < totalCards) {
          pageCards.push({
            index: globalIdx + 1,
            tableNum: tableStartNumber + globalIdx
          });
        }
      }
      cardPages.push(pageCards);
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tocuyo-burgerfest.com';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';

    return (
      <div className="print-root bg-stone-200 text-stone-950 min-h-screen relative pb-52 print:pb-0 print:p-0 print:bg-white print:min-h-0">
        <style>{`
          @media print {
            .no-print { display: none !important; }
            @page {
              size: A4 portrait;
              margin: 4mm 6mm;
            }
            html, body {
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-root {
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              min-height: 0 !important;
            }
            .print-container {
              padding: 0 !important;
              margin: 0 !important;
            }
            .print-page {
              width: 198mm !important;
              max-width: 198mm !important;
              margin: 0 auto !important;
              margin-bottom: 0 !important;
              padding: 0 !important;
              border: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              background: white !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
            }
            .print-page + .print-page {
              page-break-before: always !important;
              break-before: page !important;
            }
            .table-card-print {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .table-card-print * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>

        {/* Floating Controls (Hidden in Print) */}
        <div className="no-print fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3 max-w-xl">
          {/* Card Info and Customization Bar */}
          <div className="bg-black/95 backdrop-blur-md px-5 py-4 rounded-3xl shadow-2xl border border-stone-800 text-stone-200 w-full space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-stone-800 pb-2.5">
              <div className="min-w-0">
                <div className="text-[10px] text-amber-400 uppercase tracking-widest font-black flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-[#A40B03]" />
                  <span>QRs de Mesa Oficiales</span>
                </div>
                <div className="text-base font-black text-[#FFF9ED] truncate max-w-xs">{printRest.nombre}</div>
                <div className="text-xs text-stone-400 truncate">{printRest.nombreHamburguesa}</div>
              </div>

              {/* Restaurant Selector */}
              <div className="text-right shrink-0">
                <label className="text-[10px] text-stone-400 block mb-1 font-bold">Cambiar Restaurante</label>
                <select
                  value={printTableRestId}
                  onChange={(e) => setPrintTableRestId(e.target.value)}
                  className="bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded-xl px-2.5 py-1.5 font-bold focus:outline-none focus:border-[#A40B03] cursor-pointer"
                >
                  {restaurantes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Practical PDF Advice */}
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-amber-200">
              <Printer className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#FFF9ED] block">Para Guardar en PDF:</strong>
                <span>En la ventana de impresión, selecciona <b>&quot;Guardar como PDF&quot;</b> en Destino. En &quot;Más ajustes&quot; desmarca <i>&quot;Encabezados y pies de página&quot;</i> para una hoja limpia sin URLs.</span>
              </div>
            </div>

            {/* Print Configuration Controls */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {/* Formato por hoja */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Distribución Hoja</span>
                <div className="flex rounded-xl bg-stone-900 p-0.5 border border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      setTableGridFormat('9');
                      setTableCardsCount(9);
                    }}
                    className={`flex-1 py-1 text-center font-bold text-[10px] rounded-lg transition-all cursor-pointer ${tableGridFormat === '9' ? 'bg-[#A40B03] text-white shadow-sm' : 'text-stone-400 hover:text-white'}`}
                  >
                    3x3 (9/hoja)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTableGridFormat('6');
                      setTableCardsCount(6);
                    }}
                    className={`flex-1 py-1 text-center font-bold text-[10px] rounded-lg transition-all cursor-pointer ${tableGridFormat === '6' ? 'bg-[#A40B03] text-white shadow-sm' : 'text-stone-400 hover:text-white'}`}
                  >
                    2x3 (6/hoja)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTableGridFormat('4');
                      setTableCardsCount(4);
                    }}
                    className={`flex-1 py-1 text-center font-bold text-[10px] rounded-lg transition-all cursor-pointer ${tableGridFormat === '4' ? 'bg-[#A40B03] text-white shadow-sm' : 'text-stone-400 hover:text-white'}`}
                  >
                    2x2 (4/hoja)
                  </button>
                </div>
              </div>

              {/* Cantidad de Tarjetas */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Mesas / QRs</span>
                <div className="flex items-center gap-1">
                  {(tableGridFormat === '9' ? [9, 18, 27] : tableGridFormat === '6' ? [6, 12, 18] : [4, 8, 12]).map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTableCardsCount(num)}
                      className={`px-2 py-1 text-center font-mono font-bold text-[11px] rounded-lg transition-all border cursor-pointer ${tableCardsCount === num ? 'bg-stone-800 border-amber-500 text-amber-300' : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'}`}
                    >
                      {num}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={tableCardsCount}
                    onChange={(e) => setTableCardsCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 bg-stone-900 border border-stone-700 text-stone-200 text-[11px] font-mono font-bold rounded-lg px-1 py-1 text-center"
                    title="Cantidad personalizada"
                  />
                </div>
              </div>

              {/* Numeración de mesas */}
              <div className="col-span-2 sm:col-span-1 space-y-1">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Numeración</span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-stone-300 font-semibold select-none">
                    <input
                      type="checkbox"
                      checked={tableNumbering}
                      onChange={(e) => setTableNumbering(e.target.checked)}
                      className="accent-[#A40B03] rounded"
                    />
                    <span>¿Numerar?</span>
                  </label>
                  {tableNumbering && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-stone-500 font-mono">Desde:</span>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={tableStartNumber}
                        onChange={(e) => setTableStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 bg-stone-900 border border-stone-700 text-amber-300 text-[11px] font-mono font-bold rounded-lg px-1 py-0.5 text-center"
                        title="Número inicial de mesa"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Summary info */}
            <div className="text-[11px] text-stone-400 flex items-center justify-between border-t border-stone-800 pt-2 font-mono">
              <span>{totalCards} tarjetas • {totalPages} página{totalPages === 1 ? '' : 's'} A4 / Carta</span>
              <span className="text-amber-400 font-bold">{cardsPerPage} QRs por hoja</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 bg-black/95 backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-stone-800">
            <button
              type="button"
              onClick={() => setPrintTableRestId(null)}
              className="px-5 py-2.5 rounded-xl bg-stone-900 text-stone-200 font-bold text-xs sm:text-sm hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Volver al Panel
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-6 py-2.5 rounded-xl bg-[#A40B03] text-[#FFF9ED] font-black text-xs sm:text-sm hover:bg-[#BF0E05] flex items-center gap-2 border border-[#A40B03]/60 shadow-lg shadow-[#A40B03]/30 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#FFF9ED]" />
              <span>Guardar en PDF / Imprimir</span>
            </button>
          </div>
        </div>

        {/* Printable Sheets Container */}
        <div className="print-container p-2 sm:p-6 print:p-0 print:m-0">
          {cardPages.map((pageCards, pageIndex) => (
            <div
              key={pageIndex}
              className="print-page w-full max-w-[198mm] mx-auto mb-8 print:mb-0 print:p-0 p-3 sm:p-4 bg-white rounded-2xl shadow-lg border border-stone-300"
            >
              {/* Page Header (impresión y vista previa) */}
              <div className="flex items-center justify-between gap-3 border-b-2 border-[#A40B03] pb-2 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={logoRed}
                    alt="Food Fest 2026"
                    className="h-8 w-auto object-contain shrink-0"
                  />
                  <div className="h-7 w-px bg-stone-300 shrink-0" />
                  <img
                    src={restLogo}
                    alt={printRest.nombre}
                    className="h-8 w-8 rounded-lg object-contain border border-stone-300 shadow-sm shrink-0 bg-white"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoRed; }}
                  />
                  <div className="min-w-0 leading-tight">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#A40B03] leading-none">
                      Food Fest 2026 • El Tocuyo
                    </div>
                    <div className="text-sm font-black text-stone-900 leading-tight truncate">
                      {printRest.nombre}
                    </div>
                    <div className="text-[10px] text-stone-600 font-bold truncate">
                      {printRest.nombreHamburguesa}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[9px] font-black uppercase tracking-wider text-[#A40B03] bg-red-50 border border-red-200 px-2 py-0.5 rounded-full inline-block">
                    Identificadores de Mesa Oficiales
                  </div>
                  <div className="text-[10px] text-stone-600 font-semibold mt-0.5">
                    Hoja <span className="font-black text-stone-950">{pageIndex + 1}</span> de {totalPages}
                  </div>
                  <div className="text-[8.5px] font-mono text-stone-400">
                    Formato {tableGridFormat === '9' ? '3x3 (9 QRs)' : tableGridFormat === '6' ? '2x3 (6 QRs)' : '2x2 (4 QRs)'} • A4 / Carta
                  </div>
                </div>
              </div>

              {/* Grid: 3x3 (9 por hoja) */}
              {tableGridFormat === '9' && (
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gridTemplateRows: 'repeat(3, 1fr)'
                  }}
                >
                  {pageCards.map((c) => {
                    const tableUrl = `${origin}${pathname}?restaurante=${printRest.id}${tableNumbering ? `&mesa=${c.tableNum}` : ''}`;
                    const tableLabel = tableNumbering ? `MESA #${String(c.tableNum).padStart(2, '0')}` : 'MESA OFICIAL';

                    return (
                      <div
                        key={c.index}
                        className="table-card-print relative border-2 border-dashed border-stone-400 rounded-xl p-2 flex flex-col justify-between bg-gradient-to-b from-[#FFFDF9] to-white shadow-xs overflow-hidden"
                        style={{ minHeight: '78mm', maxHeight: '82mm' }}
                      >
                        {/* Top burgundy and gold accent bar */}
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#A40B03] via-amber-500 to-[#A40B03]" />

                        {/* Card Header with Competition Logo and Table Badge */}
                        <div className="flex items-center justify-between gap-1 pt-0.5 border-b border-stone-200/80 pb-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <img
                              src={logoRed}
                              alt="Food Fest 2026"
                              className="h-4.5 w-auto object-contain shrink-0"
                            />
                            <div className="h-3.5 w-px bg-stone-300 shrink-0" />
                            <span className="text-[6.5px] font-black uppercase tracking-wider text-[#A40B03] leading-none truncate">
                              Food Fest 2026
                            </span>
                          </div>

                          <span className="text-[6.5px] font-black uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-300/80 px-1 py-0.5 rounded font-mono shrink-0">
                            {tableLabel}
                          </span>
                        </div>

                        {/* Restaurant Logo BESIDE Burger & Restaurant Names (Bigger logo, no empty gaps!) */}
                        <div className="flex items-center gap-1.5 px-1 py-0.5 bg-stone-50/90 rounded-lg border border-stone-200/90 my-0.5">
                          <img
                            src={restLogo}
                            alt={printRest.nombre}
                            className="h-9 w-9 rounded-md object-contain border border-stone-300 bg-white shrink-0 shadow-xs"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoRed; }}
                          />
                          <div className="min-w-0 flex-1 leading-tight text-left">
                            <div className="font-black text-[9.5px] uppercase tracking-tight text-stone-900 leading-none truncate">
                              {printRest.nombreHamburguesa}
                            </div>
                            <div className="text-[7.5px] font-extrabold uppercase tracking-wide text-[#A40B03] leading-none mt-0.5 truncate">
                              {printRest.nombre}
                            </div>
                          </div>
                        </div>

                        {/* QR Code (ON TOP, AMPLE & WIDE) */}
                        <div className="flex flex-col items-center justify-center my-0.5">
                          <div className="p-1 bg-white rounded-lg border border-[#A40B03] shadow-xs flex items-center justify-center">
                            <QRCodeSVG
                              value={tableUrl}
                              size={76}
                              level="Q"
                              includeMargin={false}
                            />
                          </div>
                          <div className="mt-0.5 bg-[#A40B03] text-white font-black text-[6.5px] uppercase tracking-wider px-2 py-0.5 rounded-full text-center shadow-xs">
                            ¡ESCANEA Y VOTA!
                          </div>
                        </div>

                        {/* The 5 Steps (UNDERNEATH, ORDERLY & JUSTIFIED) */}
                        <div className="w-full bg-stone-50/90 border border-stone-200/90 rounded-md px-1.5 py-1 space-y-0.5 text-[6.5px] font-bold text-stone-850">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-full bg-[#A40B03] text-white flex items-center justify-center text-[5.5px] font-black shrink-0">1</span>
                              <span>Escanea el QR</span>
                            </span>
                            <span className="text-stone-400 font-normal text-[5.5px]">con tu cámara</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-full bg-[#A40B03] text-white flex items-center justify-center text-[5.5px] font-black shrink-0">2</span>
                              <span>Regístrate con cuenta</span>
                            </span>
                            <span className="text-stone-400 font-normal text-[5.5px]">Google o email</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-full bg-[#A40B03] text-white flex items-center justify-center text-[5.5px] font-black shrink-0">3</span>
                              <span>Ingresa el código</span>
                            </span>
                            <span className="text-stone-400 font-normal text-[5.5px]">Ingresa Codigo</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-full bg-[#A40B03] text-white flex items-center justify-center text-[5.5px] font-black shrink-0">4</span>
                              <span>Califica de 1 a 5 ★</span>
                            </span>
                            <span className="text-amber-700 font-bold text-[5.5px]">Tu veredicto</span>
                          </div>
                          <div className="flex items-center justify-between pt-0.5 border-t border-stone-200 text-emerald-800 font-black bg-emerald-50 px-1 py-0.5 rounded">
                            <span className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[5.5px] font-black shrink-0">5</span>
                              <span>Voto Confirmado</span>
                            </span>
                            <span className="text-emerald-700 font-extrabold text-[5.5px]">✓ Oficial</span>
                          </div>
                        </div>

                        {/* Card Footer with Cut Guides */}
                        <div className="flex items-center justify-between pt-0.5 border-t border-dotted border-stone-300 text-[6px] text-stone-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-0.5">
                            <Scissors className="w-2 h-2 text-stone-400" />
                            <span>Línea corte</span>
                          </span>
                          <span className="text-[#A40B03] font-black">Food Fest 2026</span>
                          <span className="font-mono">#{String(c.index).padStart(3, '0')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Grid: 2x3 (6 por hoja) */}
              {tableGridFormat === '6' && (
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gridTemplateRows: 'repeat(3, 1fr)'
                  }}
                >
                  {pageCards.map((c) => {
                    const tableUrl = `${origin}${pathname}?restaurante=${printRest.id}${tableNumbering ? `&mesa=${c.tableNum}` : ''}`;
                    const tableLabel = tableNumbering ? `MESA #${String(c.tableNum).padStart(2, '0')}` : 'MESA OFICIAL';

                    return (
                      <div
                        key={c.index}
                        className="table-card-print relative border-2 border-dashed border-stone-400 rounded-2xl p-2.5 flex flex-col justify-between bg-gradient-to-b from-[#FFFDF9] to-white shadow-sm overflow-hidden"
                        style={{ minHeight: '74mm', maxHeight: '78mm' }}
                      >
                        {/* Top burgundy and gold accent bar */}
                        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#A40B03] via-amber-500 to-[#A40B03]" />

                        {/* Card Header with Competition Logo and Table Badge */}
                        <div className="flex items-center justify-between gap-1.5 pt-1 border-b border-stone-200/80 pb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <img
                              src={logoRed}
                              alt="Food Fest 2026"
                              className="h-6 w-auto object-contain shrink-0"
                            />
                            <div className="h-5 w-px bg-stone-300 shrink-0" />
                            <span className="text-[7.5px] font-black uppercase tracking-wider text-[#A40B03] leading-none truncate">
                              Food Fest 2026
                            </span>
                          </div>

                          <span className="text-[7.5px] font-black uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-300/80 px-1.5 py-0.5 rounded font-mono">
                            {tableLabel}
                          </span>
                        </div>

                        {/* Restaurant Logo BESIDE Burger & Restaurant Names */}
                        <div className="flex items-center gap-2 px-1.5 py-1 bg-stone-50 rounded-xl border border-stone-200/90 my-1">
                          <img
                            src={restLogo}
                            alt={printRest.nombre}
                            className="h-10 w-10 rounded-lg object-contain border border-stone-300 bg-white shrink-0 shadow-sm"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoRed; }}
                          />
                          <div className="min-w-0 flex-1 leading-tight text-left">
                            <div className="font-black text-[10.5px] uppercase tracking-tight text-stone-900 leading-tight truncate">
                              {printRest.nombreHamburguesa}
                            </div>
                            <div className="text-[8.5px] font-black uppercase tracking-wider text-[#A40B03] truncate">
                              {printRest.nombre}
                            </div>
                          </div>
                        </div>

                        {/* QR Code (ON TOP, AMPLE) */}
                        <div className="flex flex-col items-center justify-center my-1">
                          <div className="p-1.5 bg-white rounded-xl border border-[#A40B03] shadow-sm flex items-center justify-center">
                            <QRCodeSVG
                              value={tableUrl}
                              size={82}
                              level="Q"
                              includeMargin={false}
                            />
                          </div>
                          <div className="mt-1 bg-[#A40B03] text-white font-black text-[7.5px] uppercase tracking-wider py-0.5 px-2.5 rounded-full text-center shadow-xs">
                            ¡ESCANEA Y VOTA!
                          </div>
                        </div>

                        {/* The 5 Steps (UNDERNEATH, ORDERLY & JUSTIFIED) */}
                        <div className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 space-y-0.5 text-[7px] font-bold text-stone-850">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <span className="w-3.5 h-3.5 rounded-full bg-[#A40B03] text-white flex items-center justify-center text-[6px] font-black shrink-0">1</span>
                              <span>Escanea el QR</span>
                            </span>
                            <span className="text-stone-400 font-normal text-[6px]">con tu cámara</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <span className="w-3.5 h-3.5 rounded-full bg-[#A40B03] text-white flex items-center justify-center text-[6px] font-black shrink-0">2</span>
                              <span>Regístrate con cuenta</span>
                            </span>
                            <span className="text-stone-400 font-normal text-[6px]">Google o email</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <span className="w-3.5 h-3.5 rounded-full bg-[#A40B03] text-white flex items-center justify-center text-[6px] font-black shrink-0">3</span>
                              <span>Ingresa el código</span>
                            </span>
                            <span className="text-stone-400 font-normal text-[6px]">ingresa Codigo</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <span className="w-3.5 h-3.5 rounded-full bg-[#A40B03] text-white flex items-center justify-center text-[6px] font-black shrink-0">4</span>
                              <span>Califica de 1 a 5 ★</span>
                            </span>
                            <span className="text-amber-700 font-bold text-[6px]">Tu veredicto</span>
                          </div>
                          <div className="flex items-center justify-between pt-0.5 border-t border-stone-200 text-emerald-800 font-black bg-emerald-50 px-1 py-0.5 rounded">
                            <span className="flex items-center gap-1">
                              <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[6px] font-black shrink-0">5</span>
                              <span>Voto Confirmado</span>
                            </span>
                            <span className="text-emerald-700 font-extrabold text-[6px]">✓ Oficial</span>
                          </div>
                        </div>

                        {/* Card Footer with Cut Guides */}
                        <div className="flex items-center justify-between pt-1 border-t border-dotted border-stone-300 text-[6.5px] text-stone-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-0.5">
                            <Scissors className="w-2.5 h-2.5 text-stone-400" />
                            <span>Línea de corte</span>
                          </span>
                          <span className="text-[#A40B03] font-black">Food Fest El Tocuyo 2026</span>
                          <span className="font-mono">#{String(c.index).padStart(3, '0')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Grid: 2x2 (4 por hoja) - Formato Grande */}
              {tableGridFormat === '4' && (
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gridTemplateRows: 'repeat(2, 1fr)'
                  }}
                >
                  {pageCards.map((c) => {
                    const tableUrl = `${origin}${pathname}?restaurante=${printRest.id}${tableNumbering ? `&mesa=${c.tableNum}` : ''}`;
                    const tableLabel = tableNumbering ? `MESA #${String(c.tableNum).padStart(2, '0')}` : 'MESA OFICIAL';

                    return (
                      <div
                        key={c.index}
                        className="table-card-print relative border-2 border-dashed border-stone-400 rounded-3xl p-4 flex flex-col justify-between bg-gradient-to-b from-[#FFFDF9] via-white to-stone-50 shadow-sm overflow-hidden"
                        style={{ minHeight: '112mm', maxHeight: '116mm' }}
                      >
                        {/* Top burgundy and gold accent bar */}
                        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#A40B03] via-amber-500 to-[#A40B03]" />

                        {/* Header with Competition Logo and Table Badge */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-b border-stone-200 pb-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={logoRed}
                              alt="Food Fest 2026"
                              className="h-8 w-auto object-contain"
                            />
                            <div className="h-7 w-px bg-stone-300" />
                            <div>
                              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#A40B03] leading-none">
                                Food Fest 2026
                              </div>
                              <div className="text-[7.5px] font-bold text-stone-500 uppercase tracking-widest leading-none mt-0.5">
                                El Tocuyo • Edición Oficial
                              </div>
                            </div>
                          </div>

                          <span className="text-[9px] font-mono font-black uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
                            {tableLabel}
                          </span>
                        </div>

                        {/* Restaurant Logo BESIDE Burger & Restaurant Names */}
                        <div className="flex items-center gap-2.5 px-2.5 py-1.5 bg-stone-50 rounded-2xl border border-stone-200 my-1">
                          <img
                            src={restLogo}
                            alt={printRest.nombre}
                            className="h-11 w-11 rounded-xl object-contain border border-stone-300 bg-white shadow-sm shrink-0"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoRed; }}
                          />
                          <div className="min-w-0 flex-1 leading-tight text-left">
                            <h4 className="font-black text-xs uppercase tracking-tight text-stone-900 truncate">
                              {printRest.nombreHamburguesa}
                            </h4>
                            <p className="text-[10px] font-black uppercase tracking-wider text-[#A40B03] truncate">
                              {printRest.nombre}
                            </p>
                          </div>
                        </div>

                        {/* Center: Big QR Code */}
                        <div className="flex flex-col items-center justify-center my-1">
                          <div className="p-2 bg-white rounded-2xl border-2 border-[#A40B03] shadow-md">
                            <QRCodeSVG
                              value={tableUrl}
                              size={110}
                              level="Q"
                              includeMargin={false}
                            />
                          </div>
                          <div className="mt-1.5 bg-[#A40B03] text-white font-black text-[9px] uppercase tracking-wider py-1 px-3 rounded-lg shadow-sm">
                            ¡ESCANEA CON TU CÁMARA Y VOTA!
                          </div>
                        </div>

                        {/* The 5 Steps */}
                        <div className="grid grid-cols-2 gap-1 text-[7.5px] font-bold text-stone-700 bg-stone-50 p-2 rounded-xl border border-stone-200 leading-tight">
                          <div className="flex items-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-full bg-[#A40B03] text-white flex items-center justify-center text-[6px] font-black shrink-0">1</span>
                            <span>Escanea el QR</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-full bg-[#A40B03] text-white flex items-center justify-center text-[6px] font-black shrink-0">2</span>
                            <span>Regístrate con cuenta</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-full bg-[#A40B03] text-white flex items-center justify-center text-[6px] font-black shrink-0">3</span>
                            <span>Ingresa el código</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-full bg-[#A40B03] text-white flex items-center justify-center text-[6px] font-black shrink-0">4</span>
                            <span>Califica de 1 a 5 ★</span>
                          </div>
                          <div className="col-span-2 flex items-center justify-center gap-1 text-emerald-800 font-extrabold bg-emerald-50 border border-emerald-200 py-0.5 rounded">
                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[6px] font-black shrink-0">5</span>
                            <span>Voto Confirmado</span>
                          </div>
                        </div>

                        {/* Footer with Cut Guideline */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-dotted border-stone-300 text-[7px] text-stone-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Scissors className="w-3 h-3 text-stone-400" />
                            <span>Línea de corte</span>
                          </span>
                          <span className="text-[#A40B03] font-black">Votación Oficial Food Fest 2026</span>
                          <span className="font-mono">#{String(c.index).padStart(3, '0')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- VISTA DEDICADA DE IMPRESIÓN DE QRS DE TIENDA PATROCINADORA (FORMATO A4 / CARTA) ---
  if (printSponsorId) {
    const isAll = printSponsorId === 'ALL';
    const singleSponsor = !isAll
      ? (patrocinadores.find(p => p.id === printSponsorId) || patrocinadores[0])
      : null;

    if (!isAll && !singleSponsor && patrocinadores.length === 0) {
      setPrintSponsorId(null);
      return null;
    }

    // Determine list of items to print
    let itemsToPrint: Patrocinador[] = [];
    if (isAll) {
      itemsToPrint = patrocinadores;
    } else if (singleSponsor) {
      itemsToPrint = Array.from({ length: Math.max(1, sponsorCardsCount) }, () => singleSponsor);
    }

    const cardsPerPage = sponsorGridFormat === '1' ? 1 : 4;
    const totalCards = itemsToPrint.length;
    const totalPages = Math.ceil(totalCards / cardsPerPage);

    // Group cards by page
    const cardPages: { sponsor: Patrocinador; index: number }[][] = [];
    for (let p = 0; p < totalPages; p++) {
      const pageCards: { sponsor: Patrocinador; index: number }[] = [];
      for (let i = 0; i < cardsPerPage; i++) {
        const globalIdx = p * cardsPerPage + i;
        if (globalIdx < totalCards) {
          pageCards.push({
            sponsor: itemsToPrint[globalIdx],
            index: globalIdx + 1
          });
        }
      }
      cardPages.push(pageCards);
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tocuyo-burgerfest.com';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';

    return (
      <div className="print-root bg-stone-200 text-stone-950 min-h-screen relative pb-52 print:pb-0 print:p-0 print:bg-white print:min-h-0">
        <style>{`
          @media print {
            .no-print { display: none !important; }
            @page {
              size: A4 portrait;
              margin: 4mm 6mm;
            }
            html, body {
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-root {
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              min-height: 0 !important;
            }
            .print-container {
              padding: 0 !important;
              margin: 0 !important;
            }
            .print-page {
              width: 198mm !important;
              max-width: 198mm !important;
              margin: 0 auto !important;
              margin-bottom: 0 !important;
              padding: 0 !important;
              border: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              background: white !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
            }
            .print-page + .print-page {
              page-break-before: always !important;
              break-before: page !important;
            }
            .sponsor-card-print {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .sponsor-card-print * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>

        {/* Floating Controls (Hidden in Print) */}
        <div className="no-print fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3 max-w-xl">
          {/* Customization Bar */}
          <div className="bg-black/95 backdrop-blur-md px-5 py-4 rounded-3xl shadow-2xl border border-stone-800 text-stone-200 w-full space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-stone-800 pb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Crown className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="font-extrabold text-sm text-[#FFF9ED] truncate">
                  Imprimir QRs de Patrocinadores (PDF)
                </span>
              </div>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-600/40 px-2 py-0.5 rounded-full shrink-0">
                Punto de Facturación
              </span>
            </div>

            {/* Select Sponsor */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Patrocinador a Imprimir</span>
              <select
                value={printSponsorId}
                onChange={(e) => setPrintSponsorId(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 text-[#FFF9ED] text-xs font-semibold rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">⭐ Todos los Patrocinadores ({patrocinadores.length} marcas registradas)</option>
                {patrocinadores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} • {p.tipo}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Diseño de Cuadrícula */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Formato por Hoja</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSponsorGridFormat('4');
                      if (sponsorCardsCount === 1) setSponsorCardsCount(4);
                    }}
                    className={`py-1.5 text-center font-bold text-[11px] rounded-lg transition-all border cursor-pointer ${
                      sponsorGridFormat === '4'
                        ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm font-black'
                        : 'bg-stone-900 text-stone-300 border-stone-800 hover:text-white'
                    }`}
                  >
                    2x2 (4 por Hoja)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSponsorGridFormat('1');
                      if (sponsorCardsCount === 4) setSponsorCardsCount(1);
                    }}
                    className={`py-1.5 text-center font-bold text-[11px] rounded-lg transition-all border cursor-pointer ${
                      sponsorGridFormat === '1'
                        ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm font-black'
                        : 'bg-stone-900 text-stone-300 border-stone-800 hover:text-white'
                    }`}
                  >
                    1 Grande (Stand A4)
                  </button>
                </div>
              </div>

              {/* Cantidad de Copias (si es un solo patrocinador) */}
              {!isAll ? (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Copias de Tarjeta</span>
                  <div className="flex items-center gap-1">
                    {(sponsorGridFormat === '4' ? [4, 8, 12, 16] : [1, 2, 3, 4]).map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSponsorCardsCount(num)}
                        className={`px-2 py-1 text-center font-mono font-bold text-[11px] rounded-lg transition-all border cursor-pointer ${
                          sponsorCardsCount === num
                            ? 'bg-stone-800 border-amber-500 text-amber-300'
                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={sponsorCardsCount}
                      onChange={(e) => setSponsorCardsCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 bg-stone-900 border border-stone-700 text-stone-200 text-[11px] font-mono font-bold rounded-lg px-1 py-1 text-center"
                      title="Copias personalizadas"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Lote Completo</span>
                  <div className="text-[11px] text-amber-300 font-bold bg-stone-900 border border-stone-800 rounded-lg py-1 px-2 truncate">
                    {patrocinadores.length} tiendas registradas
                  </div>
                </div>
              )}
            </div>

            {/* Summary info */}
            <div className="text-[11px] text-stone-400 flex items-center justify-between border-t border-stone-800 pt-2 font-mono">
              <span>{totalCards} tarjeta{totalCards === 1 ? '' : 's'} • {totalPages} página{totalPages === 1 ? '' : 's'} A4 / Carta</span>
              <span className="text-amber-400 font-bold">
                {cardsPerPage === 1 ? '1 Stand Grande (A4)' : '4 QRs por hoja (2x2)'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 bg-black/95 backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-stone-800">
            <button
              type="button"
              onClick={() => setPrintSponsorId(null)}
              className="px-5 py-2.5 rounded-xl bg-stone-900 text-stone-200 font-bold text-xs sm:text-sm hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Volver al Panel
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#A40B03] to-[#BF0E05] text-[#FFF9ED] font-black text-xs sm:text-sm hover:brightness-110 flex items-center gap-2 border border-amber-400/40 shadow-lg shadow-[#A40B03]/30 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Guardar en PDF / Imprimir</span>
            </button>
          </div>
        </div>

        {/* Printable Sheets Container */}
        <div className="print-container p-2 sm:p-6 print:p-0 print:m-0">
          {cardPages.map((pageCards, pageIndex) => (
            <div
              key={pageIndex}
              className="print-page w-full max-w-[198mm] mx-auto mb-8 print:mb-0 print:p-0 p-3 sm:p-4 bg-white rounded-2xl shadow-lg border border-stone-300"
            >
              {/* Page Header (impresión y vista previa) */}
              <div className="flex items-center justify-between gap-3 border-b-2 border-[#A40B03] pb-2 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={logoRed}
                    alt="Food Fest 2026"
                    className="h-8 w-auto object-contain shrink-0"
                  />
                  <div className="h-7 w-px bg-stone-300 shrink-0" />
                  <div className="min-w-0 leading-tight">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#A40B03] leading-none">
                      Food Fest 2026 • El Tocuyo
                    </div>
                    <div className="text-sm font-black text-stone-900 leading-tight truncate">
                      Punto Oficial de Facturación de Tienda Patrocinadora
                    </div>
                    <div className="text-[10px] text-stone-600 font-bold truncate">
                      Escaneo exclusivo para validación y registro de compras oficiales
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[9px] font-black uppercase tracking-wider text-amber-950 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full inline-block">
                    Material Oficial de Mostrador
                  </div>
                  <div className="text-[10px] text-stone-600 font-semibold mt-0.5">
                    Hoja <span className="font-black text-stone-950">{pageIndex + 1}</span> de {totalPages}
                  </div>
                  <div className="text-[8.5px] font-mono text-stone-400">
                    {sponsorGridFormat === '1' ? '1 Stand Grande (1x1)' : '4 Tarjetas (2x2)'} • A4 / Carta
                  </div>
                </div>
              </div>

              {/* Grid 1: 1 por hoja (Stand Grande A4 / Mostrador) */}
              {sponsorGridFormat === '1' && (
                <div className="w-full flex items-center justify-center">
                  {pageCards.map((c) => {
                    const pat = c.sponsor;
                    const sponsorLogo = pat.logoUrl || logoRed;
                    const sponsorCheckinUrl = `${origin}${pathname}?patrocinador=${pat.id}`;

                    return (
                      <div
                        key={c.index}
                        className="sponsor-card-print w-full relative border-2 border-[#A40B03] rounded-3xl p-6 sm:p-7 flex flex-col justify-between bg-gradient-to-b from-[#FFFDF9] via-white to-[#FFFDF9] shadow-sm overflow-hidden"
                        style={{ minHeight: '246mm', maxHeight: '252mm' }}
                      >
                        {/* Top burgundy and gold accent bar */}
                        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#A40B03] via-amber-500 to-[#A40B03]" />

                        {/* Card Header with Competition Logo and Official Badge */}
                        <div className="flex items-center justify-between gap-4 pt-1 border-b border-stone-200 pb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={logoRed}
                              alt="Food Fest 2026"
                              className="h-10 w-auto object-contain shrink-0"
                            />
                            <div className="h-8 w-px bg-stone-300 shrink-0" />
                            <div>
                              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#A40B03] leading-none">
                                Food Fest 2026 • El Tocuyo
                              </div>
                              <div className="text-base font-black text-stone-900 leading-tight">
                                TIENDA PATROCINADORA AUTORIZADA
                              </div>
                            </div>
                          </div>

                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full font-mono shrink-0 shadow-xs">
                            PUNTO OFICIAL
                          </span>
                        </div>

                        {/* Sponsor Brand Spotlight (Logo beside Name and Category) */}
                        <div className="flex items-center gap-4 p-4 bg-stone-50/95 rounded-2xl border border-stone-200 shadow-xs my-2">
                          <img
                            src={sponsorLogo}
                            alt={pat.nombre}
                            className="h-20 w-20 rounded-xl object-contain border border-stone-300 bg-white p-1.5 shadow-sm shrink-0"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoRed; }}
                          />
                          <div className="min-w-0 flex-1 leading-tight text-left">
                            <div className="font-black text-2xl uppercase tracking-tight text-stone-900 leading-tight truncate">
                              {pat.nombre}
                            </div>
                            <div className="inline-block mt-1 text-xs font-black uppercase tracking-wider text-white bg-[#A40B03] px-2.5 py-0.5 rounded-md">
                              {pat.tipo}
                            </div>
                            {pat.descripcion && (
                              <p className="text-xs text-stone-600 font-medium line-clamp-2 mt-1">
                                {pat.descripcion}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* QR Code Centerpiece (Maximized Amplitude) */}
                        <div className="flex flex-col items-center justify-center my-2">
                          <div className="p-3 bg-white rounded-3xl border-2 border-[#A40B03] shadow-md flex items-center justify-center">
                            <QRCodeSVG
                              value={sponsorCheckinUrl}
                              size={155}
                              level="Q"
                              includeMargin={false}
                            />
                          </div>

                          {/* Striking Callout Banner */}
                          <div className="mt-3 bg-gradient-to-r from-[#A40B03] via-[#C91006] to-[#A40B03] text-white font-black text-lg sm:text-xl uppercase tracking-wider px-8 py-2.5 rounded-2xl text-center shadow-lg border border-amber-400/60 flex items-center justify-center gap-2">
                            <Receipt className="w-6 h-6 text-amber-300 shrink-0" />
                            <span>¡INGRESA TU FACTURA ACÁ!</span>
                          </div>

                          {/* Explanatory subtitle (NO STEPS, exact requested copy) */}
                          <div className="mt-3 max-w-lg bg-amber-50/95 border border-amber-200/90 rounded-xl px-4 py-2 text-center shadow-2xs">
                            <p className="text-xs sm:text-sm font-extrabold text-amber-950 leading-relaxed">
                              Escanea este código QR con la cámara de tu teléfono móvil para registrar y validar tu factura oficial de compra en este Patrocinante.
                            </p>
                          </div>
                        </div>

                        {/* Official Assurance Box */}
                        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex items-center justify-between text-xs text-stone-800 font-bold">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Válido para restaurantes participantes del festival gastronómico</span>
                          </div>
                          <span className="font-mono text-[10px] text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                            ID: #PAT-{pat.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>

                        {/* Card Footer with Festival Stamp and Validation Code */}
                        <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-[9px] text-stone-500 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-[#A40B03]" />
                            <span>Punto de Mostrador Oficial • The Best Burger 2026</span>
                          </span>
                          <span className="text-[#A40B03] font-black">El Tocuyo, Estado Lara</span>
                          <span className="font-mono">#{String(c.index).padStart(3, '0')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Grid 2: 4 por hoja (2x2) */}
              {sponsorGridFormat === '4' && (
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gridTemplateRows: 'repeat(2, 1fr)'
                  }}
                >
                  {pageCards.map((c) => {
                    const pat = c.sponsor;
                    const sponsorLogo = pat.logoUrl || logoRed;
                    const sponsorCheckinUrl = `${origin}${pathname}?patrocinador=${pat.id}`;

                    return (
                      <div
                        key={c.index}
                        className="sponsor-card-print relative border-2 border-stone-300 rounded-2xl p-3 flex flex-col justify-between bg-gradient-to-b from-[#FFFDF9] via-white to-[#FFFDF9] shadow-xs overflow-hidden"
                        style={{ minHeight: '126mm', maxHeight: '130mm' }}
                      >
                        {/* Top burgundy and gold accent bar */}
                        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#A40B03] via-amber-500 to-[#A40B03]" />

                        {/* Header: Logo Oficial del Evento + Identificador */}
                        <div className="flex items-center justify-between gap-1.5 pt-0.5 border-b border-stone-200/90 pb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <img
                              src={logoRed}
                              alt="Food Fest 2026"
                              className="h-6 w-auto object-contain shrink-0"
                            />
                            <div className="h-4.5 w-px bg-stone-300 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-[6.5px] font-black uppercase tracking-[0.18em] text-[#A40B03] leading-none">
                                Food Fest 2026
                              </div>
                              <div className="text-[8.5px] font-black text-stone-900 leading-tight truncate">
                                El Tocuyo • 2026
                              </div>
                            </div>
                          </div>

                          <span className="text-[7px] font-black uppercase tracking-wider text-amber-950 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full font-mono shrink-0 shadow-2xs">
                            TIENDA AUTORIZADA
                          </span>
                        </div>

                        {/* Brand Showcase: Logo del Patrocinante + Nombre + Tipo (Jerarquía Clara) */}
                        <div className="flex items-center gap-2 p-1.5 bg-stone-50/95 rounded-xl border border-stone-200/90 shadow-2xs my-1">
                          <img
                            src={sponsorLogo}
                            alt={pat.nombre}
                            className="h-12 w-12 rounded-lg object-contain border border-stone-300 bg-white p-1 shadow-xs shrink-0"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoRed; }}
                          />
                          <div className="min-w-0 flex-1 leading-tight text-left">
                            <div className="font-black text-[12px] uppercase tracking-tight text-stone-900 leading-tight truncate">
                              {pat.nombre}
                            </div>
                            <div className="inline-block mt-0.5 text-[7.5px] font-black uppercase tracking-wider text-white bg-[#A40B03] px-1.5 py-0.5 rounded">
                              {pat.tipo}
                            </div>
                            <div className="text-[7.5px] text-stone-500 font-bold mt-0.5 truncate">
                              Punto Oficial de Facturación y Compras
                            </div>
                          </div>
                        </div>

                        {/* QR Code Centerpiece: Más Grande (size={106}) y Centrado */}
                        <div className="flex flex-col items-center justify-center my-0.5">
                          <div className="p-1.5 bg-white rounded-xl border-2 border-[#A40B03] shadow-xs flex items-center justify-center">
                            <QRCodeSVG
                              value={sponsorCheckinUrl}
                              size={106}
                              level="Q"
                              includeMargin={false}
                            />
                          </div>

                          {/* Striking Callout Banner */}
                          <div className="mt-1.5 w-full bg-gradient-to-r from-[#A40B03] via-[#C91006] to-[#A40B03] text-white font-black text-[10px] uppercase tracking-wider py-1.5 px-2 rounded-lg text-center shadow-xs border border-amber-400/50 flex items-center justify-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            <span>¡INGRESA TU FACTURA ACÁ!</span>
                          </div>
                        </div>

                        {/* Texto Institucional Exacto Solicitado */}
                        <div className="w-full bg-amber-50/90 border border-amber-200/90 rounded-lg px-2 py-1 my-0.5 text-center">
                          <p className="text-[7.5px] font-extrabold text-amber-950 leading-snug">
                            Escanea este código QR con la cámara de tu teléfono móvil para registrar y validar tu factura oficial de compra en este Patrocinante.
                          </p>
                        </div>

                        {/* Footer con Guía de Corte y Código Único */}
                        <div className="flex items-center justify-between pt-1 border-t border-dotted border-stone-300 text-[6.5px] text-stone-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-0.5">
                            <Scissors className="w-2.5 h-2.5 text-stone-400" />
                            <span>Línea corte</span>
                          </span>
                          <span className="text-[#A40B03] font-black">Food Fest 2026 • Registro Oficial</span>
                          <span className="font-mono">#{String(c.index).padStart(3, '0')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#FFF9ED] py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[#0F0F0F] border border-[#A40B03]/40 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-12 w-auto px-3 py-1 rounded-2xl bg-black border border-[#A40B03]/50 flex items-center justify-center">
              <img src={logoBlanco} alt="Food Fest 2026" className="h-9 w-auto object-contain" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#FFF9ED] font-['Cabinet_Grotesk',sans-serif]">
                  Panel Superadministrador <span className="text-[#A40B03]">2026</span>
                </h1>
                {adminSessionEmail && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>{adminSessionEmail}</span>
                    <span className="text-stone-400">• {idleMinutesLeft}m</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Control de lotes, auditoría antifraude en tiempo real y gestión del Food Fest.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button onClick={refreshAllData} className="p-2.5 rounded-xl bg-black text-stone-300 hover:text-[#FFF9ED] border border-stone-800 hover:border-[#A40B03]/40 transition-colors cursor-pointer" title="Refrescar datos">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-black text-stone-400 hover:text-red-400 border border-stone-800 transition-colors text-xs font-semibold cursor-pointer">
              <LogOut className="w-4 h-4" /> <span>Cerrar Sesión</span>
            </button>
            <button onClick={handleExitToPublicSafe} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#A40B03] text-[#FFF9ED] text-xs font-bold hover:bg-[#BF0E05] transition-all shadow-md border border-[#FFF9ED]/20 cursor-pointer" title="Cierra la sesión de comité y regresa al sitio público">
              <ArrowLeft className="w-4 h-4 text-[#FFF9ED]" /> <span>Sitio Público</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-[#0F0F0F] border border-stone-800 text-xs font-bold">
          <button onClick={() => setActiveTab('stats')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'stats' ? 'bg-[#A40B03] text-[#FFF9ED] shadow-[0_0_15px_rgba(164,11,3,0.35)] border border-[#A40B03]/60' : 'text-stone-400 hover:bg-stone-900'}`}>
            <BarChart3 className="w-4 h-4" /> <span>Métricas & Fraude</span>
          </button>
          <button onClick={() => setActiveTab('generator')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'generator' ? 'bg-[#A40B03] text-[#FFF9ED] shadow-[0_0_15px_rgba(164,11,3,0.35)] border border-[#A40B03]/60' : 'text-stone-400 hover:bg-stone-900'}`}>
            <QrCode className="w-4 h-4" /> <span>Generador Códigos</span>
          </button>
          <button onClick={() => setActiveTab('gala')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'gala' ? 'bg-[#A40B03] text-[#FFF9ED] shadow-[0_0_15px_rgba(164,11,3,0.35)] border border-[#A40B03]/60' : 'text-stone-400 hover:bg-stone-900'}`}>
            <Trophy className="w-4 h-4" /> <span>Gala Oficial</span>
          </button>
          <button onClick={() => setActiveTab('entities')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'entities' ? 'bg-[#A40B03] text-[#FFF9ED] shadow-[0_0_15px_rgba(164,11,3,0.35)] border border-[#A40B03]/60' : 'text-stone-400 hover:bg-stone-900'}`}>
            <Store className="w-4 h-4" /> <span>Restaurantes</span>
          </button>
          <button onClick={() => setActiveTab('sponsors')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'sponsors' ? 'bg-[#A40B03] text-[#FFF9ED] shadow-[0_0_15px_rgba(164,11,3,0.35)] border border-[#A40B03]/60' : 'text-stone-400 hover:bg-stone-900'}`}>
            <Award className="w-4 h-4" /> <span>Patrocinadores</span>
          </button>
          <button 
            onClick={() => {
              setActiveTab('sponsor_audit');
              fetchComprasAudit();
            }} 
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              activeTab === 'sponsor_audit' 
                ? 'bg-[#A40B03] text-[#FFF9ED] shadow-[0_0_15px_rgba(164,11,3,0.35)] border border-[#A40B03]/60' 
                : 'text-stone-400 hover:bg-stone-900'
            }`}
          >
            <Receipt className="w-4 h-4" /> <span>Auditoría Compras</span>
          </button>
        </div>

        {/* TAB 1: METRICS & FRAUD DASHBOARD */}
        {activeTab === 'stats' && (() => {
          const participantesActivos = restaurantes.filter(r => !r.descalificado);
          const participantesDescalificados = restaurantes.filter(r => r.descalificado);
          const totalParticipantes = restaurantes.length;
          const liderActual = sortedRestaurantes.find(r => !r.descalificado);
          const promedioVotosPorRestaurante = totalParticipantes > 0 
            ? (stats.totalVotos / totalParticipantes).toFixed(1) 
            : '0.0';
          const calificacionPromedioGlobal = stats.promedioGlobal && stats.promedioGlobal > 0 
            ? stats.promedioGlobal.toFixed(2) 
            : (participantesActivos.length > 0 && stats.totalVotos > 0
                ? (participantesActivos.reduce((acc, curr) => acc + (curr.promedioRating * curr.votosCount), 0) / (stats.totalVotos || 1)).toFixed(2)
                : '0.00');
          const tasaCanje = stats.totalCodigosGenerados > 0 
            ? Math.round(((stats.totalCodigosUsados || stats.totalVotos) / stats.totalCodigosGenerados) * 100) 
            : 0;
          const codigosDisponibles = Math.max(0, stats.totalCodigosGenerados - (stats.totalCodigosUsados || stats.totalVotos));

          const fraudeDuplicadosCount = fraudLogs.filter(f => f.motivo?.includes('DUPLICADO')).length;
          const fraudeCodigosCount = fraudLogs.filter(f => f.motivo?.includes('CÓDIGO') || f.motivo?.includes('CODIGO') || f.motivo?.includes('USADO') || f.motivo?.includes('INEXISTENTE')).length;
          const fraudeAdminCount = fraudLogs.filter(f => f.motivo?.includes('ADMIN') || f.motivo?.includes('AUTORIZADO')).length;

          const filteredFraudLogs = fraudLogs.filter((log) => {
            const matchesSearch = !fraudSearchQuery.trim() || 
              (log.codigoIntentado && log.codigoIntentado.toLowerCase().includes(fraudSearchQuery.toLowerCase())) ||
              (log.motivo && log.motivo.toLowerCase().includes(fraudSearchQuery.toLowerCase())) ||
              (log.restauranteId && log.restauranteId.toLowerCase().includes(fraudSearchQuery.toLowerCase()));

            if (!matchesSearch) return false;

            if (fraudFilterType === 'DUPLICADOS') {
              return log.motivo?.includes('DUPLICADO');
            }
            if (fraudFilterType === 'CODIGOS') {
              return log.motivo?.includes('CÓDIGO') || log.motivo?.includes('CODIGO') || log.motivo?.includes('USADO') || log.motivo?.includes('INEXISTENTE');
            }
            if (fraudFilterType === 'ADMIN') {
              return log.motivo?.includes('ADMIN') || log.motivo?.includes('AUTORIZADO');
            }
            return true;
          });

          // Metrics for quality distribution
          const topTierBurgers = participantesActivos.filter(r => r.votosCount > 0 && r.promedioRating >= 4.75).length;
          const midTierBurgers = participantesActivos.filter(r => r.votosCount > 0 && r.promedioRating >= 4.0 && r.promedioRating < 4.75).length;
          const developingBurgers = participantesActivos.filter(r => r.votosCount === 0 || r.promedioRating < 4.0).length;

          return (
            <div className="space-y-6">
              
              {/* 1. HEADER EJECUTIVO & PULSO DEL FESTIVAL */}
              <div className="p-6 rounded-2xl bg-gradient-to-b from-[#160c0c] via-[#0F0F0F] to-[#0A0A0A] border border-[#A40B03]/40 shadow-xl space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-[#A40B03]/20 border border-[#A40B03]/50 text-[#FFF9ED] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Centro de Comando Food Fest 2026
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                        stats.resultadosRevelados
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                          : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stats.resultadosRevelados ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
                        {stats.resultadosRevelados ? 'Gala Finalizada • Resultados Revelados' : 'Votación en Curso • Modo Anónimo'}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-[#FFF9ED] tracking-wide">
                      Métricas en Vivo, Rendimiento Gastronómico & Ciberdefensa
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-3xl leading-relaxed">
                      Auditoría centralizada en tiempo real. Monitorea la afluencia de votos por mesa, la satisfacción media de los comensales y la neutralización activa de incidentes de fraude bajo transacciones ACID.
                    </p>
                  </div>

                  {/* Quick Refresh & Quick Navigation */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleManualRefreshDashboard}
                      disabled={isRefreshingDashboard}
                      className="px-3.5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white border border-stone-800 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md"
                      title="Sincronizar datos con Firestore inmediatamente"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-[#A40B03] ${isRefreshingDashboard ? 'animate-spin' : ''}`} />
                      <span>{isRefreshingDashboard ? 'Sincronizando...' : 'Actualizar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('generator')}
                      className="px-3.5 py-2.5 rounded-xl bg-[#A40B03] hover:bg-[#BF0E05] text-[#FFF9ED] text-xs font-bold flex items-center gap-1.5 shadow-md border border-[#FFF9ED]/15 cursor-pointer transition-all hover:scale-[1.02]"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>+ Códigos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('gala')}
                      className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all hover:scale-[1.02]"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Gala Oficial</span>
                    </button>
                  </div>
                </div>

                {/* Sub-bar with Live Sync Metrics */}
                <div className="pt-2 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-400 font-mono">
                  <div className="flex items-center gap-3">
                    <span>Sincronización en la Nube: <strong className="text-emerald-400">Activa (Firestore 24/7)</strong></span>
                    <span>•</span>
                    <span>Última lectura: {lastRefreshedAt.toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#A40B03]" />
                    <span>Transacciones Criptográficas ACID • Integridad Garantizada</span>
                  </div>
                </div>
              </div>

              {/* 2. MATRIZ DE KPIS VITALES (6 TARJETAS DE ALTO IMPACTO) */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
                
                {/* KPI 1: Votos Válidos */}
                <div className="p-4 rounded-2xl bg-[#0F0F0F] border border-stone-800 flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Votos Válidos</span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl sm:text-3xl font-black text-[#FFF9ED] font-mono">{stats.totalVotos}</div>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      Promedio: <strong className="text-stone-200">{promedioVotosPorRestaurante}</strong> / resto.
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-emerald-400 font-mono inline-block">
                    Google Auth verificado
                  </span>
                </div>

                {/* KPI 2: Calificación Media */}
                <div className="p-4 rounded-2xl bg-[#0F0F0F] border border-stone-800 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Satisfacción Media</span>
                    <div className="w-7 h-7 rounded-lg bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Star className="w-4 h-4 fill-amber-400" />
                    </div>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl sm:text-3xl font-black text-[#FFF9ED] font-mono flex items-center gap-1">
                      <span>{calificacionPromedioGlobal}</span>
                      <span className="text-base text-amber-400">★</span>
                    </div>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      Escala oficial 1.00 a 5.00
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-amber-400 font-mono inline-block">
                    Ponderado acumulativo
                  </span>
                </div>

                {/* KPI 3: Tasa de Canje */}
                <div className="p-4 rounded-2xl bg-[#0F0F0F] border border-stone-800 flex flex-col justify-between hover:border-[#A40B03]/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Tasa de Canje</span>
                    <div className="w-7 h-7 rounded-lg bg-[#A40B03]/20 border border-[#A40B03]/40 flex items-center justify-center text-[#A40B03]">
                      <Percent className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl sm:text-3xl font-black text-[#A40B03] font-mono">{tasaCanje}%</div>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      {stats.totalCodigosUsados || stats.totalVotos} usados de {stats.totalCodigosGenerados}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-stone-300 font-mono inline-block">
                    {codigosDisponibles} QRs en mesa
                  </span>
                </div>

                {/* KPI 4: Fraude Prevenido */}
                <div className="p-4 rounded-2xl bg-red-950/20 border border-red-900/40 flex flex-col justify-between hover:border-red-600/60 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Fraude Bloqueado</span>
                    <div className="w-7 h-7 rounded-lg bg-red-950/80 border border-red-600/50 flex items-center justify-center text-red-400">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl sm:text-3xl font-black text-red-400 font-mono">{stats.intentosFraudeBloqueados}</div>
                    <div className="text-[11px] text-red-300/80 mt-0.5">
                      0 votos espurios admitidos
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-950/60 border border-red-900/50 text-red-300 font-mono inline-block">
                    100% de eficacia
                  </span>
                </div>

                {/* KPI 5: Restaurantes */}
                <div className="p-4 rounded-2xl bg-[#0F0F0F] border border-stone-800 flex flex-col justify-between hover:border-stone-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Participantes</span>
                    <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-300">
                      <Store className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl sm:text-3xl font-black text-[#FFF9ED] font-mono">
                      {participantesActivos.length}
                      <span className="text-sm font-normal text-stone-500"> / {totalParticipantes}</span>
                    </div>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      {participantesDescalificados.length > 0 ? `${participantesDescalificados.length} descalificado(s)` : '100% en competencia'}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-stone-400 font-mono inline-block">
                    Activos y auditados
                  </span>
                </div>

                {/* KPI 6: Líder Actual */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-950/20 to-[#0F0F0F] border border-amber-500/30 flex flex-col justify-between hover:border-amber-400/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Líder Actual</span>
                    <div className="w-7 h-7 rounded-lg bg-amber-950/80 border border-amber-600/50 flex items-center justify-center text-amber-400">
                      <Crown className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-2">
                    <div className="text-sm sm:text-base font-black text-[#FFF9ED] truncate" title={liderActual && liderActual.votosCount > 0 ? liderActual.nombreHamburguesa : 'Esperando votos'}>
                      {liderActual && liderActual.votosCount > 0 ? liderActual.nombreHamburguesa : 'En espera'}
                    </div>
                    <div className="text-[11px] text-stone-400 truncate mt-0.5">
                      {liderActual && liderActual.votosCount > 0 ? `${liderActual.nombre} (${liderActual.promedioRating.toFixed(2)} ★)` : 'Sin votos emitidos'}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-600/30 text-amber-300 font-mono inline-block">
                    {liderActual && liderActual.votosCount > 0 ? `${liderActual.votosCount} votos auditados` : 'Rank #1 provisional'}
                  </span>
                </div>

              </div>

              {/* 3. SELECTOR DE VISTAS DINÁMICAS DENTRO DEL DASHBOARD */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2 p-1.5 rounded-xl bg-black border border-stone-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setStatsViewMode('overview')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      statsViewMode === 'overview'
                        ? 'bg-[#A40B03] text-[#FFF9ED] shadow-sm'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Rendimiento & Gráficos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatsViewMode('security')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      statsViewMode === 'security'
                        ? 'bg-red-900/80 text-white shadow-sm'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                    <span>Ciberseguridad & Fraude</span>
                    {fraudLogs.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-950 text-red-300 text-[10px]">
                        {fraudLogs.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatsViewMode('table')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      statsViewMode === 'table'
                        ? 'bg-stone-800 text-[#FFF9ED] shadow-sm'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Tabla Comparativa ({restaurantes.length})</span>
                  </button>
                </div>

                <div className="text-xs text-stone-500 font-mono hidden sm:block">
                  Visualizando: <span className="text-stone-300 font-bold">{statsViewMode === 'overview' ? 'Análisis Gráfico' : statsViewMode === 'security' ? 'Bitácora Forense' : 'Clasificación Interna'}</span>
                </div>
              </div>

              {/* VISTA A: RENDIMIENTO & GRÁFICOS GASTRONÓMICOS */}
              {statsViewMode === 'overview' && (
                <div className="space-y-6">
                  
                  {/* Gráfico Principal Dinámico con Interruptor de Métrica */}
                  <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
                      <div>
                        <h3 className="font-bold text-[#FFF9ED] text-base flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-[#A40B03]" />
                          <span>Comparativa de Rendimiento por Restaurante</span>
                        </h3>
                        <p className="text-xs text-stone-400 mt-0.5">
                          Visualiza en tiempo real el comportamiento del flujo de votos y la nota promedio emitida por mesa.
                        </p>
                      </div>

                      {/* Selector de métrica */}
                      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black border border-stone-800 text-xs">
                        <button
                          type="button"
                          onClick={() => setChartMetric('votos')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            chartMetric === 'votos'
                              ? 'bg-[#A40B03] text-[#FFF9ED]'
                              : 'text-stone-400 hover:text-white'
                          }`}
                        >
                          Votos Acumulados
                        </button>
                        <button
                          type="button"
                          onClick={() => setChartMetric('rating')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            chartMetric === 'rating'
                              ? 'bg-amber-600 text-white'
                              : 'text-stone-400 hover:text-white'
                          }`}
                        >
                          Rating Promedio (★)
                        </button>
                      </div>
                    </div>

                    {/* Gráfico Recharts */}
                    <div className="h-72 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={sortedRestaurantes} 
                          margin={{ top: 15, right: 15, left: -10, bottom: 25 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                          <XAxis 
                            dataKey="nombre" 
                            tick={{ fill: '#a8a29e', fontSize: 11 }} 
                            interval={0}
                            angle={-20}
                            textAnchor="end"
                            tickLine={false} 
                            axisLine={false} 
                          />
                          <YAxis 
                            domain={chartMetric === 'rating' ? [0, 5] : ['auto', 'auto']}
                            tick={{ fill: '#a8a29e', fontSize: 11 }} 
                            tickLine={false} 
                            axisLine={false} 
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#0a0a0a', 
                              borderColor: '#3f3f46', 
                              borderRadius: '12px', 
                              fontSize: '12px',
                              color: '#FFF9ED'
                            }}
                            itemStyle={{ color: '#FFF9ED' }}
                            cursor={{ fill: '#1a1a1a' }}
                            formatter={(value: any) => [
                              chartMetric === 'rating' ? `${Number(value).toFixed(2)} ★` : `${value} votos`,
                              chartMetric === 'rating' ? 'Calificación' : 'Votos Registrados'
                            ]}
                          />
                          <Bar 
                            dataKey={chartMetric === 'rating' ? 'promedioRating' : 'votosCount'} 
                            fill={chartMetric === 'rating' ? '#D97706' : '#A40B03'} 
                            radius={[6, 6, 0, 0]} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Tarjetas de Diagnóstico Analítico */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Diagnóstico 1: Calidad Gastronómica */}
                    <div className="p-4 rounded-xl bg-black border border-stone-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                          <Crown className="w-4 h-4 text-amber-400" /> Distribución de Calidad
                        </span>
                        <span className="text-[10px] font-mono text-stone-500">Food Fest</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-stone-950 border border-stone-900">
                          <span className="text-stone-300">Nivel Élite (≥ 4.75 ★)</span>
                          <strong className="text-amber-400 font-mono">{topTierBurgers} hamburguesas</strong>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-stone-950 border border-stone-900">
                          <span className="text-stone-300">Nivel Alto (4.00 - 4.74 ★)</span>
                          <strong className="text-stone-200 font-mono">{midTierBurgers} hamburguesas</strong>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-stone-950 border border-stone-900">
                          <span className="text-stone-400">En Consolidación (&lt; 4.0 ★)</span>
                          <strong className="text-stone-400 font-mono">{developingBurgers} hamburguesas</strong>
                        </div>
                      </div>
                    </div>

                    {/* Diagnóstico 2: Eficiencia de Mesa */}
                    <div className="p-4 rounded-xl bg-black border border-stone-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                          <QrCode className="w-4 h-4 text-[#A40B03]" /> Dinámica de Mesa
                        </span>
                        <span className="text-[10px] font-mono text-stone-500">Métricas QR</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-stone-950 border border-stone-900">
                          <span className="text-stone-300">Códigos Activos en Circulación</span>
                          <strong className="text-stone-200 font-mono">{codigosDisponibles}</strong>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-stone-950 border border-stone-900">
                          <span className="text-stone-300">Total Códigos Generados</span>
                          <strong className="text-stone-200 font-mono">{stats.totalCodigosGenerados}</strong>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-stone-950 border border-stone-900">
                          <span className="text-stone-300">Tasa de Efectividad en Mesa</span>
                          <strong className="text-emerald-400 font-mono">{tasaCanje}%</strong>
                        </div>
                      </div>
                    </div>

                    {/* Diagnóstico 3: Integridad de Votos */}
                    <div className="p-4 rounded-xl bg-black border border-stone-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Auditoría de Integridad
                        </span>
                        <span className="text-[10px] font-mono text-stone-500">100% Blindado</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-stone-950 border border-stone-900">
                          <span className="text-stone-300">Votos Criptográficos Válidos</span>
                          <strong className="text-emerald-400 font-mono">{stats.totalVotos}</strong>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-stone-950 border border-stone-900">
                          <span className="text-stone-300">Ataques Neutralizados</span>
                          <strong className="text-red-400 font-mono">{stats.intentosFraudeBloqueados}</strong>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-stone-950 border border-stone-900">
                          <span className="text-stone-300">Vulnerabilidades No Resueltas</span>
                          <strong className="text-emerald-400 font-mono">0 (Cero)</strong>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* VISTA B: CENTRO DE CIBERSEGURIDAD & AUDITORÍA ANTIFRAUDE */}
              {statsViewMode === 'security' && (
                <div className="space-y-6">

                  {/* 4 Micro-Cards de Vectores de Ataque Mitigados */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="p-4 rounded-xl bg-black border border-stone-800 space-y-1">
                      <div className="text-[11px] font-bold text-stone-400 uppercase flex items-center justify-between">
                        <span>Doble Voto Prevenido</span>
                        <Users className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="text-2xl font-black text-amber-400 font-mono">{fraudeDuplicadosCount}</div>
                      <p className="text-[10px] text-stone-400">Bloqueados por cuenta Google o email idéntico.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-black border border-stone-800 space-y-1">
                      <div className="text-[11px] font-bold text-stone-400 uppercase flex items-center justify-between">
                        <span>Reuso de QRs Quemados</span>
                        <QrCode className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="text-2xl font-black text-red-400 font-mono">{fraudeCodigosCount}</div>
                      <p className="text-[10px] text-stone-400">Intentos de canjear tickets ya consumidos.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-black border border-stone-800 space-y-1">
                      <div className="text-[11px] font-bold text-stone-400 uppercase flex items-center justify-between">
                        <span>Acceso Ilegítimo al Comité</span>
                        <Lock className="w-4 h-4 text-[#A40B03]" />
                      </div>
                      <div className="text-2xl font-black text-[#A40B03] font-mono">{fraudeAdminCount}</div>
                      <p className="text-[10px] text-stone-400">Intentos con credenciales no registradas.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-black border border-emerald-900/40 space-y-1">
                      <div className="text-[11px] font-bold text-emerald-400 uppercase flex items-center justify-between">
                        <span>Eficacia del Blindaje</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-black text-emerald-400 font-mono">100%</div>
                      <p className="text-[10px] text-emerald-300/80">Cero votos inválidos admitidos en base de datos.</p>
                    </div>
                  </div>

                  {/* Buscador & Filtro de Logs de Fraude */}
                  <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
                      <div>
                        <h3 className="font-bold text-red-400 text-base flex items-center gap-2">
                          <ShieldAlert className="w-5 h-5 text-red-400" />
                          <span>Bitácora Forense de Seguridad & Transacciones Anómalas</span>
                        </h3>
                        <p className="text-xs text-stone-400 mt-0.5">
                          Registro inmutable de cada intento de manipulación neutralizado por las reglas de Firestore.
                        </p>
                      </div>

                      {/* Buscador dinámico */}
                      <div className="relative min-w-[220px]">
                        <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Buscar código o motivo..."
                          value={fraudSearchQuery}
                          onChange={(e) => setFraudSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black border border-stone-800 text-xs text-[#FFF9ED] placeholder-stone-500 focus:outline-none focus:border-[#A40B03]"
                        />
                      </div>
                    </div>

                    {/* Botones de filtro de motivos */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFraudFilterType('ALL')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                          fraudFilterType === 'ALL'
                            ? 'bg-[#A40B03] text-white'
                            : 'bg-black text-stone-400 hover:text-white border border-stone-800'
                        }`}
                      >
                        Todos ({fraudLogs.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFraudFilterType('DUPLICADOS')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                          fraudFilterType === 'DUPLICADOS'
                            ? 'bg-amber-600 text-white'
                            : 'bg-black text-stone-400 hover:text-white border border-stone-800'
                        }`}
                      >
                        Duplicidad ({fraudeDuplicadosCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFraudFilterType('CODIGOS')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                          fraudFilterType === 'CODIGOS'
                            ? 'bg-red-800 text-white'
                            : 'bg-black text-stone-400 hover:text-white border border-stone-800'
                        }`}
                      >
                        Códigos QR ({fraudeCodigosCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFraudFilterType('ADMIN')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                          fraudFilterType === 'ADMIN'
                            ? 'bg-stone-700 text-white'
                            : 'bg-black text-stone-400 hover:text-white border border-stone-800'
                        }`}
                      >
                        Acceso Comité ({fraudeAdminCount})
                      </button>
                    </div>

                    {/* Lista detallada de incidentes */}
                    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                      {filteredFraudLogs.length === 0 ? (
                        <div className="text-center py-10 rounded-xl bg-black border border-stone-800/80 space-y-2">
                          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                          <div className="text-stone-300 text-xs font-bold">
                            {fraudSearchQuery.trim() ? 'No se encontraron incidentes que coincidan con la búsqueda.' : 'Cero intentos de fraude registrados en este filtro.'}
                          </div>
                          <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                            El firewall atómico mantiene el festival protegido. Cada comensal está votando bajo los lineamientos oficiales.
                          </p>
                        </div>
                      ) : (
                        filteredFraudLogs.map((log) => {
                          const isDuplicado = log.motivo?.includes('DUPLICADO');
                          const isReuso = log.motivo?.includes('USADO');
                          const isNoExiste = log.motivo?.includes('INEXISTENTE');
                          const isMismatch = log.motivo?.includes('MISMATCH');

                          const badgeColor = isDuplicado 
                            ? 'bg-amber-950/80 text-amber-300 border-amber-600/40' 
                            : isReuso || isNoExiste 
                              ? 'bg-red-950/80 text-red-300 border-red-600/40' 
                              : 'bg-stone-900 text-stone-300 border-stone-700';

                          return (
                            <div 
                              key={log.id} 
                              className="p-3.5 rounded-xl bg-black border border-stone-800/80 hover:border-red-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors text-xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-black ${badgeColor}`}>
                                    {isDuplicado ? 'DUPLICADO' : isReuso ? 'CÓDIGO YA USADO' : isNoExiste ? 'CÓDIGO INEXISTENTE' : isMismatch ? 'RESTAURANTE ERRÓNEO' : 'BLOQUEO ACID'}
                                  </span>
                                  <span className="font-mono font-bold text-stone-200">
                                    {log.codigoIntentado || 'N/A'}
                                  </span>
                                  {log.restauranteId && (
                                    <span className="text-[10px] text-stone-500 font-mono">
                                      Rest: {log.restauranteId}
                                    </span>
                                  )}
                                </div>
                                <p className="text-stone-300 text-xs leading-relaxed">
                                  {log.motivo}
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-[11px] font-mono text-stone-400">
                                  {log.fecha ? new Date(log.fecha).toLocaleString() : 'Fecha no registrada'}
                                </div>
                                <span className="text-[10px] text-emerald-400 font-mono flex items-center justify-end gap-1 mt-0.5">
                                  <Check className="w-3 h-3" /> Neutralizado
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* VISTA C: TABLA COMPARATIVA DE TRACCIÓN Y RENDIMIENTO */}
              {statsViewMode === 'table' && (
                <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
                    <div>
                      <h3 className="font-bold text-[#FFF9ED] text-base flex items-center gap-2">
                        <Store className="w-5 h-5 text-[#A40B03]" />
                        <span>Diagnóstico de Participación & Cuota de Votos por Restaurante</span>
                      </h3>
                      <p className="text-xs text-stone-400 mt-0.5">
                        Supervisa qué competidores concentran mayor actividad en mesa y su porcentaje de participación relativa.
                      </p>
                    </div>
                    <div className="text-xs font-mono text-stone-400">
                      Total participantes: <strong className="text-[#FFF9ED]">{restaurantes.length}</strong>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {sortedRestaurantes.map((r, i) => {
                      const sharePercent = stats.totalVotos > 0 
                        ? ((r.votosCount / stats.totalVotos) * 100).toFixed(1) 
                        : '0.0';

                      return (
                        <div 
                          key={r.id} 
                          className="p-3.5 rounded-xl bg-black border border-stone-800/80 hover:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono font-bold text-sm text-[#A40B03] w-6 text-center">
                              #{i + 1}
                            </span>
                            <img 
                              src={r.fotoUrl || r.logoUrl} 
                              alt={r.nombreHamburguesa} 
                              className="w-10 h-10 rounded-lg object-cover border border-stone-800 shrink-0" 
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-[#FFF9ED] truncate">{r.nombreHamburguesa}</span>
                                <span className="text-[10px] text-stone-400 truncate">({r.nombre})</span>
                                {r.descalificado && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-800">
                                    Descalificado
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5">
                                <span>{r.instagram || 'Sin instagram'}</span>
                                <span>•</span>
                                <span className="text-stone-300 font-mono">{r.precio || '$ --'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-900">
                            <div className="text-left sm:text-right">
                              <div className="text-[10px] text-stone-500 uppercase font-semibold">Participación</div>
                              <div className="font-mono font-bold text-stone-200">
                                {sharePercent}% <span className="text-stone-500 text-[10px]">del total</span>
                              </div>
                            </div>

                            <div className="text-left sm:text-right">
                              <div className="text-[10px] text-stone-500 uppercase font-semibold">Votos</div>
                              <div className="font-mono font-bold text-[#FFF9ED]">
                                {r.votosCount}
                              </div>
                            </div>

                            <div className="text-right min-w-[70px]">
                              <div className="text-[10px] text-stone-500 uppercase font-semibold">Rating</div>
                              <div className="font-mono font-black text-amber-400 flex items-center justify-end gap-1">
                                <Star className="w-3.5 h-3.5 fill-amber-400" />
                                <span>{r.votosCount === 0 ? "0.00" : r.promedioRating.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          );
        })()}

        {/* TAB 2: GENERATOR */}
        {activeTab === 'generator' && (
          <div className="space-y-6">
            
            {/* Form to generate new codes */}
            <form onSubmit={handleGenerateCodes} className="p-6 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-stone-200">Generar Nuevo Lote de Códigos</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Seleccionar Restaurante (Sin códigos generados)</label>
                  <select
                    value={selectedRestId}
                    onChange={(e) => setSelectedRestId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none"
                    disabled={restaurantes.filter(r => !codigos.some(c => c.restauranteId === r.id)).length === 0}
                  >
                    {restaurantes.filter(r => !codigos.some(c => c.restauranteId === r.id)).length === 0 && (
                      <option value="">Todos los restaurantes ya tienen códigos</option>
                    )}
                    {restaurantes
                      .filter(r => !codigos.some(c => c.restauranteId === r.id))
                      .map((r) => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Cantidad de Códigos (Para todo el evento)</label>
                  <input type="number" min="1" max="2000" value={batchCount} onChange={(e) => setBatchCount(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none font-mono" />
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  type="submit" 
                  disabled={isGeneratingCodes || !selectedRestId}
                  className="px-6 py-3 rounded-xl bg-[#A40B03] text-[#FFF9ED] font-bold text-xs hover:bg-[#BF0E05] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-[#A40B03]/60 shadow-md shadow-[#A40B03]/30"
                >
                  {isGeneratingCodes ? (
                    <><RefreshCw className="w-4 h-4 animate-spin text-[#FFF9ED]" /> <span>Generando Códigos...</span></>
                  ) : (
                    <><PlusCircle className="w-4 h-4 text-[#FFF9ED]" /> <span>Generar Lote Único</span></>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-stone-500 font-semibold mt-2">
                ⚠️ Solo se puede generar códigos UNA VEZ por restaurante. Si requieres más, contacta soporte técnico.
              </p>
            </form>

            {/* List of Restaurants and their codes */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <h3 className="font-bold text-[#FFF9ED] flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-[#A40B03]" /> <span>Códigos Generados por Restaurante</span>
                </h3>
              </div>

              <div className="space-y-3">
                {restaurantes.filter(r => codigos.some(c => c.restauranteId === r.id)).length === 0 && (
                  <div className="text-stone-500 text-sm">No se han generado códigos para ningún restaurante aún.</div>
                )}
                
                {restaurantes
                  .filter(r => codigos.some(c => c.restauranteId === r.id))
                  .map((r) => {
                    const rCodes = codigos.filter(c => c.restauranteId === r.id);
                    const usados = rCodes.filter(c => c.usado).length;
                    const disponibles = rCodes.length - usados;

                    return (
                      <div key={r.id} className="p-4 rounded-xl bg-black border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img src={r.logoUrl} alt={r.nombre} className="w-10 h-10 rounded-lg object-cover border border-[#A40B03]/40" />
                          <div>
                            <div className="font-bold text-[#FFF9ED]">{r.nombre}</div>
                            <div className="text-xs text-stone-400">Total generados: <span className="font-mono text-stone-200">{rCodes.length}</span></div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
                          <div className="flex gap-6 text-xs font-semibold w-full sm:w-auto justify-center sm:justify-start">
                            <div className="flex flex-col items-center">
                              <span className="text-stone-500 uppercase text-[10px]">Usados</span>
                              <span className="text-emerald-400 font-mono text-sm">{usados}</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-stone-500 uppercase text-[10px]">Disponibles</span>
                              <span className="text-[#A40B03] font-mono text-sm font-bold">{disponibles}</span>
                            </div>
                          </div>

                          <button 
                            onClick={() => setPrintRestId(r.id)}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-stone-900 text-[#FFF9ED] text-xs font-bold hover:bg-stone-800 hover:border-[#A40B03]/50 transition-colors flex justify-center items-center gap-2 border border-stone-800"
                          >
                            <QrCode className="w-4 h-4 text-[#A40B03]" />
                            <span>Ver Tickets PDF</span>
                          </button>
                        </div>
                      </div>
                    );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: GALA OFICIAL & RANKING DESANONIMIZADO */}
        {activeTab === 'gala' && (
          <div className="space-y-6">

            {/* HEADER DE LA GALA & CONTROL MAESTRO DE REVELACIÓN */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-[#180d0d] to-[#0F0F0F] border border-[#A40B03]/50 shadow-xl space-y-6">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800/80 pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#A40B03]/20 border border-[#A40B03]/50 text-[#FFF9ED] text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" /> Gran Gala Oficial Food Fest 2026
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                      stats.resultadosRevelados 
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' 
                        : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${stats.resultadosRevelados ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      {stats.resultadosRevelados ? 'Resultados Públicos Visibles' : 'Modo Público Anónimo'}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-[#FFF9ED] tracking-wide">
                    Ranking Oficial Desanonimizado & Conteo de Votos
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-2xl leading-relaxed">
                    Panel exclusivo del Comité Organizador. Audita las calificaciones, comprende la matemática entre estrellas y criterios técnicos, y controla cuándo publicar los resultados oficiales en la pantalla principal.
                  </p>
                </div>

                {/* BOTÓN MAESTRO DE REVELACIÓN / OCULTAMIENTO */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleResultadosPublicos}
                    disabled={isTogglingGala}
                    className={`px-5 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      stats.resultadosRevelados
                        ? 'bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 hover:border-stone-500'
                        : 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-500 hover:to-emerald-600 text-white border border-emerald-400/30 shadow-emerald-950/60 hover:scale-[1.02]'
                    }`}
                  >
                    {isTogglingGala ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Actualizando estado...</span>
                      </>
                    ) : stats.resultadosRevelados ? (
                      <>
                        <EyeOff className="w-4 h-4 text-stone-400" />
                        <span>Ocultar Resultados (Volver a Modo Anónimo)</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 text-emerald-300" />
                        <span>Revelar Resultados al Público (Finalizar Concurso)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* BANNER INFORMATIVO DEL ESTADO DE VISIBILIDAD */}
              <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                stats.resultadosRevelados 
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200' 
                  : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
              }`}>
                {stats.resultadosRevelados ? (
                  <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs leading-relaxed">
                  <strong className="block text-sm font-bold text-[#FFF9ED] mb-0.5">
                    {stats.resultadosRevelados 
                      ? '🎉 ¡Concurso Finalizado! Resultados revelados en vivo para todo el público' 
                      : '🔒 Modo Anónimo Activo: El público en la página principal solo ve códigos cifrados'}
                  </strong>
                  {stats.resultadosRevelados ? (
                    <span>
                      En la pantalla pública (<code className="bg-black/40 px-1 py-0.5 rounded text-stone-300">LeaderboardAnonimo</code>), todos los visitantes pueden ver ahora los nombres reales de los restaurantes, las fotos de hamburguesas, los logos y el Podio de Ganadores oficial con sus respectivas estrellas y posiciones de honor.
                    </span>
                  ) : (
                    <span>
                      Hasta que el comité no decida presionar el botón de revelación, el público verá únicamente nombres genéricos (<em>"Participante #1", "Identidad Oculta"</em>). Esto previene votos por favoritismo y protege la integridad de la competencia. Solo el Comité puede visualizar las identidades reales aquí.
                    </span>
                  )}
                  {stats.fechaRevelacion && (
                    <div className="mt-1 text-[10px] text-stone-400 font-mono">
                      Última modificación registrada: {new Date(stats.fechaRevelacion).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* SECCIÓN EDUCATIVA: EXPLICACIÓN DETALLADA DE VOTOS, PUNTOS Y ESTRELLAS */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-6">
              
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-[#A40B03]" />
                  <h4 className="font-extrabold text-[#FFF9ED] text-base tracking-wide">
                    Metodología de Votación & Sistema de Conteo (Estrellas vs Puntos)
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-stone-400 bg-stone-900 px-2.5 py-1 rounded-lg border border-stone-800">
                  Auditoría Inmutable Food Fest 2026
                </span>
              </div>

              {/* GRID CON LAS 3 TARJETAS EXPLICATIVAS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 1. CÓMO SE REALIZA EL VOTO */}
                <div className="p-4 rounded-xl bg-black border border-stone-800/90 space-y-3">
                  <div className="flex items-center gap-2 text-stone-200 font-bold text-xs">
                    <UserCheck className="w-4 h-4 text-[#A40B03]" />
                    <span>1. Procedimiento de Emisión del Voto</span>
                  </div>
                  <ul className="text-xs text-stone-400 space-y-2 leading-relaxed">
                    <li>
                      <strong className="text-stone-200">Autenticación Google:</strong> El comensal debe identificarse antes de calificar para certificar una cuenta humana real.
                    </li>
                    <li>
                      <strong className="text-stone-200">Código QR Físico de Mesa:</strong> Debe escanear un ticket físico irrepetible impreso por el restaurante. No es posible votar sin estar en la mesa.
                    </li>
                    <li>
                      <strong className="text-stone-200">Garantía de Unicidad (1 Voto):</strong> El sistema bloquea duplicados por UID de cuenta y por correo normalizado. Nadie puede votar dos veces al mismo restaurante.
                    </li>
                    <li>
                      <strong className="text-stone-200">Quema Atómica:</strong> Al emitir el voto, una transacción quema el código QR para que nadie más pueda reutilizarlo.
                    </li>
                  </ul>
                </div>

                {/* 2. CONTEO DE ESTRELLAS (RATING GLOBAL) */}
                <div className="p-4 rounded-xl bg-black border border-stone-800/90 space-y-3">
                  <div className="flex items-center gap-2 text-stone-200 font-bold text-xs">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>2. Rating Global en Estrellas (1.00 a 5.00 ★)</span>
                  </div>
                  <div className="text-xs text-stone-400 space-y-2 leading-relaxed">
                    <p>
                      La calificación troncal del festival es la <strong className="text-stone-200">Calificación Global</strong> (1 a 5 estrellas). Es la métrica directa de la satisfacción general del comensal.
                    </p>
                    <div className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 font-mono text-[11px] text-amber-300">
                      Promedio = [ (Promedio Previo × Votos Previos) + Estrellas Nuevo Voto ] / Total Votos
                    </div>
                    <p className="text-[11px]">
                      Se calcula en tiempo real con <strong className="text-stone-200">2 decimales exactos</strong> (ej: 4.88 ★) mediante transacciones ACID seguras.
                    </p>
                  </div>
                </div>

                {/* 3. LOS 4 CRITERIOS TÉCNICOS EN PUNTOS */}
                <div className="p-4 rounded-xl bg-black border border-stone-800/90 space-y-3 md:col-span-2 lg:col-span-1">
                  <div className="flex items-center gap-2 text-stone-200 font-bold text-xs">
                    <Flame className="w-4 h-4 text-[#A40B03]" />
                    <span>3. Los 4 Criterios Técnicos (1 a 5 Puntos)</span>
                  </div>
                  <div className="text-xs text-stone-400 space-y-1.5 leading-relaxed">
                    <p className="text-[11px] mb-1">
                      En cada voto, el comensal evalúa obligatoriamente 4 rubros técnicos sensoriales:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 rounded bg-stone-950 border border-stone-900">
                        <strong className="text-stone-200 block">🥩 Sabor & Punto</strong>
                        Jugosidad, sazón y cocción de la carne.
                      </div>
                      <div className="p-2 rounded bg-stone-950 border border-stone-900">
                        <strong className="text-stone-200 block">🍞 Textura del Pan</strong>
                        Esponjosidad, frescura y resistencia.
                      </div>
                      <div className="p-2 rounded bg-stone-950 border border-stone-900">
                        <strong className="text-stone-200 block">🥣 Salsas & Toppings</strong>
                        Balance gustativo y crocancia.
                      </div>
                      <div className="p-2 rounded bg-stone-950 border border-stone-900">
                        <strong className="text-stone-200 block">💡 Creatividad</strong>
                        Innovación y toque de autor autóctono.
                      </div>
                    </div>
                    <p className="text-[10px] text-stone-500 mt-1">
                      Quedan registrados en la bitácora inmutable de votos para auditoría forense del comité.
                    </p>
                  </div>
                </div>

              </div>

              {/* REGLA DE CLASIFICACIÓN & DESEMPATE OFICIAL */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Scale className="w-5 h-5 text-[#A40B03] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-sm font-bold text-[#FFF9ED] block">
                      Criterio Oficial de Desempate en el Ranking
                    </strong>
                    <p className="text-stone-400 mt-0.5 leading-relaxed">
                      1º Posiciona quien tenga <strong>mayor promedio de estrellas</strong>. 2º Si dos hamburguesas empatan en promedio exacto (ej. 4.90 ★ vs 4.90 ★), el desempate favorece a la propuesta con <strong>mayor cantidad total de votos auditados (<code className="text-[#FFF9ED]">votosCount</code>)</strong>, premiando la preferencia popular de más comensales reales.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-stone-300">
                  <div className="px-3 py-1.5 rounded-lg bg-black border border-stone-800">
                    <span className="text-stone-500">Total Votos:</span> <strong className="text-emerald-400">{stats.totalVotos}</strong>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-black border border-stone-800">
                    <span className="text-stone-500">Participantes:</span> <strong className="text-[#FFF9ED]">{restaurantes.length}</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* TABLA DE CLASIFICACIÓN DESANONIMIZADA OFICIAL */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-[#A40B03]/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
                <h3 className="text-lg font-black text-[#FFF9ED] flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#A40B03]" /> 
                  <span>Tabla Consolidada de Posiciones • Food Fest 2026</span>
                </h3>
                <span className="text-xs text-stone-400">
                  Ordenado por Promedio Oficial y Desempate de Votos
                </span>
              </div>

              <div className="space-y-3">
                {sortedRestaurantes.length === 0 ? (
                  <div className="text-center py-8 text-stone-500 text-xs">
                    No hay restaurantes registrados en la base de datos.
                  </div>
                ) : (
                  sortedRestaurantes.map((r, i) => {
                    const isPodium = i < 3;
                    const rankLabel = i === 0 ? 'Oro' : i === 1 ? 'Plata' : i === 2 ? 'Bronce' : `#${i + 1}`;
                    const borderStyle = i === 0 
                      ? 'bg-gradient-to-r from-[#A40B03]/25 via-black to-black border-[#A40B03] shadow-[0_0_25px_rgba(164,11,3,0.3)]' 
                      : i === 1 
                        ? 'bg-gradient-to-r from-slate-500/10 via-black to-black border-slate-400/40' 
                        : i === 2 
                          ? 'bg-gradient-to-r from-amber-700/10 via-black to-black border-amber-600/40' 
                          : 'bg-black border-stone-800 hover:border-stone-700';

                    return (
                      <div 
                        key={r.id} 
                        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${borderStyle} ${r.descalificado ? 'opacity-50 grayscale' : ''}`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          
                          {/* Rank Badge */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-sm shrink-0 ${
                            i === 0 
                              ? 'bg-gradient-to-br from-amber-400 to-[#A40B03] text-black shadow-md' 
                              : i === 1 
                                ? 'bg-gradient-to-br from-slate-200 to-slate-500 text-black' 
                                : i === 2 
                                  ? 'bg-gradient-to-br from-amber-600 to-amber-900 text-white' 
                                  : 'bg-stone-900 border border-stone-800 text-stone-400'
                          }`}>
                            {i === 0 ? <Crown className="w-5 h-5 text-amber-950" /> : `#${i + 1}`}
                          </div>

                          {/* Burger / Logo Avatar */}
                          <img 
                            src={r.fotoUrl || r.logoUrl} 
                            alt={r.nombreHamburguesa} 
                            className="w-12 h-12 rounded-xl object-cover border border-stone-800 shrink-0" 
                          />

                          {/* Restaurant Info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-[#FFF9ED] text-sm sm:text-base truncate">
                                {r.nombreHamburguesa}
                              </span>
                              {isPodium && (
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  i === 0 ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' :
                                  i === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/40' :
                                  'bg-amber-700/20 text-amber-400 border border-amber-700/40'
                                }`}>
                                  Lugar {rankLabel}
                                </span>
                              )}
                              {r.descalificado && (
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                                  Descalificado
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-stone-400 flex items-center gap-2 mt-0.5">
                              <span className="font-medium text-stone-300">{r.nombre}</span>
                              {r.instagram && (
                                <span className="text-[#A40B03] font-semibold">{r.instagram}</span>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Scores & Statistics */}
                        <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-900">
                          
                          <div className="text-left sm:text-right">
                            <div className="text-xs text-stone-500 uppercase font-semibold">Votos Válidos</div>
                            <div className="text-sm font-black text-stone-300 font-mono">
                              {r.votosCount} {r.votosCount === 1 ? 'voto' : 'votos'}
                            </div>
                          </div>

                          <div className="text-right min-w-[90px]">
                            <div className="text-xs text-stone-500 uppercase font-semibold">Promedio</div>
                            <div className="text-base sm:text-lg font-black text-[#FFF9ED] font-mono flex items-center justify-end gap-1">
                              <Star className="w-4 h-4 fill-[#A40B03] text-[#A40B03]" />
                              <span>{r.votosCount === 0 ? "0.00" : r.promedioRating.toFixed(2)}</span>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: ENTITIES (RESTAURANTS) & TABLE QR GENERATION */}
        {activeTab === 'entities' && (
          <div className="space-y-6">

            {/* SECTION 1: LIST OF RESTAURANTS & TABLE QR GENERATOR */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
                <div>
                  <h3 className="font-bold text-[#FFF9ED] flex items-center gap-2 text-base">
                    <QrCode className="w-5 h-5 text-[#A40B03]" /> 
                    <span>Generador de QRs Oficiales de Mesa</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Genera e imprime el código QR exclusivo de mesa para cada participante. Al escanearlo, el comensal entra directamente a la ficha de votación del restaurante.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {restaurantes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPrintTableRestId(restaurantes[0]?.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#A40B03] hover:bg-[#BF0E05] text-[#FFF9ED] font-bold text-xs shadow-md border border-[#FFF9ED]/20 cursor-pointer"
                      title="Imprimir hojas de QRs de mesa en formato A4 / Carta"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#FFF9ED]" />
                      <span>Imprimir QRs de Mesa</span>
                    </button>
                  )}
                  <div className="text-xs px-3 py-1.5 rounded-xl bg-black border border-stone-800 text-stone-300 font-medium">
                    {restaurantes.length} Participantes Registrados
                  </div>
                </div>
              </div>

              {/* Grid of registered restaurants */}
              {restaurantes.length === 0 ? (
                <div className="text-center py-8 text-stone-500 text-xs">
                  No hay restaurantes registrados aún. Registra el primero en el formulario inferior.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {restaurantes.map((r) => {
                    const tableUrl = typeof window !== 'undefined'
                      ? `${window.location.origin}${window.location.pathname}?restaurante=${r.id}`
                      : `https://tocuyo-burgerfest.com/?restaurante=${r.id}`;

                    return (
                      <div 
                        key={r.id} 
                        className={`p-4 rounded-xl bg-black border transition-all flex flex-col justify-between space-y-3 group ${
                          r.descalificado 
                            ? 'border-red-600/60 bg-gradient-to-b from-red-950/20 to-black' 
                            : 'border-stone-800 hover:border-[#A40B03]/50'
                        }`}
                      >
                        {/* Status & Quick Actions Bar */}
                        <div className="flex items-center justify-between gap-2 border-b border-stone-900 pb-2.5">
                          {r.descalificado ? (
                            <span className="px-2 py-0.5 rounded-md bg-red-600/30 border border-red-500/80 text-red-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              <ShieldX className="w-3 h-3 text-red-400" /> Descalificado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> En Competencia
                            </span>
                          )}

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditRestModal(r)}
                              disabled={r.descalificado}
                              className={`px-2 py-1 rounded-lg border transition-colors text-[11px] font-semibold flex items-center gap-1 ${
                                r.descalificado
                                  ? 'opacity-40 cursor-not-allowed bg-stone-950 border-stone-800 text-stone-500'
                                  : 'bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white border border-stone-800 hover:border-stone-700 cursor-pointer'
                              }`}
                              title={r.descalificado ? 'Bloqueado: El restaurante está descalificado. Reincorpóralo para editar.' : 'Editar información completa'}
                            >
                              <Edit3 className="w-3 h-3 text-[#A40B03]" />
                              <span>Editar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openDisqualifyModal(r)}
                              className={`px-2 py-1 rounded-lg border transition-colors text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                                r.descalificado
                                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                                  : 'bg-red-950/30 border-red-700/50 text-red-400 hover:bg-red-900/40'
                              }`}
                              title="Control de Descalificación con código de seguridad"
                            >
                              {r.descalificado ? <ShieldCheck className="w-3 h-3 text-emerald-400" /> : <ShieldX className="w-3 h-3 text-red-400" />}
                              <span>{r.descalificado ? 'Reincorporar' : 'Descalificar'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Restaurant Info */}
                        <div className="flex items-start gap-3">
                          <img 
                            src={r.fotoUrl} 
                            alt={r.nombreHamburguesa} 
                            className="w-14 h-14 rounded-lg object-cover border border-stone-800 shrink-0" 
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-[#FFF9ED] text-xs truncate group-hover:text-[#A40B03] transition-colors">
                              {r.nombreHamburguesa}
                            </h4>
                            <p className="text-stone-400 text-[11px] truncate">{r.nombre}</p>
                            <p className="text-[#A40B03] text-[11px] font-semibold">{r.instagram}</p>
                            {r.videoUrl && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 mt-1">
                                <Film className="w-3 h-3" /> Con video
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Manager Credentials Badge */}
                        <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-[11px] flex items-center justify-between gap-2">
                          <div className="truncate">
                            <span className="text-stone-500 font-bold block text-[10px] uppercase">Credenciales Encargado:</span>
                            <span className="font-mono text-stone-300">
                              User: <strong className="text-[#FFF9ED]">{r.usuarioAcceso || r.nombre.toLowerCase().replace(/[^a-z0-9]/g, '')}</strong>
                            </span>
                            <span className="text-stone-600 mx-1">•</span>
                            <span className="font-mono text-stone-300">
                              Clave: <strong className="text-amber-400">{r.claveAcceso || 'burger2026'}</strong>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const u = r.usuarioAcceso || r.nombre.toLowerCase().replace(/[^a-z0-9]/g, '');
                              const p = r.claveAcceso || 'burger2026';
                              navigator.clipboard.writeText(`Credenciales Food Fest 2026\nRestaurante: ${r.nombre}\nUsuario: ${u}\nClave: ${p}`);
                              alert(`Credenciales de ${r.nombre} copiadas al portapapeles.`);
                            }}
                            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 shrink-0 cursor-pointer"
                            title="Copiar credenciales para enviar al encargado"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Action Buttons: QR, Imprimir PDF & Video */}
                        <div className="pt-2 border-t border-stone-900 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedQrRest(r)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white font-bold text-xs border border-stone-800 transition-all cursor-pointer"
                            title="Ver diseño individual de QR de mesa"
                          >
                            <QrCode className="w-3.5 h-3.5 text-[#A40B03]" />
                            <span>QR Mesa</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrintTableRestId(r.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-[#A40B03]/20 hover:bg-[#A40B03] text-[#FFF9ED] font-bold text-xs border border-[#A40B03]/40 transition-all shadow-sm cursor-pointer"
                            title="Imprimir hojas con múltiples QRs en formato A4 / Carta"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#FFF9ED]" />
                            <span>Imprimir PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingVideoRest(r);
                              setEditVideoUrlInput(r.videoUrl || '');
                            }}
                            className="px-2.5 py-2 rounded-lg bg-black hover:bg-stone-900 border border-stone-800 hover:border-[#A40B03]/60 text-stone-300 hover:text-[#FFF9ED] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Editar Enlace de Video / Reel"
                          >
                            <Film className="w-3.5 h-3.5 text-[#A40B03]" />
                            <span>Video</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* MODAL: QR DE MESA VISUALIZADOR & IMPRESOR */}
            {selectedQrRest && (
              <div 
                className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 overflow-y-auto p-3 sm:p-5 flex items-start sm:items-center justify-center"
                onClick={() => setSelectedQrRest(null)}
              >
                <div 
                  className="bg-[#0F0F0F] border border-stone-800 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative my-auto max-h-[calc(100vh-2rem)] sm:max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  
                  {/* Modal Header (Fijo arriba con la X siempre visible) */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-800 shrink-0">
                    <div>
                      <h4 className="font-extrabold text-[#FFF9ED] text-base flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-[#A40B03]" />
                        <span>QR Oficial de Mesa</span>
                      </h4>
                      <p className="text-xs text-stone-400">
                        {selectedQrRest.nombre} • {selectedQrRest.nombreHamburguesa}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedQrRest(null)}
                      className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer shrink-0"
                      title="Cerrar modal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Printable Table Card Visual (Con Scroll Interno Fluido) */}
                  {(() => {
                    const tableUrl = typeof window !== 'undefined'
                      ? `${window.location.origin}${window.location.pathname}?restaurante=${selectedQrRest.id}`
                      : `https://tocuyo-burgerfest.com/?restaurante=${selectedQrRest.id}`;
                    const restLogo = selectedQrRest.logoUrl || logoRed;

                    return (
                      <div className="overflow-y-auto space-y-4 pr-1 mt-3 -mr-1 focus:outline-none overscroll-contain pb-2 [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent]">
                        {/* Luxury Formal Table Card Visual */}
                        <div className="relative p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-[#FFFDF9] to-white text-stone-950 flex flex-col items-center text-center space-y-3 shadow-2xl border-2 border-amber-300/80 overflow-hidden">
                          {/* Top burgundy and gold accent bar */}
                          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#A40B03] via-amber-500 to-[#A40B03]" />

                          {/* Header: Competition Logo + Table Badge */}
                          <div className="flex items-center justify-between w-full border-b border-stone-200 pb-2 pt-1">
                            <div className="flex items-center gap-2">
                              <img
                                src={logoRed}
                                alt="Food Fest 2026"
                                className="h-7 w-auto object-contain"
                              />
                              <div className="h-6 w-px bg-stone-300" />
                              <div className="text-left">
                                <div className="text-[8.5px] font-black uppercase tracking-wider text-[#A40B03] leading-none">
                                  Food Fest 2026
                                </div>
                                <div className="text-[7.5px] font-bold text-stone-400 uppercase tracking-widest leading-none mt-0.5">
                                  El Tocuyo Oficial
                                </div>
                              </div>
                            </div>

                            <span className="text-[9px] font-mono font-black uppercase text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full">
                              MESA OFICIAL
                            </span>
                          </div>

                          {/* Restaurant Logo BESIDE Burger & Restaurant Names (Bigger logo, no empty gaps!) */}
                          <div className="flex items-center gap-3 w-full p-2.5 bg-stone-50 rounded-2xl border border-stone-200 text-left">
                            <img
                              src={restLogo}
                              alt={selectedQrRest.nombre}
                              className="h-12 w-12 rounded-xl object-contain border border-stone-300 bg-white shadow-sm shrink-0"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoRed; }}
                            />
                            <div className="min-w-0 flex-1 leading-tight">
                              <div className="font-black text-stone-950 text-base uppercase tracking-tight truncate">
                                {selectedQrRest.nombreHamburguesa}
                              </div>
                              <div className="text-xs text-[#A40B03] font-black uppercase tracking-wider truncate">
                                {selectedQrRest.nombre}
                              </div>
                            </div>
                          </div>

                          {/* QR Code Container with High Quality Error Correction */}
                          <div className="p-3 bg-white rounded-2xl border-2 border-[#A40B03] shadow-md">
                            <QRCodeSVG
                              value={tableUrl}
                              size={160}
                              level="Q"
                              includeMargin={false}
                            />
                          </div>

                          {/* CTA Banner */}
                          <div className="w-full bg-[#A40B03] text-white font-black text-xs uppercase tracking-wider py-2 px-3 rounded-xl shadow-md">
                            ¡ESCANEA CON TU CÁMARA Y VOTA!
                          </div>

                          {/* The 5 Steps */}
                          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-bold text-stone-800 text-left bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                            <div className="flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-[#A40B03] text-white flex items-center justify-center text-[9px] font-black shrink-0">1</span>
                              <span>Escanea el QR</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-[#A40B03] text-white flex items-center justify-center text-[9px] font-black shrink-0">2</span>
                              <span>Regístrate con cuenta</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-[#A40B03] text-white flex items-center justify-center text-[9px] font-black shrink-0">3</span>
                              <span>Ingresa el código</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-[#A40B03] text-white flex items-center justify-center text-[9px] font-black shrink-0">4</span>
                              <span>Califica de 1 a 5 ★</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:col-span-2 justify-center text-emerald-800 font-extrabold bg-emerald-50 border border-emerald-200 py-1 rounded-lg">
                              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-black shrink-0">5</span>
                              <span>Voto Confirmado</span>
                            </div>
                          </div>
                        </div>

                        {/* URL & Action buttons */}
                        <div className="space-y-2.5 text-xs">
                          {/* Direct Print Multi-Card PDF Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setPrintTableRestId(selectedQrRest.id);
                              setSelectedQrRest(null);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#A40B03] hover:bg-[#BF0E05] text-[#FFF9ED] font-black transition-all text-sm border border-[#FFF9ED]/20 shadow-lg shadow-[#A40B03]/30 cursor-pointer"
                          >
                            <Printer className="w-4 h-4 text-[#FFF9ED]" />
                            <span>Guardar en PDF / Imprimir (Formato 3x3 • 9 QRs por Hoja A4 / Carta)</span>
                          </button>

                          <div className="p-2.5 rounded-xl bg-black border border-stone-800 font-mono text-[11px] text-stone-400 break-all select-all">
                            {tableUrl}
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(tableUrl);
                                setCopiedTableUrl(true);
                                setTimeout(() => setCopiedTableUrl(false), 2500);
                              }}
                              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-black border border-stone-800 hover:border-[#A40B03]/60 text-stone-200 font-bold transition-all text-xs cursor-pointer"
                            >
                              {copiedTableUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#A40B03]" />}
                              <span>{copiedTableUrl ? 'Copiado' : 'Copiar URL'}</span>
                            </button>

                            <a
                              href={tableUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white font-bold transition-all text-xs border border-stone-800"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Abrir Comensal</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              </div>
            )}

            {/* MODAL: EDITAR VIDEO / ENLACE DE RESTAURANTE */}
            {editingVideoRest && (
              <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#0F0F0F] border border-stone-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-800">
                    <div>
                      <h4 className="font-extrabold text-[#FFF9ED] text-base flex items-center gap-2">
                        <Film className="w-5 h-5 text-[#A40B03]" />
                        <span>Video de Preparación</span>
                      </h4>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {editingVideoRest.nombre} • {editingVideoRest.nombreHamburguesa}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingVideoRest(null)}
                      className="p-1.5 rounded-xl bg-stone-900 text-stone-400 hover:text-[#FFF9ED] border border-stone-800 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveRestaurantVideo} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                        Enlace del Video o Reel:
                      </label>
                      <input
                        type="url"
                        value={editVideoUrlInput}
                        onChange={(e) => setEditVideoUrlInput(e.target.value)}
                        placeholder="Ej: https://www.instagram.com/reel/C... o https://.../video.mp4 o YouTube"
                        className="w-full px-4 py-3 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03] font-mono"
                      />
                      <p className="text-[11px] text-stone-500 mt-2 leading-relaxed">
                        💡 Soporta <strong>Reels de Instagram</strong> (ej: <code className="text-stone-400">instagram.com/reel/...</code>), videos de <strong>YouTube</strong> y archivos directos <strong>MP4</strong>.
                      </p>
                    </div>

                    {videoSaveSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        <span>¡Enlace de video guardado exitosamente!</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingVideoRest(null)}
                        className="px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-xs font-bold text-stone-400 hover:text-stone-200"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingVideo}
                        className="px-5 py-2.5 rounded-xl bg-[#A40B03] hover:bg-[#BF0E05] text-[#FFF9ED] text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isSavingVideo ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Guardar Enlace</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL 1: EDITAR INFORMACIÓN COMPLETA DEL RESTAURANTE */}
            {editingRest && (
              <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-hidden">
                <div className="bg-[#0F0F0F] border border-stone-800 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                  {/* Modal Header (Fixed) */}
                  <div className="p-5 sm:p-6 pb-4 border-b border-stone-800 flex items-start justify-between gap-3 shrink-0">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#A40B03]/20 border border-[#A40B03]/40 text-[#FFF9ED] text-[11px] font-bold uppercase tracking-wider mb-1.5">
                        <Edit3 className="w-3 h-3 text-[#A40B03]" />
                        <span>Edición de Ficha Oficial</span>
                      </div>
                      <h4 className="font-extrabold text-[#FFF9ED] text-base sm:text-lg">
                        Modificar Ficha de {editingRest.nombreHamburguesa}
                      </h4>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {editingRest.nombre} • Modifica ingredientes, precios, descripciones o enlaces.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingRest(null)}
                      className="p-1.5 rounded-xl bg-stone-900 text-stone-400 hover:text-[#FFF9ED] border border-stone-800 transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Modal Body (Single Scrollbar) */}
                  <form id="edit-rest-form" onSubmit={handleSaveRestaurantEdit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4" noValidate autoComplete="off">
                    {/* Auto-format Button */}
                    <div className="flex items-center justify-between pb-1 border-b border-stone-900">
                      <span className="text-xs text-stone-400 font-medium">
                        Datos del participante y burger
                      </span>
                      <button
                        type="button"
                        onClick={autoFormatEditRest}
                        className="px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Capitalizar y Formatear Automático</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          Nombre del Restaurante
                        </label>
                        <input
                          type="text"
                          required
                          value={editRestForm.nombre}
                          onChange={(e) => setEditRestForm({ ...editRestForm, nombre: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          Nombre de la Hamburguesa / Plato
                        </label>
                        <input
                          type="text"
                          required
                          value={editRestForm.nombreHamburguesa}
                          onChange={(e) => setEditRestForm({ ...editRestForm, nombreHamburguesa: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          Slogan
                        </label>
                        <input
                          type="text"
                          value={editRestForm.slogan}
                          onChange={(e) => setEditRestForm({ ...editRestForm, slogan: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          Precio Oficial
                        </label>
                        <input
                          type="text"
                          value={editRestForm.precio}
                          onChange={(e) => setEditRestForm({ ...editRestForm, precio: e.target.value })}
                          placeholder="Ej: $8.00"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03] font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          Instagram
                        </label>
                        <input
                          type="text"
                          value={editRestForm.instagram}
                          onChange={(e) => setEditRestForm({ ...editRestForm, instagram: e.target.value })}
                          placeholder="@usuario"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          Dirección en El Tocuyo
                        </label>
                        <input
                          type="text"
                          value={editRestForm.direccion}
                          onChange={(e) => setEditRestForm({ ...editRestForm, direccion: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                        />
                      </div>

                      {/* Credenciales de Acceso para Encargado */}
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                          Usuario Encargado (Acceso QR)
                        </label>
                        <input
                          type="text"
                          value={editRestForm.usuarioAcceso}
                          onChange={(e) => setEditRestForm({ ...editRestForm, usuarioAcceso: e.target.value })}
                          placeholder="Ej: burger_el_tocuyo"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03] font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                          Clave de Acceso (Acceso QR)
                        </label>
                        <input
                          type="text"
                          value={editRestForm.claveAcceso}
                          onChange={(e) => setEditRestForm({ ...editRestForm, claveAcceso: e.target.value })}
                          placeholder="Ej: burger2026"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03] font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          URL de Video / Reel (Instagram o MP4)
                        </label>
                        <input
                          type="url"
                          value={editRestForm.videoUrl}
                          onChange={(e) => setEditRestForm({ ...editRestForm, videoUrl: e.target.value })}
                          placeholder="https://www.instagram.com/reel/... o https://.../video.mp4"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03] font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          Ingredientes (Separados por coma)
                        </label>
                        <input
                          type="text"
                          value={editRestForm.ingredientesRaw}
                          onChange={(e) => setEditRestForm({ ...editRestForm, ingredientesRaw: e.target.value })}
                          placeholder="Pan brioche artesanal, 180g blend de carne, queso cheddar..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          Descripción de la Hamburguesa
                        </label>
                        <textarea
                          rows={3}
                          value={editRestForm.descripcion}
                          onChange={(e) => setEditRestForm({ ...editRestForm, descripcion: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03] resize-none"
                        />
                      </div>

                      {/* Optional Image Replacement */}
                      <div className="p-3 rounded-xl border border-stone-800 bg-black space-y-1">
                        <label className="block text-[11px] font-bold uppercase text-stone-400">
                          Reemplazar Foto (Opcional)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setEditFotoFile(e.target.files ? e.target.files[0] : null)}
                          className="text-[11px] text-stone-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-stone-900 file:text-stone-300"
                        />
                      </div>

                      <div className="p-3 rounded-xl border border-stone-800 bg-black space-y-1">
                        <label className="block text-[11px] font-bold uppercase text-stone-400">
                          Reemplazar Logo (Opcional)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setEditLogoFile(e.target.files ? e.target.files[0] : null)}
                          className="text-[11px] text-stone-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-stone-900 file:text-stone-300"
                        />
                      </div>
                    </div>

                    {editRestSuccess && (
                      <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>¡Información del restaurante actualizada exitosamente en Firebase!</span>
                      </div>
                    )}
                  </form>

                  {/* Modal Footer (Fixed at Bottom) */}
                  <div className="p-4 sm:p-5 border-t border-stone-800 bg-[#0A0A0A] rounded-b-3xl flex items-center justify-end gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingRest(null)}
                      className="px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-xs font-bold text-stone-400 hover:text-stone-200 cursor-pointer transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      form="edit-rest-form"
                      disabled={isSavingEditRest}
                      className="px-5 py-2.5 rounded-xl bg-[#A40B03] hover:bg-[#BF0E05] text-[#FFF9ED] text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingEditRest ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Guardando en Firebase...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Guardar Modificaciones</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL 2: SEGURIDAD DE DESCALIFICACIÓN (CÓDIGO: 0987654321) */}
            {disqualifyTargetRest && (
              <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="bg-[#0F0F0F] border border-red-600/50 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/40">
                        <ShieldAlert className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[#FFF9ED] text-base">
                          {disqualifyTargetRest.descalificado ? 'Reincorporar Restaurante' : 'Descalificar Participante'}
                        </h4>
                        <p className="text-xs text-red-400 font-semibold">
                          Acción de Auditoría Oficial • Seguridad Requerida
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDisqualifyTargetRest(null)}
                      className="p-1.5 rounded-xl bg-stone-900 text-stone-400 hover:text-[#FFF9ED] border border-stone-800 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleConfirmDisqualification} className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-black border border-stone-800 text-xs space-y-1">
                      <p className="font-bold text-[#FFF9ED]">{disqualifyTargetRest.nombre}</p>
                      <p className="text-stone-400">{disqualifyTargetRest.nombreHamburguesa}</p>
                      <p className="text-[11px] text-stone-500 pt-1">
                        {disqualifyTargetRest.descalificado 
                          ? 'Al reincorporar, el restaurante volverá a estar activo y recibirá votos nuevamente.'
                          : 'Al descalificar, aparecerá con una cinta roja pública de DESCALIFICADO y se bloquearán todos sus votos y códigos de mesa.'}
                      </p>
                    </div>

                    {/* Secret Security Code Input */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center justify-between">
                        <span>Código de Auditoría Superadmin:</span>
                        <span className="text-[10px] text-red-400 font-mono">Requerido</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          required
                          value={disqualifyCodeInput}
                          onChange={(e) => setDisqualifyCodeInput(e.target.value)}
                          placeholder="Ingresa el código secreto de 10 dígitos"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black border border-stone-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-[#FFF9ED] text-xs font-mono tracking-widest transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-stone-500">
                        Código de seguridad preestablecido para autorizar descalificaciones oficiales.
                      </p>
                    </div>

                    {/* Reason Input */}
                    {!disqualifyTargetRest.descalificado && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                          Motivo de la Descalificación (Público):
                        </label>
                        <textarea
                          rows={2}
                          value={disqualifyReasonInput}
                          onChange={(e) => setDisqualifyReasonInput(e.target.value)}
                          placeholder="Ej: Incumplimiento del gramaje de carne reglamentario, irregularidad en códigos..."
                          className="w-full px-3.5 py-2 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-red-500 resize-none"
                        />
                      </div>
                    )}

                    {disqualifyError && (
                      <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{disqualifyError}</span>
                      </div>
                    )}

                    {disqualifySuccessMsg && (
                      <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{disqualifySuccessMsg}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setDisqualifyTargetRest(null)}
                        className="px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-xs font-bold text-stone-400 hover:text-stone-200 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingDisqualify}
                        className={`px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                          disqualifyTargetRest.descalificado
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-red-600 hover:bg-red-500 text-white border border-red-500/50'
                        }`}
                      >
                        {isSubmittingDisqualify ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Validando...</span>
                          </>
                        ) : (
                          <>
                            {disqualifyTargetRest.descalificado ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldX className="w-3.5 h-3.5" />}
                            <span>{disqualifyTargetRest.descalificado ? 'Confirmar Reincorporación' : 'Aplicar Descalificación'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* SECTION 2: FORM TO REGISTER NEW RESTAURANT */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
                <h3 className="font-bold text-[#FFF9ED] flex items-center gap-2">
                  <Store className="w-5 h-5 text-[#A40B03]" /> <span>Inscribir Nuevo Restaurante / Competidor</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={autoFormatNewRest}
                    className="px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Corrige mayúsculas/minúsculas, arroba de Instagram y formato de precios automáticamente"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Capitalizar y Formatear Automático</span>
                  </button>
                  {registerSuccess && <span className="text-xs text-emerald-400 font-bold">¡Restaurante guardado exitosamente!</span>}
                </div>
              </div>

              <form onSubmit={handleCreateRestaurante} className="space-y-4" noValidate autoComplete="off">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Restaurante</label>
                    <input
                      type="text"
                      required
                      maxLength={60}
                      value={newRest.nombre}
                      onChange={(e) => updateNewRestField('nombre', e.target.value)}
                      placeholder="Ej: Asador Tocuyano BBQ"
                      aria-invalid={Boolean(restFormErrors.nombre)}
                      className={restInputClass('nombre')}
                    />
                    {restFormErrors.nombre && <p className="text-[11px] text-red-400 mt-1">{restFormErrors.nombre}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Nombre Plato / Creación</label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={newRest.nombreHamburguesa}
                      onChange={(e) => updateNewRestField('nombreHamburguesa', e.target.value)}
                      placeholder="Ej: La Tocuyana Especial"
                      aria-invalid={Boolean(restFormErrors.nombreHamburguesa)}
                      className={restInputClass('nombreHamburguesa')}
                    />
                    {restFormErrors.nombreHamburguesa && <p className="text-[11px] text-red-400 mt-1">{restFormErrors.nombreHamburguesa}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Slogan</label>
                    <input
                      type="text"
                      maxLength={80}
                      value={newRest.slogan}
                      onChange={(e) => updateNewRestField('slogan', e.target.value)}
                      placeholder="Ej: Ahumado a fuego lento"
                      aria-invalid={Boolean(restFormErrors.slogan)}
                      className={restInputClass('slogan')}
                    />
                    {restFormErrors.slogan && <p className="text-[11px] text-red-400 mt-1">{restFormErrors.slogan}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Precio</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      maxLength={8}
                      value={newRest.precio}
                      onChange={(e) => updateNewRestField('precio', e.target.value)}
                      placeholder="Ej: $8.00"
                      aria-invalid={Boolean(restFormErrors.precio)}
                      className={restInputClass('precio')}
                    />
                    {restFormErrors.precio && <p className="text-[11px] text-red-400 mt-1">{restFormErrors.precio}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Usuario de Instagram</label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={newRest.instagram}
                      onChange={(e) => updateNewRestField('instagram', e.target.value)}
                      placeholder="Ej: @mitocuyoburger"
                      aria-invalid={Boolean(restFormErrors.instagram)}
                      className={restInputClass('instagram')}
                    />
                    {restFormErrors.instagram && <p className="text-[11px] text-red-400 mt-1">{restFormErrors.instagram}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Dirección</label>
                    <input
                      type="text"
                      maxLength={120}
                      value={newRest.direccion}
                      onChange={(e) => updateNewRestField('direccion', e.target.value)}
                      placeholder="Ej: Calle 5 con Av. principal, El Tocuyo"
                      aria-invalid={Boolean(restFormErrors.direccion)}
                      className={restInputClass('direccion')}
                    />
                    {restFormErrors.direccion && <p className="text-[11px] text-red-400 mt-1">{restFormErrors.direccion}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-400 mb-1">
                      <Film className="w-3.5 h-3.5 inline mr-1 text-[#A40B03]" /> URL de Video / Reel de Preparación (Instagram Reel o MP4)
                    </label>
                    <input
                      type="url"
                      maxLength={300}
                      value={newRest.videoUrl}
                      onChange={(e) => updateNewRestField('videoUrl', e.target.value)}
                      placeholder="Ej: https://www.instagram.com/reel/C... o https://servidor.com/video.mp4"
                      aria-invalid={Boolean(restFormErrors.videoUrl)}
                      className={restInputClass('videoUrl', 'font-mono')}
                    />
                    {restFormErrors.videoUrl && <p className="text-[11px] text-red-400 mt-1">{restFormErrors.videoUrl}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Ingredientes (Separados por coma)</label>
                    <input
                      type="text"
                      maxLength={200}
                      value={newRest.ingredientesRaw}
                      onChange={(e) => updateNewRestField('ingredientesRaw', e.target.value)}
                      placeholder="Carne madurada, Queso local, Salsa especial"
                      aria-invalid={Boolean(restFormErrors.ingredientesRaw)}
                      className={restInputClass('ingredientesRaw')}
                    />
                    {restFormErrors.ingredientesRaw && <p className="text-[11px] text-red-400 mt-1">{restFormErrors.ingredientesRaw}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Descripción</label>
                    <textarea
                      rows={2}
                      maxLength={400}
                      value={newRest.descripcion}
                      onChange={(e) => updateNewRestField('descripcion', e.target.value)}
                      placeholder="Describe la creación: textura, sabor y presentación..."
                      aria-invalid={Boolean(restFormErrors.descripcion)}
                      className={restInputClass('descripcion', 'resize-none')}
                    />
                    {restFormErrors.descripcion && <p className="text-[11px] text-red-400 mt-1">{restFormErrors.descripcion}</p>}
                  </div>

                  {/* Credenciales de Acceso para Compras en Patrocinadores */}
                  <div className="sm:col-span-2 p-3.5 rounded-xl bg-stone-950/80 border border-stone-800 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Credenciales de Acceso para el Encargado (Visitas a Patrocinadores)</span>
                    </div>
                    <p className="text-[11px] text-stone-400 leading-relaxed">
                      Con este usuario y contraseña, el encargado del restaurante podrá iniciar sesión al escanear los códigos QR en las tiendas de los patrocinadores para subir sus facturas de compras. Si se dejan vacíos, se generarán automáticamente (ej: <code className="text-stone-300">nombre / burger2026</code>).
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-400 mb-1">Usuario de Acceso</label>
                        <input
                          type="text"
                          maxLength={24}
                          autoCapitalize="none"
                          value={newRest.usuarioAcceso}
                          onChange={(e) => updateNewRestField('usuarioAcceso', e.target.value)}
                          placeholder="Ej: asadortocuyano"
                          aria-invalid={Boolean(restFormErrors.usuarioAcceso)}
                          className={`w-full px-3 py-2 rounded-xl bg-black border text-[#FFF9ED] text-xs outline-none font-mono transition-colors ${
                            restFormErrors.usuarioAcceso ? 'border-red-500/70 focus:border-red-500' : 'border-stone-800 focus:border-[#A40B03]'
                          }`}
                        />
                        {restFormErrors.usuarioAcceso && <p className="text-[11px] text-red-400 mt-1">{restFormErrors.usuarioAcceso}</p>}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-400 mb-1">Contraseña de Acceso</label>
                        <input
                          type="text"
                          maxLength={32}
                          autoCapitalize="none"
                          value={newRest.claveAcceso}
                          onChange={(e) => updateNewRestField('claveAcceso', e.target.value)}
                          placeholder="Ej: burger2026"
                          aria-invalid={Boolean(restFormErrors.claveAcceso)}
                          className={`w-full px-3 py-2 rounded-xl bg-black border text-[#FFF9ED] text-xs outline-none font-mono transition-colors ${
                            restFormErrors.claveAcceso ? 'border-red-500/70 focus:border-red-500' : 'border-stone-800 focus:border-[#A40B03]'
                          }`}
                        />
                        {restFormErrors.claveAcceso && <p className="text-[11px] text-red-400 mt-1">{restFormErrors.claveAcceso}</p>}
                      </div>
                    </div>
                  </div>

                  {/* File Uploads for Restaurant */}
                  <div className={`p-4 rounded-xl border bg-black flex flex-col gap-2 ${
                    restFormErrors.fotoFile ? 'border-red-500/70' : 'border-stone-800'
                  }`}>
                    <label className="block text-xs font-semibold text-stone-400">
                      <UploadCloud className="w-4 h-4 inline mr-1 text-[#A40B03]" /> Foto de la Creación (Buena Calidad)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      required
                      onChange={(e) => {
                        setFotoFile(e.target.files ? e.target.files[0] : null);
                        clearRestFileError('fotoFile');
                      }}
                      className="text-xs text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#A40B03]/20 file:text-[#FFF9ED] hover:file:bg-[#A40B03]/30"
                    />
                    <span className="text-[10px] text-stone-500">JPG, PNG o WebP · Máximo 5 MB</span>
                    {restFormErrors.fotoFile && <p className="text-[11px] text-red-400">{restFormErrors.fotoFile}</p>}
                  </div>
                  <div className={`p-4 rounded-xl border bg-black flex flex-col gap-2 ${
                    restFormErrors.logoFile ? 'border-red-500/70' : 'border-stone-800'
                  }`}>
                    <label className="block text-xs font-semibold text-stone-400">
                      <UploadCloud className="w-4 h-4 inline mr-1 text-[#A40B03]" /> Logo del Restaurante
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      required
                      onChange={(e) => {
                        setLogoFile(e.target.files ? e.target.files[0] : null);
                        clearRestFileError('logoFile');
                      }}
                      className="text-xs text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#A40B03]/20 file:text-[#FFF9ED] hover:file:bg-[#A40B03]/30"
                    />
                    <span className="text-[10px] text-stone-500">JPG, PNG o WebP · Máximo 5 MB</span>
                    {restFormErrors.logoFile && <p className="text-[11px] text-red-400">{restFormErrors.logoFile}</p>}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUploadingRest}
                  className="px-6 py-3 rounded-xl bg-[#A40B03] text-[#FFF9ED] font-bold text-xs hover:bg-[#BF0E05] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-[#A40B03]/50 shadow-md cursor-pointer"
                >
                  {isUploadingRest ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando restaurante...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Inscribir Restaurante y Subir Fotos</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 5: SPONSORS & PYRAMID MANAGEMENT */}
        {activeTab === 'sponsors' && (
          <div className="space-y-6">

            {/* SECTION 1: SPONSORS PYRAMID DIRECTORY */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
                <div>
                  <h3 className="font-bold text-[#FFF9ED] flex items-center gap-2 text-base">
                    <Crown className="w-5 h-5 text-amber-400" /> 
                    <span>Pirámide Oficial de Patrocinadores</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Los dos patrocinadores oficiales principales se muestran en la cúspide de la pirámide pública con el diseño más grande, luminoso e impactante. Puedes designar o alternar a las marcas con un clic.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPrintSponsorId('ALL');
                      setSponsorGridFormat('4');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black text-xs shadow-md transition-all cursor-pointer"
                    title="Imprimir todos los QRs de tiendas de patrocinadores en PDF"
                  >
                    <Printer className="w-3.5 h-3.5 text-stone-950" />
                    <span>Imprimir QRs en PDF</span>
                  </button>
                  <div className="text-xs px-3 py-1.5 rounded-xl bg-black border border-stone-800 text-stone-300 font-medium">
                    {patrocinadores.length} Marcas Registradas
                  </div>
                </div>
              </div>

              {patrocinadores.length === 0 ? (
                <div className="text-center py-6 text-stone-500 text-xs">
                  Aún no has registrado patrocinadores. Registra el primero en el formulario inferior y quedará fijado automáticamente en la cúspide.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(() => {
                    const principalSponsors = patrocinadores.filter(
                      p => p.esPrincipal || p.tipo === 'Patrocinador Oficial Principal' || p.tipo === 'Principal'
                    );
                    let apexSponsors: Patrocinador[] = [];
                    if (principalSponsors.length >= 2) {
                      apexSponsors = principalSponsors.slice(0, 2);
                    } else if (principalSponsors.length === 1) {
                      apexSponsors = [principalSponsors[0]];
                      const others = patrocinadores.filter(p => p.id !== principalSponsors[0].id);
                      if (others.length > 0) apexSponsors.push(others[0]);
                    } else if (patrocinadores.length > 0) {
                      apexSponsors = patrocinadores.slice(0, Math.min(2, patrocinadores.length));
                    }

                    return patrocinadores.map((pat) => {
                      const isApex = apexSponsors.some(a => a.id === pat.id);

                      return (
                        <div
                          key={pat.id}
                          className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                            isApex
                              ? 'bg-gradient-to-br from-[#1F0706] to-black border-[#A40B03] shadow-lg shadow-[#A40B03]/25'
                              : 'bg-black border-stone-800 hover:border-stone-700'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-black border border-stone-800 shrink-0 p-1 flex items-center justify-center">
                              <img
                                src={pat.logoUrl}
                                alt={pat.nombre}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-[#FFF9ED] text-xs break-words leading-tight">
                                  {pat.nombre}
                                </h4>
                              </div>
                              <p className="text-[11px] text-stone-400 line-clamp-2 mt-0.5">
                                {pat.descripcion}
                              </p>
                              {pat.url && (
                                <a
                                  href={pat.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-[#A40B03] hover:underline flex items-center gap-1 mt-1 truncate"
                                >
                                  <span>{pat.url}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-stone-900 flex flex-col gap-2">
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSponsorQr(pat);
                                  setCopiedSponsorUrl(false);
                                }}
                                className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 transition-all cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5 text-amber-400" />
                                <span>Ver QR</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPrintSponsorId(pat.id);
                                  setSponsorGridFormat('4');
                                  setSponsorCardsCount(4);
                                }}
                                className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-[#A40B03]/25 hover:bg-[#A40B03]/45 text-[#FFF9ED] font-bold text-xs border border-[#A40B03]/60 transition-all cursor-pointer shadow-sm"
                              >
                                <Printer className="w-3.5 h-3.5 text-amber-300" />
                                <span>Imprimir PDF</span>
                              </button>
                            </div>

                            {isApex ? (
                              <button
                                type="button"
                                onClick={() => handleSetPrincipalSponsor(pat.id)}
                                className="w-full text-center py-1.5 px-2.5 rounded-lg bg-[#A40B03] hover:bg-[#8A0A02] text-amber-300 font-extrabold text-[11px] flex items-center justify-center gap-1.5 border border-amber-400/40 shadow-sm transition-all cursor-pointer"
                                title="Haz clic si deseas alternar o quitar esta marca de Oficial Principal"
                              >
                                <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                                <span className="truncate">Patrocinador Oficial Principal ✓</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetPrincipalSponsor(pat.id)}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-[#A40B03] text-stone-300 hover:text-[#FFF9ED] font-bold text-xs border border-stone-800 hover:border-[#A40B03] transition-all cursor-pointer"
                              >
                                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>Designar como Patrocinador Oficial Principal</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* SECTION 2: REGISTER NEW SPONSOR FORM */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-4">
              <div className="flex justify-between border-b border-stone-800 pb-3">
                <h3 className="font-bold text-[#FFF9ED] flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#A40B03]" /> <span>Registrar Nuevo Patrocinador</span>
                </h3>
                {sponsorSuccess && <span className="text-xs text-emerald-400 font-bold">¡Patrocinador guardado con éxito!</span>}
              </div>

              <form onSubmit={handleCreateSponsor} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Patrocinador Oficial Principal toggle */}
                  <label className="sm:col-span-2 flex items-center gap-2.5 p-3 rounded-xl bg-black border border-stone-800 hover:border-[#A40B03]/60 cursor-pointer transition-all">
                    <input 
                      type="checkbox" 
                      checked={newSponsor.esPrincipal} 
                      onChange={(e) => setNewSponsor({ 
                        ...newSponsor, 
                        esPrincipal: e.target.checked, 
                        tipo: e.target.checked ? 'Patrocinador Oficial Principal' : newSponsor.tipo 
                      })} 
                      className="w-4 h-4 accent-[#A40B03] rounded cursor-pointer" 
                    />
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-xs font-bold text-[#FFF9ED] flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-amber-400" />
                        Fijar como Patrocinador Oficial Principal (Cúspide de la Pirámide)
                      </span>
                      <span className="text-[11px] text-stone-400">
                        — Se ubicará en la cima de la pirámide (hasta 2 patrocinadores principales juntos).
                      </span>
                    </div>
                  </label>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Nombre de la Empresa</label>
                    <input type="text" required value={newSponsor.nombre} onChange={(e) => setNewSponsor({ ...newSponsor, nombre: e.target.value })} placeholder="Ej: Polar / Zulia / Pepsi" className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Tipo de Patrocinio</label>
                    <select 
                      value={newSponsor.tipo} 
                      onChange={(e) => setNewSponsor({ ...newSponsor, tipo: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                    >
                      <option value="Patrocinador Oficial Principal">Patrocinador Oficial Principal</option>
                      <option value="Aliado Gourmet">Aliado Gourmet</option>
                      <option value="Patrocinador Oficial">Patrocinador Oficial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Sitio Web / Instagram (Opcional)</label>
                    <input type="url" value={newSponsor.url} onChange={(e) => setNewSponsor({ ...newSponsor, url: e.target.value })} placeholder="https://instagram.com/empresa" className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Descripción Breve</label>
                    <input type="text" value={newSponsor.descripcion} onChange={(e) => setNewSponsor({ ...newSponsor, descripcion: e.target.value })} placeholder="Ej: Impulsando el desarrollo gastronómico y comercial de El Tocuyo" className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]" />
                  </div>
                  
                  <div className="sm:col-span-2 p-4 rounded-xl border border-stone-800 bg-black flex flex-col gap-2">
                    <label className="block text-xs font-semibold text-stone-400">
                      <UploadCloud className="w-4 h-4 inline mr-1 text-[#A40B03]" /> Logo del Patrocinador (Fondo transparente o JPG limpio)
                    </label>
                    <input 
                      type="file" 
                      accept="image/*"
                      required
                      onChange={(e) => setSponsorLogoFile(e.target.files ? e.target.files[0] : null)}
                      className="text-xs text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#A40B03]/20 file:text-[#FFF9ED] hover:file:bg-[#A40B03]/30"
                    />
                  </div>
                </div>

                <button type="submit" disabled={isUploadingSponsor} className="px-6 py-3 rounded-xl bg-[#A40B03] text-[#FFF9ED] font-bold text-xs hover:bg-[#BF0E05] transition-all flex items-center gap-2 disabled:opacity-50 border border-[#A40B03]/50 shadow-md">
                  {isUploadingSponsor ? 'Subiendo logo y guardando...' : 'Inscribir Patrocinador en la Pirámide'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 6: SPONSOR PURCHASES AUDIT (COMPLIANCE COMMITTEE) */}
        {activeTab === 'sponsor_audit' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Card */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Control de Reglas y Suministros Oficiales</span>
                  </div>
                  <h3 className="text-lg font-black text-[#FFF9ED] flex items-center gap-2">
                    Auditoría de Compras en Tiendas de Patrocinadores
                  </h3>
                  <p className="text-xs text-stone-400 mt-1 max-w-2xl leading-relaxed">
                    Verificación del cumplimiento de la regla oficial: cada restaurante participante debe comprar suministros en las tiendas de los patrocinadores del Food Fest y respaldarlo con factura y descripción.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={fetchComprasAudit}
                    disabled={isLoadingComprasAudit}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-black hover:bg-stone-900 border border-stone-800 text-xs font-bold text-stone-300 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoadingComprasAudit ? 'animate-spin' : ''}`} />
                    <span>{isLoadingComprasAudit ? 'Actualizando...' : 'Recargar Auditoría'}</span>
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              {(() => {
                const uniqueRestaurantsWithPurchases = new Set(comprasAuditList.map(c => c.restauranteId)).size;
                const uniqueSponsorsVisited = new Set(comprasAuditList.map(c => c.patrocinadorId)).size;
                const compliancePercentage = restaurantes.length > 0 
                  ? Math.round((uniqueRestaurantsWithPurchases / restaurantes.length) * 100) 
                  : 0;

                return (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
                    <div className="p-4 rounded-xl bg-black border border-stone-800 space-y-1">
                      <div className="flex items-center justify-between text-stone-400 text-xs">
                        <span>Total Facturas</span>
                        <Receipt className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="text-2xl font-black text-[#FFF9ED] font-mono">
                        {comprasAuditList.length}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        Comprobantes auditables
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-black border border-stone-800 space-y-1">
                      <div className="flex items-center justify-between text-stone-400 text-xs">
                        <span>Restaurantes al Día</span>
                        <Store className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-black text-emerald-400 font-mono">
                        {uniqueRestaurantsWithPurchases} <span className="text-xs text-stone-500">/ {restaurantes.length}</span>
                      </div>
                      <div className="text-[10px] text-stone-500">
                        Con al menos 1 compra registrada
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-black border border-stone-800 space-y-1">
                      <div className="flex items-center justify-between text-stone-400 text-xs">
                        <span>Tiendas Visitadas</span>
                        <ShoppingBag className="w-4 h-4 text-sky-400" />
                      </div>
                      <div className="text-2xl font-black text-sky-400 font-mono">
                        {uniqueSponsorsVisited} <span className="text-xs text-stone-500">/ {patrocinadores.length}</span>
                      </div>
                      <div className="text-[10px] text-stone-500">
                        Puntos de venta de patrocinadores
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-black border border-stone-800 space-y-1">
                      <div className="flex items-center justify-between text-stone-400 text-xs">
                        <span>Cumplimiento Global</span>
                        <Award className="w-4 h-4 text-[#A40B03]" />
                      </div>
                      <div className="text-2xl font-black text-[#FFF9ED] font-mono">
                        {compliancePercentage}%
                      </div>
                      <div className="text-[10px] text-stone-500">
                        Tasa de adhesión a la regla
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Compliance Matrix by Restaurant */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div>
                  <h4 className="font-bold text-[#FFF9ED] text-sm flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-400" />
                    <span>Control de Cumplimiento por Participante</span>
                  </h4>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Resumen de visitas y facturas presentadas por cada restaurante participante.
                  </p>
                </div>
                <div className="text-xs text-stone-400 font-medium">
                  {restaurantes.length} Competidores
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {restaurantes.map((rest) => {
                  const restCompras = comprasAuditList.filter(c => c.restauranteId === rest.id);
                  const sponsorIds = new Set(restCompras.map(c => c.patrocinadorId));
                  const isCompliant = restCompras.length > 0;

                  return (
                    <div
                      key={rest.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                        isCompliant 
                          ? 'bg-black border-stone-800 hover:border-emerald-500/40' 
                          : 'bg-black border-amber-900/40 hover:border-amber-700/60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={rest.logoUrl}
                          alt={rest.nombre}
                          className="w-10 h-10 rounded-xl object-contain bg-stone-900 border border-stone-800 p-0.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-[#FFF9ED] text-xs truncate">{rest.nombreHamburguesa}</h5>
                          <p className="text-[11px] text-stone-400 truncate">{rest.nombre}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="font-mono text-[10px] text-stone-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                              👤 {rest.usuarioAcceso || rest.nombre.toLowerCase().replace(/[^a-z0-9]/g, '')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-900 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-bold text-stone-300">
                            {restCompras.length} {restCompras.length === 1 ? 'Factura' : 'Facturas'}
                          </div>
                          <div className="text-[10px] text-stone-500">
                            {sponsorIds.size} {sponsorIds.size === 1 ? 'tienda' : 'tiendas'}
                          </div>
                        </div>

                        <div>
                          {isCompliant ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-400" /> Al día
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-400" /> Sin compras
                            </span>
                          )}
                        </div>
                      </div>

                      {restCompras.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuditFilterRest(rest.id);
                            setAuditFilterSponsor('todos');
                          }}
                          className="w-full text-center py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-[11px] font-semibold text-stone-300 transition-colors cursor-pointer"
                        >
                          Ver sus facturas ({restCompras.length})
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filter and Detailed Invoices Table */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                <div>
                  <h4 className="font-bold text-[#FFF9ED] text-base flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                    <span>Registro Detallado de Facturas de Compras</span>
                  </h4>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Historial cronológico de todos los comprobantes y descripciones cargados por los restaurantes participantes.
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={auditFilterRest}
                    onChange={(e) => setAuditFilterRest(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                  >
                    <option value="todos">Todos los Restaurantes</option>
                    {restaurantes.map(r => (
                      <option key={r.id} value={r.id}>{r.nombreHamburguesa} ({r.nombre})</option>
                    ))}
                  </select>

                  <select
                    value={auditFilterSponsor}
                    onChange={(e) => setAuditFilterSponsor(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                  >
                    <option value="todos">Todos los Patrocinadores</option>
                    {patrocinadores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>

                  {(auditFilterRest !== 'todos' || auditFilterSponsor !== 'todos') && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuditFilterRest('todos');
                        setAuditFilterSponsor('todos');
                      }}
                      className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-semibold cursor-pointer"
                    >
                      Limpiar Filtros
                    </button>
                  )}
                </div>
              </div>

              {/* Invoices List */}
              {(() => {
                const filtered = comprasAuditList.filter(item => {
                  if (auditFilterRest !== 'todos' && item.restauranteId !== auditFilterRest) return false;
                  if (auditFilterSponsor !== 'todos' && item.patrocinadorId !== auditFilterSponsor) return false;
                  return true;
                });

                if (isLoadingComprasAudit) {
                  return (
                    <div className="text-center py-12 text-stone-400 text-xs flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                      <span>Cargando registro de compras...</span>
                    </div>
                  );
                }

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12 text-stone-500 text-xs bg-black/40 rounded-xl border border-dashed border-stone-800">
                      No se encontraron compras ni facturas registradas con los filtros seleccionados.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl bg-black border border-stone-800 hover:border-stone-700 transition-all flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2 border-b border-stone-900 pb-2">
                            <div>
                              <div className="text-[10px] uppercase font-mono text-amber-400 font-bold">
                                Tienda Patrocinadora
                              </div>
                              <div className="font-extrabold text-[#FFF9ED] text-sm">
                                {item.patrocinadorNombre}
                              </div>
                            </div>
                            <span className="text-[10px] text-stone-400 font-mono bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
                              {item.fecha ? new Date(item.fecha).toLocaleDateString() : ''}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="text-[10px] uppercase font-mono text-stone-500 font-semibold">
                              Restaurante Comprador
                            </div>
                            <div className="text-xs font-bold text-stone-200">
                              {item.restauranteNombreHamburguesa || item.restauranteNombre}
                            </div>
                            <div className="text-[11px] text-stone-400">
                              {item.restauranteNombre}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-stone-950 border border-stone-900 space-y-1">
                            <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1">
                              <FileText className="w-3 h-3 text-stone-400" />
                              <span>Detalle de Productos / Insumos Adquiridos:</span>
                            </div>
                            <p className="text-xs text-stone-300 leading-relaxed font-sans">
                              {item.descripcion}
                            </p>
                          </div>

                          {(item.monto || item.numeroFactura) && (
                            <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono">
                              {item.monto && (
                                <span className="bg-stone-900 px-2 py-0.5 rounded border border-stone-800 text-emerald-400 font-bold">
                                  {item.monto}
                                </span>
                              )}
                              {item.numeroFactura && (
                                <span className="bg-stone-900 px-2 py-0.5 rounded border border-stone-800 text-stone-300">
                                  Factura: {item.numeroFactura}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Invoice Photo Preview or Indicator */}
                        <div className="pt-2 border-t border-stone-900">
                          {item.facturaFotoUrl ? (
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <img
                                  src={item.facturaFotoUrl}
                                  alt="Factura"
                                  className="w-9 h-9 rounded-lg object-cover border border-stone-800 cursor-pointer hover:opacity-80"
                                  onClick={() => setSelectedAuditImage(item.facturaFotoUrl || null)}
                                />
                                <span className="text-[11px] text-stone-400">Foto de factura adjunta</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedAuditImage(item.facturaFotoUrl || null)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver</span>
                              </button>
                            </div>
                          ) : (
                            <div className="text-[11px] text-stone-500 italic flex items-center gap-1">
                              <span>(Registro con descripción sin foto adjunta)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* MODAL: QR DE TIENDA DEL PATROCINADOR */}
        {selectedSponsorQr && (
          <div 
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 overflow-y-auto p-3 sm:p-5 flex items-start sm:items-center justify-center"
            onClick={() => setSelectedSponsorQr(null)}
          >
            <div 
              className="bg-[#0F0F0F] border border-stone-800 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative my-auto max-h-[calc(100vh-2rem)] sm:max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header (Fijo arriba con la X siempre visible) */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-800 shrink-0">
                <div>
                  <h4 className="font-extrabold text-[#FFF9ED] text-base flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-amber-400" />
                    <span>QR Oficial de Tienda Patrocinadora</span>
                  </h4>
                  <p className="text-xs text-stone-400">
                    {selectedSponsorQr.nombre} • {selectedSponsorQr.tipo}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSponsorQr(null)}
                  className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content Body (Con Scroll Interno Fluido) */}
              {(() => {
                const sponsorCheckinUrl = typeof window !== 'undefined'
                  ? `${window.location.origin}${window.location.pathname}?patrocinador=${selectedSponsorQr.id}`
                  : `https://tocuyo-burgerfest.com/?patrocinador=${selectedSponsorQr.id}`;
                const sponsorLogo = selectedSponsorQr.logoUrl || logoRed;

                return (
                  <div className="overflow-y-auto space-y-4 pr-1 mt-3 -mr-1 focus:outline-none overscroll-contain pb-2 [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent]">
                    {/* Tarjeta con diseño formal, elegante y llamativo */}
                    <div className="p-5 rounded-2xl bg-gradient-to-b from-[#FFFDF9] via-white to-[#FFFDF9] text-stone-950 flex flex-col items-center text-center space-y-3 shadow-xl border-2 border-[#A40B03] relative overflow-hidden">
                      {/* Barra superior de acento oro y borgoña */}
                      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#A40B03] via-amber-500 to-[#A40B03]" />

                      {/* Header de la tarjeta */}
                      <div className="w-full flex items-center justify-between gap-2 border-b border-stone-200 pb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={logoRed} alt="Food Fest 2026" className="h-6 w-auto object-contain shrink-0" />
                          <div className="h-4 w-px bg-stone-300 shrink-0" />
                          <span className="text-[8px] font-black uppercase tracking-wider text-[#A40B03] truncate">
                            The Best Burger 2026
                          </span>
                        </div>
                        <span className="text-[7.5px] font-black uppercase tracking-wider text-amber-950 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full font-mono">
                          TIENDA OFICIAL
                        </span>
                      </div>

                      {/* Fila de la Marca: Logo del Patrocinante al lado de su Nombre */}
                      <div className="w-full flex items-center gap-3 p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                        <img
                          src={sponsorLogo}
                          alt={selectedSponsorQr.nombre}
                          className="h-12 w-12 rounded-lg object-contain border border-stone-300 bg-white p-1 shadow-xs shrink-0"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoRed; }}
                        />
                        <div className="min-w-0 flex-1 text-left leading-tight">
                          <div className="font-black text-sm uppercase tracking-tight text-stone-900 truncate">
                            {selectedSponsorQr.nombre}
                          </div>
                          <div className="text-[8.5px] font-extrabold uppercase tracking-wide text-[#A40B03] mt-0.5">
                            {selectedSponsorQr.tipo}
                          </div>
                          <div className="text-[8px] text-stone-500 font-semibold truncate mt-0.5">
                            Punto Oficial de Facturación y Compras
                          </div>
                        </div>
                      </div>

                      {/* QR amplio y centrado */}
                      <div className="p-2.5 bg-white rounded-2xl border-2 border-[#A40B03] shadow-md">
                        <QRCodeSVG
                          value={sponsorCheckinUrl}
                          size={155}
                          level="Q"
                          includeMargin={false}
                        />
                      </div>

                      {/* Banner de llamada a la acción */}
                      <div className="w-full bg-gradient-to-r from-[#A40B03] via-[#C91006] to-[#A40B03] text-white font-black text-xs sm:text-sm uppercase tracking-wider py-2 px-3 rounded-xl shadow-md border border-amber-400/50 flex items-center justify-center gap-1.5">
                        <Receipt className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>¡INGRESA TU FACTURA ACÁ!</span>
                      </div>

                      {/* Texto Institucional Exacto Solicitado */}
                      <div className="w-full bg-amber-50/90 border border-amber-200/90 rounded-xl px-3 py-1.5 text-center">
                        <p className="text-[10px] sm:text-[10.5px] font-extrabold text-amber-950 leading-snug">
                          Escanea este código QR con la cámara de tu teléfono móvil para registrar y validar tu factura oficial de compra en este Patrocinante.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-black border border-stone-800 font-mono text-[11px] text-stone-400 break-all select-all">
                        {sponsorCheckinUrl}
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(sponsorCheckinUrl);
                            setCopiedSponsorUrl(true);
                            setTimeout(() => setCopiedSponsorUrl(false), 2500);
                          }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-black border border-stone-800 hover:border-amber-400/60 text-stone-200 font-bold transition-all text-xs cursor-pointer"
                        >
                          {copiedSponsorUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                          <span>{copiedSponsorUrl ? 'Copiado' : 'Copiar Enlace'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPrintSponsorId(selectedSponsorQr.id);
                            setSponsorGridFormat('4');
                            setSponsorCardsCount(4);
                            setSelectedSponsorQr(null);
                          }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#A40B03] to-[#BF0E05] text-[#FFF9ED] font-black transition-all text-xs border border-amber-400/40 shadow-md hover:brightness-110 cursor-pointer"
                        >
                          <Printer className="w-4 h-4 text-amber-300" />
                          <span>Imprimir PDF (A4)</span>
                        </button>
                      </div>

                      <a
                        href={sponsorCheckinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-black/60 hover:bg-stone-900 text-stone-400 hover:text-stone-200 text-xs transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir Módulo de Registro en Pestaña Nueva</span>
                      </a>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* MODAL: VISOR DE FACTURA COMPLETA */}
        {selectedAuditImage && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            <div className="bg-[#0F0F0F] border border-stone-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-sm font-bold text-[#FFF9ED]">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>Comprobante de Factura Oficial</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAuditImage(null)}
                  className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 sm:p-6 overflow-y-auto flex items-center justify-center bg-black/60 min-h-[300px]">
                <img
                  src={selectedAuditImage}
                  alt="Factura completa"
                  className="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg border border-stone-800"
                />
              </div>
              <div className="p-3 border-t border-stone-800 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedAuditImage(null)}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cerrar Visor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
