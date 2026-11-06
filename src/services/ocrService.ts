import { createWorker, type Worker } from 'tesseract.js';

export interface FacturaValidationResult {
  esFactura: boolean;
  texto: string;
  motivo?: string;
  error?: boolean;
}

// Keywords fiscales / comerciales típicas de facturas y tickets (ES/EN)
const KEYWORDS_FACTURA = [
  'factura', 'fiscal', 'rif', 'nit', 'control', 'serie', 'folio',
  'subtotal', 'sub total', 'iva', 'i.v.a', 'total',   'neto',
  'cantidad', 'precio', 'monto', 'pago', 'efectivo', 'debito', 'tarjeta',
  'credito', 'ticket', 'recibo', 'pedido', 'venta', 'cliente',
  'vendedor', 'cajero', 'fecha', 'gracias', 'bs', 'bs.', 'usd', '$',
  'impuesto', 'dragonnet', 'almacen', 'comercial', 'farmacia', 'venezuela',
  'facturan', 'incluido', 'exento', 'condiciones', 'original', 'duplicado'
];

const MONTO_REGEX = /\$?\s?\d[\d.,]*\s?(?:\$|bs|usd|us\$)?/i;

let workerPromise: Promise<Worker> | null = null;

// Worker singleton reutilizable para no re-descargar el modelo cada vez
const getWorker = async (): Promise<Worker> => {
  if (!workerPromise) {
    workerPromise = createWorker(['spa', 'eng']).catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
};

// Precarga opcional del modelo (llamar al abrir el formulario, evita esperar al capturar)
export const preloadOCR = (): Promise<Worker> => getWorker().catch(() => {
  throw new Error('No se pudo precargar el modelo OCR');
});

// Preprocesado: escala, gris y contraste para mejorar el reconocimiento en fotos de tickets
const preprocessImage = (file: File, targetWidth = 1400): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > targetWidth) {
          height = Math.round((height * targetWidth) / width);
          width = targetWidth;
        }
        if (width < 600) {
          height = Math.round((height * 600) / width);
          width = 600;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Escala de grises + boost de contraste simple
        try {
          const imageData = ctx.getImageData(0, 0, width, height);
          const d = imageData.data;
          const contrast = 1.35;
          const offset = 128 * (1 - contrast);
          for (let i = 0; i < d.length; i += 4) {
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            const v = gray * contrast + offset;
            d[i] = d[i + 1] = d[i + 2] = v < 0 ? 0 : v > 255 ? 255 : v;
          }
          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } catch {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen para el OCR.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo para el OCR.'));
    reader.readAsDataURL(file);
  });
};

const normalizar = (texto: string): string =>
  texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const validateFacturaOCR = async (file: File): Promise<FacturaValidationResult> => {
  try {
    const imagenPreprocesada = await preprocessImage(file);
    const worker = await getWorker();
    const { data } = await worker.recognize(imagenPreprocesada);
    const texto = data?.text || '';
    const textoNorm = normalizar(texto);

    // 1. El texto extraído debe tener contenido significativo
    const alfanum = textoNorm.replace(/[^a-z0-9]/g, '');
    if (alfanum.length < 15) {
      return {
        esFactura: false,
        texto,
        motivo: 'No se detectó suficiente texto en la imagen. Toma la factura más nítida, bien iluminada y de frente.'
      };
    }

    // 2. Debe encontrarse al menos 2 keywords fiscales/comerciales de factura
    const encontradas = KEYWORDS_FACTURA.filter(k => textoNorm.includes(k));
    if (encontradas.length < 2) {
      return {
        esFactura: false,
        texto,
        motivo: 'La foto no parece una factura o comprobante de compra (no se detectó información fiscal ni montos).'
      };
    }

    // 3. Debe detectarse al menos un monto numérico
    if (!MONTO_REGEX.test(textoNorm)) {
      return {
        esFactura: false,
        texto,
        motivo: 'La foto no parece una factura o comprobante de compra (no se detectó información fiscal ni montos).'
      };
    }

    return { esFactura: true, texto };
  } catch (err) {
    console.error('Error en OCR de factura:', err);
    // Fallo técnico del OCR (p.ej. sin internet para descargar el modelo): no bloquear el negocio
    return { esFactura: true, texto: '', error: true };
  }
};
