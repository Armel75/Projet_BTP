import nodemailer from "nodemailer";
import { env } from '../config/env.js';

const transporter = nodemailer.createTransport({
  host: "192.168.0.247",
  port: 587,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

export const sendResetEmail = async (to: string, link: string) => {
  await transporter.sendMail({
    from: '"Support" <support@groupesorepco.com>',
    to,
    subject: "Réinitialisation du mot de passe",
    html: `<p>Réinitialisation du mot de passe</p><a href="${link}">Clique ici</a><p>Ce lien expire dans 15 minutes.</p>`,
  });
};
