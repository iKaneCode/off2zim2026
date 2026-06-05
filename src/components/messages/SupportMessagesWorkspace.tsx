"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  CheckCheck,
  FileText,
  Paperclip,
  Search,
  Send,
  UserRound,
  X,
} from "lucide-react";
import { notifySupportMessagesUpdated } from "@/hooks/useSupportUnreadCount";
import { getSurfaceHref } from "@/lib/app-surface";
import { apiFetch, getAuthHeaders } from "@/lib/client-api";
import { serviceProviderIdToRouteSegment } from "@/lib/service-provider-id";
import { cn } from "@/lib/utils";
import type {
  SupportContactRecord,
  SupportConversationRecord,
  SupportMessageAttachmentRecord,
  SupportMessageRecord,
} from "@/types/platform";

type WorkspaceMode = "admin" | "provider";
type MessageFilter = "all" | "service_provider" | "user" | "unread";

const ADMIN_FILTERS: Array<{ value: MessageFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "service_provider", label: "Service Providers" },
  { value: "user", label: "Users" },
  { value: "unread", label: "Unread" },
];
const PROVIDER_FILTERS: Array<{ value: MessageFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
];

const OFF2ZIM_CONTACT: SupportContactRecord = {
  id: "off2zim-admin",
  userId: "off2zim-admin",
  companyId: null,
  serviceProviderId: null,
  name: "Off2Zim Admin",
  contactName: "Off2Zim Admin",
  email: "",
  role: "admin",
  avatarUrl: null,
  recipientType: "user",
};

export default function SupportMessagesWorkspace({
  mode,
  className,
}: {
  mode: WorkspaceMode;
  className?: string;
}) {
  const isAdmin = mode === "admin";
  const listEndpoint = isAdmin
    ? "/api/admin/messages"
    : "/api/provider/messages";
  const conversationEndpoint = isAdmin
    ? "/api/admin/messages"
    : "/api/provider/messages";
  const [contacts, setContacts] = useState<SupportContactRecord[]>([]);
  const [conversations, setConversations] = useState<
    SupportConversationRecord[]
  >([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedConversation, setSelectedConversation] =
    useState<SupportConversationRecord | null>(null);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<
    string | null
  >(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MessageFilter>("all");
  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    SupportMessageAttachmentRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const updateWorkspace = (
    payload:
      | {
          contacts: SupportContactRecord[];
          conversations: SupportConversationRecord[];
        }
      | { conversations: SupportConversationRecord[] },
  ) => {
    if ("contacts" in payload) {
      setContacts(payload.contacts);
    }
    setConversations(payload.conversations);
  };

  const loadWorkspace = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const payload = isAdmin
        ? await apiFetch<{
            contacts: SupportContactRecord[];
            conversations: SupportConversationRecord[];
          }>(listEndpoint)
        : await apiFetch<{ conversations: SupportConversationRecord[] }>(
            listEndpoint,
          );
      updateWorkspace(payload);
      setError("");
    } catch (err) {
      if (!quiet) {
        setError(
          err instanceof Error ? err.message : "Unable to load messages.",
        );
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const loadConversation = async (
    conversationId: string,
    options: { quiet?: boolean; setUnreadBoundary?: boolean } = {},
  ) => {
    if (!options.quiet) setLoadingConversation(true);
    try {
      const payload = await apiFetch<{
        conversation: SupportConversationRecord;
        firstUnreadMessageId?: string | null;
      }>(`${conversationEndpoint}/${conversationId}`);
      setSelectedConversation(payload.conversation);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === payload.conversation.id
            ? { ...payload.conversation, unreadCount: 0 }
            : conversation,
        ),
      );
      if (options.setUnreadBoundary) {
        setFirstUnreadMessageId(payload.firstUnreadMessageId ?? null);
      }
      notifySupportMessagesUpdated();
      setError("");
    } catch (err) {
      if (!options.quiet) {
        setError(
          err instanceof Error ? err.message : "Unable to load conversation.",
        );
      }
    } finally {
      if (!options.quiet) setLoadingConversation(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      if (!active) return;
      await loadWorkspace(true);
      if (selectedConversation?.id) {
        await loadConversation(selectedConversation.id, { quiet: true });
      }
    };
    const handleFocus = () => void refresh();
    const interval = window.setInterval(refresh, 3000);
    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (messagesRef.current) {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedConversation?.id, selectedConversation?.messages?.length]);

  const conversationByContact = useMemo(
    () =>
      new Map(
        conversations.map((conversation) => [
          contactKey(conversation.participant),
          conversation,
        ]),
      ),
    [conversations],
  );

  const listItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const items = isAdmin
      ? contacts.map((contact) => ({
          key: contactKey(contact),
          contact,
          conversation: conversationByContact.get(contactKey(contact)) ?? null,
        }))
      : conversations.map((conversation) => ({
          key: conversation.id,
          contact: OFF2ZIM_CONTACT,
          conversation,
        }));

    return items
      .filter(({ contact, conversation }) => {
        if (
          filter === "service_provider" &&
          contact.recipientType !== "service_provider"
        ) {
          return false;
        }
        if (filter === "user" && contact.recipientType !== "user") {
          return false;
        }
        if (filter === "unread" && !(conversation?.unreadCount ?? 0)) {
          return false;
        }
        if (!normalizedQuery) return true;

        return [contact.name, conversation?.lastMessage?.body]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedQuery),
          );
      })
      .sort(
        (first, second) =>
          new Date(
            second.conversation?.lastMessageAt ?? "1970-01-01",
          ).getTime() -
            new Date(
              first.conversation?.lastMessageAt ?? "1970-01-01",
            ).getTime() ||
          first.contact.name.localeCompare(second.contact.name),
      );
  }, [contacts, conversationByContact, conversations, filter, isAdmin, query]);

  const selectedContact = isAdmin
    ? (contacts.find((contact) => contactKey(contact) === selectedKey) ??
      selectedConversation?.participant ??
      null)
    : selectedConversation
      ? OFF2ZIM_CONTACT
      : null;

  const selectItem = (item: (typeof listItems)[number]) => {
    setSelectedKey(item.key);
    setSelectedConversation(null);
    setFirstUnreadMessageId(null);
    setDraft("");
    setPendingAttachments([]);
    if (item.conversation) {
      void loadConversation(item.conversation.id, {
        setUnreadBoundary: true,
      });
    }
  };

  const sendMessage = async () => {
    if (!selectedContact || (!draft.trim() && !pendingAttachments.length)) {
      return;
    }
    if (sending) return;

    setSending(true);
    try {
      const request = {
        method: "POST",
        body: JSON.stringify({
          body: draft.trim(),
          attachments: pendingAttachments,
          ...(!selectedConversation && isAdmin
            ? {
                participantUserId: selectedContact.userId,
                companyId: selectedContact.companyId,
              }
            : {}),
        }),
      };
      const payload = selectedConversation
        ? await apiFetch<{ conversation: SupportConversationRecord }>(
            `${conversationEndpoint}/${selectedConversation.id}`,
            request,
          )
        : await apiFetch<{ conversation: SupportConversationRecord }>(
            conversationEndpoint,
            request,
          );

      setSelectedConversation(payload.conversation);
      setSelectedKey(
        isAdmin
          ? contactKey(payload.conversation.participant)
          : payload.conversation.id,
      );
      setConversations((current) => [
        payload.conversation,
        ...current.filter(
          (conversation) => conversation.id !== payload.conversation.id,
        ),
      ]);
      setDraft("");
      setPendingAttachments([]);
      notifySupportMessagesUpdated();
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!selectedConversation || !files?.length || uploading) return;

    const availableSlots = Math.max(0, 5 - pendingAttachments.length);
    const selectedFiles = Array.from(files).slice(0, availableSlots);
    if (!selectedFiles.length) return;

    setUploading(true);
    try {
      const uploaded: SupportMessageAttachmentRecord[] = [];
      for (const file of selectedFiles) {
        const data = new FormData();
        data.append("file", file);
        data.append("conversationId", selectedConversation.id);
        const payload = await apiFetch<{
          attachment: SupportMessageAttachmentRecord;
        }>("/api/support-messages/uploads", {
          method: "POST",
          body: data,
        });
        uploaded.push(payload.attachment);
      }
      setPendingAttachments((current) => [...current, ...uploaded].slice(0, 5));
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to upload attachment.",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filters = isAdmin ? ADMIN_FILTERS : PROVIDER_FILTERS;
  const headerHref =
    isAdmin &&
    selectedContact?.recipientType === "service_provider" &&
    selectedContact.serviceProviderId
      ? getSurfaceHref(
          "admin",
          `/admin/service-providers/${serviceProviderIdToRouteSegment(
            selectedContact.serviceProviderId,
          )}`,
        )
      : "";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101010] lg:grid lg:min-h-[560px] lg:grid-cols-[340px_minmax(0,1fr)]",
        className,
      )}
    >
      <aside className="flex min-h-[420px] flex-col border-b border-slate-200 dark:border-white/10 lg:min-h-0 lg:border-b-0 lg:border-r">
        <div className="space-y-3 border-b border-slate-200 p-4 dark:border-white/10">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  filter === option.value
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-white/55 dark:hover:bg-white/10",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-8 text-sm text-slate-500">Loading...</div>
          ) : listItems.length === 0 ? (
            <div className="px-4 py-8 text-sm text-slate-500">
              No matching conversations.
            </div>
          ) : (
            listItems.map((item) => {
              const selected = item.key === selectedKey;
              const unreadCount = item.conversation?.unreadCount ?? 0;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => selectItem(item)}
                  className={cn(
                    "block w-full border-b border-slate-100 px-4 py-3 text-left transition dark:border-white/[0.06]",
                    selected
                      ? "bg-slate-100 dark:bg-white/[0.07]"
                      : "hover:bg-slate-50 dark:hover:bg-white/[0.04]",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <ContactAvatar contact={item.contact} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                            {item.contact.name}
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-500 dark:text-white/45">
                            {messagePreview(item.conversation?.lastMessage)}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <div className="text-[11px] text-slate-400 dark:text-white/35">
                            {item.conversation
                              ? formatListDate(item.conversation.lastMessageAt)
                              : ""}
                          </div>
                          {unreadCount > 0 ? (
                            <span
                              className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#ff5630] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
                              aria-label={`${unreadCount} unread messages`}
                            >
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <div className="flex min-h-[520px] min-w-0 flex-col lg:min-h-0">
        {selectedContact ? (
          <>
            <header className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
              {headerHref ? (
                <Link
                  href={headerHref}
                  className="inline-flex items-center gap-3 rounded-lg transition hover:opacity-75"
                >
                  <ContactAvatar contact={selectedContact} size="large" />
                  <span className="text-sm font-semibold text-slate-950 dark:text-white">
                    {selectedContact.name}
                  </span>
                </Link>
              ) : (
                <div className="inline-flex items-center gap-3">
                  <ContactAvatar contact={selectedContact} size="large" />
                  <span className="text-sm font-semibold text-slate-950 dark:text-white">
                    {selectedContact.name}
                  </span>
                </div>
              )}
            </header>
            <div
              ref={messagesRef}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4 dark:bg-white/[0.015]"
            >
              {loadingConversation ? (
                <div className="text-sm text-slate-500">Loading...</div>
              ) : selectedConversation?.messages?.length ? (
                selectedConversation.messages.map(
                  (message, index, messages) => {
                    const outgoing =
                      message.sender.role === (isAdmin ? "admin" : "provider");
                    const previousMessage = messages[index - 1];
                    const showDate =
                      !previousMessage ||
                      dateKey(previousMessage.createdAt) !==
                        dateKey(message.createdAt);
                    return (
                      <Fragment key={message.id}>
                        {showDate ? (
                          <DateDivider value={message.createdAt} />
                        ) : null}
                        {message.id === firstUnreadMessageId ? (
                          <div className="flex items-center gap-3 py-1">
                            <div className="h-px flex-1 bg-[#ff5630]/40" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff5630]">
                              Unread
                            </span>
                            <div className="h-px flex-1 bg-[#ff5630]/40" />
                          </div>
                        ) : null}
                        <div className={cn("flex", outgoing && "justify-end")}>
                          <div
                            className={cn(
                              "max-w-[82%] rounded-xl px-4 py-3 text-sm shadow-sm",
                              outgoing
                                ? "rounded-br-sm bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                                : "rounded-bl-sm bg-white text-slate-700 dark:bg-white/[0.08] dark:text-white/75",
                            )}
                          >
                            {message.body ? <div>{message.body}</div> : null}
                            {message.attachments.length ? (
                              <div
                                className={cn(
                                  "space-y-2",
                                  message.body && "mt-3",
                                )}
                              >
                                {message.attachments.map((attachment) => (
                                  <AttachmentButton
                                    key={attachment.fileUrl}
                                    attachment={attachment}
                                    outgoing={outgoing}
                                  />
                                ))}
                              </div>
                            ) : null}
                            <div
                              className={cn(
                                "mt-1.5 flex items-center justify-end gap-1 text-[10px]",
                                outgoing
                                  ? "text-white/55 dark:text-slate-500"
                                  : "text-slate-400 dark:text-white/35",
                              )}
                            >
                              <span>{formatTime(message.createdAt)}</span>
                              {outgoing ? (
                                <MessageStatus message={message} />
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </Fragment>
                    );
                  },
                )
              ) : (
                <div className="grid h-full min-h-52 place-items-center text-center text-sm text-slate-500 dark:text-white/45">
                  Start a conversation with {selectedContact.name}.
                </div>
              )}
            </div>
            <div className="border-t border-slate-200 p-3 dark:border-white/10">
              {error ? (
                <div className="mb-3 text-xs text-rose-600 dark:text-rose-300">
                  {error}
                </div>
              ) : null}
              {pendingAttachments.length ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {pendingAttachments.map((attachment) => (
                    <div
                      key={attachment.fileUrl}
                      className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/60"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="max-w-44 truncate">
                        {attachment.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingAttachments((current) =>
                            current.filter(
                              (item) => item.fileUrl !== attachment.fileUrl,
                            ),
                          )
                        }
                        aria-label={`Remove ${attachment.fileName}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.webp"
                onChange={(event) => void uploadFiles(event.target.files)}
                className="hidden"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!selectedConversation || uploading}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60"
                  aria-label="Attach documents"
                  title={
                    selectedConversation
                      ? "Attach documents"
                      : "Send the first message before attaching documents"
                  }
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder="Write a message"
                  className="min-h-11 flex-1 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#ff5630] dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/30"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={
                    (!draft.trim() && !pendingAttachments.length) || sending
                  }
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-45 dark:bg-white dark:text-slate-950"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="grid h-full min-h-[520px] place-items-center px-4 text-center text-sm text-slate-500 dark:text-white/45">
            Select a conversation to open it.
          </div>
        )}
      </div>
    </section>
  );
}

function ContactAvatar({
  contact,
  size = "default",
}: {
  contact: SupportContactRecord;
  size?: "default" | "large";
}) {
  const sizeClass = size === "large" ? "h-11 w-11" : "h-10 w-10";
  const iconClass = size === "large" ? "h-5 w-5" : "h-4 w-4";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-white/60",
        sizeClass,
      )}
    >
      {contact.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={contact.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : contact.recipientType === "service_provider" ||
        contact.role === "admin" ? (
        <Building2 className={iconClass} />
      ) : (
        <UserRound className={iconClass} />
      )}
    </div>
  );
}

function MessageStatus({ message }: { message: SupportMessageRecord }) {
  if (message.readAt) {
    return (
      <CheckCheck className="h-3.5 w-3.5 text-sky-400" aria-label="Read" />
    );
  }
  if (message.deliveredAt) {
    return <CheckCheck className="h-3.5 w-3.5" aria-label="Delivered" />;
  }
  return <Check className="h-3.5 w-3.5" aria-label="Sent" />;
}

function DateDivider({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 shadow-sm dark:bg-white/[0.07] dark:text-white/45">
        {formatDayLabel(value)}
      </span>
      <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

function AttachmentButton({
  attachment,
  outgoing,
}: {
  attachment: SupportMessageAttachmentRecord;
  outgoing: boolean;
}) {
  const download = async () => {
    const response = await fetch(attachment.fileUrl, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) return;
    const blobUrl = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = attachment.fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  return (
    <button
      type="button"
      onClick={() => void download()}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition",
        outgoing
          ? "border-white/15 bg-white/10 hover:bg-white/15 dark:border-slate-200 dark:bg-slate-100 dark:hover:bg-slate-200"
          : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]",
      )}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{attachment.fileName}</span>
      <span className="shrink-0 opacity-60">
        {formatFileSize(attachment.size)}
      </span>
    </button>
  );
}

function contactKey(contact: SupportContactRecord) {
  return contact.companyId
    ? `company:${contact.companyId}`
    : `user:${contact.userId}`;
}

function messagePreview(message?: SupportMessageRecord | null) {
  if (!message) return "Start a conversation";
  if (message.body) return message.body;
  if (message.attachments.length === 1) return message.attachments[0].fileName;
  if (message.attachments.length > 1) {
    return `${message.attachments.length} attachments`;
  }
  return "Message";
}

function dateKey(value: string) {
  return new Date(value).toDateString();
}

function formatDayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function formatListDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? formatTime(value)
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
