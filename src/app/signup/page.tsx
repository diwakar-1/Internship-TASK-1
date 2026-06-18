"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/hooks/useApp";
import { Mail, Lock, User, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { dataStore } from "@/lib/store";

export default function SignupPage() {
  const { signup } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");

  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (step !== 2 || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate username rules (alphanumeric + only . - _ allowed)
    const usernameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!usernameRegex.test(username)) {
      setError("Username can only contain letters, numbers, and the . - _ special characters. No other special characters are allowed.");
      setLoading(false);
      return;
    }

    try {
      // Check if username is already taken
      const isTaken = dataStore.getUsers().some(
        (u) => u.username?.toLowerCase() === username.trim().toLowerCase()
      );
      if (isTaken) {
        throw new Error("Username is already taken");
      }

      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }
      
      toast.success("Verification code sent to your email!");
      setTimeLeft(60);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Invalid verification code");
      }

      await signup(
        email,
        password,
        `${firstName} ${lastName}`.trim(),
        username.trim(),
        firstName.trim(),
        lastName.trim()
      );
      toast.success("Registration successful!");
      router.push("/forms");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f1f8] p-4 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="orb orb-purple w-[400px] h-[400px] -top-32 -left-32 animate-pulse-soft" />
      <div className="orb orb-brand w-[350px] h-[350px] bottom-[-10%] -right-20 animate-pulse-soft" style={{ animationDelay: "1.2s" }} />
      <div className="orb orb-cyan w-[200px] h-[200px] top-[40%] right-[10%] animate-pulse-soft" style={{ animationDelay: "2s" }} />

      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="flex items-center justify-center gap-2 text-2xl mb-6 text-ink-900">
          <img src="/logo.png" alt="FormCraft Logo" className="w-10 h-10 object-contain" />
          <span className="font-gnome-bc font-bold">FormCraft</span>
        </Link>

        <div className="panel-static panel-pad" style={{ border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 8px 40px rgba(60, 30, 120, 0.08), 0 0 0 1px rgba(0,0,0,0.03)" }}>
          {step === 1 ? (
            <>
              <h1 className="text-2xl font-semibold text-ink-900 tracking-tight">Create your account</h1>
              <p className="text-sm text-black/45 mt-1">Start building forms in seconds — it's free.</p>

              <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm animate-slide-up">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* First Name & Last Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs uppercase tracking-wider text-black/60 font-semibold">First name</label>
                    <input 
                      type="text" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)} 
                      className="input rounded-xl text-sm" 
                      placeholder="Jane" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="label text-xs uppercase tracking-wider text-black/60 font-semibold">Last name</label>
                    <input 
                      type="text" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)} 
                      className="input rounded-xl text-sm" 
                      placeholder="Doe" 
                      required 
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="label text-xs uppercase tracking-wider text-black/60 font-semibold">Username</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" strokeWidth={2} />
                    <input 
                      type="text" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      className="input pl-9 rounded-xl text-sm" 
                      placeholder="jane_doe" 
                      required 
                    />
                  </div>
                  <span className="text-[10px] text-black/35 mt-1 block">Only letters, numbers, and . - _ special characters allowed.</span>
                </div>



                {/* Email */}
                <div>
                  <label className="label text-xs uppercase tracking-wider text-black/60 font-semibold">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" strokeWidth={2} />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-9" placeholder="you@example.com" required />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="label text-xs uppercase tracking-wider text-black/60 font-semibold">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" strokeWidth={2} />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input pl-9" placeholder="At least 6 characters" required minLength={6} />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 mt-2">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Send Verification Code"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4 border border-brand-100">
                <ShieldCheck size={24} />
              </div>
              <h1 className="text-2xl font-semibold text-center text-ink-900 tracking-tight">Verify your email</h1>
              <p className="text-sm text-center text-black/45 mt-2">
                We've sent a 6-digit verification code to <span className="font-semibold text-ink-800">{email}</span>.
              </p>

              <form onSubmit={handleVerifyOtpAndSignup} className="mt-6 space-y-4">
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm animate-slide-up">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="label text-center">Verification Code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••"
                    className="input text-center text-2xl tracking-[0.75em] font-mono font-bold py-3 placeholder:text-black/20"
                    required
                    maxLength={6}
                    autoFocus
                    disabled={timeLeft === 0}
                  />
                  <div className="text-center text-xs mt-2">
                    {timeLeft > 0 ? (
                      <span className="text-black/45">Code expires in <span className="font-semibold text-brand-600">{timeLeft}s</span></span>
                    ) : (
                      <span className="text-red-500 font-semibold">Code has expired. Please resend code.</span>
                    )}
                  </div>
                </div>

                <button type="submit" disabled={loading || timeLeft === 0} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Verify & Create Account"}
                </button>

                <div className="flex items-center justify-between text-xs pt-2">
                  <button type="button" onClick={() => setStep(1)} className="text-black/55 hover:text-black hover:underline transition">
                    ← Back to edit details
                  </button>
                  {timeLeft > 0 ? (
                    <span className="text-black/35 cursor-not-allowed">Resend code ({timeLeft}s)</span>
                  ) : (
                    <button type="button" onClick={handleRequestOtp} className="text-brand-600 font-semibold hover:underline transition">
                      Resend code
                    </button>
                  )}
                </div>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-black/45">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}