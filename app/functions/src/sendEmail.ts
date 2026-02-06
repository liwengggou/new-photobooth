/**
 * Email Sending Cloud Functions
 *
 * Sends email notifications when users submit feedback or contact messages.
 * Uses Nodemailer with Gmail SMTP.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

// Support email address
const SUPPORT_EMAIL = "liwengousuzhou@gmail.com";

// Create Nodemailer transporter using Gmail
// You need to set these environment variables in Firebase:
// firebase functions:config:set gmail.email="your-email@gmail.com" gmail.password="your-app-password"
const getTransporter = () => {
  const gmailEmail = functions.config().gmail?.email;
  const gmailPassword = functions.config().gmail?.password;

  if (!gmailEmail || !gmailPassword) {
    console.error("Gmail credentials not configured. Set them using:");
    console.error(
      'firebase functions:config:set gmail.email="your@gmail.com" gmail.password="your-app-password"'
    );
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailEmail,
      pass: gmailPassword,
    },
  });
};

/**
 * Cloud Function triggered when a new feedback document is created
 */
export const onFeedbackCreated = functions.firestore
  .document("feedback/{feedbackId}")
  .onCreate(async (snap, context) => {
    const feedback = snap.data();
    const feedbackId = context.params.feedbackId;

    console.log(`Processing feedback: ${feedbackId}`);

    const transporter = getTransporter();
    if (!transporter) {
      console.error("Email transporter not available");
      // Mark as failed to send
      await snap.ref.update({ emailSent: false, emailError: "Transporter not configured" });
      return;
    }

    // Build star rating display
    const rating = feedback.rating || 0;
    const stars = rating > 0 ? "⭐".repeat(rating) : "Not rated";

    // Build email content
    const mailOptions = {
      from: `Photobooth App <${functions.config().gmail?.email}>`,
      to: SUPPORT_EMAIL,
      subject: `[${feedback.feedbackType || "General"}] App Feedback`,
      html: `
        <h2>New Feedback Received</h2>
        <p><strong>Rating:</strong> ${stars}</p>
        <p><strong>Feedback Type:</strong> ${feedback.feedbackType || "General"}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p>${(feedback.message || "").replace(/\n/g, "<br>")}</p>
        <hr>
        <p><strong>User Details:</strong></p>
        <ul>
          <li>Name: ${feedback.userName || "Unknown"}</li>
          <li>Email: ${feedback.userEmail || "Unknown"}</li>
          <li>User ID: ${feedback.userId || "Unknown"}</li>
          <li>App Version: ${feedback.appVersion || "Unknown"}</li>
        </ul>
        <p><strong>Submitted:</strong> ${feedback.createdAt?.toDate?.() || new Date()}</p>
        <p><em>Feedback ID: ${feedbackId}</em></p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent for feedback: ${feedbackId}`);
      await snap.ref.update({ emailSent: true, emailSentAt: admin.firestore.FieldValue.serverTimestamp() });
    } catch (error) {
      console.error(`Failed to send email for feedback ${feedbackId}:`, error);
      await snap.ref.update({ emailSent: false, emailError: String(error) });
    }
  });

/**
 * Cloud Function triggered when a new contact message is created
 */
export const onContactMessageCreated = functions.firestore
  .document("contactMessages/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const messageId = context.params.messageId;

    console.log(`Processing contact message: ${messageId}`);

    const transporter = getTransporter();
    if (!transporter) {
      console.error("Email transporter not available");
      await snap.ref.update({ emailSent: false, emailError: "Transporter not configured" });
      return;
    }

    // Build email content
    const mailOptions = {
      from: `Photobooth App <${functions.config().gmail?.email}>`,
      to: SUPPORT_EMAIL,
      replyTo: message.userEmail || undefined,
      subject: message.subject || "Support Request",
      html: `
        <h2>New Contact Message</h2>
        <p><strong>Subject:</strong> ${message.subject || "No subject"}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p>${(message.message || "").replace(/\n/g, "<br>")}</p>
        <hr>
        <p><strong>User Details:</strong></p>
        <ul>
          <li>Name: ${message.userName || "Unknown"}</li>
          <li>Email: ${message.userEmail || "Unknown"}</li>
          <li>User ID: ${message.userId || "Unknown"}</li>
          <li>App Version: ${message.appVersion || "Unknown"}</li>
        </ul>
        <p><strong>Submitted:</strong> ${message.createdAt?.toDate?.() || new Date()}</p>
        <p><em>Message ID: ${messageId}</em></p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent for contact message: ${messageId}`);
      await snap.ref.update({ emailSent: true, emailSentAt: admin.firestore.FieldValue.serverTimestamp() });
    } catch (error) {
      console.error(`Failed to send email for contact message ${messageId}:`, error);
      await snap.ref.update({ emailSent: false, emailError: String(error) });
    }
  });
