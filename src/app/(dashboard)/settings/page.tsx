"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/hooks/useApp";
import { auth } from "@/lib/auth";
import { uploadFile } from "@/lib/firebase";
import { User, Save, AlertCircle, Shield, Camera } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, refresh } = useApp();
  const router = useRouter();
  const [name, setName] = useState(user?.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!user) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file must be under 5MB");
      return;
    }

    setUploading(true);
    const tid = toast.loading("Uploading profile photo...");
    try {
      const url = await uploadFile(file);
      await auth.updateProfile({ photoURL: url });
      refresh();
      toast.success("Profile photo updated successfully", { id: tid });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed", { id: tid });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (confirm("Are you sure you want to remove your profile photo?")) {
      setUploading(true);
      const tid = toast.loading("Removing profile photo...");
      try {
        await auth.updateProfile({ photoURL: "" });
        refresh();
        toast.success("Profile photo removed successfully", { id: tid });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Removal failed", { id: tid });
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSave = () => {
    setSaving(true);
    try {
      auth.updateProfile({ displayName: name });
      refresh();
      toast.success("Profile updated successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-enter py-2 max-w-3xl mx-auto">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-[34px] font-extralight tracking-tight text-black leading-none">Settings</h1>
        <p className="text-sm text-black/45 mt-1.5">Manage your account and preferences.</p>
      </div>

      {/* Profile Section */}
      <div className="crextio-panel-static p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#f3edf8] border border-black/5 text-black/70 flex items-center justify-center">
            <User size={18} />
          </div>
          <div>
            <h2 className="font-bold text-[16px] text-black tracking-tight">Profile Info</h2>
            <p className="text-xs text-black/45 mt-0.5">Update your personal account display details.</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Profile Picture Upload Section */}
          <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 mb-2 border-b border-black/5">
            <div className="relative group cursor-pointer w-20 h-20 shrink-0">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile photo" 
                  className="w-20 h-20 rounded-full object-cover border-2 border-black/10 shadow-md group-hover:opacity-85 transition-opacity" 
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#6366f1] to-[#8b5cf6] text-white flex items-center justify-center font-bold text-2xl border-2 border-white shadow-md">
                  {user.displayName?.charAt(0).toUpperCase()}
                </div>
              )}
              
              {/* Camera Overlay Icon on hover */}
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Camera className="text-white" size={20} />
              </div>
              
              {/* Hidden File Input */}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="absolute inset-0 opacity-0 cursor-pointer rounded-full"
                disabled={uploading} 
              />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <h3 className="font-semibold text-sm text-black">Profile Picture</h3>
              <p className="text-xs text-black/40">Upload a new photo (PNG, JPG, or GIF up to 5MB).</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
                <button 
                  type="button" 
                  onClick={() => document.getElementById("settings-pfp-file-input")?.click()}
                  disabled={uploading}
                  className="bg-black hover:bg-black/85 text-white px-4 py-1.5 rounded-full text-xs font-bold transition disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload Photo"}
                </button>
                {user.photoURL && (
                  <button 
                    type="button" 
                    onClick={handleRemoveImage}
                    disabled={uploading}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-600 px-4 py-1.5 rounded-full text-xs font-bold transition disabled:opacity-50"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
            
            {/* File Input for the button trigger */}
            <input 
              id="settings-pfp-file-input"
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              className="hidden" 
            />
          </div>
          <div>
            <label className="label text-xs uppercase tracking-wider text-black/60 font-bold">Display Name</label>
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full bg-black/5 border border-transparent focus:border-black/10 rounded-full px-4 py-2.5 text-xs sm:text-sm text-black outline-none transition" 
            />
          </div>
          <div>
            <label className="label text-xs uppercase tracking-wider text-black/60 font-bold">Email Address</label>
            <input 
              value={user.email} 
              disabled 
              className="w-full bg-black/[0.03] border border-transparent rounded-full px-4 py-2.5 text-xs sm:text-sm text-black/50 cursor-not-allowed outline-none" 
            />
          </div>
          <div>
            <label className="label text-xs uppercase tracking-wider text-black/60 font-bold">Developer Role</label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="chip bg-black text-white rounded-full px-3 py-1 font-bold text-[10px] uppercase tracking-wider w-fit shrink-0">
                {user.role}
              </span>
              <span className="text-xs text-black/45">Admins have full access to forms, template actions, and API features.</span>
            </div>
          </div>

          <div className="pt-2">
            <button 
              onClick={handleSave} 
              disabled={saving} 
              className="bg-black hover:bg-black/85 text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
            >
              <Save size={14} /> <span>{saving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="crextio-panel-static p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#f3edf8] border border-black/5 text-black/70 flex items-center justify-center">
            <Shield size={18} />
          </div>
          <div>
            <h2 className="font-bold text-[16px] text-black tracking-tight">Security & Access</h2>
            <p className="text-xs text-black/45 mt-0.5">Account security levels and access controls.</p>
          </div>
        </div>

        <div className="space-y-3.5 text-xs sm:text-sm">
          <div className="flex items-center justify-between p-3.5 bg-black/[0.02] rounded-2xl border border-black/[0.03]">
            <span className="text-black font-semibold">Account created</span>
            <span className="text-black/60 font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center justify-between p-3.5 bg-black/[0.02] rounded-2xl border border-black/[0.03]">
            <span className="text-black font-semibold">Active sessions</span>
            <span className="text-black/60 font-medium">1 active device</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="crextio-panel-static p-6 sm:p-8 border-red-200 bg-red-500/[0.02] border-dashed" style={{ borderWidth: "1.5px" }}>
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
            <AlertCircle size={18} />
          </div>
          <div>
            <h2 className="font-bold text-[16px] text-red-900 tracking-tight">Danger Zone</h2>
            <p className="text-xs text-red-700/60 mt-0.5">Irreversible administrative actions — proceed with care.</p>
          </div>
        </div>
        <button
          onClick={async () => {
            if (confirm("Delete your account and all data? This cannot be undone.")) {
              setDeleting(true);
              const tid = toast.loading("Deleting account...");
              try {
                await auth.deleteAccount();
                toast.success("Account successfully deleted", { id: tid });
                refresh();
                router.push("/");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Deletion failed", { id: tid });
              } finally {
                setDeleting(false);
              }
            }
          }}
          disabled={deleting}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition shadow-sm disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete Account"}
        </button>
      </div>
    </div>
  );
}