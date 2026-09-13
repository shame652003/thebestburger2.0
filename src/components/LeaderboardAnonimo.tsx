import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Restaurante } from '../types';
import { Trophy, Flame, Eye, EyeOff, ShieldCheck, Lock, Star, Sparkles, TrendingUp } from 'lucide-react';

interface LeaderboardAnonimoProps {
  restaurantes: Restaurante[];
}

export const LeaderboardAnonimo: React.FC<LeaderboardAnonimoProps> = ({
  restaurantes,
}) => {
  // Public client view is strictly anonymous for integrity
  const sorted = [...restaurantes].sort((a, b) => {
    if (b.promedioRating === a.promedioRating) {
      return b.votosCount - a.votosCount;
    }
    return b.promedioRating - a.promedioRating;
  });

  const totalVotos = sorted.reduce((acc, curr) => acc + curr.votosCount, 0);

  return (
    <section id="ranking" className="py-16 bg-stone-900/40 border-t border-stone-800 scroll-mt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>Mecanismo de Integridad & Transparencia</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-100 font-['Cabinet_Grotesk',sans-serif] tracking-tight">
            Leaderboard Oficial en Tiempo Real
          </h2>
          
          <p className="text-stone-400 text-sm sm:text-base mt-2">
            Para garantizar la más estricta imparcialidad gastronómica, el ranking público se presenta bajo{' '}
            <strong className="text-amber-400">código anónimo certificado</strong>. Los nombres de los ganadores 
            serán develados en la Gran Gala Final en El Tocuyo.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-amber-400 font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Actualización atómica en vivo tras cada voto verificado</span>
          </div>
        </div>

        {/* Podium Top 3 & List */}
        <div className="space-y-4">
          {sorted.map((item, index) => {
            const porcentajeVotos = totalVotos > 0 ? Math.round((item.votosCount / totalVotos) * 100) : 0;
            const isFirst = index === 0;
            const isSecond = index === 1;
            const isThird = index === 2;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className={`relative rounded-2xl p-5 sm:p-6 transition-all border ${
                  isFirst
                    ? 'bg-gradient-to-r from-amber-500/15 via-stone-900/90 to-stone-950 border-amber-500/50 shadow-xl shadow-amber-500/10'
                    : 'bg-stone-950/80 border-stone-800/80 hover:border-stone-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Position & Identity */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${
                        isFirst
                          ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-stone-950 shadow-md shadow-amber-500/30'
                          : isSecond
                          ? 'bg-gradient-to-br from-stone-300 to-stone-500 text-stone-950'
                          : isThird
                          ? 'bg-gradient-to-br from-amber-700 to-orange-800 text-stone-100'
                          : 'bg-stone-900 border border-stone-800 text-stone-400'
                      }`}
                    >
                      {isFirst ? <Trophy className="w-6 h-6" /> : `#${index + 1}`}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg sm:text-xl font-black text-stone-100 font-['Cabinet_Grotesk',sans-serif]">
                          <span className="flex items-center gap-2">
                            Hamburguesa #{index + 1}
                            <span className="text-xs px-2 py-0.5 rounded-md bg-stone-900 border border-stone-800 text-stone-400 font-mono font-medium">
                              [Identidad Oculta]
                            </span>
                          </span>
                        </h3>
                      </div>

                      <p className="text-xs text-stone-400 mt-0.5">
                        Código de competencia: <strong className="text-stone-300 font-mono">{item.rankingAnonimoTag}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Rating & Stats */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-900">
                    
                    <div className="text-left sm:text-right">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                        Votos Válidos
                      </div>
                      <div className="text-base sm:text-lg font-extrabold text-stone-200">
                        {item.votosCount} <span className="text-xs text-stone-500 font-normal">({porcentajeVotos}%)</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                        Calificación
                      </div>
                      <div className="flex items-center gap-1.5 text-lg sm:text-xl font-black text-amber-400">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span>{item.promedioRating.toFixed(2)}</span>
                      </div>
                    </div>

                  </div>

                </div>

                {/* Progress Bar of Popularity */}
                <div className="mt-4 w-full bg-stone-900 rounded-full h-2 overflow-hidden border border-stone-800">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.min(100, (item.promedioRating / 5) * 100)}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      isFirst
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                        : 'bg-stone-600'
                    }`}
                  />
                </div>

              </motion.div>
            );
          })}
        </div>

        {/* Security & Audit badge */}
        <div className="mt-8 p-4 rounded-2xl bg-stone-950 border border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Actualizado automáticamente con cada transacción atómica de Firestore.</span>
          </div>
          <div className="flex items-center gap-1.5 text-stone-500">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span>Auditoría de integridad activa 24/7</span>
          </div>
        </div>

      </div>
    </section>
  );
};
