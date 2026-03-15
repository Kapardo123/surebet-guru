import Lottie from "lottie-react";
import { useEffect, useState } from "react";

interface LottieLogoProps {
  size?: number;
  className?: string;
}

const LottieLogo = ({ size = 100, className = "" }: LottieLogoProps) => {
  const [animationData, setAnimationData] = useState<any>(null);
  const animationUrl = "https://lottie.host/8e2a6d71-558e-4903-8851-90807895e6f3/7W9X9eX0W2.json";

  useEffect(() => {
    fetch(animationUrl)
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error("Error loading Lottie:", err));
  }, []);

  if (!animationData) {
    return <div style={{ width: size, height: size }} className={className} />;
  }

  return (
    <div style={{ width: size, height: size }} className={className}>
      <Lottie 
        animationData={animationData}
        loop={true}
        autoplay={true}
      />
    </div>
  );
};

export default LottieLogo;
