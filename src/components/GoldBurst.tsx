import { motion } from "framer-motion";

/** One-shot burst of gold sparkles and a flash, centred in its parent. */
const GoldBurst = ({ count = 18, radius = 150, delay = 0.3 }: { count?: number; radius?: number; delay?: number }) => (
  <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center" aria-hidden>
    {Array.from({ length: count }).map((_, i) => {
      const a = (i / count) * Math.PI * 2;
      const r = radius + (i % 3) * 40;
      return (
        <motion.span
          key={i}
          className="absolute sparkle !opacity-100 !animate-none"
          style={{ width: 10 + (i % 4) * 5, height: 10 + (i % 4) * 5, background: i % 2 ? "#ffe08a" : "#fff" }}
          initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
          animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r, scale: [0, 1.3, 0], rotate: 180 }}
          transition={{ duration: 1.1, delay: delay + (i % 5) * 0.03, ease: [0.15, 0.8, 0.3, 1] }}
        />
      );
    })}
    <motion.span
      className="absolute w-40 h-40 rounded-full bg-[radial-gradient(circle,rgba(255,236,170,.75),transparent_65%)]"
      initial={{ scale: 0.2, opacity: 0 }}
      animate={{ scale: 3, opacity: [0, 1, 0] }}
      transition={{ duration: 0.9, delay }}
    />
  </div>
);

export default GoldBurst;
