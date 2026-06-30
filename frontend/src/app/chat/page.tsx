"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Hash, AtSign, Plus, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import {
  getChannels,
  getChannelMessages,
  sendChannelMessage,
  markChannelRead,
  createChannel,
  getChatSocketUrl,
  ChatChannel,
  ChatMessage,
} from "@/lib/api";

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ChatPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [creating, setCreating] = useState(false);

  const activeIdRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));

  const selectChannel = useCallback(async (channelId: number) => {
    setActiveId(channelId);
    activeIdRef.current = channelId;
    setLoadingMsgs(true);
    const res = await getChannelMessages(channelId);
    setMessages(res.data || []);
    setLoadingMsgs(false);
    scrollToBottom();
    markChannelRead(channelId);
    setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, unread_count: 0 } : c)));
  }, []);

  const loadChannels = useCallback(async () => {
    const res = await getChannels();
    if (res.data) {
      setChannels(res.data);
      if (activeIdRef.current == null && res.data.length > 0) {
        selectChannel(res.data[0].id);
      }
    }
  }, [selectChannel]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Best-effort WebSocket for live delivery (falls back to REST silently).
  useEffect(() => {
    const url = getChatSocketUrl();
    if (!url) return;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(url);
    } catch {
      return;
    }
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message" && data.message) {
          const msg: ChatMessage = data.message;
          if (msg.channel_id === activeIdRef.current) {
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
            scrollToBottom();
            markChannelRead(msg.channel_id);
          } else {
            setChannels((prev) =>
              prev.map((c) => (c.id === msg.channel_id ? { ...c, unread_count: (c.unread_count || 0) + 1 } : c)),
            );
          }
        }
      } catch {
        /* ignore malformed frames */
      }
    };
    ws.onerror = () => ws?.close();
    return () => ws?.close();
  }, []);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || activeId == null) return;
    setText("");
    const res = await sendChannelMessage(activeId, body);
    if (res.data) {
      setMessages((prev) => (prev.some((m) => m.id === res.data!.id) ? prev : [...prev, res.data!]));
      scrollToBottom();
    }
  };

  const handleCreateChannel = async () => {
    const name = window.prompt("New channel name");
    if (!name || !name.trim()) return;
    setCreating(true);
    const res = await createChannel({ name: name.trim() });
    setCreating(false);
    if (res.data) {
      await loadChannels();
      selectChannel(res.data.id);
    }
  };

  const activeChannel = channels.find((c) => c.id === activeId) || null;

  return (
    <ProtectedRoute>
      <DashboardLayout
        role={(user?.role as "admin" | "employee") || "employee"}
        userName={user?.name || "User"}
        userHandle={`@${user?.email?.split("@")[0] || "user"}`}
        noPadding
      >
        <div className="flex h-[calc(100dvh-3.5rem)]">
          {/* Channel list */}
          <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Channels</h2>
              <button
                type="button"
                onClick={handleCreateChannel}
                disabled={creating}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                title="New channel"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {channels.length === 0 ? (
                <p className="px-2 py-4 text-xs text-muted-foreground">No channels yet.</p>
              ) : (
                channels.map((c) => {
                  const isDm = c.channel_type === "direct";
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectChannel(c.id)}
                      className={`mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        activeId === c.id
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      }`}
                    >
                      {isDm ? <AtSign size={14} className="shrink-0" /> : <Hash size={14} className="shrink-0" />}
                      <span className="flex-1 truncate">{c.name || "Direct message"}</span>
                      {!!c.unread_count && (
                        <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          {c.unread_count}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Messages */}
          <section className="flex flex-1 flex-col bg-background">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-lg tracking-tight">
                  {activeChannel?.channel_type === "direct" ? "@" : "#"} {activeChannel?.name || "Select a channel"}
                </span>
                {activeChannel && (
                  <span className="flex items-center gap-1 ml-2 text-muted-foreground hover:bg-secondary p-1 rounded cursor-pointer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  </span>
                )}
              </div>
              {activeChannel && (
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="hover:bg-secondary p-1.5 rounded cursor-pointer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></span>
                  <span className="hover:bg-secondary p-1.5 rounded cursor-pointer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col">
              {loadingMsgs ? (
                <div className="flex flex-1 items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : !activeChannel ? (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  Select a channel to start messaging.
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-1 flex-col justify-end pb-8">
                  <div className="bg-secondary/40 w-16 h-16 rounded-xl flex items-center justify-center mb-4">
                    <Hash size={32} className="text-foreground" />
                  </div>
                  <h1 className="text-4xl font-extrabold text-foreground mb-2">
                    {activeChannel?.channel_type === "direct" ? "@" : "#"}{activeChannel?.name}
                  </h1>
                  <p className="text-muted-foreground text-base max-w-lg mb-4">
                    You're looking at the <strong>#{activeChannel?.name}</strong> channel.<br/>
                    This is the one channel that will always include everyone. It's a great spot for announcements and team-wide conversations.
                  </p>
                </div>
              ) : (
                <ul className="space-y-4 flex-1">
                  {messages.map((m) => (
                    <li key={m.id} className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                        {(m.sender_name?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-foreground">{m.sender_name || "User"}</span>
                          <span className="text-[11px] text-muted-foreground">{fmtTime(m.created_at)}</span>
                          {m.edited_at && <span className="text-[10px] text-muted-foreground">(edited)</span>}
                        </div>
                        <p className={`whitespace-pre-wrap break-words text-sm ${m.deleted_at ? "italic text-muted-foreground" : "text-foreground"}`}>
                          {m.body}
                        </p>
                      </div>
                    </li>
                  ))}
                  <div ref={bottomRef} />
                </ul>
              )}
            </div>

            {activeChannel && (
              <div className="px-5 pb-5 pt-2">
                <div className="rounded-xl border border-border bg-card shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all flex flex-col">
                  {/* Rich Text Format Bar Placeholder */}
                  <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/20">
                    <button className="p-1 hover:bg-secondary rounded text-muted-foreground"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
                    <button className="p-1 hover:bg-secondary rounded text-muted-foreground"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
                    <div className="w-px h-4 bg-border mx-1"></div>
                    <button className="p-1 hover:bg-secondary rounded text-muted-foreground font-bold font-serif w-6">B</button>
                    <button className="p-1 hover:bg-secondary rounded text-muted-foreground italic font-serif w-6">I</button>
                    <button className="p-1 hover:bg-secondary rounded text-muted-foreground line-through w-6">S</button>
                    <div className="w-px h-4 bg-border mx-1"></div>
                    <button className="p-1 hover:bg-secondary rounded text-muted-foreground"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></button>
                    <button className="p-1 hover:bg-secondary rounded text-muted-foreground"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></button>
                  </div>
                  
                  {/* Input Area */}
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={`Message ${activeChannel?.channel_type === "direct" ? "@" : "#"}${activeChannel.name || ""}`}
                    className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground outline-none min-h-[60px]"
                    rows={1}
                  />

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between px-2 py-2">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 hover:bg-secondary rounded-full bg-secondary/50 text-foreground"><Plus size={16} /></button>
                      <button className="p-1.5 hover:bg-secondary rounded text-muted-foreground font-medium text-xs">Aa</button>
                      <button className="p-1.5 hover:bg-secondary rounded text-muted-foreground"><AtSign size={16} /></button>
                      <button className="p-1.5 hover:bg-secondary rounded text-muted-foreground">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!text.trim()}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                        text.trim() ? "bg-green-600 text-white hover:bg-green-700" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Send size={14} className={text.trim() ? "ml-0.5" : ""} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
