import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Award, Sparkles, QrCode, ArrowRight, Star, Flame, CheckCircle2, MapPin } from 'lucide-react';

interface Hero3DProps {
  onExploreBurgers: () => void;
  totalVotos: number;
}

export const Hero3D: React.FC<Hero3DProps> = ({
  onExploreBurgers,
  totalVotos,
}) => {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -12;
    const rotY = ((x - centerX) / centerX) * 12;

    setRotateX(rotX);
    setRotateY(rotY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24">
      {/* Ambient background glow & radial grid */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-amber-600/15 via-orange-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 right-10 w-72 h-72 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Copy & Value Proposition */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Pill Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-semibold shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Edición Oficial 2025 • El Tocuyo, Estado Lara</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            </motion.div>

            {/* Main Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-stone-100 font-['Cabinet_Grotesk',sans-serif] leading-[1.08]"
            >
              ¿Cuál es la Mejor <br />
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 bg-clip-text text-transparent">
                Hamburguesa de El Tocuyo?
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg text-stone-300 max-w-2xl leading-relaxed font-normal"
            >
              Los mejores asadores y restaurantes de la Ciudad Madre compiten por la corona culinaria. 
              Prueba cada creación en su local, pide tu <strong>código de seguridad intransferible</strong> y vota 
              en nuestra plataforma con verificación atómica antifraude.
            </motion.p>

            {/* Value Pillars Badges */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1"
            >
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-900/60 border border-stone-800 text-left">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-200">Sin Registro</h4>
                  <p className="text-[11px] text-stone-400">Vota directo con el código</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-900/60 border border-stone-800 text-left">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-200">100% Antifraude</h4>
                  <p className="text-[11px] text-stone-400">1 código = 1 voto único</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-900/60 border border-stone-800 text-left">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-200">Ranking Anónimo</h4>
                  <p className="text-[11px] text-stone-400">Misterio hasta la final</p>
                </div>
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center gap-4 pt-2"
            >
              <button
                onClick={onExploreBurgers}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-extrabold text-sm sm:text-base text-stone-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 shadow-xl shadow-amber-500/25 hover:shadow-2xl hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>Explorar Hamburguesas & Votar</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onExploreBurgers}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm sm:text-base text-stone-200 bg-stone-900/90 border border-stone-700 hover:border-amber-500/50 hover:bg-stone-800 transition-all"
              >
                <span>Ver Participantes</span>
              </button>
            </motion.div>

            {/* Micro proof line */}
            <div className="flex items-center justify-center lg:justify-start gap-4 text-xs text-stone-400 pt-1">
              <span className="flex items-center gap-1.5 text-stone-300">
                <Flame className="w-4 h-4 text-amber-500" />
                <strong className="text-amber-400 font-bold">{totalVotos} votos</strong> registrados en vivo
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-500" /> El Tocuyo, Morán
              </span>
            </div>

          </div>

          {/* Right Column: 3D Interactive Presentation Stage */}
          <div className="lg:col-span-5 flex justify-center">
            <div 
              className="w-full max-w-md perspective-[1000px]"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <motion.div
                style={{
                  transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
                  transformStyle: 'preserve-3d',
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="relative rounded-3xl bg-gradient-to-b from-stone-900/95 via-stone-900/80 to-stone-950 p-6 sm:p-7 border border-amber-500/30 shadow-2xl shadow-black/80 backdrop-blur-xl"
              >
                
                {/* Floating 3D Badge: Trophy / Star */}
                <div 
                  style={{ transform: 'translateZ(40px)' }}
                  className="absolute -top-4 -right-4 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-stone-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/40 flex items-center gap-1.5 border border-amber-300"
                >
                  <Flame className="w-4 h-4 fill-stone-950" />
                  <span>Copa Tocuyo 2025</span>
                </div>

                {/* Burger Main Image Stage with Dynamic Lighting */}
                <div 
                  style={{ transform: 'translateZ(30px)' }}
                  className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-stone-950 shadow-inner group"
                >
                  <img
                    src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80"
                    alt="Hamburguesa de Gala El Tocuyo"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Visual Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" />
                  
                  {/* Floating floating chip on image */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-stone-950/85 backdrop-blur-md text-amber-300 font-semibold border border-amber-500/20">
                      Smash Angus & Queso de Mano
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-stone-950 font-extrabold flex items-center gap-1">
                      <Star className="w-3 h-3 fill-stone-950" /> 4.9
                    </span>
                  </div>
                </div>

                {/* Card Body with 3D Depth */}
                <div 
                  style={{ transform: 'translateZ(25px)' }}
                  className="mt-5 space-y-3 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-stone-100 font-['Cabinet_Grotesk',sans-serif]">
                        La Batalla de Sabores
                      </h3>
                      <p className="text-xs text-stone-400">
                        4 restaurantes élite compitiendo en vivo
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
                      #1
                    </div>
                  </div>

                  {/* Criteria Preview Bar */}
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between text-[11px] text-stone-400 font-medium">
                      <span>Criterio Evaluado</span>
                      <span className="text-amber-400">Puntaje Comensal</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-stone-950/70 border border-stone-800 flex items-center justify-between">
                        <span className="text-stone-300">🥩 Sabor Carne</span>
                        <span className="font-bold text-amber-400">4.9 ★</span>
                      </div>
                      <div className="p-2 rounded-lg bg-stone-950/70 border border-stone-800 flex items-center justify-between">
                        <span className="text-stone-300">🍞 Pan & Textura</span>
                        <span className="font-bold text-amber-400">4.8 ★</span>
                      </div>
                    </div>
                  </div>

                  {/* QR Card Prompt */}
                  <div 
                    style={{ transform: 'translateZ(35px)' }}
                    className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-amber-500 text-stone-950 font-bold">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-stone-200">¿Estás en el local?</div>
                        <div className="text-[10px] text-stone-400">Escanea el código de mesa</div>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-amber-400 underline decoration-amber-500/40 cursor-pointer" onClick={onExploreBurgers}>
                      Ingresar
                    </span>
                  </div>

                </div>

              </motion.div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
