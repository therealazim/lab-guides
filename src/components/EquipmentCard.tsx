import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

import { useI18n, type Lang } from '../i18n'
import imageMap from '../data/imageMap.json'

interface Props {
  equipment: Record<string, any>
  index: number
}

export default function EquipmentCard({ equipment, index }: Props) {
  const { lang, t } = useI18n()
  const data = equipment[lang as Lang] || equipment.en
  const slug = equipment.slug
  const imgSrc = (imageMap as Record<string, string>)[slug] || equipment.image || ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
    >
      <Link to={`/equipment/${slug}`} className="block group h-full">
        <div className="lum-card h-full flex flex-col overflow-hidden active:scale-[1.02] md:group-hover:scale-[1.02] transition-all duration-800">
          {/* Image */}
          <div className="relative h-32 sm:h-44 bg-lum-mid flex items-center justify-center overflow-hidden border-b border-lum-panel-border">
            <div className="absolute inset-0 bg-gradient-to-t from-lum-deep/20 to-transparent" />
            <img
              src={imgSrc}
              alt={data.name}
              className="max-h-32 max-w-[80%] object-contain transition-transform duration-700 active:scale-105 md:group-hover:scale-105 relative z-10"
              loading="lazy"
            />
          </div>

          {/* Content */}
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-sm font-semibold text-lum-ivory mb-2 line-clamp-2 active:text-lum-silver md:group-hover:text-lum-silver transition-colors duration-500 tracking-tight">
              {data.name}
            </h3>
            <p className="text-xs text-lum-slate-light/60 font-light line-clamp-2 mb-5 flex-grow leading-relaxed">
              {data.description}
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-lum-panel-border">
              <span className="text-[9px] font-medium tracking-[0.15em] uppercase text-lum-slate-warm">
                {t('viewGuide')}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-lum-slate-light/60 active:text-lum-ivory md:group-hover:text-lum-ivory transition-colors duration-500" />
            </div>
          </div>

          {/* Status badge */}
          {equipment.status && (
            <div className={`absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-xl text-[9px] font-semibold tracking-[0.1em] uppercase ${
              equipment.status === 'AVAILABLE' ? 'bg-emerald-500/20 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/20 border border-red-500/20 text-red-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                equipment.status === 'AVAILABLE' ? 'bg-emerald-400' : 'bg-red-400'
              }`} />
              {equipment.status}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}