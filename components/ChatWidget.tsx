"use client";

import { useEffect, useState } from "react";
import { Bot, Send, X, RotateCcw, User, Sparkles, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/lib/hooks/useChat";

const QUICK_QUESTIONS = [
  "Qu'est-ce que je dois faire aujourd'hui ?",
  "Qui appeler pour le magasin Carrefour Ixelles ?",
  "Explique-moi ce qu'est un halfmoon",
  "Quelles visites ont des remarques cette semaine ?",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const { messages, input, setInput, loading, error, bottomRef, inputRef, send, reset } = useChat();

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }, 80);
    return () => clearTimeout(t);
  }, [open, bottomRef, inputRef]);

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;

    await send(text);
    if (!open) setUnread((n) => n + 1);
  };

  const handleReset = () => {
    reset();
    setUnread(0);
  };

  return (
    <>
      {/* Backdrop — click outside to close */}
      {open && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-[calc(100vw-2rem)] max-w-sm h-[70vh] max-h-[560px] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-teal-cpm shrink-0">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">MerchandiserGPT</p>
              <p className="text-xs text-white/60">Contexte Mars injecté automatiquement</p>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  title="Effacer la conversation"
                  aria-label="Effacer la conversation"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Fermer le chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-4 pt-4 text-center">
                <div className="w-12 h-12 bg-teal-cpm/10 dark:bg-teal-cpm/15 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-teal-cpm" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Ton assistant Mars</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[220px] mx-auto">
                    Je connais ton planning, les magasins et le vocabulaire Mars.
                  </p>
                </div>
                <div className="w-full space-y-1.5">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-teal-cpm/10 dark:hover:bg-teal-cpm/15 hover:border-teal-cpm/30 hover:text-teal-cpm transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 bg-teal-cpm rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-teal-cpm text-white rounded-tr-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 bg-teal-cpm rounded-full flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-3 py-2">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-red-mars dark:text-red-400 bg-red-mars-light dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-2 text-center">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Pose ta question... (Entrée)"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-cpm max-h-24 overflow-y-auto"
                style={{ minHeight: "36px" }}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                size="icon"
                className="shrink-0 h-9 w-9 rounded-xl"
                aria-label="Envoyer"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => {
          setOpen((v) => {
            if (!v) setUnread(0);
            return !v;
          });
        }}
        className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          open
            ? "bg-slate-700 hover:bg-slate-800 rotate-0"
            : "bg-teal-cpm hover:bg-teal-cpm/85"
        } ${open ? "scale-90" : "scale-100 hover:scale-105"}`}
        aria-label="Assistant IA"
      >
        {open ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-mars text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
    </>
  );
}
