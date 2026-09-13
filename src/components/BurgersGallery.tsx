import React from 'react';
import { motion } from 'motion/react';
import { Restaurante } from '../types';
import { Star, MapPin, QrCode, ArrowUpRight, Flame, Instagram, Sparkles } from 'lucide-react';

interface BurgersGalleryProps {
  restaurantes: Restaurante[];
  onSelectRestaurant: (restauranteId: string) => void;
}

export const BurgersGallery: React.FC<BurgersGalleryProps> = ({
  restaurantes,
  onSelectRestaurant,
}) => {
  return (
    <section id="hamburguesas" className="py-16 bg-stone-950 border-t border-stone-900 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Flame className="w-3.5 h-3.5" />
              <span>Galería Oficial de Competidores</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-100 font-['Cabinet_Grotesk',sans-serif] tracking-tight">
              Hamburguesas Participantes
            </h2>
            <p className="text-stone-400 text-sm sm:text-base mt-2 max-w-2xl">
              Cada propuesta fue diseñada especialmente para este festival. Conoce los ingredientes autóctonos, 
              ubica el restaurante en El Tocuyo y prepárate para votar.
            </p>
          </div>

          <div className="text-xs text-stone-400 bg-stone-900/80 px-4 py-2.5 rounded-xl border border-stone-800 self-start md:self-auto">
            <span className="font-semibold text-stone-200">Tip de Votación:</span> Puedes votar al instante o guardar tu código para votar al final.
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {restaurantes.map((rest, index) => (
            <motion.div
              key={rest.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group rounded-3xl bg-stone-900/60 border border-stone-800/80 hover:border-amber-500/40 transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-lg shadow-black/40 hover:shadow-2xl hover:shadow-amber-500/10"
            >
              
              {/* Image & Badges */}
              <div className="relative aspect-[16/10] overflow-hidden bg-stone-950">
                <img
                  src={rest.fotoUrl}
                  alt={rest.nombreHamburguesa}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" />

                {/* Price Tag */}
                <div className="absolute top-4 right-4 px-3 py-1 rounded-xl bg-amber-500 text-stone-950 font-black text-sm shadow-lg shadow-black/40">
                  {rest.precio}
                </div>

                {/* Restaurant Signature Banner on Bottom of Photo */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 bg-stone-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-800">
                    <img
                      src={rest.logoUrl}
                      alt={rest.nombre}
                      className="w-5 h-5 rounded-full object-cover border border-amber-500/50"
                      referrerPolicy="no-referrer"
                    />
                    <span className="font-bold text-stone-200">{rest.nombre}</span>
                  </div>

                  <div className="flex items-center gap-1 bg-amber-500/90 text-stone-950 px-2.5 py-1 rounded-lg font-extrabold shadow">
                    <Star className="w-3.5 h-3.5 fill-stone-950" />
                    <span>{rest.votosCount === 0 ? "0.00" : rest.promedioRating.toFixed(2)}</span>
                    <span className="text-[10px] font-semibold text-stone-900 opacity-80">({rest.votosCount})</span>
                  </div>
                </div>
              </div>

              {/* Content Details */}
              <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-5">
                <div>
                  <h3 className="text-2xl font-black text-stone-100 font-['Cabinet_Grotesk',sans-serif] group-hover:text-amber-400 transition-colors">
                    {rest.nombreHamburguesa}
                  </h3>
                  <p className="text-amber-500/90 text-xs font-semibold mt-1">
                    "{rest.slogan}"
                  </p>
                  <p className="text-stone-300 text-xs sm:text-sm mt-3 leading-relaxed">
                    {rest.descripcion}
                  </p>

                  {/* Ingredients Tags */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {rest.ingredientes.map((ing, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-stone-950 border border-stone-800 text-stone-300"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>

                  {/* Address & Social */}
                  <div className="mt-4 pt-3 border-t border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-400 gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{rest.direccion}</span>
                    </div>
                    <div className="flex items-center gap-1 text-stone-400 hover:text-amber-400 transition-colors shrink-0">
                      <Instagram className="w-3.5 h-3.5" />
                      <span>{rest.instagram}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => onSelectRestaurant(rest.id)}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-stone-300 bg-stone-950 border border-stone-800 hover:border-amber-500/40 hover:text-stone-100 transition-all"
                  >
                    <QrCode className="w-4 h-4 text-amber-500" />
                    <span>Ver QR & Ficha</span>
                  </button>

                  <button
                    onClick={() => onSelectRestaurant(rest.id)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold text-stone-950 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <span>Votar por Esta</span>
                    <ArrowUpRight className="w-4 h-4 text-stone-950" />
                  </button>
                </div>

              </div>

            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
