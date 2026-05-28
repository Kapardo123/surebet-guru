import { cn } from "@/lib/utils";

interface ShimmerProps {
  className?: string;
  lines?: number;
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const Shimmer = ({ className, lines = 3, rounded = "lg" }: ShimmerProps) => {
  const roundedMap = {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl"
  };

  return (
    <div className={cn("space-y-3 p-4", className)}>
      {/* Header shimmer */}
      <div className="flex items-center gap-3">
        <div className={cn("shimmer h-10 w-10", roundedMap.xl)} />
        <div className="flex-1 space-y-2">
          <div className={cn("shimmer h-4 w-3/4", roundedMap.md)} />
          <div className={cn("shimmer h-3 w-1/2", roundedMap.md)} />
        </div>
      </div>

      {/* Content lines */}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "shimmer h-4",
            i === lines - 1 ? "w-2/3" : "w-full",
            roundedMap.md
          )}
        />
      ))}

      {/* Footer shimmer */}
      <div className="flex gap-2 pt-2">
        <div className={cn("shimmer h-8 w-20 flex-1", roundedMap.lg)} />
        <div className={cn("shimmer h-8 w-20 flex-1", roundedMap.lg)} />
      </div>
    </div>
  );
};

export const CardShimmer = ({ className }: { className?: string }) => (
  <div className={cn("card-modern", className)}>
    <Shimmer lines={4} rounded="2xl" />
  </div>
);

export const TipCardShimmer = () => (
  <CardShimmer className="p-6">
    <div className="space-y-4">
      {/* Team logos */}
      <div className="flex justify-center gap-8 py-4">
        <div className="shimmer h-14 w-14 rounded-full" />
        <div className="shimmer h-14 w-14 rounded-full" />
      </div>
      
      {/* Info grid */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="shimmer h-16 rounded-xl" />
        ))}
      </div>
    </div>
  </CardShimmer>
);

export const CouponCardShimmer = () => (
  <CardShimmer className="p-6">
    <div className="space-y-4">
      {/* Match rows */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="shimmer h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="shimmer h-4 w-24 rounded-md" />
            <div className="shimmer h-3 w-16 rounded-md" />
          </div>
          <div className="shimmer h-8 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  </CardShimmer>
);

export default Shimmer;
