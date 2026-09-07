import { initializeApp, getApps, cert, getApp, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import path from "path";
import fs from "fs";

// Service account credentials for apt-footing-392911
const EMBEDDED_SERVICE_ACCOUNT: ServiceAccount = {
  projectId: "apt-footing-392911",
  clientEmail: "firebase-adminsdk-5y4f9@apt-footing-392911.iam.gserviceaccount.com",
  privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDNDWaNWqgGNAAL\ncZkXuzDr0KD0/jEoMNZPNdjc1zaeyHA7DlJKdFQMnJlXIsS746yd11LwdebZxMsq\nqsz5EG/Pnq6QJUcu01IwV+tWF/xSC3bx6iC8T6qccGYPHAunElwswyb+nSvFuZZI\nsUdnzNGowg/iOdkDGZVKo2XEoQX9T5D3WBWI4WBjpZWXc0iby/DxTYIffDRknUUU\ndM5NHZSIWGVVX9C3lqX+a5TMgkmcrht0IY9mml8GTWFyFUXyRGAz5Advvprg+p2t\nPdz2AXNZvnYA+QvH9Hv1apFbM3DueG5A7eBsoPMeh6AFy8RnxlaujuCe89Dmpv9Z\nrv+1qTz1AgMBAAECggEAZapuvcgEherTWNkuZAdCNrE+lKnRWpF4OFbE2p3z7V8I\n0icEIvkxUP11w6+v5k54X9wKOcHjPvalGtcLgLOnFEQjXcG13OAWoHR+8LU8u7sG\ncuQ37dX8C8totrYbiu79942csGHh+YtOGWWYNz1keC0brfkrgS92h0ajZw3FR/V/\nd3JQAbtTXjosGhGxepjiSCGEpXNzgjGaTvNMTSEcIbYUEmXrnimZqGRsdy3tk9sa\nllnOTwJ1oX+eD3kynmIOyXtXVTX572zFquz0d20zl/r6AXYOl1SpuqyUzJpKfpT8\njOaEJ2ic8O4nX7z6WTThJ6OGm+isIFefaIBgUd74AwKBgQDpyRXQqnplEkGTFaEm\n1IVaZtiM93r7NbaH/BjXDIU/teSnLkId7wZtlBAm6auBJCv4yhbplIlmdAVqQobk\nrH7bLPaWaA9qc79Q13Kzh91f0fO1XaZm/KCZybNou4+TWZ8FL8mo5AfTroK5YadX\n724hIB/YFOx6Vkx4UVD2zLe3JwKBgQDgiV8azRk1VLIEItTVehBHUIYeZ4Y/ij5n\nFs9uXi/4fs/0Vl0JlYtfYO4MmgDMDqG3gVOL1bU+lIA6ujg7V0OuPjzMleyb2c24\np57luCt/Z8TwMnBvlG6mc/l/8op37BeLDD2SzXpNpQZiNlxKGkYD0LnWdsV6QNyO\nYeFuDFfcgwKBgDkSdPfm1lBcP5PnoNq44QErwEvRkr1G5JOX8Hx3OwRNpE9H1K44\nDuqrTbIiM1MogG+Q7j0BnPVc94F0Ujf7AFEDTgNzzeef8CGNJxw628krmQI6pYfY\nvmAsxFaaCzfelhqPCvznBh4gKRuWgmLOOaVukTeQDBblgG+S8l/9pA/bAoGBAL5K\n7fUS2UhfbTcgJex+NImb7u6Zoib7jINly4qn/FPHdYqIHvVebe35ggXgBsjppZiV\n3C5ogeB1jm83Hyz7efqT+IcSkKJM5pKWTI43lXW2hitjM/L8gwJCy7Lp5PxZdGJ9\njzl5NyvSriRSGckblzbokHb31ckUa1eoEJtpjpTtAoGAdgB9KfgPNgEqdwKl4nB9\ni+GQXi2hhHVfcwdODmfrurKcuql8ZCF84Ak7W9puxLPC8LKNOFRcxm2ACPL9WTtP\n2LN6IPh/ihVVotwFcCuTDw9qrUFR+F3R46NKwqE0buw7EbQcBj/fBb0xxpDV+N5y\njp+HV9t5M4lDg9psg3HTuPg=\n-----END PRIVATE KEY-----\n",
};

function initAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  // 1. Check if environment variable contains JSON
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      return initializeApp({
        credential: cert(sa),
        projectId: sa.project_id || sa.projectId || "apt-footing-392911",
      });
    } catch {
      // Fall through
    }
  }

  // 2. Check if local service account file exists
  try {
    const serviceAccountPath = path.join(process.cwd(), "firebase-service-account.json");
    if (fs.existsSync(serviceAccountPath)) {
      const raw = fs.readFileSync(serviceAccountPath, "utf-8");
      const sa = JSON.parse(raw);
      return initializeApp({
        credential: cert(sa),
        projectId: sa.project_id || "apt-footing-392911",
      });
    }
  } catch {
    // Read-only filesystem or missing file
  }

  // 3. Use embedded service account credentials (for Vercel deployment)
  return initializeApp({
    credential: cert(EMBEDDED_SERVICE_ACCOUNT),
    projectId: EMBEDDED_SERVICE_ACCOUNT.projectId,
  });
}

const adminApp = initAdminApp();
export const adminDb = getFirestore(adminApp);
try {
  adminDb.settings({ ignoreUndefinedProperties: true });
} catch {
  // Ignored if settings already set
}
