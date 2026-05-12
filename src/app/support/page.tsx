"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  Mail,
  Phone,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "How do I cancel or modify a booking?",
    a: "Go to your Bookings page, select the booking, and choose 'Cancel' or 'Modify'. Cancellation policies vary by provider — check the listing for details before booking.",
  },
  {
    q: "When will I receive my refund?",
    a: "Refunds are processed within 3–7 business days after cancellation is approved. The exact time depends on your bank or mobile money provider.",
  },
  {
    q: "How do I become a verified provider?",
    a: "Visit your Provider Dashboard and open the Verification tab. Upload the required business documents — our team reviews submissions within 48 hours.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept EcoCash, OneMoney, Telecash, and major credit/debit cards through our secure payment gateway.",
  },
  {
    q: "How do I report a problem with a listing?",
    a: "On the listing detail page, click the flag icon to report an issue. You can also describe the problem in the form below and our team will investigate.",
  },
  {
    q: "How do Community Guides get selected?",
    a: "Guides apply through the community programme, are vetted by our team for local knowledge and responsiveness, and earn a verified badge after review.",
  },
];

const CONTACT_CHANNELS = [
  {
    icon: Mail,
    label: "Email support",
    value: "support@off2zim.com",
    href: "mailto:support@off2zim.com",
    availability: "Response within 24 hours",
    accent: "text-[#8dc9ff]",
    bg: "bg-[#13283a]",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+263 78 111 4400",
    href: "tel:+263781114400",
    availability: "Mon–Fri 8 am – 6 pm CAT",
    accent: "text-[#4ade80]",
    bg: "bg-[#0f2a1e]",
  },
  {
    icon: MessageCircle,
    label: "Live chat",
    value: "Start a conversation",
    href: "#chat",
    availability: "Available now",
    accent: "text-[#c4b5fd]",
    bg: "bg-[#2d1f38]",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[18px] border border-white/[0.07] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="theme-heading text-sm font-medium">{q}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-white/40" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-white/40" />
        )}
      </button>
      {open && (
        <div className="border-t border-white/[0.07] px-5 py-4">
          <p className="theme-muted text-sm leading-6">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="theme-page min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#8dc9ff]/25 bg-[#13283a] px-4 py-2 text-sm font-medium text-[#8dc9ff]">
            <MessageCircle className="h-4 w-4" />
            Help &amp; Support
          </div>
          <h1 className="theme-heading mt-4 text-4xl font-semibold">How can we help?</h1>
          <p className="theme-muted mt-2 text-sm leading-6 max-w-xl">
            Browse common questions or contact us directly. We are here to help with bookings, provider support, and trip planning.
          </p>
        </div>

        {/* Contact channels */}
        <div className="grid gap-4 md:grid-cols-3 mb-10">
          {CONTACT_CHANNELS.map((ch) => {
            const Icon = ch.icon;
            return (
              <a
                key={ch.label}
                href={ch.href}
                className="theme-panel group rounded-[24px] p-5 transition hover:shadow-lg"
              >
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full ${ch.bg}`}>
                  <Icon className={`h-5 w-5 ${ch.accent}`} />
                </div>
                <p className="theme-subtle text-xs uppercase tracking-wide mb-1">{ch.label}</p>
                <p className="theme-heading text-sm font-semibold">{ch.value}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-white/40">
                  <Clock className="h-3 w-3" />
                  {ch.availability}
                </div>
              </a>
            );
          })}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          {/* FAQ */}
          <div>
            <h2 className="theme-heading text-xl font-semibold mb-4">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {FAQ_ITEMS.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
            <div className="mt-5">
              <Link
                href="/ask-a-local"
                className="inline-flex items-center gap-2 text-sm text-[#ff7352] hover:underline"
              >
                Ask a Community Guide instead
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Contact form */}
          <div>
            <h2 className="theme-heading text-xl font-semibold mb-4">Send a message</h2>
            {submitted ? (
              <div className="theme-panel rounded-[24px] p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#0f2a1e]">
                  <Mail className="h-6 w-6 text-[#4ade80]" />
                </div>
                <h3 className="theme-heading font-semibold">Message received</h3>
                <p className="theme-muted mt-2 text-sm leading-6">
                  We will get back to you within 24 hours. Check your inbox for a confirmation.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setFormData({ name: "", email: "", subject: "", message: "" }); }}
                  className="mt-5 rounded-full border border-white/10 px-5 py-2 text-sm theme-muted hover:bg-white/[0.05] transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="theme-panel rounded-[24px] p-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs theme-subtle mb-1.5">Name</label>
                    <input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      className="theme-input w-full rounded-[12px] px-4 py-2.5 text-sm"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs theme-subtle mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      className="theme-input w-full rounded-[12px] px-4 py-2.5 text-sm"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs theme-subtle mb-1.5">Subject</label>
                  <input
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
                    className="theme-input w-full rounded-[12px] px-4 py-2.5 text-sm"
                    placeholder="Briefly describe your issue"
                  />
                </div>
                <div>
                  <label className="block text-xs theme-subtle mb-1.5">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                    className="theme-input w-full rounded-[12px] px-4 py-2.5 text-sm resize-none"
                    placeholder="Describe what happened and how we can help..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-full bg-[#ff5630] px-6 py-3 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors"
                >
                  Send message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
