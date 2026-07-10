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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout

    fetch(animationUrl, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setAnimationData(data);
        clearTimeout(timeoutId);
      })
      .catch((err) => {
        console.error("Error loading Lottie:", err);
        // Silently fail, the fallback UI (empty div) will show
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
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
