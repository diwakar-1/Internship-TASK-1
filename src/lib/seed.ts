import { createForm, createField, dataStore } from "./store";
import { generateId } from "./utils";
import type { Form, FormResponse, User } from "@/types";

export function seedSampleData(currentUser: User) {
  if (dataStore.isInitialized()) return;

  const demoUser: User = {
    uid: "demo-user-uid",
    email: "demo@formcraft.app",
    displayName: "Demo User",
    role: "admin",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
  };
  dataStore.saveUser(demoUser);
  dataStore.saveUser(currentUser);

  const customerFeedback = createForm(demoUser.uid, "Customer Feedback Survey");
  customerFeedback.description = "Help us improve our service by sharing your experience.";
  customerFeedback.fields = [
    createField("text"),
    {
      ...createField("email"),
      label: "Email Address",
      validation: { required: true, ...createField("email").validation },
    },
    {
      ...createField("rating"),
      label: "How would you rate our service?",
      validation: { required: true, min: 1, max: 5 },
    },
    {
      ...createField("radio"),
      label: "How did you hear about us?",
      options: [
        { id: generateId("o_"), label: "Google Search", value: "google" },
        { id: generateId("o_"), label: "Social Media", value: "social" },
        { id: generateId("o_"), label: "Friend Referral", value: "referral" },
        { id: generateId("o_"), label: "Other", value: "other" },
      ],
      validation: { required: true },
    },
    createField("textarea"),
  ];
  customerFeedback.fields[0] = { ...customerFeedback.fields[0], label: "Full Name", validation: { required: true } };
  customerFeedback.fields[4] = { ...customerFeedback.fields[4], label: "What can we improve?", helpText: "Be as detailed as you like" };
  customerFeedback.theme = { ...customerFeedback.theme, primaryColor: "#0ea5e9" };
  customerFeedback.status = "published";
  customerFeedback.publishedAt = Date.now() - 1000 * 60 * 60 * 24 * 7;
  customerFeedback.responseCount = 12;
  customerFeedback.viewCount = 89;
  customerFeedback.tags = ["feedback", "customer"];
  dataStore.saveForm(customerFeedback);

  const eventRSVP = createForm(demoUser.uid, "Annual Conference RSVP");
  eventRSVP.description = "Reserve your seat for our annual industry conference.";
  eventRSVP.fields = [
    { ...createField("text"), label: "Full Name", validation: { required: true } },
    { ...createField("email"), label: "Work Email", validation: { required: true } },
    { ...createField("phone"), label: "Phone Number" },
    { ...createField("dropdown"), label: "Dietary Preference", options: [
      { id: generateId("o_"), label: "None", value: "none" },
      { id: generateId("o_"), label: "Vegetarian", value: "vegetarian" },
      { id: generateId("o_"), label: "Vegan", value: "vegan" },
      { id: generateId("o_"), label: "Gluten-free", value: "gluten_free" },
    ]},
    { ...createField("checkbox"), label: "Sessions to Attend", options: [
      { id: generateId("o_"), label: "Keynote", value: "keynote" },
      { id: generateId("o_"), label: "Workshops", value: "workshops" },
      { id: generateId("o_"), label: "Networking", value: "networking" },
    ]},
    { ...createField("textarea"), label: "Questions for speakers?" },
  ];
  eventRSVP.theme = { ...eventRSVP.theme, primaryColor: "#8b5cf6", borderRadius: "xl" };
  eventRSVP.status = "published";
  eventRSVP.publishedAt = Date.now() - 1000 * 60 * 60 * 24 * 3;
  eventRSVP.responseCount = 47;
  eventRSVP.viewCount = 203;
  eventRSVP.tags = ["event", "rsvp"];
  dataStore.saveForm(eventRSVP);

  const jobApp = createForm(demoUser.uid, "Job Application Form");
  jobApp.description = "Apply for open positions at our company.";
  jobApp.fields = [
    { ...createField("text"), label: "Full Name", validation: { required: true } },
    { ...createField("email"), label: "Email", validation: { required: true } },
    { ...createField("phone"), label: "Phone" },
    { ...createField("url"), label: "LinkedIn Profile" },
    { ...createField("dropdown"), label: "Position Applying For", options: [
      { id: generateId("o_"), label: "Frontend Developer", value: "fe_dev" },
      { id: generateId("o_"), label: "Backend Developer", value: "be_dev" },
      { id: generateId("o_"), label: "Designer", value: "designer" },
      { id: generateId("o_"), label: "Product Manager", value: "pm" },
    ], validation: { required: true }},
    { ...createField("radio"), label: "Years of Experience", options: [
      { id: generateId("o_"), label: "0-2 years", value: "0_2" },
      { id: generateId("o_"), label: "3-5 years", value: "3_5" },
      { id: generateId("o_"), label: "6-10 years", value: "6_10" },
      { id: generateId("o_"), label: "10+ years", value: "10_plus" },
    ]},
    { ...createField("textarea"), label: "Tell us about yourself", validation: { required: true } },
    { ...createField("file"), label: "Upload Resume" },
  ];
  jobApp.status = "published";
  jobApp.publishedAt = Date.now() - 1000 * 60 * 60 * 24 * 14;
  jobApp.responseCount = 23;
  jobApp.viewCount = 156;
  jobApp.tags = ["hiring", "hr"];
  dataStore.saveForm(jobApp);

  const draft = createForm(demoUser.uid, "Product Feature Request");
  draft.description = "Tell us what features you'd love to see.";
  draft.status = "draft";
  draft.tags = ["product"];
  dataStore.saveForm(draft);

  const archived = createForm(demoUser.uid, "2024 Internal Survey");
  archived.status = "archived";
  archived.archivedAt = Date.now() - 1000 * 60 * 60 * 24 * 60;
  dataStore.saveForm(archived);

  const sampleResponses: Omit<FormResponse, "id" | "formId">[] = [
    { formVersionId: "v1", data: { "Full Name": "Alice Johnson", "Email Address": "alice@example.com", "How would you rate our service?": 5, "How did you hear about us?": "google", "What can we improve?": "Loved the experience!" }, submittedAt: Date.now() - 1000 * 60 * 60 * 24 * 6, completionTimeMs: 95000 },
    { formVersionId: "v1", data: { "Full Name": "Bob Smith", "Email Address": "bob@example.com", "How would you rate our service?": 4, "How did you hear about us?": "social", "What can we improve?": "More documentation please" }, submittedAt: Date.now() - 1000 * 60 * 60 * 24 * 5, completionTimeMs: 110000 },
    { formVersionId: "v1", data: { "Full Name": "Carla Diaz", "Email Address": "carla@example.com", "How would you rate our service?": 5, "How did you hear about us?": "referral", "What can we improve?": "" }, submittedAt: Date.now() - 1000 * 60 * 60 * 24 * 4, completionTimeMs: 75000 },
    { formVersionId: "v1", data: { "Full Name": "David Lee", "Email Address": "david@example.com", "How would you rate our service?": 3, "How did you hear about us?": "google", "What can we improve?": "Slower than expected" }, submittedAt: Date.now() - 1000 * 60 * 60 * 24 * 3, completionTimeMs: 140000 },
    { formVersionId: "v1", data: { "Full Name": "Emma Wilson", "Email Address": "emma@example.com", "How would you rate our service?": 5, "How did you hear about us?": "social", "What can we improve?": "Keep it up!" }, submittedAt: Date.now() - 1000 * 60 * 60 * 24 * 2, completionTimeMs: 88000 },
    { formVersionId: "v1", data: { "Full Name": "Frank Brown", "Email Address": "frank@example.com", "How would you rate our service?": 4, "How did you hear about us?": "other", "What can we improve?": "More payment options" }, submittedAt: Date.now() - 1000 * 60 * 60 * 24, completionTimeMs: 102000 },
  ];
  sampleResponses.forEach((r) => {
    dataStore.saveResponse({ ...r, id: generateId("resp_"), formId: customerFeedback.id });
  });

  dataStore.markInitialized();
}
