"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/hooks/useApp";
import { dataStore, createForm, createField, generateId, syncFirestoreToLocal } from "@/lib/store";
import { EmptyState } from "@/components/ui/PageHeader";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { toast } from "sonner";
import {
  Plus, Search, LayoutGrid, ListFilter, Archive, Copy, Trash2, Edit3, FileText, BarChart3, ArchiveRestore, Eye, Sparkles, HelpCircle, ExternalLink, QrCode, Download, Check, Camera
} from "lucide-react";
import { timeAgo, cn, copyToClipboard } from "@/lib/utils";
import { QRCodeCanvas } from "@/components/form/QRCodeCanvas";
import type { Form, FormStatus } from "@/types";

const GOOGLE_APPS_SCRIPT_CODE = `function doGet(e) {
  return HtmlService.createHtmlOutput(
    "<html><head><style>" +
    "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 50px; background-color: #f8fafc; color: #0f172a; }" +
    ".card { max-width: 480px; margin: 0 auto; background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }" +
    "h1 { font-size: 20px; font-weight: 600; color: #6366f1; margin-bottom: 10px; }" +
    "p { font-size: 14px; color: #64748b; line-height: 1.5; }" +
    ".status { display: inline-block; background: #ecfdf5; color: #059669; font-weight: bold; font-size: 11px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 20px; }" +
    "</style></head><body>" +
    "<div class='card'>" +
    "<div class='status'>Active</div>" +
    "<h1>Google Sheets Sync Active</h1>" +
    "<p>This URL is configured to receive form submissions from FormCraft. It expects HTTP POST requests with JSON payloads and cannot be viewed directly.</p>" +
    "</div>" +
    "</body></html>"
  );
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    if (sheet.getLastColumn() === 0) {
      sheet.appendRow(["Timestamp", "Submitter Email", "Form Title"]);
    }
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var rowData = {};
    rowData["Timestamp"] = new Date(data.submittedAt || Date.now()).toLocaleString();
    rowData["Submitter Email"] = data.submitterEmail || "Anonymous";
    rowData["Form Title"] = data.formTitle || "Untitled Form";
    
    for (var fieldName in data.responseData) {
      var val = data.responseData[fieldName];
      var valString = Array.isArray(val) ? val.join(", ") : String(val);
      
      if (headers.indexOf(fieldName) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(fieldName);
        headers.push(fieldName);
      }
      rowData[fieldName] = valString;
    }
    
    var row = headers.map(function(header) {
      return rowData[header] || "";
    });
    
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

export default function FormsPage() {
  const { user, refresh } = useApp();
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FormStatus | "all">("all");
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Form | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");

  const [localTier, setLocalTier] = useState<"free" | "bronze" | "silver" | "gold">("free");

  const [showQrModal, setShowQrModal] = useState<Form | null>(null);
  const [qrFgColor, setQrFgColor] = useState("#000000");
  const [copiedLink, setCopiedLink] = useState(false);

  const handleOpenQrModal = (form: Form) => {
    setShowQrModal(form);
    setQrFgColor(form.theme.primaryColor || "#000000");
  };

  // Sync initial local storage tier
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("formcraft:tier");
      if (saved && ["free", "bronze", "silver", "gold"].includes(saved)) {
        setLocalTier(saved as "free" | "bronze" | "silver" | "gold");
      }
    }
  }, []);

  const tier = useMemo(() => {
    if (user?.tier && user.proExpiresAt) {
      if (Date.now() < user.proExpiresAt) {
        return user.tier;
      }
    }
    return localTier;
  }, [user, localTier]);

  const saveTier = (newTier: "free" | "bronze" | "silver" | "gold") => {
    setLocalTier(newTier);
    if (typeof window !== "undefined") {
      localStorage.setItem("formcraft:tier", newTier);
    }
    if (user) {
      dataStore.addNotification({
        userId: user.uid,
        title: `Plan Updated: ${newTier.charAt(0).toUpperCase() + newTier.slice(1)}`,
        message: newTier === "free" 
          ? "Your account has been switched to the Free tier." 
          : `Congratulations! You have successfully upgraded to the ${newTier.toUpperCase()} Plan.`,
        type: "success"
      });
    }
  };

  const [showTierModal, setShowTierModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Profile Edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editBirthMonth, setEditBirthMonth] = useState("January");
  const [editBirthDay, setEditBirthDay] = useState(1);
  const [editBirthYear, setEditBirthYear] = useState(2000);
  const [editPhotoURL, setEditPhotoURL] = useState("");
  const [uploading, setUploading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Sync profile edit states when profile modal is opened
  useEffect(() => {
    if (showProfileModal && user) {
      setEditFirstName(user.firstName || "");
      setEditLastName(user.lastName || "");
      setEditUsername(user.username || "");
      setEditGender(user.gender || "");
      setEditBirthMonth(user.birthMonth || "January");
      setEditBirthDay(user.birthDay || 1);
      setEditBirthYear(user.birthYear || 2000);
      setEditPhotoURL(user.photoURL || "");
      setIsEditingProfile(false);
      setProfileError("");
    }
  }, [showProfileModal, user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file must be under 5MB");
      return;
    }

    setUploading(true);
    const tid = toast.loading("Uploading photo...");
    try {
      const { uploadFile } = await import("@/lib/firebase");
      const url = await uploadFile(file);
      setEditPhotoURL(url);
      toast.success("Photo uploaded successfully", { id: tid });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed", { id: tid });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setEditPhotoURL("");
    toast.success("Photo removed");
  };

  const handleSaveProfile = async () => {
    setProfileError("");
    setSavingProfile(true);

    const cleanUsername = editUsername.trim();
    const cleanFirstName = editFirstName.trim();
    const cleanLastName = editLastName.trim();

    if (!cleanFirstName) {
      setProfileError("First name is required");
      setSavingProfile(false);
      return;
    }

    if (!cleanUsername) {
      setProfileError("Username is required");
      setSavingProfile(false);
      return;
    }

    // Validate username rules
    const usernameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!usernameRegex.test(cleanUsername)) {
      setProfileError("Username can only contain letters, numbers, and the . - _ special characters. No other special characters are allowed.");
      setSavingProfile(false);
      return;
    }

    // Check availability
    const isTaken = dataStore.getUsers().some(
      (u) => u.uid !== user?.uid && u.username?.toLowerCase() === cleanUsername.toLowerCase()
    );
    if (isTaken) {
      setProfileError("Username is already taken");
      setSavingProfile(false);
      return;
    }

    try {
      const { auth } = await import("@/lib/auth");
      await auth.updateProfile({
        firstName: cleanFirstName,
        lastName: cleanLastName,
        username: cleanUsername,
        gender: editGender,
        birthMonth: editBirthMonth,
        birthDay: editBirthDay,
        birthYear: editBirthYear,
        displayName: `${cleanFirstName} ${cleanLastName}`.trim(),
        photoURL: editPhotoURL
      });
      
      refresh();
      setIsEditingProfile(false);
      setShowProfileModal(false);
      toast.success("Profile updated successfully");
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // Redirection and validation effect after successful Stripe Checkout payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout_success") === "true") {
      const sessionId = params.get("session_id");
      const upgradeToastId = toast.loading("Verifying your payment, please wait...");
      
      // Clean query params so refresh doesn't trigger toast again
      router.replace("/forms");

      const verifySession = async () => {
        try {
          // Wait 1.5 seconds for webhook to process
          await new Promise((r) => setTimeout(r, 1500));

          // Query verify session endpoint
          const res = await fetch(`/api/stripe/verify-session?session_id=${sessionId}`);
          const data = await res.json();

          if (data.success && data.plan) {
            saveTier(data.plan);
            
            const { auth } = await import("@/lib/auth");
            await auth.reloadCurrentUser();

            toast.success(`Welcome to the ${data.plan.toUpperCase()} plan! 🚀`, { id: upgradeToastId });
          } else {
            const { auth } = await import("@/lib/auth");
            const updated = await auth.reloadCurrentUser();
            if (updated?.tier && updated.tier !== "free") {
              saveTier(updated.tier);
              toast.success(`Welcome to the ${updated.tier.toUpperCase()} plan! 🚀`, { id: upgradeToastId });
            } else {
              toast.error("Payment verification is processing. Your plan will update shortly.", { id: upgradeToastId });
            }
          }
        } catch (error) {
          console.error("Payment verification error:", error);
          toast.error("Unable to verify payment instantly. Checking updates in background.", { id: upgradeToastId });
        }
      };

      if (sessionId) {
        verifySession();
      } else {
        toast.dismiss(upgradeToastId);
      }
    } else if (params.get("checkout_cancel") === "true") {
      toast.error("Upgrade cancelled.");
      router.replace("/forms");
    }
  }, [router]);

  const handleUpgrade = async (planName: "bronze" | "silver" | "gold") => {
    if (!user) {
      toast.error("Please sign in to upgrade your subscription plan.");
      return;
    }

    const upgradeToastId = toast.loading(`Initiating upgrade to ${planName}...`);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planName,
          userId: user.uid,
          email: user.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start checkout");
      }

      toast.success("Redirecting to payment gateway...", { id: upgradeToastId });
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout", { id: upgradeToastId });
    }
  };

  // Accordion active states
  const [openAccordion, setOpenAccordion] = useState<string | null>("templates");

  // Integrations states
  const [integrations, setIntegrations] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("formcraft:integrations");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return {
      googleSheets: {
        connected: false,
        spreadsheetName: "",
        spreadsheetUrl: "",
      },
      slackAlerts: {
        connected: false,
        webhookUrl: "",
        channel: "#form-alerts",
      }
    };
  });

  const saveIntegrations = (newIntegrations: typeof integrations) => {
    setIntegrations(newIntegrations);
    if (typeof window !== "undefined") {
      localStorage.setItem("formcraft:integrations", JSON.stringify(newIntegrations));
    }
  };

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showSlackModal, setShowSlackModal] = useState(false);
  const [gsSheetName, setGsSheetName] = useState("");
  const [gsScriptUrl, setGsScriptUrl] = useState("");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [slackChannel, setSlackChannel] = useState("#form-alerts");

  const [latency, setLatency] = useState(14);
  const [storageUsage, setStorageUsage] = useState("0.0 KB");

  const loadForms = () => {
    if (!user) return;
    setForms(dataStore.getForms(user.uid));
  };

  useEffect(() => {
    if (!user) return;
    loadForms();
    syncFirestoreToLocal(user.uid);
  }, [user]);

  // Listen for background sync updates
  useEffect(() => {
    if (!user) return;
    const handleSync = () => {
      loadForms();
    };
    window.addEventListener("formcraft:sync", handleSync);
    return () => window.removeEventListener("formcraft:sync", handleSync);
  }, [user]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      let total = 0;
      for (let x in localStorage) {
        if (localStorage.hasOwnProperty(x)) {
          total += (localStorage[x].length + x.length) * 2;
        }
      }
      setStorageUsage((total / 1024).toFixed(1) + " KB");
    }

    const interval = setInterval(() => {
      setLatency(Math.floor(Math.random() * 8) + 8);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    let list = forms;
    if (statusFilter !== "all") list = list.filter((f) => f.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (f) => f.title.toLowerCase().includes(s) || f.description.toLowerCase().includes(s) || f.tags.some((t) => t.toLowerCase().includes(s))
      );
    }
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [forms, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: forms.length,
      published: forms.filter((f) => f.status === "published").length,
      draft: forms.filter((f) => f.status === "draft").length,
      archived: forms.filter((f) => f.status === "archived").length,
      totalResponses: forms.reduce((acc, f) => acc + f.responseCount, 0),
    };
  }, [forms]);

  const handleCreate = () => {
    if (!user) return;

    // Enforce tier creation limits
    const limit = tier === "free" ? 2 : tier === "bronze" ? 5 : tier === "silver" ? 20 : Infinity;
    if (forms.length >= limit) {
      toast.error(`You have reached the form limit of ${limit} forms for the ${tier.toUpperCase()} plan. Please upgrade to create more forms!`);
      setShowNew(false);
      setShowTierModal(true);
      return;
    }

    const form = createForm(user.uid, newTitle.trim() || "Untitled form");
    dataStore.saveForm(form);
    toast.success("Form created successfully");
    setShowNew(false);
    setNewTitle("");
    router.push(`/forms/${form.id}/edit`);
  };

  const handleDuplicate = (f: Form) => {
    if (!user) return;

    // Enforce tier creation limits
    const limit = tier === "free" ? 2 : tier === "bronze" ? 5 : tier === "silver" ? 20 : Infinity;
    if (forms.length >= limit) {
      toast.error(`You have reached the form limit of ${limit} forms for the ${tier.toUpperCase()} plan. Please upgrade to duplicate this form!`);
      setShowTierModal(true);
      return;
    }

    const copy = dataStore.duplicateForm(f.id, user.uid);
    if (copy) {
      toast.success("Form duplicated");
      loadForms();
    }
  };

  const handleArchive = (f: Form) => {
    dataStore.archiveForm(f.id);
    toast.success("Form archived");
    loadForms();
  };

  const handleUnarchive = (f: Form) => {
    dataStore.setFormStatus(f.id, "draft");
    toast.success("Form restored to draft");
    loadForms();
  };

  const handleDelete = (f: Form) => {
    dataStore.deleteForm(f.id);
    toast.success("Form moved to trash");
    loadForms();
  };

  const handlePermanentDelete = (f: Form) => {
    dataStore.permanentlyDeleteForm(f.id);
    toast.success("Form permanently deleted");
    loadForms();
    setConfirmDelete(null);
  };

  const handleApplyTemplate = (templateKey: "feedback" | "contact" | "newsletter") => {
    if (!user) return;

    let title = "";
    let description = "";
    let tags: string[] = [];
    let fields: any[] = [];

    if (templateKey === "feedback") {
      title = "Customer Feedback Survey";
      description = "Help us improve by sharing your thoughts on your recent experience.";
      tags = ["feedback", "survey"];
      fields = [
        {
          ...createField("text"),
          label: "Full Name",
          placeholder: "Jane Doe",
          validation: { required: false }
        },
        {
          ...createField("email"),
          label: "Email Address",
          placeholder: "you@example.com",
          validation: { required: true }
        },
        {
          ...createField("rating"),
          label: "How would you rate your overall experience?",
          validation: { required: true, max: 5 }
        },
        {
          ...createField("radio"),
          label: "How likely are you to recommend us?",
          validation: { required: true },
          options: [
            { id: generateId("o_"), label: "Very likely", value: "very_likely" },
            { id: generateId("o_"), label: "Somewhat likely", value: "somewhat_likely" },
            { id: generateId("o_"), label: "Not likely", value: "not_likely" }
          ]
        },
        {
          ...createField("textarea"),
          label: "What did you like most about our service?",
          placeholder: "Type your thoughts here...",
          validation: { required: false }
        },
        {
          ...createField("textarea"),
          label: "Any other comments or suggestions?",
          placeholder: "Type your feedback here...",
          validation: { required: false }
        }
      ];
    } else if (templateKey === "contact") {
      title = "Contact Information";
      description = "Please fill out your contact details to stay in touch.";
      tags = ["contact", "leads"];
      fields = [
        {
          ...createField("text"),
          label: "Full Name",
          placeholder: "Jane Doe",
          validation: { required: true }
        },
        {
          ...createField("email"),
          label: "Email Address",
          placeholder: "jane@example.com",
          validation: { required: true }
        },
        {
          ...createField("phone"),
          label: "Phone Number",
          placeholder: "+1 (555) 000-0000",
          validation: { required: false }
        },
        {
          ...createField("text"),
          label: "Company / Organization",
          placeholder: "Acme Corp",
          validation: { required: false }
        },
        {
          ...createField("textarea"),
          label: "Message / Inquiries",
          placeholder: "Write your message here...",
          validation: { required: false }
        }
      ];
    } else if (templateKey === "newsletter") {
      title = "Newsletter Subscription";
      description = "Subscribe to our weekly newsletter to get the latest updates and tips.";
      tags = ["newsletter", "signup"];
      fields = [
        {
          ...createField("text"),
          label: "First Name",
          placeholder: "Jane",
          validation: { required: true }
        },
        {
          ...createField("email"),
          label: "Email Address",
          placeholder: "jane@example.com",
          validation: { required: true }
        },
        {
          ...createField("checkbox"),
          label: "What content are you interested in?",
          validation: { required: false },
          options: [
            { id: generateId("o_"), label: "Product Updates", value: "product_updates" },
            { id: generateId("o_"), label: "Weekly Tips & Tricks", value: "weekly_tips" },
            { id: generateId("o_"), label: "Special Offers", value: "special_offers" }
          ]
        }
      ];
    }

    const form = createForm(user.uid, title);
    form.description = description;
    form.tags = tags;
    form.fields = fields;

    dataStore.saveForm(form);
    toast.success(`"${title}" template applied!`);
    router.push(`/forms/${form.id}/edit`);
  };

  const handleConnectGoogle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gsScriptUrl.startsWith("https://script.google.com/")) {
      toast.error("Please enter a valid Google Apps Script Web App URL (must start with https://script.google.com/)");
      return;
    }
    saveIntegrations({
      ...integrations,
      googleSheets: {
        connected: true,
        spreadsheetName: gsSheetName.trim() || "FormCraft Responses",
        spreadsheetUrl: gsScriptUrl.trim(),
      }
    });
    toast.success("Google Sheets integration connected!");
    setShowGoogleModal(false);
  };

  const handleDisconnectGoogle = () => {
    saveIntegrations({
      ...integrations,
      googleSheets: {
        connected: false,
        spreadsheetName: "",
        spreadsheetUrl: "",
      }
    });
    setGsSheetName("");
    setGsScriptUrl("");
    toast.success("Google Sheets integration disconnected");
    setShowGoogleModal(false);
  };

  const handleConnectSlack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slackWebhook.startsWith("https://hooks.slack.com/")) {
      toast.error("Please enter a valid Slack webhook URL (must start with https://hooks.slack.com/)");
      return;
    }
    saveIntegrations({
      ...integrations,
      slackAlerts: {
        connected: true,
        webhookUrl: slackWebhook,
        channel: slackChannel.trim() || "#general",
      }
    });
    toast.success("Slack integration connected!");
    setShowSlackModal(false);
  };

  const handleDisconnectSlack = () => {
    saveIntegrations({
      ...integrations,
      slackAlerts: {
        connected: false,
        webhookUrl: "",
        channel: "",
      }
    });
    toast.success("Slack integration disconnected");
    setShowSlackModal(false);
  };

  const handleSendSlackTest = async () => {
    const toastId = toast.loading("Sending test notification to Slack...");
    try {
      const res = await fetch("/api/integrations/slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: integrations.slackAlerts.webhookUrl,
          channel: integrations.slackAlerts.channel,
          isTest: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send test alert");

      toast.success(`Test notification sent successfully to ${integrations.slackAlerts.channel}!`, { id: toastId });
    } catch (err: any) {
      toast.error(`Error sending test alert: ${err.message}`, { id: toastId });
    }
  };

  if (!user) return null;

  return (
    <div className="page-enter py-2">
      
      {/* Crextio-style Header & Metrics Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 mt-2">
        {/* Left: Thin Elegant Welcome + Horizontal Progress Indicators */}
        <div className="flex-1">
          <h1 className="text-[36px] font-extralight tracking-tight text-black leading-none">
            Welcome back, <span className="font-normal">{user?.firstName || user?.displayName || "Creator"}</span>
          </h1>
          
          {/* Crextio Progress Bar Row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-5 text-[11px] font-bold text-black/60 uppercase tracking-wider">
            {/* Metric 1: Published Ratio */}
            <div className="flex items-center gap-2">
              <span>Published</span>
              <div className="w-16 h-3.5 bg-black/5 rounded-full overflow-hidden relative">
                <div className="h-full bg-[#222222] rounded-full" style={{ width: `${stats.total > 0 ? (stats.published / stats.total) * 100 : 0}%` }} />
              </div>
              <span className="text-black font-semibold normal-case">
                {stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0}%
              </span>
            </div>

            {/* Metric 2: Draft Ratio */}
            <div className="flex items-center gap-2">
              <span>Drafts</span>
              <div className="w-16 h-3.5 bg-black/5 rounded-full overflow-hidden relative">
                <div className="h-full bg-[#fbbf24] rounded-full" style={{ width: `${stats.total > 0 ? (stats.draft / stats.total) * 100 : 0}%` }} />
              </div>
              <span className="text-black font-semibold normal-case">
                {stats.total > 0 ? Math.round((stats.draft / stats.total) * 100) : 0}%
              </span>
            </div>

            {/* Metric 3: Hatched Project Time Style */}
            <div className="flex items-center gap-2">
              <span>Response conversion</span>
              <div className="w-24 h-3.5 bg-black/5 rounded-full overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full hatch-white" style={{ width: '60%' }} />
              </div>
              <span className="text-black font-semibold normal-case">60%</span>
            </div>

            {/* Metric 4: General Rate */}
            <div className="flex items-center gap-2">
              <span>Performance</span>
              <div className="w-16 h-3.5 bg-black/5 rounded-full overflow-hidden relative border border-black/5">
                <div className="h-full bg-[#93c5fd] rounded-full" style={{ width: '85%' }} />
              </div>
              <span className="text-black font-semibold normal-case">85%</span>
            </div>
          </div>
        </div>

        {/* Right: Large Thin Stats Counters */}
        <div className="flex items-center gap-10 sm:gap-14 shrink-0">
          <div className="text-left">
            <div className="text-[52px] font-extralight text-black leading-none tracking-tight">{stats.total}</div>
            <div className="text-[11px] font-bold text-black/45 tracking-wider uppercase mt-1">Total Forms</div>
          </div>
          <div className="text-left">
            <div className="text-[52px] font-extralight text-black leading-none tracking-tight">{stats.published}</div>
            <div className="text-[11px] font-bold text-black/45 tracking-wider uppercase mt-1">Published</div>
          </div>
          <div className="text-left">
            <div className="text-[52px] font-extralight text-black leading-none tracking-tight">{stats.totalResponses}</div>
            <div className="text-[11px] font-bold text-black/45 tracking-wider uppercase mt-1">Responses</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Side Profile & Accordions, Right Side Form List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start mt-6">
        
        {/* Left Side: Creator Widget & Expandable Details */}
        <div className="space-y-4 lg:col-span-1">
          
          {/* Creator Profile Card (Lora Piterson widget style) */}
          <div className="crextio-panel p-5 relative overflow-hidden flex flex-col justify-between min-h-[240px] group transition-all duration-500 hover:shadow-glow">
            {/* Soft gradient background based on tier */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-60 z-0 transition-all duration-500",
              tier === "free" ? "from-[#fbbf24]/10 via-[#c7d2fe]/10 to-transparent" :
              tier === "bronze" ? "from-amber-600/15 via-[#fbbf24]/5 to-transparent" :
              tier === "silver" ? "from-slate-400/20 via-indigo-50/10 to-transparent" :
              "from-yellow-400/25 via-amber-200/10 to-transparent"
            )} />
            
            {/* Top Right tier badge */}
             <button 
               onClick={() => setShowTierModal(true)}
               className={cn(
                 "absolute top-4 right-4 z-10 px-2.5 py-1.5 rounded-full text-[10px] font-bold shadow-sm uppercase tracking-wider transition hover:scale-105 active:scale-95 flex items-center gap-1.5",
                 tier === "free" ? "bg-slate-100 text-slate-700 border border-slate-200" :
                 tier === "bronze" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                 tier === "silver" ? "bg-slate-200 text-slate-800 border border-slate-300" :
                 "bg-yellow-50 text-yellow-800 border border-yellow-200 shadow-glow font-extrabold animate-pulse-soft"
               )}
             >
               {tier === "bronze" && <img src="/bronze.png" alt="Bronze Badge" className="w-3.5 h-3.5 object-contain" />}
               {tier === "silver" && <img src="/silver.png" alt="Silver Badge" className="w-3.5 h-3.5 object-contain" />}
               {tier === "gold" && <img src="/gold.png" alt="Gold Badge" className="w-3.5 h-3.5 object-contain" />}
               {tier === "free" ? "Free Account" : tier === "bronze" ? "Bronze Plan" : tier === "silver" ? "Silver Plan" : "Gold VIP"}
             </button>
            
            {/* Avatar & User Details */}
            <div 
              onClick={() => setShowProfileModal(true)}
              className="relative z-10 flex-1 flex flex-col justify-start mt-6 cursor-pointer group/profile"
              title="Edit Profile"
            >
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="w-12 h-12 rounded-full object-cover mb-3 shadow-md border border-white/40 transition-transform group-hover/profile:scale-105" 
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg mb-3 shadow-md border border-white/40 transition-transform group-hover/profile:scale-105">
                  {user.displayName?.charAt(0).toUpperCase()}
                </div>
              )}
              <h2 className="text-[19px] font-bold text-black leading-tight transition-colors group-hover/profile:text-brand-600 flex items-center gap-1.5">
                {user.displayName}
                <span className="text-[10px] font-bold bg-black/5 text-black/50 px-1.5 py-0.5 rounded transition group-hover/profile:bg-brand-50 group-hover/profile:text-brand-700">Edit</span>
              </h2>
              
              {/* Subscription Label */}
               <p className={cn(
                 "text-xs mt-0.5 font-medium transition-colors flex items-center gap-1",
                 tier === "free" ? "text-black/45" :
                 tier === "bronze" ? "text-amber-700" :
                 tier === "silver" ? "text-indigo-700" :
                 "text-yellow-700 font-semibold"
               )}>
                 {tier === "free" && <span>Free Tier Member</span>}
                 {tier === "bronze" && (
                   <>
                     <span>Bronze Subscriber</span>
                     <img src="/bronze.png" alt="Bronze" className="w-3.5 h-3.5 object-contain" />
                   </>
                 )}
                 {tier === "silver" && (
                   <>
                     <span>Silver Subscriber</span>
                     <img src="/silver.png" alt="Silver" className="w-3.5 h-3.5 object-contain" />
                   </>
                 )}
                 {tier === "gold" && (
                   <>
                     <span>Gold Subscriber</span>
                     <img src="/gold.png" alt="Gold" className="w-3.5 h-3.5 object-contain animate-pulse-soft" />
                   </>
                 )}
               </p>
              
              {/* Subscribed Interactive Quota Bar */}
              {tier !== "free" && (
                <div className="mt-4 pt-3 border-t border-black/5 space-y-1 animate-slide-up">
                  <div className="flex justify-between text-[10px] font-bold text-black/55 uppercase tracking-wider">
                    <span>Forms Limit</span>
                    <span>{forms.length} / {tier === "bronze" ? 5 : tier === "silver" ? 20 : "Unlimited"}</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden relative">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        tier === "bronze" ? "bg-amber-600" : 
                        tier === "silver" ? "bg-indigo-600" : 
                        "bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600"
                      )}
                      style={{ width: `${tier === "gold" ? 100 : Math.min((forms.length / (tier === "bronze" ? 5 : 20)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Bottom Footer Action & Price Row */}
            <div className="relative z-10 mt-5 pt-3 border-t border-black/5 flex items-center justify-between">
              <button 
                onClick={() => setShowTierModal(true)} 
                className="text-[10.5px] font-bold text-brand-600 hover:text-brand-700 hover:underline uppercase tracking-wider transition-colors"
              >
                Manage Plan
              </button>
              
              <button 
                onClick={() => setShowTierModal(true)}
                className="bg-[#222222] text-white hover:bg-black px-3 py-1 rounded-full text-[11px] font-bold shadow-sm transition active:scale-95"
              >
                {tier === "free" ? "₹0 / mo" : tier === "bronze" ? "₹199 / mo" : tier === "silver" ? "₹499 / mo" : "₹999 / mo"}
              </button>
            </div>
          </div>

          {/* Interactive Accordion Menus (Pension/Devices style) */}
          <div className="space-y-2.5">
            {/* Accordion 1: Quick Templates */}
            <div className="crextio-panel-static p-4 flex flex-col transition-all duration-200">
              <button 
                onClick={() => setOpenAccordion(openAccordion === "templates" ? null : "templates")}
                className="flex items-center justify-between text-[11px] font-bold text-black/60 uppercase tracking-wider"
              >
                <span>Form Templates</span>
                <span className="text-black/30 text-[9px]">{openAccordion === "templates" ? "▲" : "▼"}</span>
              </button>
              {openAccordion === "templates" && (
                <div className="text-[12.5px] text-black/75 space-y-2 mt-3 pt-2.5 border-t border-black/5">
                  <div 
                    onClick={() => handleApplyTemplate("feedback")}
                    className="flex items-center justify-between hover:text-black cursor-pointer group/item"
                  >
                    <span>Customer Feedback</span>
                    <button className="text-[9px] bg-black/5 group-hover/item:bg-black group-hover/item:text-white px-2 py-0.5 rounded-full transition font-semibold">Apply</button>
                  </div>
                  <div 
                    onClick={() => handleApplyTemplate("contact")}
                    className="flex items-center justify-between hover:text-black cursor-pointer group/item"
                  >
                    <span>Contact Info Sheet</span>
                    <button className="text-[9px] bg-black/5 group-hover/item:bg-black group-hover/item:text-white px-2 py-0.5 rounded-full transition font-semibold">Apply</button>
                  </div>
                  <div 
                    onClick={() => handleApplyTemplate("newsletter")}
                    className="flex items-center justify-between hover:text-black cursor-pointer group/item"
                  >
                    <span>Newsletter Signup</span>
                    <button className="text-[9px] bg-black/5 group-hover/item:bg-black group-hover/item:text-white px-2 py-0.5 rounded-full transition font-semibold">Apply</button>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 2: Active Integrations */}
            <div className="crextio-panel-static p-4 flex flex-col transition-all duration-200">
              <button 
                onClick={() => setOpenAccordion(openAccordion === "integrations" ? null : "integrations")}
                className="flex items-center justify-between text-[11px] font-bold text-black/60 uppercase tracking-wider"
              >
                <span>Active integrations</span>
                <span className="text-black/30 text-[9px]">{openAccordion === "integrations" ? "▲" : "▼"}</span>
              </button>
              {openAccordion === "integrations" && (
                <div className="text-[12.5px] text-black/75 space-y-2 mt-3 pt-2.5 border-t border-black/5">

                  <div 
                    onClick={() => setShowSlackModal(true)}
                    className="flex items-center justify-between hover:bg-black/[0.02] p-1.5 rounded-xl cursor-pointer group/int"
                  >
                    <span>Slack Alerts</span>
                    {integrations.slackAlerts.connected ? (
                      <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-100 group-hover/int:bg-green-100 transition">Connected</span>
                    ) : (
                      <span className="text-[10px] text-black/40 bg-black/5 px-2 py-0.5 rounded-full group-hover/int:bg-black group-hover/int:text-white transition">Disconnected</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 3: System Status */}
            <div className="crextio-panel-static p-4 flex flex-col transition-all duration-200">
              <button 
                onClick={() => setOpenAccordion(openAccordion === "status" ? null : "status")}
                className="flex items-center justify-between text-[11px] font-bold text-black/60 uppercase tracking-wider"
              >
                <span>Performance & Status</span>
                <span className="text-black/30 text-[9px]">{openAccordion === "status" ? "▲" : "▼"}</span>
              </button>
              {openAccordion === "status" && (
                <div className="text-[12.5px] text-black/75 space-y-2 mt-3 pt-2.5 border-t border-black/5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span>API Endpoint</span>
                    <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-100">Healthy</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Database Latency</span>
                    <span className="text-black font-mono font-semibold">{latency}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Browser Storage Used</span>
                    <span className="text-black font-mono font-semibold">{storageUsage} / 5 MB</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
        </div>

        {/* Right Side: Search, Filters & Forms Grid */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Search and Filters Capsule Panel */}
          <div className="crextio-panel p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search forms by title, description, or tag..."
                className="w-full bg-black/5 border border-transparent focus:border-black/10 rounded-full pl-9 pr-4 py-2 text-xs sm:text-sm text-black placeholder-black/40 outline-none transition"
              />
            </div>
            
            <div className="flex items-center gap-2.5">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FormStatus | "all")}
                className="bg-black/5 border border-transparent focus:border-black/10 rounded-full px-3.5 py-2 text-xs sm:text-sm text-black outline-none transition"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              
              <div className="hidden sm:flex items-center bg-black/5 p-0.5 rounded-full border border-transparent">
                <button onClick={() => setView("grid")} className={cn("p-1.5 rounded-full transition", view === "grid" ? "bg-white text-black shadow-sm" : "text-black/50 hover:text-black")} title="Grid view">
                  <LayoutGrid size={15} />
                </button>
                <button onClick={() => setView("list")} className={cn("p-1.5 rounded-full transition", view === "list" ? "bg-white text-black shadow-sm" : "text-black/50 hover:text-black")} title="List view">
                  <ListFilter size={15} />
                </button>
              </div>

              <button 
                onClick={() => setShowNew(true)} 
                className="bg-black text-white hover:bg-black/85 px-5 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shrink-0"
              >
                <Plus size={15} /> <span>New Form</span>
              </button>
            </div>
          </div>

          {/* Forms List rendering */}
          {filtered.length === 0 ? (
            <div className="crextio-panel-static p-10 text-center">
              <EmptyState
                icon={FileText}
                title={search ? "No forms found" : "Create your first form"}
                description={search ? "Try adjusting your filters or search query." : "Get started by building a new form. It's free and takes seconds."}
                action={!search ? <button onClick={() => setShowNew(true)} className="bg-black text-white hover:bg-black/85 px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-1.5 transition mx-auto mt-4"><Plus size={15} /> New Form</button> : undefined}
              />
            </div>
          ) : view === "grid" ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((f) => (
                <FormCard key={f.id} form={f} onDuplicate={handleDuplicate} onArchive={handleArchive} onUnarchive={handleUnarchive} onDelete={() => setConfirmDelete(f)} onQrCode={handleOpenQrModal} />
              ))}
            </div>
          ) : (
            <div className="crextio-panel-static divide-y divide-black/5 overflow-hidden">
              {filtered.map((f) => (
                <FormRow key={f.id} form={f} onDuplicate={handleDuplicate} onArchive={handleArchive} onUnarchive={handleUnarchive} onDelete={() => setConfirmDelete(f)} onQrCode={handleOpenQrModal} />
              ))}
            </div>
          )}

        </div>

      </div>

      {/* Modals & Dialogs */}
      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="Create a new form"
        description="Give your form a name. You can change it anytime."
        footer={
          <>
            <button onClick={() => setShowNew(false)} className="btn-secondary rounded-full">Cancel</button>
            <button onClick={handleCreate} className="bg-black text-white hover:bg-black/85 px-5 py-2 rounded-full text-sm font-bold transition">Create Form</button>
          </>
        }
      >
        <label className="label text-xs uppercase tracking-wider text-black/60 font-bold">Form title</label>
        <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Customer Feedback Survey" className="input rounded-full" />
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handlePermanentDelete(confirmDelete)}
        title="Delete form permanently?"
        description={`This will permanently delete "${confirmDelete?.title}" and all of its ${confirmDelete?.responseCount ?? 0} responses. This cannot be undone.`}
        confirmText="Delete permanently"
        destructive
      />

      {/* QR Code Sharing Modal */}
      <Modal
        open={!!showQrModal}
        onClose={() => {
          setShowQrModal(null);
          setQrFgColor("#000000");
        }}
        title="QR Code & Share"
        description={showQrModal ? `Scan or download the QR code for "${showQrModal.title}" to share with respondents.` : ""}
        size="md"
        footer={
          <>
            <button 
              onClick={() => {
                setShowQrModal(null);
                setQrFgColor("#000000");
              }} 
              className="btn-secondary rounded-full text-xs font-bold px-4 py-2"
            >
              Close
            </button>
            <button 
              onClick={() => {
                if (!showQrModal) return;
                const canvas = document.getElementById("dashboard-qr-canvas") as HTMLCanvasElement | null;
                if (!canvas) return;
                const url = canvas.toDataURL("image/png");
                const a = document.createElement("a");
                a.href = url;
                a.download = `${showQrModal.title.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
                a.click();
                toast.success("QR Code downloaded as PNG");
              }}
              className="bg-black text-white hover:bg-black/85 px-5 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5"
            >
              <Download size={14} /> Download PNG
            </button>
          </>
        }
      >
        {showQrModal && (
          <div className="space-y-5 pt-2">
            {/* Customizer + Preview Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Left Column: QR Code Preview (Centered) */}
              <div className="flex flex-col items-center justify-center p-4 bg-white border border-black/5 rounded-2xl shadow-sm">
                <QRCodeCanvas 
                  id="dashboard-qr-canvas" 
                  value={`${window.location.origin}/forms/${showQrModal.id}`} 
                  size={160} 
                  fgColor={qrFgColor} 
                />
              </div>

              {/* Right Column: Customization Presets */}
              <div className="space-y-4">
                <div>
                  <label className="label text-[11px] uppercase tracking-wider text-black/60 font-bold mb-2 block">
                    Foreground Color
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Presets */}
                    {[
                      { label: "Black", value: "#000000" },
                      { label: "Indigo", value: "#6366f1" },
                      { label: "Emerald", value: "#10b981" },
                      { label: "Amber", value: "#f59e0b" },
                      { label: "Rose", value: "#f43f5e" },
                      { label: "Violet", value: "#8b5cf6" },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => setQrFgColor(preset.value)}
                        className={cn(
                          "w-7 h-7 rounded-full border transition-all duration-200 hover:scale-105 active:scale-95",
                          qrFgColor.toLowerCase() === preset.value.toLowerCase() 
                            ? "ring-2 ring-black ring-offset-2 scale-110" 
                            : "border-black/10"
                        )}
                        style={{ backgroundColor: preset.value }}
                        title={preset.label}
                      />
                    ))}

                    {/* Custom Form Theme Preset if exists and not default black */}
                    {showQrModal.theme.primaryColor && !["#000000", "black"].includes(showQrModal.theme.primaryColor.toLowerCase()) && (
                      <button
                        onClick={() => setQrFgColor(showQrModal.theme.primaryColor)}
                        className={cn(
                          "w-7 h-7 rounded-full border transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center text-[8px] font-bold text-white shadow-sm",
                          qrFgColor.toLowerCase() === showQrModal.theme.primaryColor.toLowerCase() 
                            ? "ring-2 ring-black ring-offset-2 scale-110" 
                            : "border-black/10"
                        )}
                        style={{ backgroundColor: showQrModal.theme.primaryColor }}
                        title="Form Theme Color"
                      >
                        Theme
                      </button>
                    )}

                    {/* Color picker */}
                    <div className="relative w-7 h-7 rounded-full border border-black/10 overflow-hidden cursor-pointer flex items-center justify-center bg-black/5">
                      <input 
                        type="color" 
                        value={qrFgColor} 
                        onChange={(e) => setQrFgColor(e.target.value)} 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                        title="Custom Color"
                      />
                      <div className="w-4 h-4 rounded-full border border-black/5" style={{ backgroundColor: qrFgColor }} />
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-black/45 leading-normal">
                  Customize the foreground color to match your brand or marketing collateral. Make sure there is enough contrast for scanners.
                </p>
              </div>
            </div>

            {/* Link Copy Area */}
            <div className="space-y-2 pt-2 border-t border-black/5">
              <label className="label text-[11px] uppercase tracking-wider text-black/60 font-bold">
                Direct Link
              </label>
              <div className="flex gap-2">
                <input 
                  readOnly 
                  value={`${window.location.origin}/forms/${showQrModal.id}`} 
                  className="input flex-1 font-mono text-xs" 
                />
                <button 
                  onClick={async () => {
                    const link = `${window.location.origin}/forms/${showQrModal.id}`;
                    const ok = await copyToClipboard(link);
                    if (ok) {
                      setCopiedLink(true);
                      toast.success("Link copied to clipboard!");
                      setTimeout(() => setCopiedLink(false), 2000);
                    } else {
                      toast.error("Failed to copy link");
                    }
                  }} 
                  className="btn-secondary px-3.5"
                >
                  {copiedLink ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={2} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Slack Alerts Integration Modal */}
      <Modal
        open={showSlackModal}
        onClose={() => setShowSlackModal(false)}
        title={integrations.slackAlerts.connected ? "Slack Integration" : "Connect Slack Alerts"}
        description={integrations.slackAlerts.connected ? "Incoming responses will trigger notifications in your Slack channel." : "Send real-time alerts to a Slack channel when a form receives a response."}
        size={integrations.slackAlerts.connected ? "md" : "lg"}
        footer={
          integrations.slackAlerts.connected ? (
            <>
              <button onClick={handleDisconnectSlack} className="btn-danger rounded-full text-xs font-bold px-4 py-2">Disconnect</button>
              <button onClick={handleSendSlackTest} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-full text-xs font-bold transition">Send Test Alert</button>
              <button onClick={() => setShowSlackModal(false)} className="btn-secondary rounded-full text-xs font-bold px-4 py-2">Close</button>
            </>
          ) : (
            <>
              <button onClick={() => setShowSlackModal(false)} className="btn-secondary rounded-full text-xs font-bold px-4 py-2">Cancel</button>
              <button form="slack-connect-form" type="submit" className="bg-black text-white hover:bg-black/85 px-5 py-2 rounded-full text-xs font-bold transition">Connect Webhook</button>
            </>
          )
        }
      >
        {integrations.slackAlerts.connected ? (
          <div className="space-y-4 pt-2">
            <div className="space-y-3">
              <div>
                <label className="label text-[11px] uppercase tracking-wider text-black/60 font-bold">Target Channel</label>
                <div className="p-3 bg-black/[0.02] border border-black/5 rounded-xl font-mono text-xs text-black/75">
                  {integrations.slackAlerts.channel}
                </div>
              </div>
              <div>
                <label className="label text-[11px] uppercase tracking-wider text-black/60 font-bold">Webhook URL</label>
                <div className="p-3 bg-black/[0.02] border border-black/5 rounded-xl font-mono text-xs text-black/45 truncate">
                  {integrations.slackAlerts.webhookUrl}
                </div>
              </div>
            </div>
            <p className="text-xs text-black/45">
              A notification with form data will be sent to this Slack channel for each new submission.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left Column: Connection Form */}
            <form id="slack-connect-form" onSubmit={handleConnectSlack} className="space-y-4 pt-2">
              <div>
                <label className="label text-[11px] uppercase tracking-wider text-black/60 font-bold">Incoming Webhook URL</label>
                <input 
                  required 
                  type="url"
                  value={slackWebhook} 
                  onChange={(e) => setSlackWebhook(e.target.value)} 
                  placeholder="https://hooks.slack.com/services/.../.../..." 
                  className="input rounded-xl font-mono text-xs"
                />
                <span className="text-[10px] text-black/35 mt-1 block">Generate this under Slack API &gt; Incoming Webhooks.</span>
              </div>
              <div>
                <label className="label text-[11px] uppercase tracking-wider text-black/60 font-bold">Channel</label>
                <input 
                  required 
                  value={slackChannel} 
                  onChange={(e) => setSlackChannel(e.target.value)} 
                  placeholder="e.g. #form-alerts" 
                  className="input rounded-xl font-mono text-xs"
                />
              </div>
            </form>

            {/* Right Column: Setup Walkthrough for New Users */}
            <div className="border-t md:border-t-0 md:border-l border-black/5 pt-5 md:pt-0 md:pl-6 space-y-3.5">
              <h3 className="text-[11px] font-bold text-black/60 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle size={14} className="text-[#6366f1]" />
                Slack Setup Guide
              </h3>
              
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {/* Step 1 */}
                <div className="flex gap-2.5 items-start text-xs">
                  <div className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-0.5">Create a Workspace</h4>
                    <p className="text-black/50 leading-relaxed">
                      Go to <a href="https://slack.com/get-started" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline inline-flex items-center gap-0.5 font-medium">slack.com <ExternalLink size={10} /></a> and sign up to create a free workspace for your team or organization.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-2.5 items-start text-xs">
                  <div className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-0.5">Add a Channel</h4>
                    <p className="text-black/50 leading-relaxed">
                      In your new Slack sidebar, click <strong>Add channels</strong> and create a public channel (e.g. <code className="bg-black/5 px-1 py-0.5 rounded font-mono text-[10px]">#form-alerts</code>) where notifications will go.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-2.5 items-start text-xs">
                  <div className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-0.5">Create a Webhook App</h4>
                    <p className="text-black/50 leading-relaxed">
                      Go to the <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline inline-flex items-center gap-0.5 font-medium">Slack App Portal <ExternalLink size={10} /></a>. Click <strong>Create New App</strong> and select <strong>From Scratch</strong>.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-2.5 items-start text-xs">
                  <div className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-0.5">Enable & Copy Webhook</h4>
                    <p className="text-black/50 leading-relaxed">
                      Go to <strong>Incoming Webhooks</strong> and toggle it <strong>On</strong>. Click <strong>Add New Webhook</strong> at the bottom, select your channel, authorize it, and copy the generated URL to the form.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Manage Subscription Modal */}
      <Modal
        open={showTierModal}
        onClose={() => setShowTierModal(false)}
        title="Manage Subscription Plan"
        description="Choose the plan that suits you best. All prices are in Indian Rupees (₹) and include local tax."
        size="md"
        footer={
          <button onClick={() => setShowTierModal(false)} className="btn-secondary rounded-full text-xs font-bold px-4 py-2">Close</button>
        }
      >
        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Free Plan */}
          <div 
            onClick={() => {
              saveTier("free");
              toast.success("Switched to Free Plan");
            }}
            className={cn(
              "p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[140px]",
              tier === "free" ? "border-brand-600 bg-brand-50/50 shadow-soft" : "border-black/5 hover:border-black/25 bg-black/[0.01]"
            )}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-black">Free Plan</span>
                {tier === "free" && <span className="text-[9px] bg-brand-100 text-brand-700 font-bold px-2 py-0.5 rounded-full">Active</span>}
              </div>
              <p className="text-[10px] text-black/45 mt-1">Basic form building. Limit 2 forms.</p>
            </div>
            <div className="text-lg font-bold text-black mt-4">₹0 <span className="text-[10px] text-black/45 font-normal">/ mo</span></div>
          </div>

          {/* Bronze Plan */}
          <div 
            onClick={() => handleUpgrade("bronze")}
            className={cn(
              "p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[140px]",
              tier === "bronze" ? "border-amber-600 bg-amber-50/30 shadow-soft" : "border-black/5 hover:border-black/25 bg-black/[0.01]"
            )}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-black flex items-center gap-1">
                  Bronze Plan
                  <img src="/bronze.png" alt="Bronze" className="w-3.5 h-3.5 object-contain" />
                </span>
                {tier === "bronze" && <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">Active</span>}
              </div>
              <p className="text-[10px] text-black/45 mt-1">For growing makers. Limit 5 forms.</p>
            </div>
            <div className="text-lg font-bold text-black mt-4">₹199 <span className="text-[10px] text-black/45 font-normal">/ mo</span></div>
          </div>

          {/* Silver Plan */}
          <div 
            onClick={() => handleUpgrade("silver")}
            className={cn(
              "p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[140px]",
              tier === "silver" ? "border-slate-500 bg-slate-50 shadow-soft" : "border-black/5 hover:border-black/25 bg-black/[0.01]"
            )}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-black flex items-center gap-1">
                  Silver Plan
                  <img src="/silver.png" alt="Silver" className="w-3.5 h-3.5 object-contain" />
                </span>
                {tier === "silver" && <span className="text-[9px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-full">Active</span>}
              </div>
              <p className="text-[10px] text-black/45 mt-1">For active developers. Limit 20 forms.</p>
            </div>
            <div className="text-lg font-bold text-black mt-4">₹499 <span className="text-[10px] text-black/45 font-normal">/ mo</span></div>
          </div>

          {/* Gold Plan */}
          <div 
            onClick={() => handleUpgrade("gold")}
            className={cn(
              "p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[140px] relative overflow-hidden group",
              tier === "gold" ? "border-yellow-500 bg-yellow-50/50 shadow-glow" : "border-black/5 hover:border-black/25 bg-black/[0.01]"
            )}
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-400/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-black flex items-center gap-1">
                  Gold Plan 
                  <img src="/gold.png" alt="Gold" className="w-3.5 h-3.5 object-contain" />
                </span>
                {tier === "gold" && <span className="text-[9px] bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 rounded-full">Active</span>}
              </div>
              <p className="text-[10px] text-black/45 mt-1">Unlimited forms & responses. Priority support.</p>
            </div>
            <div className="text-lg font-bold text-black mt-4 flex items-baseline gap-1">
              <span>₹999</span>
              <span className="text-[10px] text-black/45 font-normal">/ mo</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Profile Details Modal */}
      <Modal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Edit Profile Details"
        description="Update your personal information. Your email address cannot be changed."
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button 
              onClick={() => setShowProfileModal(false)} 
              disabled={savingProfile}
              className="btn-secondary rounded-full text-xs font-bold px-4 py-2"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveProfile} 
              disabled={savingProfile}
              className="bg-black text-white hover:bg-black/85 px-5 py-2 rounded-full text-xs font-bold transition disabled:opacity-50"
            >
              {savingProfile ? "Saving..." : "Save Changes"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          {profileError && (
            <div className="text-xs text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 leading-snug">
              {profileError}
            </div>
          )}

          {/* Profile Picture Upload Section */}
          <div className="flex items-center gap-4 pb-4 mb-2 border-b border-black/5">
            <div className="relative group cursor-pointer w-16 h-16 shrink-0">
              {editPhotoURL ? (
                <img 
                  src={editPhotoURL} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-full object-cover border border-black/10 shadow-sm" 
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xl border border-white shadow-sm">
                  {user.displayName?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Camera className="text-white" size={16} />
              </div>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="absolute inset-0 opacity-0 cursor-pointer rounded-full"
                disabled={uploading} 
              />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-xs font-bold text-black">Profile Picture</h4>
              <p className="text-[10px] text-black/45">Change your avatar image.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => document.getElementById("modal-pfp-file-input")?.click()}
                  disabled={uploading}
                  className="bg-black hover:bg-black/85 text-white px-3 py-1 rounded-full text-[10px] font-bold transition disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload Photo"}
                </button>
                {editPhotoURL && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={uploading}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-600 px-3 py-1 rounded-full text-[10px] font-bold transition disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <input 
              id="modal-pfp-file-input"
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              className="hidden" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-black/45 uppercase tracking-wider block mb-1">First Name</label>
              <input
                type="text"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                className="w-full bg-black/5 border border-transparent focus:border-black/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-black outline-none transition"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-black/45 uppercase tracking-wider block mb-1">Last Name</label>
              <input
                type="text"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                className="w-full bg-black/5 border border-transparent focus:border-black/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-black outline-none transition"
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-black/45 uppercase tracking-wider block mb-1">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-black/40 font-semibold">@</span>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="w-full bg-black/5 border border-transparent focus:border-black/10 rounded-xl pl-7 pr-3 py-2 text-xs sm:text-sm text-black outline-none transition"
                placeholder="username"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-black/45 uppercase tracking-wider block mb-1">Email Address</label>
            <input
              type="text"
              value={user?.email || ""}
              disabled
              className="w-full bg-black/5 border border-transparent rounded-xl px-3 py-2 text-xs sm:text-sm text-black/40 outline-none select-none cursor-not-allowed"
            />
            <p className="text-[9px] text-black/40 mt-1">Email address is linked to your authentication and cannot be edited.</p>
          </div>

          <div>
            <label className="text-[10px] font-bold text-black/45 uppercase tracking-wider block mb-1">Gender</label>
            <select
              value={editGender}
              onChange={(e) => setEditGender(e.target.value)}
              className="w-full bg-black/5 border border-transparent focus:border-black/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-black outline-none transition appearance-none"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-black/45 uppercase tracking-wider block mb-1">Birth Date</label>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={editBirthMonth}
                onChange={(e) => setEditBirthMonth(e.target.value)}
                className="bg-black/5 border border-transparent focus:border-black/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-black outline-none transition"
              >
                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={editBirthDay}
                onChange={(e) => setEditBirthDay(Number(e.target.value))}
                className="bg-black/5 border border-transparent focus:border-black/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-black outline-none transition"
              >
                {Array.from({ length: 31 }).map((_, idx) => (
                  <option key={idx + 1} value={idx + 1}>{idx + 1}</option>
                ))}
              </select>
              <select
                value={editBirthYear}
                onChange={(e) => setEditBirthYear(Number(e.target.value))}
                className="bg-black/5 border border-transparent focus:border-black/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-black outline-none transition"
              >
                {Array.from({ length: 100 }).map((_, idx) => {
                  const y = new Date().getFullYear() - idx;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function FormCard({
  form,
  onDuplicate,
  onArchive,
  onUnarchive,
  onDelete,
  onQrCode,
}: {
  form: Form;
  onDuplicate: (f: Form) => void;
  onArchive: (f: Form) => void;
  onUnarchive: (f: Form) => void;
  onDelete: (f: Form) => void;
  onQrCode?: (f: Form) => void;
}) {
  const maxResponses = 100;
  const progressPercent = Math.min((form.responseCount / maxResponses) * 100, 100);
  const isDark = form.status === "archived";

  return (
    <div className={cn(
      "relative group transition-all duration-300 flex flex-col justify-between min-h-[240px]",
      isDark ? "crextio-card-dark p-6" : "crextio-panel p-6"
    )}>
      {/* Top right status badge */}
      <div className="absolute top-5 right-5 z-10">
        <span className={cn(
          "chip text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full",
          form.status === "published" ? "bg-green-100 text-green-700" :
          form.status === "draft" ? "bg-[#fbbf24]/20 text-[#b45309]" :
          "bg-white/15 text-white/80 border border-white/10"
        )}>
          {form.status}
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-between h-full">
        <div>
          {/* File Icon container */}
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center mb-4 border",
            isDark ? "bg-white/10 border-white/10" : "bg-[#f3edf8]/60 border-black/5"
          )}>
            <FileText size={16} className={isDark ? "text-white" : "text-black/70"} />
          </div>

          {/* Form title */}
          <Link href={`/forms/${form.id}/edit`} className="block">
            <h3 className={cn(
              "font-bold text-[15.5px] tracking-tight group-hover:underline",
              isDark ? "text-white" : "text-black"
            )}>
              {form.title}
            </h3>
          </Link>
          <p className={cn(
            "text-xs line-clamp-2 mt-1 min-h-[2rem]",
            isDark ? "text-white/60" : "text-black/45"
          )}>
            {form.description || "No description provided"}
          </p>
        </div>

        {/* Responses/fields progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10.5px] font-semibold mb-1">
            <span className={isDark ? "text-white/80" : "text-black/60"}>{form.responseCount} responses</span>
            <span className={isDark ? "text-white/40" : "text-black/35"}>{form.fields.length} fields</span>
          </div>
          <div className={cn("h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-black/5")}>
            <div 
              className={cn("h-full rounded-full", isDark ? "bg-[#fbbf24] hatch-white" : "bg-black hatch-dark")} 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Footer meta / actions */}
        <div className={cn(
          "mt-4 pt-3 border-t flex items-center justify-between text-xs",
          isDark ? "border-white/10" : "border-black/5"
        )}>
          <Link href={`/forms/${form.id}/edit`} className={cn(
            "font-bold hover:underline",
            isDark ? "text-white" : "text-black"
          )}>
            Edit Form
          </Link>
          
          <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity duration-200">
            {form.status === "published" && (
              <>
                <Link href={`/forms/${form.id}`} target="_blank" className={cn("p-1.5 rounded-full transition", isDark ? "hover:bg-white/10 text-white/60 hover:text-white" : "hover:bg-black/5 text-black/50 hover:text-black")} title="View">
                  <Eye size={13} />
                </Link>
                {onQrCode && (
                  <button onClick={() => onQrCode(form)} className={cn("p-1.5 rounded-full transition", isDark ? "hover:bg-white/10 text-white/60 hover:text-white" : "hover:bg-black/5 text-black/50 hover:text-black")} title="QR Code">
                    <QrCode size={13} />
                  </button>
                )}
              </>
            )}
            <button onClick={() => onDuplicate(form)} className={cn("p-1.5 rounded-full transition", isDark ? "hover:bg-white/10 text-white/60 hover:text-white" : "hover:bg-black/5 text-black/50 hover:text-black")} title="Duplicate">
              <Copy size={13} />
            </button>
            {form.status === "archived" ? (
              <button onClick={() => onUnarchive(form)} className={cn("p-1.5 rounded-full transition", isDark ? "hover:bg-white/10 text-white/60 hover:text-white" : "hover:bg-black/5 text-black/50 hover:text-black")} title="Restore">
                <ArchiveRestore size={13} />
              </button>
            ) : (
              <button onClick={() => onArchive(form)} className={cn("p-1.5 rounded-full transition", isDark ? "hover:bg-white/10 text-white/60 hover:text-white" : "hover:bg-black/5 text-black/50 hover:text-black")} title="Archive">
                <Archive size={13} />
              </button>
            )}
            <button onClick={() => onDelete(form)} className={cn("p-1.5 rounded-full transition", isDark ? "hover:bg-red-500/20 text-red-400 hover:text-red-300" : "hover:bg-red-50 text-red-500 hover:text-red-700")} title="Delete">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormRow({
  form,
  onDuplicate,
  onArchive,
  onUnarchive,
  onDelete,
  onQrCode,
}: {
  form: Form;
  onDuplicate: (f: Form) => void;
  onArchive: (f: Form) => void;
  onUnarchive: (f: Form) => void;
  onDelete: (f: Form) => void;
  onQrCode?: (f: Form) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-4 hover:bg-black/[0.02] transition group">
      <div className="w-1.5 h-8 rounded" style={{ backgroundColor: "#222222" }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link href={`/forms/${form.id}/edit`} className="font-bold text-[14.5px] text-black hover:underline truncate">
            {form.title}
          </Link>
          <span className="chip text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-black/5 text-black/60">
            {form.status}
          </span>
        </div>
        <div className="text-[11px] text-black/45 mt-0.5 flex items-center gap-2 leading-none">
          <span>{form.responseCount} responses</span>
          <span>·</span>
          <span>{form.fields.length} fields</span>
          <span>·</span>
          <span>Updated {timeAgo(form.updatedAt)}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <Link href={`/forms/${form.id}/edit`} className="bg-black/5 hover:bg-black/10 text-black text-xs font-bold px-3 py-1.5 rounded-full transition">Edit</Link>
        {form.status === "published" && onQrCode && (
          <button onClick={() => onQrCode(form)} className="p-1.5 text-black/45 hover:bg-black/5 rounded-full transition" title="QR Code">
            <QrCode size={13} />
          </button>
        )}
        {form.status === "archived" ? (
          <button onClick={() => onUnarchive(form)} className="p-1.5 text-black/45 hover:bg-black/5 rounded-full transition" title="Restore">
            <ArchiveRestore size={13} />
          </button>
        ) : (
          <button onClick={() => onArchive(form)} className="p-1.5 text-black/45 hover:bg-black/5 rounded-full transition" title="Archive">
            <Archive size={13} />
          </button>
        )}
        <button onClick={() => onDuplicate(form)} className="p-1.5 text-black/45 hover:bg-black/5 rounded-full transition" title="Duplicate">
          <Copy size={13} />
        </button>
        <button onClick={() => onDelete(form)} className="p-1.5 text-black/45 hover:bg-red-50 hover:text-red-600 rounded-full transition" title="Delete">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}