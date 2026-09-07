"use client";

import React, { useState } from "react";
import { auth, googleProvider } from "@/lib/firebase-client";
import { signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { ALLOWED_EMAILS, isAuthorizedEmail } from "@/lib/auth-config";
import { Shield, Lock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (user: { email: string; displayName?: string; photoURL?: string }) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const email = user.email;

      if (!isAuthorizedEmail(email)) {
        await signOut(auth);
        setErrorMsg(
          `Akses Ditolak: Akun Google (${email}) tidak memiliki hak akses. Hanya akun terdaftar (fiqrin1805@gmail.com dan hasan@kwsg.co.id) yang dapat mengakses dan mengelola sistem ini.`
        );
        return;
      }

      onLoginSuccess({
        email: email!,
        displayName: user.displayName || email!,
        photoURL: user.photoURL || undefined,
      });
    } catch (err: unknown) {
      console.error("Login Google error:", err);
      const msg = err instanceof Error ? err.message : "Gagal melakukan login dengan Google";
      
      if (msg.includes("popup-blocked")) {
        // Fallback to redirect if popup is blocked
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: unknown) {
          setErrorMsg(redirectErr instanceof Error ? redirectErr.message : "Gagal mengalihkan ke Google");
        }
      } else if (msg.includes("popup-closed-by-user")) {
        setErrorMsg("Jendela login Google ditutup sebelum autentikasi selesai.");
      } else {
        setErrorMsg(`Gagal login dengan Google: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center p-4 sm:p-6 corp-grid-bg">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Top Corporate Accent Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-[#0c519d] via-[#1268c7] to-[#fb2c36]" />

        <div className="p-8 sm:p-10 space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-4 rounded-2xl bg-[#0c519d] text-white shadow-lg shadow-[#0c519d]/20 mb-2">
              <Shield className="w-9 h-9" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              Semen Indonesia Cooperative
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Sistem Pemantauan Infrastruktur Server & Database
            </p>
            <div className="inline-block px-3 py-1 rounded-full bg-blue-50 text-[#0c519d] font-bold text-[11px] border border-blue-200 tracking-wider uppercase mt-1">
              Restricted Access Portal
            </div>
          </div>

          {/* Error / Unauthorized Warning */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-[#fb2c36]/10 border border-[#fb2c36]/40 text-[#fb2c36] text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[#fb2c36]" />
              <div className="leading-relaxed font-semibold">{errorMsg}</div>
            </div>
          )}

          {/* Exclusive Action: Google Sign In */}
          <div className="space-y-4 pt-2">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 hover:border-[#0c519d] text-slate-800 font-bold text-sm flex items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-60 group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? "Memverifikasi Akun Google..." : "Masuk dengan Akun Google"}</span>
            </button>
          </div>

          {/* Access Policy Information */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Lock className="w-3.5 h-3.5 text-[#0c519d]" />
              <span>Otoritas Khusus Administrator:</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Hanya akun Google resmi berikut yang dapat login dan menambah / mengelola target server:
            </p>
            <div className="space-y-1 font-mono text-[11px] font-bold text-[#0c519d]">
              {ALLOWED_EMAILS.map((email) => (
                <div key={email} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{email}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-400 font-mono">
        Semen Indonesia Cooperative • Secure NOC Command Center
      </footer>
    </div>
  );
}
