import { motion, AnimatePresence } from "framer-motion";
import { Download, AlertTriangle, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpdateRequiredModalProps {
  isOpen: boolean;
  forceUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  message: string;
  downloadUrl: string;
  onLater?: () => void;
}

const UpdateRequiredModal = ({
  isOpen,
  forceUpdate,
  currentVersion,
  latestVersion,
  message,
  downloadUrl,
  onLater,
}: UpdateRequiredModalProps) => {
  const handleUpdate = () => {
    window.open(downloadUrl, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-accent/10 border-2 border-accent/30 shadow-2xl shadow-accent/20"
            >
              {/* Background decoration */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                  className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-30"
                  style={{
                    background: "radial-gradient(circle, hsl(45 100% 50%), transparent 70%)",
                  }}
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360],
                  }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-20"
                  style={{
                    background: "radial-gradient(circle, hsl(280 100% 50%), transparent 70%)",
                  }}
                  animate={{
                    scale: [1.2, 1, 1.2],
                    rotate: [360, 180, 0],
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
              </div>

              <div className="relative z-10 p-6 sm:p-8">
                {/* Header */}
                <div className="flex flex-col items-center text-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30"
                  >
                    {forceUpdate ? (
                      <AlertTriangle className="w-8 h-8 text-white" />
                    ) : (
                      <Download className="w-8 h-8 text-white" />
                    )}
                  </motion.div>

                  <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2">
                    {forceUpdate ? 'Update Required! 🚀' : 'Update Available'}
                  </h2>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {message}
                  </p>
                </div>

                {/* Version info */}
                <div className="bg-muted/50 rounded-xl p-4 mb-6 border border-border/50">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Current</p>
                      <p className="text-xs font-bold text-red-400 line-through">{currentVersion}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Latest</p>
                      <p className="text-xs font-bold text-green-400">{latestVersion}</p>
                    </div>
                  </div>
                </div>

                {/* Features list */}
                <div className="space-y-2 mb-6 text-left">
                  <h3 className="text-xs font-bold text-accent uppercase tracking-wider">What's New:</h3>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span>Enhanced AdMob integration with rewarded ads</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span>Premium users get instant access to Hero Tip</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span>Improved UI and bug fixes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span>Better performance and stability</span>
                    </li>
                  </ul>
                </div>

                {/* Action buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleUpdate}
                    className="w-full gap-2 h-12 font-display uppercase tracking-wider text-sm bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 shadow-lg shadow-accent/30 transition-all hover:scale-[1.02]"
                  >
                    <Download className="w-5 h-5" />
                    {forceUpdate ? 'Update Now' : 'Download Update'}
                  </Button>

                  {!forceUpdate && onLater && (
                    <Button
                      variant="ghost"
                      onClick={onLater}
                      className="w-full gap-2 h-10 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Later
                    </Button>
                  )}

                  {forceUpdate && (
                    <p className="text-[10px] text-center text-muted-foreground italic">
                      This update is required to continue using the app
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UpdateRequiredModal;
