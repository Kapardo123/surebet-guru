import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import LottieLogo from "./LottieLogo";

const ADMIN_LOGIN = "123";
const ADMIN_PASSWORD = "321";

const Logo = () => {
  const [tapCount, setTapCount] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleTap = useCallback(() => {
    const next = tapCount + 1;
    setTapCount(next);

    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTapCount(0), 2000);

    if (next >= 5) {
      setTapCount(0);
      setShowLogin(true);
    }
  }, [tapCount]);

  const handleLogin = () => {
    if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
      setShowLogin(false);
      setLogin("");
      setPassword("");
      navigate("/admin");
    } else {
      toast({ title: "Wrong credentials", variant: "destructive" });
    }
  };

  return (
    <>
      <div 
        className="select-none cursor-pointer flex items-baseline gap-0.5 group" 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTap(); }}
      >
        <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-primary via-[hsl(280,80%,65%)] to-accent bg-[length:200%_100%] animate-[shimmer_3s_ease-in-out_infinite] bg-clip-text text-transparent transition-transform group-hover:scale-105 duration-300">
          GREAT
        </span>
        <span className="text-xl font-extralight tracking-[0.15em] text-foreground/80">
          SPORT
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.35em] text-accent/70 ml-1 mb-px">
          BETS
        </span>
      </div>

      <Dialog open={showLogin} onOpenChange={setShowLogin}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Admin Login</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">Enter your credentials to access the admin panel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Login</Label>
              <Input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Enter login"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} className="w-full font-display uppercase tracking-wider text-xs">
              Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Logo;
