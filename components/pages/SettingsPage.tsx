"use client";

import { useEffect, useState } from "react";
import { Save, Eye, EyeOff, Plus, Trash2, CheckCircle2, AlertCircle, BookOpen, RefreshCw, Sun, Moon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import type { Week } from "@/types/visit";

interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [openaiKey, setOpenaiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [userName, setUserName] = useState("");
  const [userZone, setUserZone] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  const [glossary, setGlossary] = useState<GlossaryTerm[]>([]);
  const [newTerm, setNewTerm] = useState("");
  const [newDef, setNewDef] = useState("");
  const [addingTerm, setAddingTerm] = useState(false);

  const [weeks, setWeeks] = useState<Week[]>([]);
  const [confirmDeleteWeekId, setConfirmDeleteWeekId] = useState<string | null>(null);
  const [confirmDeleteTermId, setConfirmDeleteTermId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()).catch(() => ({})),
      fetch("/api/glossary").then((r) => r.json()).catch(() => []),
      fetch("/api/weeks").then((r) => r.json()).catch(() => []),
    ]).then(([settings, terms, weeksData]) => {
      setUserName(settings.userName || "");
      setUserZone(settings.userZone || "");
      setUserEmail(settings.userEmail || "");
      setHomeAddress(settings.homeAddress || "");
      setHasApiKey(settings.hasApiKey || false);
      if (Array.isArray(terms)) setGlossary(terms);
      if (Array.isArray(weeksData)) setWeeks(weeksData);
    });
  }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    setErrorMsg(null);
    const body: Record<string, string> = { userName, userZone, userEmail, homeAddress };
    if (openaiKey) body.openaiKey = openaiKey;
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la sauvegarde");
      setSettingsSaved(true);
      setHasApiKey(data.hasApiKey);
      if (openaiKey) setOpenaiKey("");
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setSavingSettings(false);
    }
  };

  const addTerm = async () => {
    if (!newTerm.trim() || !newDef.trim()) return;
    setAddingTerm(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/glossary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: newTerm.trim(), definition: newDef.trim() }),
      });
      const term = await res.json();
      if (!res.ok) throw new Error(term.error || "Erreur ajout terme");
      setGlossary((prev) => {
        const existing = prev.findIndex((t) => t.id === term.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = term;
          return updated;
        }
        return [...prev, term].sort((a, b) => a.term.localeCompare(b.term));
      });
      setNewTerm("");
      setNewDef("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setAddingTerm(false);
    }
  };

  const deleteTerm = async (id: string) => {
    await fetch("/api/glossary", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setGlossary((prev) => prev.filter((t) => t.id !== id));
    setConfirmDeleteTermId(null);
  };

  const deleteWeek = async (id: string) => {
    setErrorMsg(null);
    try {
      const res = await fetch("/api/weeks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur suppression");
      }
      setWeeks((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setConfirmDeleteWeekId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Paramètres</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gère tes préférences, ton glossaire et tes semaines importées</p>
      </div>

      {errorMsg && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700 shrink-0">✕</button>
        </div>
      )}

      {/* App */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="w-4 h-4 text-red-600" />
            Application
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Actualiser l&apos;app</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Recharge toutes les données depuis le serveur</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4" /> Actualiser
            </Button>
          </div>
          <div className="h-px bg-slate-100 dark:bg-slate-700" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Mode sombre</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Basculer entre le mode clair et sombre</p>
            </div>
            <Button size="sm" variant="outline" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === "dark" ? "Mode clair" : "Mode sombre"}
            </Button>
          </div>
          <div className="h-px bg-slate-100 dark:bg-slate-700" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Vider le cache</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Force le rechargement complet (résout les bugs d&apos;affichage)</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if ("caches" in window) {
                  const keys = await caches.keys();
                  await Promise.all(keys.map((k) => caches.delete(k)));
                }
                window.location.reload();
              }}
            >
              <RefreshCw className="w-4 h-4" /> Vider &amp; Recharger
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile & API */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profil & Configuration IA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Prénom</label>
              <input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Guillaume"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Zone</label>
              <input
                value={userZone}
                onChange={(e) => setUserZone(e.target.value)}
                placeholder="Bruxelles"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Adresse domicile</label>
            <input
              value={homeAddress}
              onChange={(e) => setHomeAddress(e.target.value)}
              placeholder="Rue Georges Tourneur 12, 6030 Marchienne-au-Pont"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500">Utilisée comme point de départ sur la carte des itinéraires</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Email</label>
            <input
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="guillaume@example.com"
              type="email"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Clé API OpenAI
              {hasApiKey && (
                <span className="ml-2 text-green-600 font-normal">
                  <CheckCircle2 className="w-3 h-3 inline mr-0.5" />Configurée
                </span>
              )}
            </label>
            <div className="relative">
              <input
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                type={showKey ? "text" : "password"}
                placeholder={hasApiKey ? "Laisser vide pour conserver l'actuelle" : "sk-..."}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {!hasApiKey && (
              <p className="flex items-center gap-1 text-xs text-orange-600">
                <AlertCircle className="w-3 h-3" />
                Clé requise pour utiliser l&apos;IA (Mails et Assistant)
              </p>
            )}
            {hasApiKey && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                La clé est stockée en base de données. Pour plus de sécurité, configure-la comme variable d&apos;env <code>OPENAI_API_KEY</code> sur Vercel.
              </p>
            )}
          </div>
          <Button onClick={saveSettings} disabled={savingSettings} className="w-full">
            {settingsSaved ? (
              <><CheckCircle2 className="w-4 h-4" /> Sauvegardé !</>
            ) : (
              <><Save className="w-4 h-4" /> Sauvegarder</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Glossary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-4 h-4 text-red-600" />
            Glossaire métier Mars
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500">
            Ces termes sont injectés automatiquement dans chaque conversation avec l&apos;IA.
          </p>

          {/* Add term */}
          <div className="space-y-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-3">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Ajouter un terme</p>
            <input
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              placeholder="Terme (ex: PDV)"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <input
              value={newDef}
              onChange={(e) => setNewDef(e.target.value)}
              placeholder="Définition..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={addTerm}
              disabled={!newTerm.trim() || !newDef.trim() || addingTerm}
              className="w-full"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </Button>
          </div>

          {/* Glossary list */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {glossary.map((term) => (
              <div key={term.id} className="flex items-start gap-2 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{term.term}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{term.definition}</p>
                </div>
                {confirmDeleteTermId === term.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => deleteTerm(term.id)}
                      className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      aria-label="Confirmer la suppression du terme"
                    >
                      Oui
                    </button>
                    <button
                      onClick={() => setConfirmDeleteTermId(null)}
                      className="text-xs px-2 py-0.5 border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                      aria-label="Annuler la suppression"
                    >
                      Non
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteTermId(term.id)}
                    className="shrink-0 text-slate-300 hover:text-red-500 transition-colors mt-0.5"
                    aria-label={`Supprimer le terme ${term.term}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weeks management */}
      {weeks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Plannings importés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {weeks.map((w) => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{w.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{w._count.visits} visites</p>
                </div>
                {confirmDeleteWeekId === w.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Confirmer ?</span>
                    <button
                      onClick={() => deleteWeek(w.id)}
                      className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Supprimer
                    </button>
                    <button
                      onClick={() => setConfirmDeleteWeekId(null)}
                      className="text-xs px-2 py-1 border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteWeekId(w.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
