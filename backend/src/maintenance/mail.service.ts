import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

type MailDeliveryResult = {
  mode: 'smtp' | 'development-preview';
  previewUrl?: string;
};

type PrimaryAdminChangeApprovalMail = {
  to: string;
  newAdminEmail: string;
  approvalUrl: string;
  expiresAt: Date;
};

type PrimaryAdminChangeCompletedMail = {
  to: string;
  previousAdminEmail: string;
  newAdminEmail: string;
  changedAt: Date;
};

@Injectable()
export class MaintenanceMailService {
  private readonly logger = new Logger(MaintenanceMailService.name);
  private transporter: Transporter | null = null;

  async sendPrimaryAdminChangeApprovalMail(
    payload: PrimaryAdminChangeApprovalMail,
  ): Promise<MailDeliveryResult> {
    const subject = 'EditorialHub: confirma el cambio de ADMIN principal';
    const text = [
      'Se solicito un cambio de ADMIN principal dentro de EditorialHub.',
      '',
      `Correo actual del ADMIN: ${payload.to}`,
      `Nuevo correo propuesto: ${payload.newAdminEmail}`,
      `Vence: ${payload.expiresAt.toISOString()}`,
      '',
      'Para aprobar el cambio, abre este enlace:',
      payload.approvalUrl,
    ].join('\n');

    return this.sendMailWithFallback(payload.to, subject, text, payload.approvalUrl);
  }

  async sendPrimaryAdminChangeCompletedMail(
    payload: PrimaryAdminChangeCompletedMail,
  ): Promise<MailDeliveryResult> {
    const subject = 'EditorialHub: cambio de ADMIN principal completado';
    const text = [
      'El cambio de ADMIN principal fue confirmado correctamente.',
      '',
      `Correo anterior: ${payload.previousAdminEmail}`,
      `Correo actual: ${payload.newAdminEmail}`,
      `Fecha del cambio: ${payload.changedAt.toISOString()}`,
    ].join('\n');

    return this.sendMailWithFallback(payload.to, subject, text);
  }

  private async sendMailWithFallback(
    to: string,
    subject: string,
    text: string,
    previewUrl?: string,
  ): Promise<MailDeliveryResult> {
    const transporter = this.getTransporter();

    if (!transporter) {
      this.logger.warn(
        `SMTP no configurado. Correo simulado para ${to}. Asunto: ${subject}.`,
      );
      this.logger.log(text);
      return {
        mode: 'development-preview',
        previewUrl,
      };
    }

    await transporter.sendMail({
      from: this.getFromAddress(),
      to,
      subject,
      text,
    });

    return {
      mode: 'smtp',
    };
  }

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST?.trim();
    const portValue = process.env.SMTP_PORT?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();

    if (!host || !portValue || !user || !pass) {
      return null;
    }

    const port = Number(portValue);

    this.transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    return this.transporter;
  }

  private getFromAddress() {
    return process.env.SMTP_FROM?.trim() || 'EditorialHub <no-reply@editorialhub.local>';
  }
}
