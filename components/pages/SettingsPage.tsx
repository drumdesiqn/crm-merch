"use client";

import { useState } from "react";
import { Save, Eye, EyeOff, Plus, Trash2, CheckCircle2, AlertCircle, BookOpen, RefreshCw, Sun, Moon, Lock, Database, FileSpreadsheet, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { fetchApi } from "@/lib/client-api";
import { useQueryClient } from "@tanstack/react-query";
import { useSettings } from "@/lib/hooks/useSettings";
import { useGlossary } from "@/lib/hooks/useGlossary";
import { useWeeks } from "@/lib/hooks/useWeeks";
import type { GlossaryTerm } from "@/lib/hooks/useGlossary";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  const { data: settingsData } = useSettings();
  const { data: glossary = [] } = useGlossary();
  const { data: weeks = [] } = useWeeks();

  const [userName, setUserName] = useState("");
  const [userZone, setUserZone] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [settingsInitialized, setSettingsInitialized] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [newTerm, setNewTerm] = useState("");
  const [newDef, setNewDef] = useState("");
  const [addingTerm, setAddingTerm] = useState(false);

  const [confirmDeleteWeekId, setConfirmDeleteWeekId] = useState<string | null>(null);
  const [confirmDeleteTermId, setConfirmDeleteTermId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<{ counts: Record<string, number>; exportedAt: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [excelPreview, setExcelPreview] = useState<{ label: string; headers: string[]; rows: string[][]; totalRows: number; truncated: boolean } | null>(null);
  const [loadingExcel, setLoadingExcel] = useState<string | null>(null);

  const openExcelPreview = async (weekId: string) => {
    setLoadingExcel(weekId);
    const data = await fetchApi<{ label: string; headers: string[]; rows: string[][]; totalRows: number; truncated: boolean }>(`/api/weeks/${weekId}/excel`);
    setLoadingExcel(null);
    if (data) {
      setExcelPreview(data);
    }
  };

  if (settingsData && !settingsInitialized) {
    setUserName(settingsData.userName || "");
    setUserZone(settingsData.userZone || "");
    setUserEmail(settingsData.userEmail || "");
    setHomeAddress(settingsData.homeAddress || "");
    setSettingsInitialized(true);
  }

  const saveSettings = async () => {
    setSavingSettings(true);
    setErrorMsg(null);
    const body: Record<string, string> = { userName, userZone, userEmail, homeAddress };
    const data = await fetchApi<{ success: boolean }>("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      suppressToast: true,
    });
    if (data) {
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    } else {
      setErrorMsg("Erreur lors de la sauvegarde");
    }
    setSavingSettings(false);
  };

  const addTerm = async () => {
    if (!newTerm.trim() || !newDef.trim()) return;
    setAddingTerm(true);
    setErrorMsg(null);
    const term = await fetchApi<GlossaryTerm>("/api/glossary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term: newTerm.trim(), definition: newDef.trim() }),
      suppressToast: true,
    });
    if (term) {
      setNewTerm("");
      setNewDef("");
      queryClient.invalidateQueries({ queryKey: ["glossary"] });
    } else {
      setErrorMsg("Erreur lors de l'ajout du terme");
    }
    setAddingTerm(false);
  };

  const deleteTerm = async (id: string) => {
    const ok = await fetchApi("/api/glossary", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      suppressToast: true,
    });
    if (ok !== null) {
      queryClient.invalidateQueries({ queryKey: ["glossary"] });
    } else {
      setErrorMsg("Erreur lors de la suppression du terme");
    }
    setConfirmDeleteTermId(null);
  };

  const triggerBackup = async () => {
    setBackingUp(true);
    setBackupResult(null);
    const data = await fetchApi<{ counts: Record<string, number>; exportedAt: string }>("/api/backup", {
      method: "POST",
      suppressToast: true,
    });
    if (data) {
      setBackupResult(data);
    } else {
      setErrorMsg("Backup échoué — vérifie que CRON_SECRET est configuré sur Vercel");
    }
    setBackingUp(false);
  };

  const deleteWeek = async (id: string) => {
    setErrorMsg(null);
    const ok = await fetchApi("/api/weeks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      suppressToast: true,
    });
    if (ok !== null) {
      queryClient.invalidateQueries({ queryKey: ["weeks"] });
    } else {
      setErrorMsg("Erreur lors de la suppression de la semaine");
    }
    setConfirmDeleteWeekId(null);
  };

  const sectionCls = "bg-white dark:bg-[#1a1a1b] border border-slate-200 dark:border-[#2e2e30] rounded-xl p-4 space-y-3";
  const inputCls = "w-full rounded-lg border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#222223] text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-cpm placeholder:text-slate-400 dark:placeholder:text-zinc-500";
  const dividerCls = "h-px bg-slate-100 dark:bg-[#2e2e30]";
  const labelCls = "text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1">Configuration</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Paramètres</h1>
      </div>

      {errorMsg && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-red-mars-light dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-mars dark:text-red-400">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-mars hover:text-red-700 shrink-0">✕</button>
        </div>
      )}

      {/* App */}
      <div className={sectionCls}>
        <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Application</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">Actualiser l&apos;app</p>
            <p className="text-xs text-slate-500 dark:text-zinc-500">Recharge toutes les données depuis le serveur</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}><RefreshCw className="w-4 h-4" /> Actualiser</Button>
        </div>
        <div className={dividerCls} />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">Mode sombre</p>
            <p className="text-xs text-slate-500 dark:text-zinc-500">Basculer entre le mode clair et sombre</p>
          </div>
          <Button size="sm" variant="outline" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Mode clair" : "Mode sombre"}
          </Button>
        </div>
        <div className={dividerCls} />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">Backup des données</p>
            <p className="text-xs text-slate-500 dark:text-zinc-500">Exporte toutes tes données en JSON dans Vercel Blob (cron auto à 02h00)</p>
            {backupResult && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                ✓ {new Date(backupResult.exportedAt).toLocaleString("fr-BE")} — {backupResult.counts.visits} visites, {backupResult.counts.weeks} semaines
              </p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={triggerBackup} disabled={backingUp}>
            {backingUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {backingUp ? "Backup..." : "Backup"}
          </Button>
        </div>
        <div className={dividerCls} />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">Vider le cache</p>
            <p className="text-xs text-slate-500 dark:text-zinc-500">Force le rechargement complet (résout les bugs d&apos;affichage)</p>
          </div>
          <Button size="sm" variant="outline" onClick={async () => { if ("caches" in window) { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))); } window.location.reload(); }}>
            <RefreshCw className="w-4 h-4" /> Vider &amp; Recharger
          </Button>
        </div>
      </div>

      {/* Profile */}
      <div className={sectionCls}>
        <p className={labelCls}>Profil</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="settings-name" className="text-xs text-slate-500 dark:text-zinc-400">Prénom</label>
            <input id="settings-name" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Guillaume" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label htmlFor="settings-zone" className="text-xs text-slate-500 dark:text-zinc-400">Zone</label>
            <input id="settings-zone" value={userZone} onChange={(e) => setUserZone(e.target.value)} placeholder="Bruxelles" className={inputCls} />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="settings-home" className="text-xs text-slate-500 dark:text-zinc-400">Adresse domicile</label>
          <input id="settings-home" value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} placeholder="Rue Georges Tourneur 12, 6030 Marchienne-au-Pont" className={inputCls} />
          <p className="text-xs text-slate-400 dark:text-zinc-500">Utilisée comme point de départ sur la carte des itinéraires</p>
        </div>
        <div className="space-y-1">
          <label htmlFor="settings-email" className="text-xs text-slate-500 dark:text-zinc-400">Email</label>
          <input id="settings-email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="guillaume@example.com" type="email" className={inputCls} />
        </div>
        <Button onClick={saveSettings} disabled={savingSettings} className="w-full">
          {settingsSaved ? <><CheckCircle2 className="w-4 h-4" /> Sauvegardé !</> : <><Save className="w-4 h-4" /> Sauvegarder</>}
        </Button>
      </div>

      {/* Glossary */}
      <div className={sectionCls}>
        <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Glossaire métier Mars</p>
        <p className="text-xs text-slate-400 dark:text-zinc-500">Ces termes sont injectés automatiquement dans chaque conversation avec l&apos;IA.</p>
        <div className="space-y-2 border border-dashed border-slate-200 dark:border-[#2e2e30] rounded-lg p-3">
          <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Ajouter un terme</p>
          <input value={newTerm} onChange={(e) => setNewTerm(e.target.value)} placeholder="Terme (ex: PDV)" className={inputCls} />
          <input value={newDef} onChange={(e) => setNewDef(e.target.value)} placeholder="Définition..." className={inputCls} />
          <Button size="sm" variant="outline" onClick={addTerm} disabled={!newTerm.trim() || !newDef.trim() || addingTerm} className="w-full">
            <Plus className="w-4 h-4" /> Ajouter
          </Button>
        </div>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {glossary.map((term) => (
            <div key={term.id} className="flex items-start gap-2 p-2.5 rounded-lg border border-slate-100 dark:border-[#2e2e30] hover:bg-slate-50 dark:hover:bg-[#222223] transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">{term.term}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{term.definition}</p>
              </div>
              {confirmDeleteTermId === term.id ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => deleteTerm(term.id)} className="text-xs px-2 py-0.5 bg-red-mars text-white rounded hover:bg-red-700 transition-colors" aria-label="Confirmer la suppression du terme">Oui</button>
                  <button onClick={() => setConfirmDeleteTermId(null)} className="text-xs px-2 py-0.5 border border-slate-200 dark:border-[#2e2e30] text-slate-700 dark:text-zinc-300 rounded hover:bg-slate-50 dark:hover:bg-[#222223] transition-colors" aria-label="Annuler la suppression">Non</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteTermId(term.id)} className="shrink-0 text-slate-300 dark:text-zinc-600 hover:text-red-mars transition-colors mt-0.5" aria-label={`Supprimer le terme ${term.term}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Security — password change */}
      <div className={sectionCls}>
        <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Sécurité</p>
        <p className="text-xs text-slate-400 dark:text-zinc-500">Changer ton mot de passe de connexion</p>
        <div className="space-y-2">
          <div className="relative">
            <input type={showPasswords ? "text" : "password"} placeholder="Mot de passe actuel" aria-label="Mot de passe actuel" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={`${inputCls} pr-10`} />
            <button type="button" onClick={() => setShowPasswords((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500">
              {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <input type={showPasswords ? "text" : "password"} placeholder="Nouveau mot de passe (min. 6 caractères)" aria-label="Nouveau mot de passe" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} />
          <input type={showPasswords ? "text" : "password"} placeholder="Confirmer le nouveau mot de passe" aria-label="Confirmer le nouveau mot de passe" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} />
        </div>
          {passwordMsg && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              passwordMsg.type === "success"
                ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                : "bg-red-mars-light dark:bg-red-950/30 text-red-mars dark:text-red-400 border border-red-200 dark:border-red-800"
            }`}>
              {passwordMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {passwordMsg.text}
            </div>
          )}
        <Button size="sm" disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
          onClick={async () => {
            if (newPassword !== confirmPassword) { setPasswordMsg({ type: "error", text: "Les mots de passe ne correspondent pas" }); return; }
            if (newPassword.length < 6) { setPasswordMsg({ type: "error", text: "Le nouveau mot de passe doit faire au moins 6 caractères" }); return; }
            setSavingPassword(true); setPasswordMsg(null);
            const data = await fetchApi<{ error?: string }>("/api/auth/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }), suppressToast: true });
            if (data === null) { setPasswordMsg({ type: "error", text: "Erreur réseau" }); }
            else if (data.error) { setPasswordMsg({ type: "error", text: data.error }); }
            else { setPasswordMsg({ type: "success", text: "Mot de passe mis à jour avec succès !" }); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
            setSavingPassword(false);
          }}>
          <Lock className="w-4 h-4" />{savingPassword ? "Enregistrement..." : "Changer le mot de passe"}
        </Button>
      </div>

      {/* Weeks management */}
      {weeks.length > 0 && (
        <div className={sectionCls}>
          <p className={labelCls}>Plannings importés</p>
          <div className="space-y-1.5">
            {weeks.map((w) => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-[#2e2e30] hover:bg-slate-50 dark:hover:bg-[#222223] transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">{w.label}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-500">{w._count.visits} visites</p>
                </div>
                <div className="flex items-center gap-2">
                  {w.excelUrl && (
                    <button onClick={() => openExcelPreview(w.id)} disabled={loadingExcel === w.id}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50" title="Voir l'Excel importé">
                      {loadingExcel === w.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">Excel</span>
                    </button>
                  )}
                  {confirmDeleteWeekId === w.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-zinc-500">Confirmer ?</span>
                      <button onClick={() => deleteWeek(w.id)} className="text-xs px-2 py-1 bg-red-mars text-white rounded hover:bg-red-700 transition-colors">Supprimer</button>
                      <button onClick={() => setConfirmDeleteWeekId(null)} className="text-xs px-2 py-1 border border-slate-200 dark:border-[#2e2e30] text-slate-700 dark:text-zinc-300 rounded hover:bg-slate-50 dark:hover:bg-[#222223] transition-colors">Annuler</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteWeekId(w.id)} className="text-slate-300 dark:text-zinc-600 hover:text-red-mars transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Excel Preview Modal */}
      {excelPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setExcelPreview(null)}>
          <div className="bg-white dark:bg-[#1a1a1b] rounded-xl shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-[#2e2e30]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-[#2e2e30] shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-zinc-100">{excelPreview.label}</h3>
                <span className="text-xs text-slate-400 dark:text-zinc-500">{excelPreview.totalRows} ligne{excelPreview.totalRows > 1 ? "s" : ""}{excelPreview.truncated && " (aperçu limité à 500)"}</span>
              </div>
              <button onClick={() => setExcelPreview(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#222223] text-slate-400 transition-colors" aria-label="Fermer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-50 dark:bg-[#222223] z-10">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-[#2e2e30]">#</th>
                    {excelPreview.headers.map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-semibold text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-[#2e2e30] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {excelPreview.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-[#222223] border-b border-slate-100 dark:border-[#2e2e30] transition-colors">
                      <td className="px-2 py-1 text-slate-400 dark:text-zinc-600 font-mono">{i + 1}</td>
                      {row.map((cell, j) => (
                        <td key={j} className="px-2 py-1 text-slate-700 dark:text-zinc-300 max-w-[200px] truncate" title={cell}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
