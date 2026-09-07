import { initializeApp, getApps, cert, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import path from "path";
import fs from "fs";

function initAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  // Check if service account file exists
  const serviceAccountPath = path.join(process.cwd(), "firebase-service-account.json");
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || "apt-footing-392911",
    });
  }

  // Fallback to default credentials
  return initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "apt-footing-392911",
  });
}

const adminApp = initAdminApp();
export const adminDb = getFirestore(adminApp);
// Enable ignoreUndefinedProperties so Firestore doesn't reject undefined values
try {
  adminDb.settings({ ignoreUndefinedProperties: true });
} catch {
  // Ignored if settings already set
}
