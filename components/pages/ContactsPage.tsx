"use client";

import { useState } from "react";
import { Phone, Mail, ChevronDown, ChevronUp, Search, Users, Plus, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useContacts, type ContactTeamWithContacts } from "@/lib/hooks/useContacts";
import { useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";
import { showToast } from "@/components/Toast";

const EMPTY_FORM = { name: "", phone: "", email: "" };

export default function ContactsPage() {
  const { data: teams = [], isLoading } = useContacts();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [openTeams, setOpenTeams] = useState<Set<string>>(new Set());
  const [addingToTeam, setAddingToTeam] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toggleTeam = (id: string) => {
    setOpenTeams((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const q = search.toLowerCase().trim();
  const filtered: ContactTeamWithContacts[] = q
    ? teams
        .map((t) => ({ ...t, contacts: t.contacts.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) }))
        .filter((t) => t.contacts.length > 0)
    : teams;

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

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await fetchApi("/api/contacts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      suppressToast: true,
    });
    setDeletingId(null);
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
        <Loader2 className="w-6 h-6 animate-spin text-blue-mars" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-mars dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Contacts Mars</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value) setOpenTeams(new Set(teams.map((t) => t.id)));
          }}
          placeholder="Rechercher un contact..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-mars placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">Aucun contact trouvé</p>
      )}

      {filtered.map((team) => {
        const isOpen = q ? true : openTeams.has(team.id);
        const isAddingHere = addingToTeam === team.id;
        return (
          <Card key={team.id}>
            <CardHeader className="pb-0 pt-3 px-4">
              <button onClick={() => toggleTeam(team.id)} className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${team.color}`}>
                    {team.name}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">{team.contacts.length} contacts</span>
                </CardTitle>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>
            </CardHeader>
            {isOpen && (
              <CardContent className="pt-2 pb-3 px-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {team.contacts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 flex-1 min-w-0 truncate pr-2">{c.name}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900 transition-colors" title={c.phone}>
                          <Phone className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{c.phone}</span>
                        </a>
                        <a href={`mailto:${c.email}`} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors" title={c.email}>
                          <Mail className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline truncate max-w-[160px]">{c.email}</span>
                        </a>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Supprimer ce contact"
                        >
                          {deletingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {isAddingHere ? (
                  <div className="px-4 pt-3 space-y-2">
                    <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nom complet" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-mars" />
                    <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Téléphone (+32 ...)" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-mars" />
                    <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email (@effem.com)" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-mars" />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 text-xs" onClick={() => handleAdd(team.id)} disabled={saving}>
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Ajouter"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setAddingToTeam(null); setForm(EMPTY_FORM); }}>Annuler</Button>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 pt-2">
                    <button onClick={() => { setAddingToTeam(team.id); setForm(EMPTY_FORM); }} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-mars transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Ajouter un contact
                    </button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}