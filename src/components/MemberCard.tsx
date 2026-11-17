import { motion } from "framer-motion";
import HoloCard from "@/components/HoloCard";

interface MemberCardProps {
  issued: boolean;
  name?: string | null;
  memberNo?: number | null;
  validUntil?: string | null;
  daysLeft?: number;
}

const fmt = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

/**
 * Gold membership card. Members get the holo foil version that tilts under
 * the finger; everyone else sees it face down, waiting to be pulled.
 */
const MemberCard = ({ issued, name, memberNo, validUntil, daysLeft }: MemberCardProps) => {
  const until = fmt(validUntil);
  return (
    <motion.div
      initial={{ y: 30, opacity: 0, rotate: -8 }}
      animate={{ y: 0, opacity: 1, rotate: issued ? -3 : 3 }}
      transition={{ type: "spring", stiffness: 110, damping: 13 }}
      className="w-full max-w-[330px] mx-auto"
    >
      <HoloCard holo={issued} maxTilt={12} innerClassName="rounded-[22px]">
        {issued ? (
          <div className="rounded-[22px] p-[6px] foil-gold shadow-[0_20px_40px_-14px_rgba(0,0,0,.8)]">
            <div className="rounded-[17px] bg-[linear-gradient(160deg,hsl(232_40%_16%),hsl(232_45%_9%))] text-white px-5 pt-5 pb-5 aspect-[5/7] flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] foil-gold-text">Gold member</span>
                <span className="font-display text-[11px] font-bold text-white/50">No. {memberNo ?? "—"}</span>
              </div>
              <div className="flex-1 grid place-items-center">
                <div className="w-32 h-32 rounded-full foil-gold grid place-items-center shadow-[0_10px_30px_rgba(0,0,0,.5)]">
                  <div className="w-[112px] h-[112px] rounded-full bg-[hsl(232_45%_12%)] grid place-items-center">
                    <span className="font-display font-black text-[40px] foil-gold-text leading-none">GSB</span>
                  </div>
                </div>
              </div>
              <p className="font-display font-black uppercase text-[22px] leading-tight truncate">{name || "Member"}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-[10px] bg-white/[0.07] px-3 py-2">
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/50">Days left</p>
                  <p className="num font-black text-[22px] leading-none mt-1 foil-gold-text">{daysLeft ?? 0}</p>
                </div>
                <div className="rounded-[10px] bg-white/[0.07] px-3 py-2">
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/50">Valid until</p>
                  <p className="text-[13px] font-semibold leading-tight mt-1.5">{until ?? "—"}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[22px] p-[6px] bg-[hsl(232_30%_22%)] shadow-[0_20px_40px_-14px_rgba(0,0,0,.8)]">
            <div className="rounded-[17px] card-back aspect-[5/7] flex flex-col items-center justify-center text-center px-6">
              <div className="w-28 h-28 rounded-full border-2 border-dashed border-primary/40 grid place-items-center">
                <span className="font-display font-black text-[30px] text-primary/50">?</span>
              </div>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary/80">Gold member card</p>
              <p className="font-display font-black uppercase text-[22px] leading-tight mt-2">Not pulled yet</p>
              <p className="text-[14px] text-white/60 mt-2">{name ? `Reserved for ${name}` : "Pick a pack below to pull it"}</p>
            </div>
          </div>
        )}
      </HoloCard>
    </motion.div>
  );
};

export default MemberCard;
