"use client";

import { useState } from "react";
import { Phone, Mail, ChevronDown, ChevronUp, Search, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TEAMS, type Team } from "@/lib/constants";

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [openTeams, setOpenTeams] = useState<Set<string>>(new Set(["snacking"]));

  const toggleTeam = (id: string) => {
    setOpenTeams((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const q = search.toLowerCase().trim();
  const filtered: Team[] = q
    ? TEAMS.map((t) => ({
        ...t,
        contacts: t.contacts.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)),
      })).filter((t) => t.contacts.length > 0)
    : TEAMS;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-red-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Contacts Mars</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value) setOpenTeams(new Set(["snacking", "food-pet", "spt"]));
          }}
          placeholder="Rechercher un contact..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">Aucun contact trouvé</p>
      )}

      {filtered.map((team) => {
        const isOpen = q ? true : openTeams.has(team.id);
        return (
          <Card key={team.id}>
            <CardHeader className="pb-0 pt-3 px-4">
              <button
                onClick={() => toggleTeam(team.id)}
                className="flex items-center justify-between w-full"
              >
                <CardTitle className="flex items-center gap-2 text-sm">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${team.color}`}>
                    {team.name}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">{team.contacts.length} contacts</span>
                </CardTitle>
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                }
              </button>
            </CardHeader>
            {isOpen && (
              <CardContent className="pt-2 pb-2 px-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {team.contacts.map((c) => (
                    <div key={c.email} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 flex-1 min-w-0 truncate pr-2">{c.name}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={`tel:${c.phone.replace(/\s/g, "")}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
                          title={c.phone}
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{c.phone}</span>
                        </a>
                        <a
                          href={`mailto:${c.email}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                          title={c.email}
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline truncate max-w-[160px]">{c.email}</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
