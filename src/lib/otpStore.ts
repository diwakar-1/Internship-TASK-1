export interface OtpData {
  code: string;
  expiresAt: number;
}

// Global in-memory storage for verification codes
// We attach the Map to globalThis to ensure it survives hot-module reloads (HMR) in Next.js development mode.
const globalForOtp = globalThis as unknown as {
  localOtpStore?: Map<string, OtpData>;
};

export const localOtpStore = globalForOtp.localOtpStore ?? new Map<string, OtpData>();

if (process.env.NODE_ENV !== "production") {
  globalForOtp.localOtpStore = localOtpStore;
}
