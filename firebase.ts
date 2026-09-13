import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBgLdheL9XwDsw5Nxg813xDPFMkPj_9CNU",
  authDomain: "thebestburger-69e44.firebaseapp.com",
  projectId: "thebestburger-69e44",
  storageBucket: "thebestburger-69e44.firebasestorage.app",
  messagingSenderId: "979994349638",
  appId: "1:979994349638:web:da8698d01343011d37ba47",
  measurementId: "G-LE4R8R8VJB"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Configurar Analytics asegurando que corra solo en cliente
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

// Inicializar Firestore (Base de datos)
const db = getFirestore(app);

// Inicializar Storage (Imágenes)
const storage = getStorage(app);

export { app, analytics, db, storage };
