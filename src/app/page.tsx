"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/hooks/useApp";
import { Sparkles, ArrowRight, Check, BarChart3, Palette, Share2, Shield, Zap, FileText, Star } from "lucide-react";

export default function HomePage() {
  const { user, loading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push("/forms");
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-[#f4f1f8] relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="orb orb-brand w-[500px] h-[500px] -top-40 -left-40 animate-pulse-soft" />
      <div className="orb orb-purple w-[400px] h-[400px] top-20 right-[-10%] animate-pulse-soft" style={{ animationDelay: "1s" }} />
      <div className="orb orb-cyan w-[300px] h-[300px] bottom-20 left-[20%] animate-pulse-soft" style={{ animationDelay: "2s" }} />

      <header className="border-b border-black/5 bg-white/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl text-ink-900">
            <img src="/logo.png" alt="FormCraft Logo" className="w-8 h-8 object-contain" />
            <span className="font-gnome-bc font-bold">FormCraft</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost">Sign in</Link>
            <Link href="/signup" className="btn-dark">
              Get started <ArrowRight size={16} strokeWidth={2} />
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative z-10">
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ink-900 text-white text-sm font-medium mb-6 shadow-lg">
            <Sparkles size={14} strokeWidth={2.4} className="text-brand-300" /> New: AI-powered form suggestions
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-ink-900 leading-[1.1]">
            Build beautiful forms{" "}
            <span className="gradient-text-animated">in minutes</span>
          </h1>
          <p className="mt-6 text-lg text-black/50 max-w-2xl mx-auto leading-relaxed">
            Create, customize, and share dynamic interactive forms. Collect responses in real time, analyze results, and export effortlessly.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link href="/signup" className="btn-primary text-base px-7 py-3">
              Start free <ArrowRight size={18} strokeWidth={2} />
            </Link>
          </div>
        </section>

        {/* Mock Dashboard Preview */}
        <section className="mt-16 max-w-4xl mx-auto">
          <div className="panel-static p-3 sm:p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-soft">
            <div className="grid grid-cols-3 gap-3">
              {[
                { title: "Customer Survey", responses: 142, color: "#6366f1" },
                { title: "Feedback Form", responses: 89, color: "#10b981" },
                { title: "Event Registration", responses: 234, color: "#8b5cf6" },
              ].map((item) => (
                <div key={item.title} className="glass-card p-4" style={{ "--progress-color": item.color } as React.CSSProperties}>
                  <div className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center" style={{ background: `${item.color}30` }}>
                    <FileText size={14} style={{ color: item.color }} />
                  </div>
                  <div className="text-white font-semibold text-sm">{item.title}</div>
                  <div className="text-white/40 text-xs mt-1">{item.responses} responses</div>
                  <div className="progress-bar mt-3">
                    <div className="progress-bar-fill" style={{ "--progress-width": `${Math.min(item.responses / 2.5, 100)}%`, "--progress-color": item.color, "--progress-color-end": `${item.color}80` } as React.CSSProperties} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="mt-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: Zap, title: "Drag-and-drop builder", desc: "Add, remove, and arrange fields effortlessly with our intuitive builder." },
            { icon: Palette, title: "Custom branding", desc: "Apply your colors, logos, and themes for a personalized look and feel." },
            { icon: Share2, title: "Easy sharing", desc: "Share via direct links, QR codes, or embed in your website with one click." },
            { icon: BarChart3, title: "Real-time analytics", desc: "Track submissions, completion times, and field-level insights live." },
            { icon: Shield, title: "Secure & private", desc: "Role-based access, password protection, and encrypted data storage." },
            { icon: Check, title: "Export anywhere", desc: "Download your data as CSV or Excel for deeper analysis." },
          ].map((f) => (
            <div key={f.title} className="panel-static panel-pad group hover:shadow-soft hover:-translate-y-1 transition-all duration-300 cursor-default">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-50 to-purple-50 text-brand-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <f.icon size={20} strokeWidth={1.8} />
              </div>
              <h3 className="font-semibold text-ink-900">{f.title}</h3>
              <p className="text-sm text-black/45 mt-1.5">{f.desc}</p>
            </div>
          ))}
        </section>


      </main>

      <footer className="border-t border-black/5 mt-16 py-8 text-center text-sm text-black/40 relative z-10">
        <p>© {new Date().getFullYear()} FormCraft. Built for teams that move fast.</p>
      </footer>
    </div>
  );
}