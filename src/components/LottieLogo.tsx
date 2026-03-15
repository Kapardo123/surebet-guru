import Lottie from "lottie-react";
import footballAnimation from "@/assets/lottie/football.json"; // We will create this or use a URL

interface LottieLogoProps {
  size?: number;
  className?: string;
}

const LottieLogo = ({ size = 100, className = "" }: LottieLogoProps) => {
  // Using a professional sports/betting related animation URL
  const animationUrl = "https://lottie.host/8e2a6d71-558e-4903-8851-90807895e6f3/7W9X9eX0W2.json";

  return (
    <div style={{ width: size, height: size }} className={className}>
      <Lottie 
        animationData={null} // We will use path instead
        path={animationUrl}
        loop={true}
        autoplay={true}
      />
    </div>
  );
};

export default LottieLogo;
