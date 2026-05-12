import { BookingConfirmation } from "@/types/payment";

interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private static async sendEmail(template: EmailTemplate): Promise<boolean> {
    console.log("Sending email:", {
      to: template.to,
      subject: template.subject,
    });

    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 1000);
    });
  }

  static async sendBookingConfirmation(
    booking: BookingConfirmation
  ): Promise<boolean> {
    const customerName = booking.customerInfo?.name || "Valued Guest";
    const customerEmail = booking.customerInfo?.email;

    if (!customerEmail) {
      console.error("No customer email provided for booking confirmation");
      return false;
    }

    const template: EmailTemplate = {
      to: customerEmail,
      subject: `🇿🇼 Your Zimbabwe Adventure is Confirmed! - ${booking.confirmationNumber}`,
      text: `Dear ${customerName}, your booking ${booking.confirmationNumber} is confirmed!`,
      html: `<h1>Booking Confirmed!</h1><p>Dear ${customerName}, your booking ${booking.confirmationNumber} is confirmed!</p>`,
    };

    try {
      const success = await this.sendEmail(template);
      if (success) {
        console.log(`Booking confirmation email sent to ${customerEmail}`);
      }
      return success;
    } catch (error) {
      console.error("Failed to send booking confirmation email:", error);
      return false;
    }
  }

  static async sendMobileMoneyConfirmation(
    booking: BookingConfirmation,
    mobileProvider: string,
    phoneNumber: string,
    transactionId: string
  ): Promise<boolean> {
    const customerName = booking.customerInfo?.name || "Valued Guest";
    const customerEmail = booking.customerInfo?.email;

    if (!customerEmail) {
      console.error("No customer email provided for mobile money confirmation");
      return false;
    }

    const providerNames = {
      ecocash: "EcoCash",
      onemoney: "OneMoney",
      telecash: "TeleCash",
    };

    const providerName =
      providerNames[mobileProvider as keyof typeof providerNames] ||
      mobileProvider;

    const template: EmailTemplate = {
      to: customerEmail,
      subject: `🇿🇼 ${providerName} Payment Confirmed - Off2Zim`,
      text: `Dear ${customerName}, your ${providerName} payment for booking ${booking.confirmationNumber} has been confirmed. Reference: ${transactionId}. Phone: ${phoneNumber}.`,
      html: `<h1>Payment Confirmed!</h1><p>Dear ${customerName}, your ${providerName} payment for booking ${booking.confirmationNumber} has been confirmed.</p><p>Reference: ${transactionId}</p><p>Phone: ${phoneNumber}</p>`,
    };

    return await this.sendEmail(template);
  }
}
