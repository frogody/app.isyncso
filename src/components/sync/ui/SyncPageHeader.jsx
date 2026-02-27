import { motion } from 'framer-motion';
import { SyncViewSelector } from './SyncViewSelector';

export function SyncPageHeader({ icon: Icon, title, subtitle, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Row 1: Title + SyncViewSelector — IDENTICAL on all SYNC pages */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">{title}</h1>
            <p className="text-sm text-zinc-400">{subtitle}</p>
          </div>
        </div>
        <SyncViewSelector />
      </div>

      {/* Row 2: Page-specific controls (optional) */}
      {children && (
        <div className="flex items-center justify-between mt-3">
          {children}
        </div>
      )}
    </motion.div>
  );
}
