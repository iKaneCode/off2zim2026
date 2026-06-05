/**
 * Transactional email library for Off2Zim platform events.
 * Wraps Resend. All functions are fire-and-forget safe; they log on failure
 * but never throw, so a delivery problem never breaks the calling request.
 */
import { Resend } from "resend";

function getAppUrl() {
  return (
    process.env.APP_URL?.trim().replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}

function getFrom() {
  return (
    process.env.AUTH_EMAIL_FROM?.trim() ||
    "Off2Zim <no-reply@off2zim.co.zw>"
  );
}

function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  return key ? new Resend(key) : null;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const client = resend();
  const from = getFrom();
  if (!client || !from) {
    console.warn("[platform-email] Not configured; skipping:", subject, "->", to);
    return;
  }

  try {
    await client.emails.send({ from, to, subject, html });
  } catch (err) {
    console.error("[platform-email] Delivery failed:", subject, "->", to, err);
  }
}

function shell(body: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <tr>
          <td style="background:#111111;border-radius:24px 24px 0 0;padding:32px 40px 24px;border-bottom:1px solid rgba(255,255,255,0.08)">
            <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">Off2Zim</span>
          </td>
        </tr>
        <tr>
          <td style="background:#111111;padding:32px 40px">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="background:#111111;border-radius:0 0 24px 24px;padding:24px 40px 32px;border-top:1px solid rgba(255,255,255,0.08)">
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.3)">
              &copy; ${new Date().getFullYear()} Off2Zim &bull;
              <a href="${getAppUrl()}" style="color:rgba(255,255,255,0.4)">off2zim.co.zw</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#ff5630;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;font-size:14px;margin:8px 0">${label}</a>`;
}

function h2(text: string) {
  return `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#ffffff">${text}</h2>`;
}

function p(text: string) {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.65)">${text}</p>`;
}

function detail(label: string, value: string) {
  return `
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:rgba(255,255,255,0.4)">${label}</td>
      <td style="padding:8px 12px;font-size:13px;color:rgba(255,255,255,0.8);font-weight:500">${value}</td>
    </tr>`;
}

function detailTable(rows: string[]) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;margin:20px 0;overflow:hidden">
      ${rows.join("")}
    </table>`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function sendBookingConfirmation(opts: {
  to: string;
  explorerName: string;
  confirmationNumber: string;
  listingTitle: string;
  providerName: string;
  totalAmount: number;
  currency: string;
  checkIn?: string | null;
  bookingsUrl?: string;
}) {
  const url = opts.bookingsUrl ?? `${getAppUrl()}/bookings`;
  await send(
    opts.to,
    `Booking confirmed - ${opts.confirmationNumber}`,
    shell(`
      ${h2("Your booking is confirmed!")}
      ${p(`Hi ${opts.explorerName}, your booking has been confirmed. Here are the details:`)}
      ${detailTable([
        detail("Confirmation", opts.confirmationNumber),
        detail("Experience", opts.listingTitle),
        detail("Provider", opts.providerName),
        detail("Total", `${opts.currency} ${opts.totalAmount.toFixed(2)}`),
        ...(opts.checkIn ? [detail("Date", formatDate(opts.checkIn))] : []),
      ])}
      ${p("You can view and manage this booking from your bookings page.")}
      ${btn(url, "View booking")}
    `),
  );
}

export async function sendProviderNewBookingAlert(opts: {
  to: string;
  providerName: string;
  confirmationNumber: string;
  listingTitle: string;
  explorerName: string;
  guests: number;
  totalAmount: number;
  currency: string;
  checkIn?: string | null;
  dashboardUrl?: string;
}) {
  const url =
    opts.dashboardUrl ?? `${getAppUrl()}/provider-dashboard?tab=orders`;
  await send(
    opts.to,
    `New booking request - ${opts.confirmationNumber}`,
    shell(`
      ${h2("You have a new booking request")}
      ${p(`Hi ${opts.providerName}, a new booking has been submitted for your listing.`)}
      ${detailTable([
        detail("Confirmation", opts.confirmationNumber),
        detail("Listing", opts.listingTitle),
        detail("Explorer", opts.explorerName),
        detail("Guests", String(opts.guests)),
        detail("Total", `${opts.currency} ${opts.totalAmount.toFixed(2)}`),
        ...(opts.checkIn ? [detail("Date", formatDate(opts.checkIn))] : []),
      ])}
      ${p("Please confirm or decline this booking from your dashboard.")}
      ${btn(url, "Review booking")}
    `),
  );
}

export async function sendBookingStatusUpdate(opts: {
  to: string;
  explorerName: string;
  confirmationNumber: string;
  listingTitle: string;
  newStatus: string;
  bookingsUrl?: string;
}) {
  const statusLabels: Record<string, string> = {
    CONFIRMED: "confirmed",
    CANCELLED: "cancelled",
    COMPLETED: "completed",
  };
  const label = statusLabels[opts.newStatus] ?? opts.newStatus.toLowerCase();
  const url = opts.bookingsUrl ?? `${getAppUrl()}/bookings`;

  await send(
    opts.to,
    `Booking ${label} - ${opts.confirmationNumber}`,
    shell(`
      ${h2(`Your booking has been ${label}`)}
      ${p(`Hi ${opts.explorerName}, your booking <strong style="color:#fff">${opts.confirmationNumber}</strong> for <strong style="color:#fff">${opts.listingTitle}</strong> has been ${label}.`)}
      ${opts.newStatus === "COMPLETED" ? p("You can now rate your experience. Ratings are blind until both parties submit or 7 days pass.") : ""}
      ${btn(url, "View booking")}
    `),
  );
}

export async function sendDisputeOpenedNotification(opts: {
  to: string;
  recipientName: string;
  confirmationNumber: string;
  reason: string;
  role: "explorer" | "provider";
}) {
  const dashPath =
    opts.role === "provider" ? "/provider-dashboard?tab=orders" : "/bookings";
  const url = `${getAppUrl()}${dashPath}`;

  await send(
    opts.to,
    `Dispute opened - ${opts.confirmationNumber}`,
    shell(`
      ${h2("A dispute has been opened")}
      ${p(`Hi ${opts.recipientName}, a dispute has been filed against booking <strong style="color:#fff">${opts.confirmationNumber}</strong>.`)}
      ${detailTable([
        detail("Reason", opts.reason),
        detail("Booking", opts.confirmationNumber),
      ])}
      ${p("Our team will review this and be in touch. Please ensure any relevant evidence is available.")}
      ${btn(url, "View booking")}
    `),
  );
}

export async function sendPayoutRequestReceived(opts: {
  to: string;
  providerName: string;
  amount: number;
  currency: string;
  method: string;
  dashboardUrl?: string;
}) {
  const url =
    opts.dashboardUrl ?? `${getAppUrl()}/provider-dashboard?tab=subscriptions`;
  await send(
    opts.to,
    "Payout request received",
    shell(`
      ${h2("Your payout request is being processed")}
      ${p(`Hi ${opts.providerName}, we have received your payout request.`)}
      ${detailTable([
        detail("Amount", `${opts.currency} ${opts.amount.toFixed(2)}`),
        detail("Method", opts.method),
        detail("Status", "Under review"),
      ])}
      ${p("Payouts are typically processed within 3-5 business days. You will receive another email once it has been sent.")}
      ${btn(url, "View earnings")}
    `),
  );
}

export async function sendPayoutProcessed(opts: {
  to: string;
  providerName: string;
  amount: number;
  currency: string;
  status: "completed" | "failed";
  reference?: string | null;
}) {
  const isOk = opts.status === "completed";
  const url = `${getAppUrl()}/provider-dashboard?tab=subscriptions`;

  await send(
    opts.to,
    isOk ? "Payout sent" : "Payout failed",
    shell(`
      ${h2(isOk ? "Your payout has been sent" : "Your payout could not be processed")}
      ${p(`Hi ${opts.providerName}, ${isOk ? "your payout has been successfully sent." : "unfortunately your payout could not be processed. Please update your payment details and request again."}`)}
      ${detailTable([
        detail("Amount", `${opts.currency} ${opts.amount.toFixed(2)}`),
        detail("Status", isOk ? "Sent" : "Failed"),
        ...(opts.reference ? [detail("Reference", opts.reference)] : []),
      ])}
      ${btn(url, "View earnings")}
    `),
  );
}

export async function sendRatingsRevealed(opts: {
  to: string;
  recipientName: string;
  confirmationNumber: string;
  bookingsUrl?: string;
}) {
  const url = opts.bookingsUrl ?? `${getAppUrl()}/bookings`;
  await send(
    opts.to,
    `Ratings revealed - ${opts.confirmationNumber}`,
    shell(`
      ${h2("Your ratings have been revealed")}
      ${p(`Hi ${opts.recipientName}, the blind rating period for booking <strong style="color:#fff">${opts.confirmationNumber}</strong> has ended and both ratings are now visible.`)}
      ${btn(url, "View ratings")}
    `),
  );
}
