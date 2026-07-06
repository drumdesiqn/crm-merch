"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur de connexion");
        setLoading(false);
        return;
      }

      const redirect = searchParams.get("redirect") || "/";
      window.location.href = redirect;
    } catch {
      setError("Erreur réseau");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-mars-light to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Image src="/logo-cpm-mars.png" alt="CPM Mars" width={140} height={45} className="h-10 w-auto dark:hidden" style={{ width: "auto", height: "auto" }} priority />
            <Image src="/logo-cpm-mars-white.png" alt="CPM Mars" width={140} height={45} className="h-10 w-auto hidden dark:block" style={{ width: "auto", height: "auto" }} priority />
          </div>
          <CardTitle className="text-2xl font-bold">CPM Mars</CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Connectez-vous pour accéder à votre planning
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-mars dark:bg-slate-800 dark:text-white"
                placeholder="votre@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-mars dark:bg-slate-800 dark:text-white"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="bg-red-mars-light dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-mars dark:text-red-400 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-mars hover:bg-blue-800 text-white"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}