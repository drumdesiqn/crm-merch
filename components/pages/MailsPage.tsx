"use client";

import { useEffect, useState } from "react";
import { Sparkles, Copy, Check, ChevronDown, ChevronUp, Clock, CheckCircle2, AlertCircle, X, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Modification {
  id: string;
  action: string;
  target: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  description: string;
  applied: boolean;
}

interface AnalysisResult {
  mailLogId: string;
  summary: string;
  replyDraft: string;
  modifications: Modification[];
}

interface MailLog {
  id: string;
  summary: string | null;
  replyDraft: string | null;
  status: string;
  createdAt: string;
  modifications: Modification[];
}

const ACTION_LABELS: Record<string, string> = {
  modify: "Modifier",
  add: "Ajouter",
  delete: "Supprimer",
  add_remark: "Ajouter remarque",
};

export default function MailsPage() {
  const [content, setContent] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<MailLog[]>([]);
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

  useEffect(() => {
    fetch("/api/maillogs")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLogs(data); })
      .catch(() => {});
  }, []);

  const analyze = async () => {
    if (!content.trim()) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/mail/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'analyse");
        return;
      }
      setResult(data);
      setSelected(new Set(data.modifications.map((m: Modification) => m.id)));
      fetch("/api/maillogs")
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) setLogs(d); })
        .catch(() => {});
    } catch {
      setError("Erreur réseau lors de l'analyse");
    } finally {
      setAnalyzing(false);
    }
  };

  const applySelected = async () => {
    if (!result || selected.size === 0) return;
    setApplying(true);
    try {
      const res = await fetch("/api/mail/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modificationIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'application");
        return;
      }
      const successIds = (data.results as { id: string; success: boolean }[])
        .filter((r) => r.success)
        .map((r) => r.id);
      setAppliedIds(new Set(successIds));
      fetch("/api/maillogs")
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) setLogs(d); })
        .catch(() => {});
    } catch {
      setError("Erreur réseau lors de l'application");
    } finally {
      setApplying(false);
    }
  };

  const copyReply = () => {
    if (!result?.replyDraft) return;
    try {
      navigator.clipboard.writeText(result.replyDraft);
    } catch (err) {
      console.error("Clipboard error:", err);
    }
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Traitement des mails</h1>
        {result && (
          <Button variant="outline" size="sm" onClick={resetForm}>
            <X className="w-4 h-4" /> Nouveau mail
          </Button>
        )}
      </div>

      {/* Input zone — hidden after analysis */}
      {!result && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <label className="text-sm font-medium text-slate-700">Coller le contenu du mail ici</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
              placeholder="Colle le texte de ton mail ici..."
              className="w-full min-h-[100px] resize-none rounded-lg border border-slate-200 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 overflow-hidden"
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
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
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
                        ? "border-red-200 bg-red-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(mod.id)}
                      readOnly
                      disabled={appliedIds.has(mod.id)}
                      className="mt-0.5 accent-red-600"
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
