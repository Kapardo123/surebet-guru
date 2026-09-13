import type { CSSProperties, MouseEventHandler } from "react";
import a0 from "@/assets/icons/gsb/tips-target.png";
import a1 from "@/assets/icons/gsb/coupons.png";
import a2 from "@/assets/icons/gsb/premium.png";
import a3 from "@/assets/icons/gsb/sign-in.png";
import a4 from "@/assets/icons/gsb/sign-out.png";
import a5 from "@/assets/icons/gsb/crown.png";
import a6 from "@/assets/icons/gsb/trophy.png";
import a7 from "@/assets/icons/gsb/trending-up.png";
import a8 from "@/assets/icons/gsb/bell.png";
import a9 from "@/assets/icons/gsb/layers.png";
import a10 from "@/assets/icons/gsb/shield.png";
import a11 from "@/assets/icons/gsb/smartphone.png";
import a12 from "@/assets/icons/gsb/check.png";
import a13 from "@/assets/icons/gsb/sparkles.png";
import a14 from "@/assets/icons/gsb/timer.png";
import a15 from "@/assets/icons/gsb/clock.png";
import a16 from "@/assets/icons/gsb/crosshair.png";
import a17 from "@/assets/icons/gsb/badge-check.png";
import a18 from "@/assets/icons/gsb/badge-x.png";
import a19 from "@/assets/icons/gsb/minus.png";
import a20 from "@/assets/icons/gsb/chevron-down.png";
import a21 from "@/assets/icons/gsb/chevron-up.png";
import a22 from "@/assets/icons/gsb/history.png";
import a23 from "@/assets/icons/gsb/flame.png";
import a24 from "@/assets/icons/gsb/play.png";
import a25 from "@/assets/icons/gsb/zap.png";
import a26 from "@/assets/icons/gsb/gift.png";
import a27 from "@/assets/icons/gsb/hourglass.png";
import a28 from "@/assets/icons/gsb/sliders.png";
import a29 from "@/assets/icons/gsb/award.png";
import a30 from "@/assets/icons/gsb/mail.png";
import a31 from "@/assets/icons/gsb/lock.png";
import a32 from "@/assets/icons/gsb/key.png";
import a33 from "@/assets/icons/gsb/arrow-left.png";
import a34 from "@/assets/icons/gsb/arrow-right.png";
import a35 from "@/assets/icons/gsb/arrow-to-line-right.png";
import a36 from "@/assets/icons/gsb/arrow-from-line-left.png";
import a37 from "@/assets/icons/gsb/chevron-left.png";
import a38 from "@/assets/icons/gsb/chevron-right.png";
import a39 from "@/assets/icons/gsb/search.png";
import a40 from "@/assets/icons/gsb/refresh.png";
import a41 from "@/assets/icons/gsb/rotate.png";
import a42 from "@/assets/icons/gsb/save.png";
import a43 from "@/assets/icons/gsb/send.png";
import a44 from "@/assets/icons/gsb/download.png";
import a45 from "@/assets/icons/gsb/pencil.png";
import a46 from "@/assets/icons/gsb/trash.png";
import a47 from "@/assets/icons/gsb/plus-circle.png";
import a48 from "@/assets/icons/gsb/x.png";
import a49 from "@/assets/icons/gsb/eye-off.png";
import a50 from "@/assets/icons/gsb/check-check.png";
import a51 from "@/assets/icons/gsb/more.png";
import a52 from "@/assets/icons/gsb/grip.png";
import a53 from "@/assets/icons/gsb/panel-left.png";
import a54 from "@/assets/icons/gsb/circle.png";
import a55 from "@/assets/icons/gsb/dot.png";
import a56 from "@/assets/icons/gsb/alert-triangle.png";
import a57 from "@/assets/icons/gsb/spinner.png";
import a58 from "@/assets/icons/gsb/users.png";
import a59 from "@/assets/icons/gsb/globe.png";
import a60 from "@/assets/icons/gsb/receipt.png";
import a61 from "@/assets/icons/gsb/clipboard-paste.png";
import a62 from "@/assets/icons/gsb/football.png";
import a63 from "@/assets/icons/gsb/basketball.png";
import a64 from "@/assets/icons/gsb/tennis.png";
import a65 from "@/assets/icons/gsb/volleyball.png";
import a66 from "@/assets/icons/gsb/hockey.png";
import a67 from "@/assets/icons/gsb/handball.png";
import a68 from "@/assets/icons/gsb/mma.png";
import a69 from "@/assets/icons/gsb/baseball.png";
import a70 from "@/assets/icons/gsb/esports.png";
import a71 from "@/assets/icons/gsb/darts.png";

type GsbIconProps = {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  color?: string;
  fill?: string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
  strokeLinecap?: string;
  strokeLinejoin?: string;
  onClick?: MouseEventHandler<HTMLImageElement>;
  title?: string;
};

function makeIcon(src: string, displayName: string) {
  const Icon = ({ size = 24, className, style, onClick, title }: GsbIconProps) => (
    <img
      src={src}
      width={size}
      height={size}
      className={className}
      style={style}
      onClick={onClick}
      title={title}
      alt=""
      draggable={false}
    />
  );
  Icon.displayName = `GsbIcon(${displayName})`;
  return Icon;
}

export const Target = makeIcon(a0, "Target");
export const Ticket = makeIcon(a1, "Ticket");
export const Gem = makeIcon(a2, "Gem");
export const LogIn = makeIcon(a3, "LogIn");
export const LogOut = makeIcon(a4, "LogOut");
export const Crown = makeIcon(a5, "Crown");
export const Trophy = makeIcon(a6, "Trophy");
export const TrendingUp = makeIcon(a7, "TrendingUp");
export const Bell = makeIcon(a8, "Bell");
export const Layers = makeIcon(a9, "Layers");
export const Shield = makeIcon(a10, "Shield");
export const Smartphone = makeIcon(a11, "Smartphone");
export const Check = makeIcon(a12, "Check");
export const Sparkles = makeIcon(a13, "Sparkles");
export const Timer = makeIcon(a14, "Timer");
export const Clock = makeIcon(a15, "Clock");
export const Crosshair = makeIcon(a16, "Crosshair");
export const BadgeCheck = makeIcon(a17, "BadgeCheck");
export const BadgeX = makeIcon(a18, "BadgeX");
export const Minus = makeIcon(a19, "Minus");
export const ChevronDown = makeIcon(a20, "ChevronDown");
export const ChevronUp = makeIcon(a21, "ChevronUp");
export const History = makeIcon(a22, "History");
export const Flame = makeIcon(a23, "Flame");
export const Play = makeIcon(a24, "Play");
export const Zap = makeIcon(a25, "Zap");
export const Gift = makeIcon(a26, "Gift");
export const Hourglass = makeIcon(a27, "Hourglass");
export const SlidersHorizontal = makeIcon(a28, "SlidersHorizontal");
export const Award = makeIcon(a29, "Award");
export const Mail = makeIcon(a30, "Mail");
export const Lock = makeIcon(a31, "Lock");
export const KeyRound = makeIcon(a32, "KeyRound");
export const ArrowLeft = makeIcon(a33, "ArrowLeft");
export const ArrowRight = makeIcon(a34, "ArrowRight");
export const ArrowRightToLine = makeIcon(a35, "ArrowRightToLine");
export const ArrowLeftFromLine = makeIcon(a36, "ArrowLeftFromLine");
export const ChevronLeft = makeIcon(a37, "ChevronLeft");
export const ChevronRight = makeIcon(a38, "ChevronRight");
export const Search = makeIcon(a39, "Search");
export const RefreshCw = makeIcon(a40, "RefreshCw");
export const RotateCcw = makeIcon(a41, "RotateCcw");
export const Save = makeIcon(a42, "Save");
export const Send = makeIcon(a43, "Send");
export const Download = makeIcon(a44, "Download");
export const Pencil = makeIcon(a45, "Pencil");
export const Trash2 = makeIcon(a46, "Trash2");
export const PlusCircle = makeIcon(a47, "PlusCircle");
export const X = makeIcon(a48, "X");
export const EyeOff = makeIcon(a49, "EyeOff");
export const CheckCheck = makeIcon(a50, "CheckCheck");
export const MoreHorizontal = makeIcon(a51, "MoreHorizontal");
export const GripVertical = makeIcon(a52, "GripVertical");
export const PanelLeft = makeIcon(a53, "PanelLeft");
export const Circle = makeIcon(a54, "Circle");
export const Dot = makeIcon(a55, "Dot");
export const AlertTriangle = makeIcon(a56, "AlertTriangle");
export const Loader2 = makeIcon(a57, "Loader2");
export const Users = makeIcon(a58, "Users");
export const Globe = makeIcon(a59, "Globe");
export const Receipt = makeIcon(a60, "Receipt");
export const ClipboardPaste = makeIcon(a61, "ClipboardPaste");
export const Football = makeIcon(a62, "Football");
export const Basketball = makeIcon(a63, "Basketball");
export const Tennis = makeIcon(a64, "Tennis");
export const Volleyball = makeIcon(a65, "Volleyball");
export const Hockey = makeIcon(a66, "Hockey");
export const Handball = makeIcon(a67, "Handball");
export const Mma = makeIcon(a68, "Mma");
export const Baseball = makeIcon(a69, "Baseball");
export const Esports = makeIcon(a70, "Esports");
export const Darts = makeIcon(a71, "Darts");

// Icons without a custom GSB asset fall back to lucide-react.
export { Home } from "lucide-react";
