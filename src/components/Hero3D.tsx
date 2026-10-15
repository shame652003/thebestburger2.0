import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Award, Sparkles, QrCode, ArrowRight, Star, Flame, MapPin } from 'lucide-react';
import logoBlanco from '../img/logo blanco.svg';
import logoRed from '../img/logo.svg';

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
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-[#A40B03]/20 via-[#A40B03]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 right-10 w-80 h-80 bg-[#A40B03]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Copy & Value Proposition */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Pill Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#A40B03]/15 border border-[#A40B03]/40 text-[#FFF9ED] text-xs sm:text-sm font-semibold shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-[#A40B03]" />
              <span>Edición Oficial 2026 • El Tocuyo, Estado Lara</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#A40B03] animate-ping" />
            </motion.div>

            {/* Main Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#FFF9ED] font-['Cabinet_Grotesk',sans-serif] leading-[1.08]"
            >
              ¿Cuál es la Mejor Propuesta del <br />
              <span className="bg-gradient-to-r from-[#A40B03] via-red-500 to-[#FFF9ED] bg-clip-text text-transparent">
                Food Fest 2026?
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg text-stone-300 max-w-2xl leading-relaxed font-normal"
            >
              Los mejores restaurantes y creadores gastronómicos de la Ciudad Madre compiten por la corona culinaria. 
              Degusta cada creación en su local, pide tu <strong className="text-[#FFF9ED]">código único de seguridad</strong> y vota 
              en nuestra plataforma con verificación atómica y transparente.
            </motion.p>

            {/* Value Pillars Badges */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1"
            >
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-black/60 border border-[#A40B03]/25 text-left">
                <div className="p-2 rounded-lg bg-[#A40B03]/20 text-[#FFF9ED] shrink-0 border border-[#A40B03]/30">
                  <QrCode className="w-4 h-4 text-[#A40B03]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#FFF9ED]">Sin Registro</h4>
                  <p className="text-[11px] text-stone-400">Vota directo con el código</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-black/60 border border-[#A40B03]/25 text-left">
                <div className="p-2 rounded-lg bg-[#A40B03]/20 text-[#FFF9ED] shrink-0 border border-[#A40B03]/30">
                  <ShieldAlert className="w-4 h-4 text-[#A40B03]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#FFF9ED]">100% Antifraude</h4>
                  <p className="text-[11px] text-stone-400">1 código = 1 voto único</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-black/60 border border-[#A40B03]/25 text-left">
                <div className="p-2 rounded-lg bg-[#A40B03]/20 text-[#FFF9ED] shrink-0 border border-[#A40B03]/30">
                  <Award className="w-4 h-4 text-[#A40B03]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#FFF9ED]">Ranking Anónimo</h4>
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-extrabold text-sm sm:text-base text-[#FFF9ED] bg-gradient-to-r from-[#A40B03] via-[#BF0E05] to-[#7A0802] border border-[#A40B03]/60 shadow-xl shadow-[#A40B03]/30 hover:shadow-2xl hover:shadow-[#A40B03]/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>Explorar Platos & Votar</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onExploreBurgers}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-sm sm:text-base text-[#FFF9ED] bg-black/80 border border-[#A40B03]/40 hover:border-[#A40B03] hover:bg-[#A40B03]/10 transition-all"
              >
                <span>Ver Participantes</span>
              </button>
            </motion.div>

            {/* Micro proof line */}
            <div className="flex items-center justify-center lg:justify-start gap-4 text-xs text-stone-400 pt-1">
              <span className="flex items-center gap-1.5 text-stone-300">
                <Flame className="w-4 h-4 text-[#A40B03]" />
                <strong className="text-[#FFF9ED] font-bold">{totalVotos} votos</strong> registrados en vivo
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#A40B03]" /> El Tocuyo, Morán 2026
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
                className="relative rounded-3xl bg-gradient-to-b from-[#141414] via-[#0A0A0A] to-black p-6 sm:p-7 border border-[#A40B03]/40 shadow-2xl shadow-black backdrop-blur-xl"
              >
                
                {/* Floating 3D Badge: Food Fest 2026 */}
                <div 
                  style={{ transform: 'translateZ(40px)' }}
                  className="absolute -top-4 -right-4 px-4 py-2 rounded-2xl bg-gradient-to-r from-[#A40B03] to-[#7A0802] text-[#FFF9ED] font-black text-xs uppercase tracking-wider shadow-lg shadow-[#A40B03]/50 flex items-center gap-1.5 border border-[#FFF9ED]/30"
                >
                  <Flame className="w-4 h-4 fill-[#FFF9ED]" />
                  <span>Placa Food Fest 2026</span>
                </div>

                {/* Main Image Stage with Dynamic Lighting */}
                <div 
                  style={{ transform: 'translateZ(30px)' }}
                  className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-black shadow-inner group border border-stone-800"
                >
                  <img
                    src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80"
                    alt="Gastronomía Food Fest 2026"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Visual Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  
                  {/* Floating chip on image */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-md text-[#FFF9ED] font-semibold border border-[#A40B03]/30">
                      Creaciones Gourmet en Competencia
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#A40B03] text-[#FFF9ED] font-extrabold flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 fill-[#FFF9ED]" /> 5.0
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
                      <h3 className="text-xl font-bold text-[#FFF9ED] font-['Cabinet_Grotesk',sans-serif]">
                        La Batalla Gastronómica
                      </h3>
                      <p className="text-xs text-stone-400">
                        Los Mejores Restaurantes compiten por la Placa
                      </p>
                    </div>
                    <div className="px-3 py-1 rounded-xl bg-[#A40B03]/20 border border-[#A40B03]/50 flex items-center justify-center text-[#FFF9ED] font-black text-xs">
                      2026
                    </div>
                  </div>

                  {/* Criteria Preview Bar */}
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between text-[11px] text-stone-400 font-medium">
                      <span>Criterio Evaluado</span>
                      <span className="text-[#A40B03] font-bold">Puntaje Comensal</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-black/80 border border-stone-800 flex items-center justify-between">
                        <span className="text-[#FFF9ED]">🔥 Sabor & Punto</span>
                        <span className="font-bold text-[#A40B03]">5.0 ★</span>
                      </div>
                      <div className="p-2 rounded-lg bg-black/80 border border-stone-800 flex items-center justify-between">
                        <span className="text-[#FFF9ED]">✨ Creatividad</span>
                        <span className="font-bold text-[#A40B03]">5.0 ★</span>
                      </div>
                    </div>
                  </div>

                  {/* QR Card Prompt */}
                  <div 
                    style={{ transform: 'translateZ(35px)' }}
                    className="p-3 rounded-xl bg-gradient-to-r from-[#A40B03]/15 to-black/60 border border-[#A40B03]/35 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-[#A40B03] text-[#FFF9ED] font-bold">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-[#FFF9ED]">¿Estás en el restaurante?</div>
                        <div className="text-[10px] text-stone-400">Pide tu código y vota al instante</div>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-[#FFF9ED] underline decoration-[#A40B03] cursor-pointer" onClick={onExploreBurgers}>
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
