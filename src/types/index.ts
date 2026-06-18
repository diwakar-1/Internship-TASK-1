export type UserRole = "admin" | "editor" | "viewer";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: number;
  emailVerified?: boolean;
  tier?: "free" | "bronze" | "silver" | "gold";
  proExpiresAt?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  birthYear?: number;
  birthMonth?: string;
  birthDay?: number;
  gender?: string;
}

export type FieldType =
  | "text"
  | "email"
  | "number"
  | "textarea"
  | "dropdown"
  | "checkbox"
  | "radio"
  | "date"
  | "file"
  | "rating"
  | "phone"
  | "url"
  | "signature";

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
}

export interface FieldOption {
  id: string;
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  options?: FieldOption[];
  validation: FieldValidation;
  defaultValue?: string | string[] | number;
}

export interface FormTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: "none" | "sm" | "md" | "lg" | "xl" | "full";
  logoUrl?: string;
  showLogo?: boolean;
  showBranding?: boolean;
}

export interface FormSettings {
  submitButtonText: string;
  successMessage: string;
  redirectUrl?: string;
  allowMultipleSubmissions: boolean;
  collectEmail: boolean;
  showProgressBar: boolean;
  passwordProtected: boolean;
  password?: string;
  closeDate?: number;
  notifyOnSubmit: boolean;
}

export type FormStatus = "draft" | "published" | "archived";

export interface FormVersion {
  versionId: string;
  createdAt: number;
  snapshot: {
    title: string;
    description: string;
    fields: FormField[];
    theme: FormTheme;
    settings: FormSettings;
  };
}

export interface Form {
  id: string;
  ownerId: string;
  collaborators: string[];
  title: string;
  description: string;
  fields: FormField[];
  theme: FormTheme;
  settings: FormSettings;
  status: FormStatus;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  publishedAt?: number;
  archivedAt?: number;
  deletedAt?: number;
  responseCount: number;
  versions: FormVersion[];
  viewCount: number;
}

export interface FormResponse {
  id: string;
  formId: string;
  ownerId?: string;
  formVersionId: string;
  data: Record<string, unknown>;
  submittedAt: number;
  submitterEmail?: string;
  submitterIp?: string;
  userAgent?: string;
  completionTimeMs?: number;
  editedAt?: number;
  flagged?: boolean;
}

export interface AnalyticsData {
  totalResponses: number;
  totalViews: number;
  conversionRate: number;
  averageCompletionTime: number;
  responsesByDay: { date: string; count: number }[];
  fieldSummaries: Record<
    string,
    {
      fieldLabel: string;
      type: FieldType;
      distribution?: Record<string, number>;
      average?: number;
      responseRate: number;
    }
  >;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "submission";
  read: boolean;
  createdAt: number;
  link?: string;
}
