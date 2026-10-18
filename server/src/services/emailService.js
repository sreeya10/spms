import nodemailer from 'nodemailer';

export const sendInstitutionalEmail = async ({ to, subject, html, text }) => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;

  if (!user || !pass) {
    console.info(`[Email Simulated] To: ${to} | Subject: ${subject}`);
    return {
      success: true,
      simulated: true,
      message: 'SMTP credentials not configured. Email logged in console.'
    };
  }

  try {
    const transporter = nodemailer.createTransporter({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    const info = await transporter.sendMail({
      from: `"SPMS Academic Notice" <${user}>`,
      to,
      subject,
      text: text || subject,
      html
    });

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (err) {
    console.warn(`Email delivery failed to ${to}:`, err.message);
    return {
      success: false,
      error: err.message
    };
  }
};
