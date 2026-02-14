import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, ShieldAlert, XCircle } from "lucide-react";
import gaLogo from "@/assets/GA-LOGO.png";
import { formatDistanceToNow } from "date-fns";

interface BanInfo {
  banned: boolean;
  banned_until: string | null;
  ban_type: "rejected" | "deleted" | null;
  rejected: boolean;
  rejection_reason: string | null;
}

interface PendingInfo {
  isPending: true;
}

async function checkBan(email: string): Promise<BanInfo | null> {
  const { data, error } = await supabase.functions.invoke("check-ban", {
    body: { email },
  });
  if (error) {
    console.error("Ban check failed:", error);
    return null;
  }
  return data as BanInfo;
}

function BanMessage({ banInfo }: { banInfo: BanInfo }) {
  const remaining = banInfo.banned_until
    ? formatDistanceToNow(new Date(banInfo.banned_until), { addSuffix: false })
    : "some time";

  const reason =
    banInfo.ban_type === "rejected"
      ? "Your registration request was rejected."
      : "Your account was permanently deleted.";

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
      <ShieldAlert className="h-8 w-8 text-destructive" />
      <div className="space-y-2">
        <h3 className="font-semibold text-destructive">Account Banned</h3>
        <p className="text-sm text-muted-foreground">{reason}</p>
        <p className="text-sm text-muted-foreground">
          You can try again in <strong>{remaining}</strong>.
        </p>
      </div>
    </div>
  );
}

function RejectionMessage({ reason }: { reason: string | null }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
      <XCircle className="h-8 w-8 text-destructive" />
      <div className="space-y-2">
        <h3 className="font-semibold text-destructive">Access Denied</h3>
        <p className="text-sm text-muted-foreground">
          {reason || "Your registration request has been rejected by an administrator."}
        </p>
      </div>
    </div>
  );
}

function PendingMessage() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-6 text-center">
      <ShieldAlert className="h-8 w-8 text-yellow-600" />
      <div className="space-y-2">
        <h3 className="font-semibold text-yellow-700 dark:text-yellow-500">Account Pending Approval</h3>
        <p className="text-sm text-muted-foreground">
          Your account is pending approval from an administrator. Please wait for approval before logging in.
        </p>
      </div>
    </div>
  );
}

function RegistrationSuccess() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/"><img src={gaLogo} alt="Grammar Addopanto" className="mx-auto mb-2 h-16 w-auto object-contain" /></Link>
          <CardTitle className="text-2xl sr-only">Addopanto Flow</CardTitle>
          <CardDescription className="mt-2">Registration Submitted</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-muted/50 p-6 text-center">
            <div className="space-y-2">
              <h3 className="font-semibold">Awaiting Admin Approval</h3>
              <p className="text-sm text-muted-foreground">
                Your account registration has been submitted and is pending approval from an administrator.
                You can try logging in once your account is approved.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Auth() {
  const { signIn, signUp, signOut, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(() => {
    const stored = sessionStorage.getItem("registration_success");
    if (stored) {
      sessionStorage.removeItem("registration_success");
      return true;
    }
    return false;
  });
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [pendingInfo, setPendingInfo] = useState<PendingInfo | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");

  const [rejectionInfo, setRejectionInfo] = useState<{ reason: string | null } | null>(null);

  const clearAlerts = () => {
    setBanInfo(null);
    setRejectionInfo(null);
    setPendingInfo(null);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    clearAlerts();
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: "Google login failed", description: error.message, variant: "destructive" });
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();
    setLoading(true);

    // Check ban before attempting login
    const ban = await checkBan(loginEmail);
    if (ban?.banned) {
      setBanInfo(ban);
      setLoading(false);
      return;
    }
    // Check if rejected (ban expired but still rejected)
    if (ban?.rejected) {
      setRejectionInfo({ reason: ban.rejection_reason });
      setLoading(false);
      return;
    }

    const { error } = await signIn(loginEmail, loginPassword);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Post-login: check if user already has a role (approved users skip registration check)
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (roleData) {
        // User has a role — they're approved, proceed directly
        setLoading(false);
        navigate("/companies");
        return;
      }
    }

    // No role found — check registration status
    const { data: regData } = await supabase
      .from("registration_requests")
      .select("status, rejection_reason")
      .maybeSingle();

    if (regData?.status === "rejected") {
      await signOut();
      setRejectionInfo({ reason: regData.rejection_reason });
      setLoading(false);
      return;
    }

    if (regData?.status === "pending") {
      await signOut();
      setPendingInfo({ isPending: true });
      setLoading(false);
      return;
    }

    // Approved or unknown — proceed
    setLoading(false);
    navigate("/companies");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    if (signupPassword !== signupConfirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (signupPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);

    // Check ban before attempting signup
    const ban = await checkBan(signupEmail);
    if (ban?.banned) {
      setBanInfo(ban);
      setLoading(false);
      return;
    }
    if (ban?.rejected) {
      setRejectionInfo({ reason: ban.rejection_reason });
      setLoading(false);
      return;
    }

    const { error } = await signUp(signupEmail, signupPassword, signupName.trim() || undefined);
    if (error) {
      const msg = error.message || "";
      if (msg.toLowerCase().includes("temporarily blocked") || msg.toLowerCase().includes("banned")) {
        toast({ title: "Registration blocked", description: "This email has been temporarily blocked. Please try again later.", variant: "destructive" });
      } else {
        toast({ title: "Signup failed", description: msg, variant: "destructive" });
      }
      setLoading(false);
    } else {
      // Persist flag before signOut — component may unmount due to PublicRoute redirect
      sessionStorage.setItem("registration_success", "true");
      // Immediately sign out — user must wait for admin approval
      await signOut();
      setLoading(false);
      setShowRegistrationSuccess(true);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(loginEmail);
    setLoading(false);
    if (error) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "Password reset link sent." });
      setShowReset(false);
    }
  };

  if (showRegistrationSuccess) {
    return <RegistrationSuccess />;
  }

  if (showReset) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>Enter your email to receive a reset link</CardDescription>
          </CardHeader>
          <form onSubmit={handleReset}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input id="reset-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required disabled={loading} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setShowReset(false)}>
                Back to Login
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <Link to="/"><img src={gaLogo} alt="Grammar Addopanto" className="h-16 w-auto object-contain" /></Link>
          <h1 className="sr-only">Addopanto Flow</h1>
          <p className="text-sm text-muted-foreground">Smart revenue allocation for your institution</p>
        </div>

        {banInfo?.banned && <BanMessage banInfo={banInfo} />}
        {rejectionInfo && <RejectionMessage reason={rejectionInfo.reason} />}
        {pendingInfo && <PendingMessage />}

        <Tabs defaultValue="login" className="w-full" onValueChange={() => clearAlerts()}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading || loading}
                >
                  {googleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  Continue with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required disabled={loading || googleLoading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required disabled={loading || googleLoading} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                  <Button type="button" variant="link" className="w-full text-sm" onClick={() => setShowReset(true)}>
                    Forgot password?
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading || loading}
                >
                  {googleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  Sign up with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input id="signup-name" type="text" placeholder="Your full name" value={signupName} onChange={(e) => setSignupName(e.target.value)} disabled={loading || googleLoading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="you@example.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required disabled={loading || googleLoading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required disabled={loading || googleLoading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <Input id="signup-confirm" type="password" value={signupConfirm} onChange={(e) => setSignupConfirm(e.target.value)} required disabled={loading || googleLoading} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
