const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create Gmail transporter using App Password
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // use TLS (STARTTLS on port 587)
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_EMAIL;
  const fromName  = process.env.FROM_NAME  || 'DAAR Real Estate';

  // Build headers that improve inbox deliverability (reduce spam score)
  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    // Proper Reply-To so it doesn't look like a no-reply bot
    replyTo: `"${fromName} Support" <${fromEmail}>`,
    // Headers that reduce spam score
    headers: {
      // Human-initiated transactional email, not bulk/marketing
      'X-Mailer': `${fromName} Mailer`,
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high',
      // Mark as transactional (NOT bulk) — Gmail respects this
      'Precedence': 'transactional',
      // Unsubscribe header required by Gmail bulk sender rules (good practice)
      'List-Unsubscribe': `<mailto:${fromEmail}?subject=unsubscribe>`,
    },
    ...(options.html ? { html: options.html } : {}),
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('✅ Email sent:', info.messageId, '→', options.email);
  return info;
};

module.exports = sendEmail;
