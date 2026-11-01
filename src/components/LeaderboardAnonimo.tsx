import React, { useLayoutEffect, useRef } from 'react';
import { motion } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Restaurante } from '../types';
import { Trophy, Flame, ShieldCheck, Lock, Star, Sparkles, Award, Crown, ShieldX, ShieldAlert, Eye, PartyPopper } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface LeaderboardAnonimoProps {
  restaurantes: Restaurante[];
  resultadosRevelados?: boolean;
}

export const LeaderboardAnonimo: React.FC<LeaderboardAnonimoProps> = ({
  restaurantes,
  resultadosRevelados = false,
}) => {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-rank-item]').forEach((item, index) => {
        gsap.from(item, {
          opacity: 0,
          y: 30,
          rotateX: -5,
          duration: 0.7,
          delay: Math.min(index, 3) * 0.06,
          ease: 'power3.out',
          scrollTrigger: { trigger: item, start: 'top 92%', once: true },
        });
      });
    }, sectionRef);
    return () => context.revert();
  }, [restaurantes]);

  // Los restaurantes descalificados quedan completamente fuera del Leaderboard oficial en vivo
  const sorted = [...restaurantes]
    .filter(r => !r.descalificado)
    .sort((a, b) => {
      if (b.promedioRating === a.promedioRating) {
        return b.votosCount - a.votosCount;
      }
      return b.promedioRating - a.promedioRating;
    });

  // Top 3 for podium (solo participantes en competencia)
  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];
  const podiumList = [
    { item: second, rank: 2, label: 'Plata', color: 'from-slate-400 to-slate-600', border: 'border-slate-400/50', height: 'h-40 sm:h-48' },
    { item: first, rank: 1, label: 'Oro', color: 'from-[#A40B03] to-[#7A0802]', border: 'border-[#A40B03] shadow-[0_0_35px_rgba(164,11,3,0.4)]', height: 'h-48 sm:h-60' },
    { item: third, rank: 3, label: 'Bronce', color: 'from-amber-700 to-amber-900', border: 'border-amber-700/50', height: 'h-36 sm:h-44' },
  ].filter(p => p.item !== undefined);

  return (
    <section ref={sectionRef} id="ranking" className="py-12 sm:py-20 bg-gradient-to-b from-black/60 via-[#0D0505]/50 to-black/60 backdrop-blur-[2px] border-t border-stone-900/80 scroll-mt-20 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 sm:w-[600px] h-96 bg-[#A40B03]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          {resultadosRevelados ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-[#A40B03]/25 to-amber-500/20 border border-amber-500/50 text-[#FFF9ED] text-xs font-bold uppercase tracking-wider mb-3 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
              <Trophy className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>Gala Oficial Finalizada • Resultados Públicos Revelados</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#A40B03]/15 border border-[#A40B03]/40 text-[#FFF9ED] text-xs font-bold uppercase tracking-wider mb-3 shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Lock className="w-3.5 h-3.5 text-[#A40B03]" />
              <span>Mecanismo de Integridad & Transparencia 24/7</span>
            </div>
          )}
          
          <h2 className="font-display text-4xl sm:text-6xl font-normal text-[#FFF9ED] tracking-wide leading-[1.02] [text-shadow:0_4px_24px_rgba(0,0,0,0.85)]">
            {resultadosRevelados ? 'Cuadro de Honor & Ganadores Oficiales' : 'Leaderboard Oficial en Vivo'}
          </h2>
          
          <p className="text-stone-300 text-sm sm:text-base mt-3 leading-relaxed">
            {resultadosRevelados ? (
              <>
                ¡El <strong className="text-amber-300">Food Fest 2026 ha concluido</strong>! Conoce las mejores propuestas gastronómicas y a los restaurantes campeones elegidos por los comensales mediante votación auditada e inmutable.
              </>
            ) : (
              <>
                Para garantizar la más estricta imparcialidad gastronómica, el ranking público se presenta bajo{' '}
                <strong className="text-[#FFF9ED]">código anónimo certificado</strong>. Los restaurantes ganadores 
                serán develados en la Gran Gala Final del Food Fest 2026.
              </>
            )}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {resultadosRevelados ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-300 font-mono font-semibold backdrop-blur-md">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Resultados Consolidados & Auditados Oficiales</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/80 border border-[#A40B03]/40 text-xs text-[#FFF9ED] font-mono font-semibold backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-[#A40B03]" />
                <span>Registro seguro y verificado</span>
              </div>
            )}
          </div>
        </div>

        {/* PODIUM DE HONOR (TOP 3) */}
        {sorted.length >= 2 && (
          <div className="mb-14">
            <div className="text-center mb-6">
              <span className={`text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 ${resultadosRevelados ? 'text-amber-400' : 'text-[#A40B03]'}`}>
                <Crown className="w-4 h-4" />
                <span>{resultadosRevelados ? 'Podio Oficial de Ganadores • Food Fest 2026' : 'Podio de Honor Provisional'}</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-6 items-end max-w-2xl mx-auto pt-6 [perspective:1000px]">
              {podiumList.map(({ item, rank, label, color, border, height }) => {
                const isLeader = rank === 1;
                const ratingFormatted = item.votosCount === 0 ? "0.00" : item.promedioRating.toFixed(2);
                const displayIndex = sorted.findIndex(s => s.id === item.id) + 1;

                return (
                  <div
                    key={item.id}
                    data-rank-item
                    className="flex flex-col items-center text-center will-change-transform"
                  >
                    {/* Crown or Trophy for 1st place */}
                    {isLeader && (
                      <div className="mb-2 flex flex-col items-center animate-bounce duration-1000">
                        <Crown className="w-7 h-7 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-600/40">
                          {resultadosRevelados ? '¡Campeón Food Fest!' : 'Líder'}
                        </span>
                      </div>
                    )}

                    {/* Participant Avatar Card */}
                    <div className={`w-full p-2 sm:p-4 rounded-2xl bg-gradient-to-b from-[#1B1513] to-[#0D0D0D] border ${border} flex flex-col items-center space-y-2 mb-2 relative shadow-[0_16px_35px_rgba(0,0,0,0.55)] backdrop-blur-md`}>
                      
                      {resultadosRevelados ? (
                        <div className="relative group">
                          <img 
                            src={item.fotoUrl || item.logoUrl} 
                            alt={item.nombreHamburguesa} 
                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-amber-400/70 shadow-lg"
                          />
                          <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center font-black text-xs bg-gradient-to-br ${color} text-[#FFF9ED] border border-white/20 shadow`}>
                            #{rank}
                          </div>
                        </div>
                      ) : (
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-sm sm:text-base bg-gradient-to-br ${color} text-[#FFF9ED] shadow-md border border-[#FFF9ED]/20`}>
                          {isLeader ? <Trophy className="w-5 h-5 text-amber-300" /> : `#${displayIndex}`}
                        </div>
                      )}

                      <div className="space-y-0.5 w-full">
                        <div className="font-extrabold text-[#FFF9ED] text-xs sm:text-sm truncate" title={resultadosRevelados ? item.nombreHamburguesa : `Participante #${displayIndex}`}>
                          {resultadosRevelados ? item.nombreHamburguesa : `Participante #${displayIndex}`}
                        </div>
                        <div className="text-[10px] text-stone-300 font-mono truncate" title={resultadosRevelados ? item.nombre : '[Identidad Oculta]'}>
                          {resultadosRevelados ? item.nombre : '[Identidad Oculta]'}
                        </div>
                        {resultadosRevelados && item.instagram && (
                          <div className="text-[9px] text-[#A40B03] font-bold font-mono truncate">
                            {item.instagram}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 bg-black/80 px-2.5 py-1 rounded-lg border border-stone-800 text-xs font-black text-[#FFF9ED]">
                        <Star className="w-3 h-3 fill-[#A40B03] text-[#A40B03]" />
                        <span>{ratingFormatted}</span>
                      </div>

                    </div>

                    {/* Pedestal Base */}
                    <div className={`w-full ${height} rounded-t-2xl bg-gradient-to-t ${color} border-t-2 border-x-2 ${border} flex flex-col items-center justify-start pt-3 shadow-2xl relative overflow-hidden`}>
                      <span className="font-display text-4xl sm:text-6xl font-normal text-[#FFF9ED]/95 drop-shadow-md">
                        {rank}
                      </span>
                      <span className="text-[10px] sm:text-xs uppercase font-extrabold text-[#FFF9ED]/80 tracking-widest mt-0.5">
                        {label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FULL CLASSIFICATION TABLE (POSITIONS #4 ONWARDS IF PODIUM ACTIVE) */}
        {(() => {
          const isPodiumActive = sorted.length >= 2;
          const remainingParticipants = isPodiumActive ? sorted.slice(3) : sorted;

          if (isPodiumActive && remainingParticipants.length === 0) {
            return (
              <div className="text-center py-6 p-5 rounded-2xl bg-black/60 border border-stone-800 text-stone-400 text-xs">
                <span>Todos los participantes activos se encuentran compitiendo en el <strong>Podio de Honor</strong>. Las nuevas posiciones (#4 en adelante) se listarán aquí conforme se sumen más competidores.</span>
              </div>
            );
          }

          return (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-stone-800 text-xs font-bold text-stone-400 uppercase tracking-wider px-2">
                <span>
                  {resultadosRevelados 
                    ? (isPodiumActive ? 'Cuadro Clasificatorio Oficial (#4 en adelante)' : 'Clasificación General Final') 
                    : (isPodiumActive ? 'Siguientes Posiciones en Competencia (#4 en adelante)' : 'Clasificación General Auditada')}
                </span>
                <span>Rendimiento & Calificación</span>
              </div>

              {remainingParticipants.map((item) => {
                const rankNumber = sorted.findIndex(s => s.id === item.id) + 1;
                const ratingFormatted = item.votosCount === 0 ? "0.00" : item.promedioRating.toFixed(2);

                return (
                  <div
                    key={item.id}
                    data-rank-item
                    className={`relative rounded-2xl p-4 sm:p-5 transition-[border-color,box-shadow] duration-300 border bg-gradient-to-r from-[#15100F] to-black will-change-transform ${
                      resultadosRevelados 
                        ? 'border-stone-800 hover:border-amber-500/40 shadow-[0_12px_30px_rgba(0,0,0,0.4)]' 
                        : 'border-stone-800/80 hover:border-[#D6A44B]/35 shadow-[0_12px_30px_rgba(0,0,0,0.35)]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      {/* Position & Identity */}
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-base shrink-0 bg-stone-900 border border-stone-800 text-stone-300">
                          #{rankNumber}
                        </div>

                        {resultadosRevelados && (item.fotoUrl || item.logoUrl) && (
                          <img 
                            src={item.fotoUrl || item.logoUrl} 
                            alt={item.nombreHamburguesa} 
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-stone-800 shrink-0"
                          />
                        )}

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-xl sm:text-2xl font-normal tracking-wide text-[#FFF9ED]">
                              {resultadosRevelados ? item.nombreHamburguesa : `Participante #${rankNumber}`}
                            </h3>
                            {resultadosRevelados ? (
                              <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-[#A40B03]/20 border border-[#A40B03]/40 text-[#FFF9ED] font-bold">
                                {item.nombre}
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-stone-400 font-mono font-medium">
                                [Identidad Oculta]
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-400 mt-0.5">
                            {resultadosRevelados && item.instagram ? item.instagram : `Posición #${rankNumber} en Competencia Oficial`}
                          </p>
                        </div>
                      </div>

                      {/* Rating & Stats */}
                      <div className="flex items-center justify-between sm:justify-end gap-5 sm:gap-8 border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-900">
                        
                        <div className="text-right">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                            Puntuación
                          </div>
                          <div className="flex items-center gap-1 text-base sm:text-lg font-black text-[#FFF9ED]">
                            <Star className="w-4 h-4 fill-[#A40B03] text-[#A40B03]" />
                            <span>{ratingFormatted}</span>
                          </div>
                        </div>

                      </div>

                    </div>

                    {/* Progress Bar of Popularity */}
                    <div className="mt-3.5 w-full bg-stone-950 rounded-full h-2 overflow-hidden border border-stone-800/80">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${Math.min(100, ((item.votosCount === 0 ? 0 : item.promedioRating) / 5) * 100)}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${resultadosRevelados ? 'bg-gradient-to-r from-[#A40B03] to-amber-500' : 'bg-stone-700'}`}
                      />
                    </div>

                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Security & Audit badge */}
        <div className="mt-10 p-5 rounded-2xl bg-black border border-stone-800/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400 shadow-md">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#A40B03] shrink-0" />
            <span>{resultadosRevelados ? 'Resultados oficiales certificados por el Comité de Integridad Gastronómica.' : 'Actualizado automáticamente con cada transacción.'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-stone-300 font-medium">
            <Flame className="w-4 h-4 text-[#A40B03]" />
            <span>Auditoría de integridad activa 24/7 • Food Fest 2026</span>
          </div>
        </div>

      </div>
    </section>
  );
};

