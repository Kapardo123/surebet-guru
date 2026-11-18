import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/hooks/useIsAdmin";

interface AdminLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Admin sign-in with a real Supabase account that is listed in the `admins`
 * table (see supabase/migrations/20261118_engagement.sql). There are no
 * credentials in the app bundle any more.
 */
const AdminLoginDialog = ({ open, onOpenChange }: AdminLoginDialogProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!email || !password || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      const admin = await checkIsAdmin();
      if (admin === null) throw new Error("Admin check unavailable. Run the 20261118 migration first.");
      if (!admin) {
        await supabase.auth.signOut();
        throw new Error("This account is not an admin.");
      }
      onOpenChange(false);
      setPassword("");
      navigate("/admin");
    } catch (e: any) {
      toast({ title: "Can't sign in", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Admin sign-in</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">Use the account that's listed as an admin.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          </div>
          <Button onClick={handleLogin} disabled={busy} className="w-full">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign in
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminLoginDialog;
