import "./load-env.mjs";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY?.trim();
const from = process.env.AUTH_EMAIL_FROM?.trim();
const to = process.env.EMAIL_TEST_TO?.trim();
const appUrl =
  process.env.APP_URL?.trim().replace(/\/+$/, "") || "https://off2zim.co.zw";

if (!apiKey) {
  throw new Error("RESEND_API_KEY is required.");
}

if (!from) {
  throw new Error("AUTH_EMAIL_FROM is required.");
}

if (!to) {
  throw new Error("EMAIL_TEST_TO is required.");
}

const resend = new Resend(apiKey);
const subject = process.env.EMAIL_TEST_SUBJECT?.trim() || "Off2Zim email test";

const result = await resend.emails.send({
  from,
  to,
  subject,
  html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2>Off2Zim email test</h2>
      <p>This confirms Resend is configured for Off2Zim staging.</p>
      <p><a href="${appUrl}">${appUrl}</a></p>
    </div>
  `,
});

console.log(
  JSON.stringify(
    {
      deliveredToProvider: Boolean(result.data?.id),
      id: result.data?.id || null,
      error: result.error?.message || null,
    },
    null,
    2,
  ),
);
