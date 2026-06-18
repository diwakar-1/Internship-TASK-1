"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/hooks/useApp";
import { isFirebaseConfigured } from "@/lib/firebase";
import { syncFirestoreToLocal, dataStore } from "@/lib/store";
import { LayoutGrid, BarChart3, Settings, LogOut, FileText, Bell, Check, Trash2, Inbox } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import type { AppNotification } from "@/types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signout } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Trigger background sync on mount, window focus, and periodically every 30 seconds
  useEffect(() => {
    if (!user) return;

    // Run sync on mount/init
    syncFirestoreToLocal(user.uid);

    // Run sync on window focus (user returning to tab)
    const handleFocus = () => {
      syncFirestoreToLocal(user.uid);
    };
    window.addEventListener("focus", handleFocus);

    // Run sync periodically every 30 seconds
    const interval = setInterval(() => {
      syncFirestoreToLocal(user.uid);
    }, 30000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [user]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Initialize notifications and request permission
  useEffect(() => {
    if (!user) return;
    const existing = dataStore.getNotifications(user.uid);
    const existingIds = new Set(existing.map((n) => n.id));
    notifiedIdsRef.current = existingIds;
    setNotifications(existing);

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, [user]);

  // Poll for new notifications and trigger desktop alerts
  useEffect(() => {
    if (!user) return;
    const fetchNotifs = () => {
      const list = dataStore.getNotifications(user.uid);
      setNotifications(list);

      list.forEach((n) => {
        if (!n.read && !notifiedIdsRef.current.has(n.id)) {
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(n.title, {
                body: n.message,
                icon: "/logo.png",
              });
            } catch (err) {
              console.error("Failed to show browser notification:", err);
            }
          }
          notifiedIdsRef.current.add(n.id);
        }
      });
    };

    const interval = setInterval(fetchNotifs, 4000);
    return () => clearInterval(interval);
  }, [user]);

  // Click outside listener
  useEffect(() => {
    if (!showNotifications) return;
    const handleClose = () => setShowNotifications(false);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, [showNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = (id: string) => {
    dataStore.markNotificationAsRead(id);
    if (user) setNotifications(dataStore.getNotifications(user.uid));
  };

  const handleMarkAllRead = () => {
    if (user) {
      dataStore.markAllNotificationsAsRead(user.uid);
      setNotifications(dataStore.getNotifications(user.uid));
    }
  };

  const handleDeleteNotif = (id: string) => {
    dataStore.deleteNotification(id);
    if (user) setNotifications(dataStore.getNotifications(user.uid));
  };

  const handleClearAll = () => {
    if (user) {
      dataStore.clearAllNotifications(user.uid);
      setNotifications(dataStore.getNotifications(user.uid));
    }
  };

  const handleNotificationClick = (n: AppNotification) => {
    handleMarkRead(n.id);
    if (n.link) {
      router.push(n.link);
    }
    setShowNotifications(false);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f6f2]">
        <div className="w-8 h-8 border-4 border-black/10 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  const allNav = [
    { href: "/forms", label: "Forms", icon: LayoutGrid },
    { href: "/responses", label: "Responses", icon: FileText },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f6f2] via-[#f3edf8] to-[#eae4f5] flex flex-col antialiased">
      {/* Crextio-style floating top header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 relative z-30">
        <div className="h-16 bg-white/70 backdrop-blur-md rounded-full border border-white/60 shadow-soft px-4 sm:px-6 flex items-center justify-between gap-4">
          
          {/* Brand Logo - Left */}
          <Link href="/forms" className="flex items-center gap-2 px-3 py-1.5 bg-white border border-black/5 rounded-full shadow-sm hover:shadow-md transition shrink-0">
            <img src="/logo.png" alt="FormCraft Logo" className="w-6 h-6 object-contain" />
            <span className="text-[15.5px] tracking-tight text-black hidden sm:inline font-gnome-bc font-bold">FormCraft</span>
          </Link>

          {/* Navigation Links - Center */}
          <nav className="flex items-center gap-1 sm:gap-2 bg-black/[0.03] p-1 rounded-full border border-black/[0.03] overflow-x-auto scrollbar-none">
            {allNav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-[13.5px] font-semibold transition-all duration-200 whitespace-nowrap",
                    active
                      ? "bg-[#222222] text-white shadow-sm"
                      : "text-black/60 hover:text-black hover:bg-black/[0.03]"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Settings & Profile - Right */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Setting Tab Link */}
            <Link 
              href="/settings" 
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 bg-white border border-black/5 rounded-full text-[11px] sm:text-xs font-semibold text-black/60 hover:text-black hover:shadow-sm transition",
                pathname.startsWith("/settings") && "bg-[#222222] text-white border-transparent hover:text-white"
              )}
            >
              <Settings size={13} />
              <span className="hidden md:inline">Setting</span>
            </Link>

            {/* Notification bell */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-8 h-8 rounded-full bg-white border border-black/5 flex items-center justify-center text-black/60 hover:text-black hover:shadow-sm transition relative"
              >
                <Bell size={13} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-md border border-black/5 rounded-2xl shadow-glow z-50 p-4 animate-slide-up">
                  {/* Header of dropdown */}
                  <div className="flex items-center justify-between pb-2 border-b border-black/5 mb-3">
                    <span className="text-xs font-bold text-black uppercase tracking-wider">Notifications</span>
                    {notifications.length > 0 && (
                      <div className="flex gap-2">
                        <button 
                          onClick={handleMarkAllRead}
                          className="text-[10px] text-brand-600 hover:text-brand-700 hover:underline font-bold transition"
                        >
                          Mark all read
                        </button>
                        <span className="text-black/10">|</span>
                        <button 
                          onClick={handleClearAll}
                          className="text-[10px] text-black/40 hover:text-red-500 hover:underline font-bold transition"
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* List of notifications */}
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-black/5">
                    {notifications.length === 0 ? (
                      <div className="py-6 flex flex-col items-center justify-center text-center">
                        <Inbox size={24} className="text-black/20 mb-2" />
                        <p className="text-xs text-black/40">All caught up! No notifications.</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => handleNotificationClick(n)}
                          className={cn(
                            "p-2.5 rounded-xl border transition cursor-pointer flex gap-2.5 relative group text-left",
                            n.read 
                              ? "bg-black/[0.01] border-transparent opacity-70 hover:opacity-100 hover:bg-black/[0.02]" 
                              : "bg-brand-50/35 border-brand-100/50 hover:bg-brand-50/50"
                          )}
                        >
                          {/* Type-based Icon */}
                          <div className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                            n.type === "submission" ? "bg-purple-50 text-purple-600 border border-purple-100" :
                            n.type === "success" ? "bg-green-50 text-green-600 border border-green-100" :
                            n.type === "warning" ? "bg-yellow-50 text-yellow-600 border border-yellow-100" :
                            n.type === "error" ? "bg-red-50 text-red-600 border border-red-100" :
                            "bg-blue-50 text-blue-600 border border-blue-100"
                          )}>
                            {n.type === "submission" ? <FileText size={12} /> :
                             n.type === "success" ? <Check size={12} /> :
                             <Bell size={12} />}
                          </div>
                          
                          {/* Message Content */}
                          <div className="flex-1 min-w-0 pr-4">
                            <h4 className="text-[11.5px] font-bold text-black truncate leading-tight">{n.title}</h4>
                            <p className="text-[10px] text-black/55 mt-0.5 leading-snug">{n.message}</p>
                            <span className="text-[9px] text-black/35 mt-1 block">{timeAgo(n.createdAt)}</span>
                          </div>
                          
                          {/* Individual mark as read / delete actions on hover */}
                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!n.read && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkRead(n.id);
                                }}
                                className="p-1 bg-white hover:bg-black/5 text-black/50 hover:text-black rounded border border-black/5 shadow-sm transition"
                                title="Mark as read"
                              >
                                <Check size={10} />
                              </button>
                            )}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotif(n.id);
                              }}
                              className="p-1 bg-white hover:bg-red-50 text-black/50 hover:text-red-600 rounded border border-black/5 shadow-sm transition"
                              title="Delete"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar Circle */}
            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-black/5">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || "User Avatar"} 
                  className="w-8 h-8 rounded-full object-cover shadow-inner border border-black/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#c7d2fe] text-[#4f46e5] flex items-center justify-center font-bold text-xs shadow-inner">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-[12px] font-semibold text-black leading-none">{user.displayName}</span>
                <span className="text-[10px] text-black/45">{user.email}</span>
              </div>
              <button 
                onClick={signout} 
                title="Sign out" 
                className="text-black/40 hover:text-red-500 p-1.5 transition-colors rounded-full hover:bg-black/5"
              >
                <LogOut size={13} />
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}