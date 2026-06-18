"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/hooks/useApp";
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const { signin } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signin(email, password);
      toast.success("Welcome back!");
      router.push("/forms");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f1f8] p-4 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="orb orb-brand w-[400px] h-[400px] -top-32 -right-32 animate-pulse-soft" />
      <div className="orb orb-purple w-[350px] h-[350px] bottom-[-10%] -left-20 animate-pulse-soft" style={{ animationDelay: "1.2s" }} />

      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="flex items-center justify-center gap-2 text-2xl mb-8 text-ink-900">
          <img src="/logo.png" alt="FormCraft Logo" className="w-10 h-10 object-contain" />
          <span className="font-gnome-bc font-bold">FormCraft</span>
        </Link>

        <div className="panel-static panel-pad" style={{ border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 8px 40px rgba(60, 30, 120, 0.08), 0 0 0 1px rgba(0,0,0,0.03)" }}>
          <h1 className="text-2xl font-semibold text-ink-900 tracking-tight">Welcome back</h1>
          <p className="text-sm text-black/45 mt-1">Sign in to manage your forms and responses.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm animate-slide-up">
                <AlertCircle size={16} className="shrink-0 mt-0.5" strokeWidth={2} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" strokeWidth={2} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" strokeWidth={2} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-9 pr-9"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/60 transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-black/45">
            Don't have an account?{" "}
            <Link href="/signup" className="text-brand-600 font-medium hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}