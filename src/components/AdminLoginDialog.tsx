import { useState } from "react";
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

export const ADMIN_LOGIN = "123";
export const ADMIN_PASSWORD = "321";

interface AdminLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminLoginDialog = ({ open, onOpenChange }: AdminLoginDialogProps) => {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = () => {
    if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
      onOpenChange(false);
      setLogin("");
      setPassword("");
      navigate("/admin");
    } else {
      toast({ title: "Wrong credentials", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
  );
};

export default AdminLoginDialog;
