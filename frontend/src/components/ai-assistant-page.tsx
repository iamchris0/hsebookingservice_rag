"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Plus, MessageSquare, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const THINKING_PHRASES = [
  "Ищу информацию в базе знаний...",
  "Просматриваю документы ВШЭ...",
  "Анализирую релевантные источники...",
  "Сверяюсь с учебными материалами...",
  "Формирую ответ...",
  "Проверяю актуальность данных...",
  "Читаю учебные программы...",
  "Нахожу подходящие разделы...",
  "Обрабатываю запрос...",
  "Изучаю нормативные документы...",
  "Уточняю детали из базы...",
  "Сопоставляю источники...",
  "Составляю развёрнутый ответ...",
  "Проверяю расписание и регламенты...",
  "Почти готово...",
]

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  created_at?: string
}

interface Conversation {
  id: string
  title: string
  updated_at: string
}

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function AiAssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingMessages, setIsFetchingMessages] = useState(false)
  const [thinkingPhrase, setThinkingPhrase] = useState(THINKING_PHRASES[0])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Load conversation list ────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/conversations`, {
        headers: authHeaders(),
      })
      if (!res.ok) return
      const data: Conversation[] = await res.json()
      setConversations(data)
    } catch {
      // silently ignore network errors on load
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // ── Load messages when switching conversations ────────────────────────────

  const fetchMessages = useCallback(async (convId: string) => {
    setIsFetchingMessages(true)
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/chat/conversations/${convId}/messages`,
        { headers: authHeaders() }
      )
      if (!res.ok) return
      const data: Message[] = await res.json()
      setMessages(data)
    } finally {
      setIsFetchingMessages(false)
    }
  }, [])

  const handleSelectConversation = (id: string) => {
    setActiveId(id)
    fetchMessages(id)
  }

  // ── Cycle thinking phrases while loading ─────────────────────────────────

  useEffect(() => {
    if (!isLoading) return
    setThinkingPhrase(THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)])
    const id = setInterval(() => {
      setThinkingPhrase(THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)])
    }, 2000)
    return () => clearInterval(id)
  }, [isLoading])

  // ── Scroll to bottom on new messages ─────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, isLoading])

  // ── New conversation ──────────────────────────────────────────────────────

  const handleNewConversation = () => {
    setActiveId(null)
    setMessages([])
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }

  // ── Auto-resize textarea ──────────────────────────────────────────────────

  const autoResize = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px"
  }

  // ── Send message ──────────────────────────────────────────────────────────

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    // Optimistic: add user message immediately
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
    }
    setMessages((prev) => [...prev, tempUserMsg])
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    setIsLoading(true)

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/messages`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          message: text,
          ...(activeId ? { conversation_id: activeId } : {}),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || "Server error")
      }

      const data = await res.json() as {
        conversation_id: string
        answer: string
        message_id: string
      }

      // If a new conversation was created, register it
      if (!activeId || data.conversation_id !== activeId) {
        setActiveId(data.conversation_id)
        await fetchConversations()
      }

      // Replace temp user msg + append assistant answer
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id)
        return [
          ...withoutTemp,
          { id: `u-${Date.now()}`, role: "user" as const, content: text },
          { id: data.message_id, role: "assistant" as const, content: data.answer },
        ]
      })

      // Refresh conversations to update updated_at ordering
      fetchConversations()
    } catch (err) {
      // Remove optimistic message and show error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id))
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `Ошибка: ${err instanceof Error ? err.message : "Не удалось получить ответ. Проверьте подключение."}`,
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="-mt-8 -mb-8 -mx-4 flex" style={{ height: "calc(100vh - 116px)" }}>

      {/* Sidebar */}
      <aside className="w-72 shrink-0 bg-white border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors hover:brightness-95"
            style={{ backgroundColor: "#DCFF05", color: "#000" }}
          >
            <Plus className="w-4 h-4" />
            Новый чат
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.length === 0 ? (
            <p className="text-muted-foreground text-xs text-center mt-10 px-4">
              Нет предыдущих диалогов
            </p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-start gap-2",
                  activeId === conv.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2 leading-snug">{conv.title}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {isFetchingMessages ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center select-none">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: "#DCFF05" }}
              >
                <MessageSquare className="w-8 h-8" style={{ color: "#000" }} />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">ИИ помощник</h2>
              <p className="text-muted-foreground text-sm max-w-xs">
                Задайте вопрос — ассистент ответит на основе документов НИУ ВШЭ
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "text-black whitespace-pre-wrap"
                        : "bg-white border border-border text-foreground shadow-sm prose prose-sm max-w-none"
                    )}
                    style={msg.role === "user" ? { backgroundColor: "#DCFF05" } : {}}
                  >
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-border rounded-2xl px-4 py-3 shadow-sm flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />
                    <span
                      key={thinkingPhrase}
                      className="text-sm text-muted-foreground animate-pulse"
                    >
                      {thinkingPhrase}
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-border bg-white p-4">
          <div className="max-w-3xl mx-auto flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              placeholder="Введите сообщение..."
              className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              style={{ maxHeight: "160px" }}
              onChange={(e) => {
                setInput(e.target.value)
                autoResize()
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#DCFF05", color: "#000" }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Отправить
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
