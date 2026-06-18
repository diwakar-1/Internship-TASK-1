import type { FieldType, FieldValidation } from "@/types";

export const FIELD_TYPES: { type: FieldType; label: string; icon: string; description: string }[] = [
  { type: "text", label: "Short Text", icon: "Type", description: "Single line of text" },
  { type: "textarea", label: "Long Text", icon: "AlignLeft", description: "Multi-line text" },
  { type: "email", label: "Email", icon: "Mail", description: "Email address" },
  { type: "number", label: "Number", icon: "Hash", description: "Numeric input" },
  { type: "phone", label: "Phone", icon: "Phone", description: "Phone number" },
  { type: "url", label: "URL", icon: "Link", description: "Web link" },
  { type: "date", label: "Date", icon: "Calendar", description: "Date picker" },
  { type: "dropdown", label: "Dropdown", icon: "ChevronDown", description: "Select from list" },
  { type: "radio", label: "Radio", icon: "Circle", description: "Pick one" },
  { type: "checkbox", label: "Checkbox", icon: "CheckSquare", description: "Multi-select" },
  { type: "rating", label: "Rating", icon: "Star", description: "Star rating" },
  { type: "file", label: "File Upload", icon: "Upload", description: "File attachment" },
  { type: "signature", label: "Signature", icon: "PenTool", description: "Draw a signature" },
];

export const DEFAULT_VALIDATION: Record<FieldType, FieldValidation> = {
  text: {},
  textarea: {},
  email: { pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", patternMessage: "Please enter a valid email" },
  number: {},
  phone: { pattern: "^[+0-9\\-\\s()]{7,}$", patternMessage: "Please enter a valid phone number" },
  url: { pattern: "^https?://.+", patternMessage: "Please enter a valid URL" },
  date: {},
  dropdown: {},
  radio: {},
  checkbox: {},
  rating: { min: 1, max: 5 },
  file: {},
  signature: {},
};

export function getDefaultLabel(type: FieldType): string {
  const map: Record<FieldType, string> = {
    text: "Short answer",
    textarea: "Long answer",
    email: "Email address",
    number: "Number",
    phone: "Phone number",
    url: "Website URL",
    date: "Date",
    dropdown: "Select an option",
    radio: "Choose one",
    checkbox: "Select all that apply",
    rating: "Rate this",
    file: "Upload a file",
    signature: "Sign here",
  };
  return map[type];
}

export function getDefaultPlaceholder(type: FieldType): string {
  const map: Record<FieldType, string> = {
    text: "Type your answer here...",
    textarea: "Type your detailed answer here...",
    email: "you@example.com",
    number: "0",
    phone: "+1 (555) 000-0000",
    url: "https://example.com",
    date: "",
    dropdown: "Choose an option",
    radio: "",
    checkbox: "",
    rating: "",
    file: "",
    signature: "",
  };
  return map[type];
}
