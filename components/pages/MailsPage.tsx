"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, ChevronDown, ChevronUp, Clock, CheckCircle2, AlertCircle, X, ChevronRight, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/client-api";
import { useQueryClient } from "@tanstack/react-query";
import { useMailLogs } from "@/lib/hooks/useMailLogs";
import type { MailLogModification } from "@/lib/hooks/useMailLogs";

type Modification = MailLogModification;

interface AnalysisResult {
  mailLogId: string;
  summary: string;
  replyDraft: string;
  modifications: Modification[];
}

const ACTION_LABELS: Record<string, string> = {
  modify: "Modifier",
  add: "Ajouter",
  delete: "Supprimer",
  add_remark: "Ajouter remarque",
};

export default function MailsPage() {
  const queryClient = useQueryClient();
  const { data: logs = [] } = useMailLogs();

  const [content, setContent] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  const resetForm = () => {
    setContent("");
    setResult(null);
    setSelected(new Set());
    setAppliedIds(new Set());
    setError(null);
  };

  const analyze = async () => {
    if (!content.trim()) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    const data = await fetchApi<AnalysisResult>("/api/mail/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      suppressToast: true,
    });
    if (data) {
      setResult(data);
      setSelected(new Set(data.modifications.map((m) => m.id)));
      queryClient.invalidateQueries({ queryKey: ["mail-logs"] });
    } else {
      setError("Erreur lors de l'analyse");
    }
    setAnalyzing(false);
  };

  const applySelected = async () => {
    if (!result || selected.size === 0) return;
    setApplying(true);
    const data = await fetchApi<{ results: { id: string; success: boolean }[] }>("/api/mail/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modificationIds: Array.from(selected) }),
      suppressToast: true,
    });
    if (data) {
      const successIds = data.results
        .filter((r) => r.success)
        .map((r) => r.id);
      setAppliedIds(new Set(successIds));
      queryClient.invalidateQueries({ queryKey: ["mail-logs"] });
    } else {
      setError("Erreur lors de l'application");
    }
    setApplying(false);
  };

  const copyReply = () => {
    if (!result?.replyDraft) return;
    navigator.clipboard.writeText(result.replyDraft).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = result.replyDraft;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleMod = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-mars-light dark:bg-blue-mars/20 flex items-center justify-center">
            <Mail className="w-5 h-5 text-blue-mars" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Traitement des mails</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Colle un email reçu — l&apos;IA détecte les changements et les applique au planning</p>
          </div>
        </div>
        {result && (
          <Button variant="outline" size="sm" onClick={resetForm}>
            <X className="w-4 h-4" /> Nouveau mail
          </Button>
        )}
      </div>

      {/* Stepper */}
      {!result && (
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-blue-mars text-white flex items-center justify-center font-bold text-[10px]">1</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">Coller l&apos;email</span>
          </div>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-600" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center font-bold text-[10px]">2</span>
            <span className="text-slate-400">Analyser</span>
          </div>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-600" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center font-bold text-[10px]">3</span>
            <span className="text-slate-400">Appliquer</span>
          </div>
        </div>
      )}
      {result && (
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px]">✓</span>
            <span className="text-slate-400">Email collé</span>
          </div>
          <div className="flex-1 h-px bg-green-200 dark:bg-green-800" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px]">✓</span>
            <span className="text-slate-400">Analysé</span>
          </div>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-600" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-blue-mars text-white flex items-center justify-center font-bold text-[10px]">3</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">Appliquer les changements</span>
          </div>
        </div>
      )}

      {/* Input zone — hidden after analysis */}
      {!result && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Contenu de l&apos;email</label>
              <p className="text-xs text-slate-400 mt-0.5">Ex: un mail de ton manager demandant de déplacer une visite ou d&apos;ajouter un magasin</p>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
              placeholder={`Exemple :\n"Bonjour, merci de reporter la visite du Carrefour Ixelles de mardi à jeudi, et d'ajouter une visite Ad Hoc au Delhaize de Waterloo vendredi matin."`}
              className="w-full min-h-[120px] resize-none rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-mars overflow-hidden"
            />
            <Button
              onClick={analyze}
              disabled={!content.trim() || analyzing}
              className="w-full"
            >
              <Sparkles className="w-4 h-4" />
              {analyzing ? "Analyse en cours..." : "Analyser avec l'IA"}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-mars-light border border-red-200 p-3 text-sm text-red-mars">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Analysis result */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="py-3 px-4">
              <p className="text-xs font-medium text-blue-700 mb-1">Résumé IA</p>
              <p className="text-sm text-blue-900">{result.summary}</p>
            </CardContent>
          </Card>

          {/* Modifications */}
          {result.modifications.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Actions détectées ({result.modifications.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.modifications.map((mod) => (
                  <div
                    key={mod.id}
                    onClick={() => !appliedIds.has(mod.id) && toggleMod(mod.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      appliedIds.has(mod.id)
                        ? "border-green-200 bg-green-50 cursor-default"
                        : selected.has(mod.id)
                        ? "border-blue-200 bg-blue-mars-light"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(mod.id)}
                      readOnly
                      disabled={appliedIds.has(mod.id)}
                      className="mt-0.5 accent-blue-mars"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {ACTION_LABELS[mod.action] || mod.action}
                        </span>
                        <span className="text-xs text-slate-600 font-medium truncate">{mod.target}</span>
                        {mod.field && (
                          <span className="text-xs text-slate-400">· {mod.field}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-800 mt-0.5">{mod.description}</p>
                      {mod.newValue && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {mod.oldValue && <><span className="line-through">{mod.oldValue}</span> → </>}
                          <span className="text-green-700 font-medium">{mod.newValue}</span>
                        </p>
                      )}
                    </div>
                    {appliedIds.has(mod.id) && (
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    )}
                  </div>
                ))}
                <Button
                  onClick={applySelected}
                  disabled={selected.size === 0 || applying || appliedIds.size === result.modifications.length}
                  variant="success"
                  className="w-full mt-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {applying
                    ? "Application..."
                    : appliedIds.size === result.modifications.length
                    ? "Toutes les modifications appliquées ✓"
                    : `Appliquer ${selected.size} modification(s) sélectionnée(s)`}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Reply draft */}
          {result.replyDraft && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Brouillon de réponse</CardTitle>
                  <Button size="sm" variant="outline" onClick={copyReply}>
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copié !" : "Copier"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{result.replyDraft}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* History */}
      {logs.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <Clock className="w-4 h-4" />
            Historique ({logs.length} mails traités)
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const appliedCount = log.modifications.filter((m) => m.applied).length;
                return (
                  <Card key={log.id} className="border-slate-200 overflow-hidden">
                    <button
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="w-full text-left"
                    >
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-800 line-clamp-2">{log.summary || "Mail analysé"}</p>
                            {log.modifications.length > 0 && (
                              <p className="text-xs text-slate-500 mt-1">
                                {appliedCount}/{log.modifications.length} modif{log.modifications.length > 1 ? "s" : ""} appliqué{appliedCount > 1 ? "es" : "e"}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-slate-400">
                              {new Date(log.createdAt).toLocaleDateString("fr-BE")}
                            </span>
                            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          </div>
                        </div>
                      </CardContent>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-100 px-4 py-3 space-y-3 bg-slate-50">
                        {/* Modifications list */}
                        {log.modifications.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Modifications</p>
                            {log.modifications.map((mod) => (
                              <div key={mod.id} className="flex items-start gap-2">
                                {mod.applied
                                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                                  : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0 mt-0.5" />}
                                <div className="min-w-0">
                                  <p className="text-xs text-slate-700">
                                    <span className="font-medium">{ACTION_LABELS[mod.action] || mod.action}</span>
                                    {" — "}{mod.target}{mod.field ? ` · ${mod.field}` : ""}
                                  </p>
                                  <p className="text-xs text-slate-500">{mod.description}</p>
                                  {mod.newValue && (
                                    <p className="text-xs text-slate-400">
                                      {mod.oldValue && <><span className="line-through">{mod.oldValue}</span> → </>}
                                      <span className="text-green-700 font-medium">{mod.newValue}</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply draft */}
                        {log.replyDraft && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Brouillon de réponse</p>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(log.replyDraft || "");
                                  setCopiedLogId(log.id);
                                  setTimeout(() => setCopiedLogId(null), 2000);
                                }}
                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                              >
                                {copiedLogId === log.id
                                  ? <><Check className="w-3 h-3 text-green-600" /> Copié</>  
                                  : <><Copy className="w-3 h-3" /> Copier</>}
                              </button>
                            </div>
                            <div className="bg-white rounded border border-slate-200 p-2.5">
                              <p className="text-xs text-slate-700 whitespace-pre-wrap">{log.replyDraft}</p>
                            </div>
                          </div>
                        )}

                        {log.modifications.length === 0 && !log.replyDraft && (
                          <p className="text-xs text-slate-400 text-center py-2">Aucun détail disponible</p>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}