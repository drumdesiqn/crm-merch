"use client";

import { useEffect } from "react";
import { Send, Bot, User, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/lib/hooks/useChat";

const QUICK_QUESTIONS = [
  "Qu'est-ce que je dois faire aujourd'hui ?",
  "Qui appeler pour le magasin Carrefour Ixelles ?",
  "Explique-moi ce qu'est un halfmoon",
  "Quelles visites ont des remarques cette semaine ?",
];

export default function AssistantPage() {
  const { messages, input, setInput, loading, error, bottomRef, inputRef, send, reset } = useChat();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, bottomRef]);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-3.5rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-mars rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">MerchandiserGPT</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Contexte Mars injecté automatiquement</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center pb-10">
            <div className="w-16 h-16 bg-blue-mars-light dark:bg-blue-mars/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-blue-mars" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Ton assistant Mars</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                Je connais ton planning, les magasins, les sales reps et le vocabulaire Mars. Pose-moi n&apos;importe quelle question.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-left text-sm px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-mars-light dark:hover:bg-blue-mars/20 hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-mars dark:hover:text-blue-cpm transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 bg-blue-mars rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-blue-mars text-white rounded-tr-sm"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-sm"
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 bg-blue-mars rounded-full flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-5">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-sm text-red-mars dark:text-red-400 bg-red-mars-light dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Pose ta question... (Entrée pour envoyer)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-mars max-h-32 overflow-y-auto"
            style={{ minHeight: "44px" }}
          />
          <Button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            size="icon"
            className="shrink-0 h-11 w-11 rounded-xl"
            aria-label="Envoyer"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
