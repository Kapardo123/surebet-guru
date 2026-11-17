import { motion, AnimatePresence } from "framer-motion";
import { Download } from "lucide-react";
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
          className="fixed inset-0 bg-black/80 z-[99999] flex items-end sm:items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full max-w-sm rounded-[24px] bg-card border border-white/10 p-6 text-center"
          >
            <p className="label foil-gold-text">New deck available</p>
            <h2 className="font-display font-black uppercase text-[26px] leading-[1.05] mt-2 text-foreground">
              New version ready
            </h2>
            <p className="text-[15.5px] text-muted-foreground leading-relaxed mt-2">{message}</p>

            <div className="flex items-center justify-center gap-3 mt-5 text-sm font-semibold">
              <span className="text-muted-foreground line-through tabular-nums">{currentVersion}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-semibold text-foreground tabular-nums">{latestVersion}</span>
            </div>

            <Button
              onClick={handleUpdate}
              size="lg"
              className="w-full gap-2 h-14 mt-6 text-[16px] font-bold"
            >
              <Download className="w-5 h-5" />
              Update now
            </Button>
            <p className="mt-3 text-[13px] text-muted-foreground">
              This update is required to keep using the app.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdateRequiredModal;
