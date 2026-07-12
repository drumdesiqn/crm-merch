"use client";

import { useState, useMemo } from "react";
import { Phone, Mail, Search, Users, Plus, Trash2, Loader2, X, MessageCircle, Pencil, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useContacts } from "@/lib/hooks/useContacts";
import { useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";
import { showToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

const EMPTY_FORM = { name: "", phone: "", email: "" };

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ContactsPage() {
  const { data: teams = [], isLoading } = useContacts();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTeam, setActiveTeam] = useState<string | null>(null);
  const [addingToTeam, setAddingToTeam] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const q = search.toLowerCase().trim();

  const allContacts = useMemo(() => {
    return teams.flatMap((t) =>
      t.contacts.map((c) => ({ ...c, teamName: t.name, teamColor: t.color, teamId: t.id }))
    );
  }, [teams]);

  const filteredContacts = useMemo(() => {
    let list = allContacts;
    if (activeTeam) list = list.filter((c) => c.teamId === activeTeam);
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q));
    return list;
  }, [allContacts, activeTeam, q]);

  const handleAdd = async (teamId: string) => {
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      showToast("error", "Tous les champs sont requis");
      return;
    }
    setSaving(true);
    const result = await fetchApi("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, ...form }),
      suppressToast: true,
    });
    setSaving(false);
    if (result) {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setForm(EMPTY_FORM);
      setAddingToTeam(null);
      showToast("success", "Contact ajouté");
    } else {
      showToast("error", "Erreur lors de l'ajout");
    }
  };

  const startEdit = (contact: { id: string; name: string; phone: string; email: string }) => {
    setEditingId(contact.id);
    setEditForm({ name: contact.name, phone: contact.phone, email: contact.email });
  };

  const handleEdit = async () => {
    if (!editingId) return;
    if (!editForm.name.trim() || !editForm.phone.trim() || !editForm.email.trim()) {
      showToast("error", "Tous les champs sont requis");
      return;
    }
    setSaving(true);
    const result = await fetchApi("/api/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, ...editForm }),
      suppressToast: true,
    });
    setSaving(false);
    if (result) {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setEditingId(null);
      setEditForm(EMPTY_FORM);
      showToast("success", "Contact modifié");
    } else {
      showToast("error", "Erreur lors de la modification");
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await fetchApi("/api/contacts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      suppressToast: true,
    });
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (result !== null) {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      showToast("success", "Contact supprimé");
    } else {
      showToast("error", "Erreur lors de la suppression");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-teal-cpm" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-cpm" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Contacts</h1>
          <span className="text-sm text-slate-400 dark:text-slate-500 ml-1">{allContacts.length}</span>
        </div>
        {teams.length > 0 && (
          <Button
            size="sm"
            onClick={() => setAddingToTeam(addingToTeam ? null : (activeTeam || teams[0].id))}
            className="h-8 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline ml-1">Ajouter</span>
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email ou téléphone..."
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-cpm placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label="Effacer la recherche"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Team filter pills */}
      {teams.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTeam(null)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors",
              !activeTeam
                ? "bg-teal-cpm text-white border-teal-cpm"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-teal-cpm hover:text-teal-cpm"
            )}
          >
            Tous ({allContacts.length})
          </button>
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTeam(activeTeam === t.id ? null : t.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors",
                activeTeam === t.id
                  ? "bg-teal-cpm text-white border-teal-cpm"
                  : `bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-teal-cpm hover:text-teal-cpm ${t.color}`
              )}
            >
              {t.name} ({t.contacts.length})
            </button>
          ))}
        </div>
      )}

      {/* Add contact form */}
      {addingToTeam && (
        <Card className="border-teal-cpm/30 dark:border-teal-cpm/30">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Nouveau contact</p>
              <button onClick={() => { setAddingToTeam(null); setForm(EMPTY_FORM); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            {teams.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Équipe</label>
                <select
                  value={addingToTeam}
                  onChange={(e) => setAddingToTeam(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-cpm"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nom complet *" aria-label="Nom complet" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-cpm" />
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Téléphone *" aria-label="Téléphone" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-cpm" />
              <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email *" aria-label="Email" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-cpm" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-xs" onClick={() => handleAdd(addingToTeam)} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Ajouter"}
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setAddingToTeam(null); setForm(EMPTY_FORM); }}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {filteredContacts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun contact trouvé</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {q ? "Essaie un autre terme de recherche" : "Les contacts sont importés avec le planning Excel"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Contact list */}
      {filteredContacts.length > 0 && (
        <div className="space-y-2">
          {filteredContacts.map((c) => (
            <Card key={c.id} className={cn("group transition-all", editingId === c.id ? "border-teal-cpm/50 shadow-md" : "hover:shadow-md hover:border-teal-cpm/30")}>
              <CardContent className="py-3 px-4">
                {editingId === c.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Modifier le contact</p>
                      <button onClick={() => { setEditingId(null); setEditForm(EMPTY_FORM); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nom *" aria-label="Nom" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-cpm" />
                      <input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Téléphone *" aria-label="Téléphone" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-cpm" />
                      <input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email *" aria-label="Email" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-cpm" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 text-xs" onClick={handleEdit} disabled={saving}>
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" />Enregistrer</>}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setEditingId(null); setEditForm(EMPTY_FORM); }}>Annuler</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    {/* Top row: avatar + info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-teal-cpm flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {getInitials(c.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{c.name}</p>
                          <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${c.teamColor}`}>
                            {c.teamName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{c.email}</p>
                      </div>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center gap-1.5 pl-[52px] sm:pl-0 shrink-0">
                      <a
                        href={`tel:${c.phone.replace(/\s/g, "")}`}
                        className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
                        title={`Appeler ${c.phone}`}
                        aria-label={`Appeler ${c.name}`}
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                      <a
                        href={`https://wa.me/${c.phone.replace(/[\s+\-()]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
                        title={`WhatsApp ${c.phone}`}
                        aria-label={`WhatsApp ${c.name}`}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                      <a
                        href={`mailto:${c.email}`}
                        className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal-cpm/10 dark:bg-teal-cpm/10 text-teal-cpm border border-teal-cpm/30 dark:border-teal-cpm/30 hover:bg-teal-cpm/15 dark:hover:bg-teal-cpm/20 transition-colors"
                        title={`Email ${c.email}`}
                        aria-label={`Envoyer un email à ${c.name}`}
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => startEdit(c)}
                        className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all text-slate-300 dark:text-slate-600 hover:text-teal-cpm hover:bg-teal-cpm/10 dark:hover:bg-teal-cpm/15"
                        title="Modifier ce contact"
                        aria-label={`Modifier ${c.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {confirmDeleteId === c.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(c.id)}
                            disabled={deletingId === c.id}
                            className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-mars text-white hover:bg-red-700 transition-colors"
                            aria-label="Confirmer la suppression"
                          >
                            {deletingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            aria-label="Annuler la suppression"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(c.id)}
                          className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Supprimer ce contact"
                          aria-label={`Supprimer ${c.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}