import { motion, AnimatePresence } from "framer-motion";
import { Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpdateRequiredModalProps {
  isOpen: boolean;
  currentVersion: string;
  latestVersion: string;
  message: string;
  downloadUrl: string;
}

const UpdateRequiredModal = ({
  isOpen,
  currentVersion,
  latestVersion,
  message,
  downloadUrl,
}: UpdateRequiredModalProps) => {
  const handleUpdate = () => {
    window.open(downloadUrl, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[99999] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-b from-card to-card/95 border border-red-500/50 shadow-2xl shadow-red-500/20"
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] opacity-20 bg-red-500"
                animate={{
                  scale: [1, 1.3, 1],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            <div className="relative z-10 p-6 sm:p-8 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center mb-5 shadow-xl shadow-red-500/40"
              >
                <AlertTriangle className="w-10 h-10 text-white" />
              </motion.div>

              <h2 className="font-display text-2xl font-bold text-white mb-3 tracking-tight">
                Update Required
              </h2>

              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                {message}
              </p>

              <div className="bg-black/40 rounded-lg p-4 mb-6 border border-red-500/30">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Version</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm font-bold text-red-400 line-through">{currentVersion}</span>
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-lg font-bold text-green-400">{latestVersion}</span>
                </div>
              </div>

              <Button
                onClick={handleUpdate}
                size="lg"
                className="w-full gap-3 h-14 font-display uppercase tracking-wider text-base bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 shadow-xl shadow-red-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] text-white"
              >
                <Download className="w-6 h-6" />
                Update Now
              </Button>

              <p className="mt-4 text-[11px] text-gray-500 font-medium">
                This update is required to use the app
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdateRequiredModal;
