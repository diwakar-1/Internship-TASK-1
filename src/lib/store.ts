import type { Form, FormField, FormResponse, FormTheme, FormSettings, User, FormStatus, AppNotification } from "@/types";
import { generateId, slugify } from "@/lib/utils";
import { DEFAULT_VALIDATION, getDefaultLabel, getDefaultPlaceholder } from "@/lib/fieldTypes";
import { isFirebaseConfigured, getFirebase } from "./firebase";

const STORAGE_KEYS = {
  forms: "formcraft:forms",
  responses: "formcraft:responses",
  user: "formcraft:user",
  users: "formcraft:users",
  initialized: "formcraft:initialized",
  notifications: "formcraft:notifications",
};

const hasWindow = () => typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!hasWindow()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!hasWindow()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Failed to write to localStorage", e);
  }
}

export function defaultTheme(): FormTheme {
  return {
    primaryColor: "#6366f1",
    backgroundColor: "#ffffff",
    textColor: "#0f172a",
    fontFamily: "Inter",
    borderRadius: "lg",
    showLogo: false,
    showBranding: true,
  };
}

export function defaultSettings(): FormSettings {
  return {
    submitButtonText: "Submit",
    successMessage: "Thank you! Your response has been recorded.",
    allowMultipleSubmissions: true,
    collectEmail: false,
    showProgressBar: false,
    passwordProtected: false,
    notifyOnSubmit: false,
  };
}

export function createField(type: FormField["type"]): FormField {
  return {
    id: generateId("f_"),
    type,
    label: getDefaultLabel(type),
    placeholder: getDefaultPlaceholder(type),
    helpText: "",
    validation: { ...DEFAULT_VALIDATION[type] },
    options:
      type === "dropdown" || type === "radio" || type === "checkbox"
        ? [
            { id: generateId("o_"), label: "Option 1", value: "option_1" },
            { id: generateId("o_"), label: "Option 2", value: "option_2" },
            { id: generateId("o_"), label: "Option 3", value: "option_3" },
          ]
        : undefined,
  };
}

export function createForm(ownerId: string, title = "Untitled form"): Form {
  const now = Date.now();
  return {
    id: generateId("form_"),
    ownerId,
    collaborators: [],
    title,
    description: "",
    fields: [createField("text")],
    theme: defaultTheme(),
    settings: defaultSettings(),
    status: "draft",
    tags: [],
    createdAt: now,
    updatedAt: now,
    responseCount: 0,
    viewCount: 0,
    versions: [],
  };
}

export const dataStore = {
  getCurrentUser(): User | null {
    return read<User | null>(STORAGE_KEYS.user, null);
  },

  setCurrentUser(user: User | null) {
    if (user === null) {
      if (hasWindow()) localStorage.removeItem(STORAGE_KEYS.user);
    } else {
      write(STORAGE_KEYS.user, user);
    }
  },

  getUsers(): User[] {
    return read<User[]>(STORAGE_KEYS.users, []);
  },

  saveUser(user: User) {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.uid === user.uid);
    if (idx >= 0) users[idx] = user;
    else users.push(user);
    write(STORAGE_KEYS.users, users);
  },

  findUserByEmail(email: string): User | undefined {
    return this.getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  },

  getForms(ownerId?: string): Form[] {
    const all = read<Form[]>(STORAGE_KEYS.forms, []);
    if (!ownerId) return all.filter((f) => !f.deletedAt);
    return all.filter((f) => !f.deletedAt && (f.ownerId === ownerId || f.collaborators.includes(ownerId)));
  },

  getForm(id: string): Form | null {
    const all = read<Form[]>(STORAGE_KEYS.forms, []);
    return all.find((f) => f.id === id) ?? null;
  },

  getPublicForm(id: string): Form | null {
    const form = this.getForm(id);
    if (!form || form.status === "archived" || form.deletedAt) return null;
    return form;
  },

  saveForm(form: Form) {
    const all = read<Form[]>(STORAGE_KEYS.forms, []);
    form.updatedAt = Date.now();
    const idx = all.findIndex((f) => f.id === form.id);
    if (idx >= 0) all[idx] = form;
    else all.push(form);
    write(STORAGE_KEYS.forms, all);

    if (isFirebaseConfigured()) {
      getFirebase().then(async (fb) => {
        if (!fb || !fb.db) return;
        try {
          const { doc, setDoc } = await import("firebase/firestore");
          await setDoc(doc(fb.db, "forms", form.id), form);
        } catch (error) {
          console.error("Error saving form to Firestore:", error);
        }
      });
    }
  },

  deleteForm(id: string) {
    const form = this.getForm(id);
    if (form) {
      form.deletedAt = Date.now();
      form.status = "archived";
      this.saveForm(form);
    }
  },

  permanentlyDeleteForm(id: string) {
    const all = read<Form[]>(STORAGE_KEYS.forms, []).filter((f) => f.id !== id);
    write(STORAGE_KEYS.forms, all);
    const responses = read<FormResponse[]>(STORAGE_KEYS.responses, []).filter((r) => r.formId !== id);
    write(STORAGE_KEYS.responses, responses);

    if (isFirebaseConfigured()) {
      getFirebase().then(async (fb) => {
        if (!fb || !fb.db) return;
        try {
          const { doc, deleteDoc, collection, query, where, getDocs } = await import("firebase/firestore");
          await deleteDoc(doc(fb.db, "forms", id));
          
          const q = query(collection(fb.db, "responses"), where("formId", "==", id));
          const snap = await getDocs(q);
          const deletePromises: Promise<void>[] = [];
          snap.forEach((d) => {
            deletePromises.push(deleteDoc(doc(fb.db, "responses", d.id)));
          });
          await Promise.all(deletePromises);
        } catch (error) {
          console.error("Error permanently deleting form from Firestore:", error);
        }
      });
    }
  },

  setFormStatus(id: string, status: FormStatus) {
    const form = this.getForm(id);
    if (!form) return;
    form.status = status;
    if (status === "published" && !form.publishedAt) form.publishedAt = Date.now();
    if (status === "archived") form.archivedAt = Date.now();
    this.saveForm(form);
  },

  duplicateForm(id: string, ownerId: string): Form | null {
    const original = this.getForm(id);
    if (!original) return null;
    const copy: Form = {
      ...JSON.parse(JSON.stringify(original)),
      id: generateId("form_"),
      ownerId,
      title: `${original.title} (Copy)`,
      status: "draft",
      publishedAt: undefined,
      archivedAt: undefined,
      deletedAt: undefined,
      responseCount: 0,
      viewCount: 0,
      versions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.saveForm(copy);
    return copy;
  },

  archiveForm(id: string) {
    this.setFormStatus(id, "archived");
  },

  incrementViewCount(id: string) {
    const form = this.getForm(id);
    if (!form) return;
    form.viewCount = (form.viewCount ?? 0) + 1;
    this.saveForm(form);
  },

  getResponses(formId: string): FormResponse[] {
    return read<FormResponse[]>(STORAGE_KEYS.responses, []).filter((r) => r.formId === formId);
  },

  saveResponse(response: FormResponse) {
    const all = read<FormResponse[]>(STORAGE_KEYS.responses, []);
    all.push(response);
    write(STORAGE_KEYS.responses, all);
    const form = this.getForm(response.formId);
    if (form) {
      form.responseCount = (form.responseCount ?? 0) + 1;
      this.saveForm(form);

      // Create notification for form owner
      this.addNotification({
        userId: form.ownerId,
        title: "New Response Received",
        message: `Your form "${form.title}" just received a new response.`,
        type: "submission",
        link: `/responses?formId=${form.id}`,
      });
    }

    if (isFirebaseConfigured()) {
      getFirebase().then(async (fb) => {
        if (!fb || !fb.db) return;
        try {
          const { doc, setDoc } = await import("firebase/firestore");
          await setDoc(doc(fb.db, "responses", response.id), response);
        } catch (error) {
          console.error("Error saving response to Firestore:", error);
        }
      });
    }
  },

  updateResponse(id: string, data: Record<string, unknown>) {
    const all = read<FormResponse[]>(STORAGE_KEYS.responses, []);
    const idx = all.findIndex((r) => r.id === id);
    if (idx >= 0) {
      all[idx].data = data;
      all[idx].editedAt = Date.now();
      write(STORAGE_KEYS.responses, all);

      const response = all[idx];
      if (isFirebaseConfigured()) {
        getFirebase().then(async (fb) => {
          if (!fb || !fb.db) return;
          try {
            const { doc, setDoc } = await import("firebase/firestore");
            await setDoc(doc(fb.db, "responses", id), response, { merge: true });
          } catch (error) {
            console.error("Error updating response in Firestore:", error);
          }
        });
      }
    }
  },

  deleteResponse(id: string) {
    const all = read<FormResponse[]>(STORAGE_KEYS.responses, []).filter((r) => r.id !== id);
    write(STORAGE_KEYS.responses, all);

    if (isFirebaseConfigured()) {
      getFirebase().then(async (fb) => {
        if (!fb || !fb.db) return;
        try {
          const { doc, deleteDoc } = await import("firebase/firestore");
          await deleteDoc(doc(fb.db, "responses", id));
        } catch (error) {
          console.error("Error deleting response from Firestore:", error);
        }
      });
    }
  },

  isInitialized(): boolean {
    return read<boolean>(STORAGE_KEYS.initialized, false);
  },

  markInitialized() {
    write(STORAGE_KEYS.initialized, true);
  },

  getNotifications(userId: string): AppNotification[] {
    const all = read<AppNotification[]>(STORAGE_KEYS.notifications, []);
    return all.filter((n) => n.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
  },

  addNotification(notification: Omit<AppNotification, "id" | "read" | "createdAt">): AppNotification {
    const all = read<AppNotification[]>(STORAGE_KEYS.notifications, []);
    const newNotif: AppNotification = {
      ...notification,
      id: generateId("notif_"),
      read: false,
      createdAt: Date.now(),
    };
    all.push(newNotif);
    write(STORAGE_KEYS.notifications, all);
    return newNotif;
  },

  markNotificationAsRead(id: string) {
    const all = read<AppNotification[]>(STORAGE_KEYS.notifications, []);
    const idx = all.findIndex((n) => n.id === id);
    if (idx >= 0) {
      all[idx].read = true;
      write(STORAGE_KEYS.notifications, all);
    }
  },

  markAllNotificationsAsRead(userId: string) {
    const all = read<AppNotification[]>(STORAGE_KEYS.notifications, []);
    const updated = all.map((n) => {
      if (n.userId === userId) {
        return { ...n, read: true };
      }
      return n;
    });
    write(STORAGE_KEYS.notifications, updated);
  },

  deleteNotification(id: string) {
    const all = read<AppNotification[]>(STORAGE_KEYS.notifications, []);
    const filtered = all.filter((n) => n.id !== id);
    write(STORAGE_KEYS.notifications, filtered);
  },

  clearAllNotifications(userId: string) {
    const all = read<AppNotification[]>(STORAGE_KEYS.notifications, []);
    const filtered = all.filter((n) => n.userId !== userId);
    write(STORAGE_KEYS.notifications, filtered);
  },

  deleteUserAndData(userId: string) {
    const allForms = read<Form[]>(STORAGE_KEYS.forms, []);
    const formsToDelete = allForms.filter((f) => f.ownerId === userId);
    const formIdsToDelete = formsToDelete.map((f) => f.id);

    const remainingForms = allForms.filter((f) => f.ownerId !== userId);
    write(STORAGE_KEYS.forms, remainingForms);

    const remainingResponses = read<FormResponse[]>(STORAGE_KEYS.responses, []).filter((r) => !formIdsToDelete.includes(r.formId));
    write(STORAGE_KEYS.responses, remainingResponses);

    const remainingUsers = read<User[]>(STORAGE_KEYS.users, []).filter((u) => u.uid !== userId);
    write(STORAGE_KEYS.users, remainingUsers);

    if (hasWindow()) {
      localStorage.removeItem(STORAGE_KEYS.user);
    }
  },
};

export async function getActiveBackend(): Promise<"firebase" | "local"> {
  if (isFirebaseConfigured()) {
    try {
      await getFirebase();
      return "firebase";
    } catch {
      return "local";
    }
  }
  return "local";
}

export async function syncFirestoreToLocal(userId: string) {
  try {
    const fb = await getFirebase();
    if (!fb || !fb.db) return;

    const { collection, query, where, getDocs } = await import("firebase/firestore");

    // Fetch forms where user is owner
    const ownerQuery = query(collection(fb.db, "forms"), where("ownerId", "==", userId));
    const ownerSnap = await getDocs(ownerQuery);

    // Fetch forms where user is collaborator
    const collabQuery = query(collection(fb.db, "forms"), where("collaborators", "array-contains", userId));
    const collabSnap = await getDocs(collabQuery);

    const remoteFormsMap = new Map<string, Form>();
    ownerSnap.forEach((doc) => {
      remoteFormsMap.set(doc.id, doc.data() as Form);
    });
    collabSnap.forEach((doc) => {
      remoteFormsMap.set(doc.id, doc.data() as Form);
    });
    const remoteForms = Array.from(remoteFormsMap.values());

    // Fetch responses for these forms
    const formIds = remoteForms.map((f) => f.id);
    const remoteResponses: FormResponse[] = [];
    const responsesCountMap = new Map<string, number>();

    if (formIds.length > 0) {
      for (const formId of formIds) {
        const respQuery = query(collection(fb.db, "responses"), where("formId", "==", formId));
        const respSnap = await getDocs(respQuery);
        let count = 0;
        respSnap.forEach((doc) => {
          remoteResponses.push(doc.data() as FormResponse);
          count++;
        });
        responsesCountMap.set(formId, count);
      }
    }

    // Ensure form responseCounts are accurate based on actual responses fetched
    remoteForms.forEach((f) => {
      f.responseCount = responsesCountMap.get(f.id) ?? 0;
    });

    // Write updated forms to local storage
    const localForms = read<Form[]>(STORAGE_KEYS.forms, []);
    const otherForms = localForms.filter((f) => f.ownerId !== userId && !f.collaborators.includes(userId));
    const updatedForms = [...otherForms, ...remoteForms];
    write(STORAGE_KEYS.forms, updatedForms);

    // Write updated responses to local storage and detect new submissions
    const localResponses = read<FormResponse[]>(STORAGE_KEYS.responses, []);
    const localResponseIds = new Set(localResponses.map((r) => r.id));

    // Detect new responses (submitted within the last 5 minutes and not already in local storage)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const newResponses = remoteResponses.filter(
      (r) => r.submittedAt > fiveMinutesAgo && !localResponseIds.has(r.id)
    );

    newResponses.forEach((r) => {
      const form = remoteForms.find((f) => f.id === r.formId);
      if (form) {
        dataStore.addNotification({
          userId: userId,
          title: "New Response Received",
          message: `Your form "${form.title}" just received a new response.`,
          type: "submission",
          link: `/responses?formId=${form.id}`,
        });
      }
    });

    const otherResponses = localResponses.filter((r) => !formIds.includes(r.formId));
    const updatedResponses = [...otherResponses, ...remoteResponses];
    write(STORAGE_KEYS.responses, updatedResponses);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("formcraft:sync"));
    }
  } catch (error) {
    console.error("Error syncing Firestore to LocalStorage:", error);
  }
}

export { slugify, generateId };
