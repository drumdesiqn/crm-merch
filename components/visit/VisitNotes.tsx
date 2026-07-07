"use client";

import { StickyNote, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { VisitNote } from "@/types/visit";

interface VisitNotesProps {
  notes: VisitNote[];
  noteInput: string;
  setNoteInput: (v: string) => void;
  addingNote: boolean;
  onAddNote: () => void;
  onDeleteNote: (noteId: string) => void;
}

export default function VisitNotes({
  notes, noteInput, setNoteInput, addingNote, onAddNote, onDeleteNote,
}: VisitNotesProps) {
  return (
    <>
      {/* Add note */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-blue-mars" /> Ajouter une note
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Ex: Facing refait, clipstrip ajouté côté gauche..."
            className="w-full min-h-[90px] resize-none rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-mars placeholder:text-slate-400 dark:placeholder:text-slate-500"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onAddNote(); }}
          />
          <Button size="sm" onClick={onAddNote} disabled={!noteInput.trim() || addingNote}>
            <Plus className="w-4 h-4" />
            {addingNote ? "Enregistrement..." : "Ajouter la note"}
          </Button>
        </CardContent>
      </Card>

      {/* Notes list */}
      {notes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Notes ({notes.length})</p>
          {[...notes]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((note) => (
            <Card key={note.id} className="border-slate-200">
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{note.content}</p>
                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="text-slate-300 hover:text-red-mars transition-colors shrink-0 mt-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {note.visit?.visitDate
                    ? new Date(note.visit.visitDate).toLocaleDateString("fr-BE", { day: "2-digit", month: "short", year: "numeric" })
                    : new Date(note.createdAt).toLocaleDateString("fr-BE", { day: "2-digit", month: "short", year: "numeric" })}
                  {note.visit?.week?.label && (
                    <span className="ml-2 text-blue-mars font-medium">· {note.visit.week.label}</span>
                  )}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
