import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { RedisService } from '../redis/redis.service';
import { EmailTemplateBuilder } from './email-template.builder';
import { BusinessException } from '../exceptions/business.exception';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private static readonly VERIFY_PREFIX = 'email:verify:';
  private static readonly VERIFIED_PREFIX = 'email:verified:';
  private static readonly VALID_DOMAINS = new Set([
    'edu.hanbat.ac.kr',
    'o365.hanbat.ac.kr',
  ]);

  constructor(
    private readonly mailerService: MailerService,
    private readonly redisService: RedisService,
  ) {}

  async sendEmailCode(email: string): Promise<void> {
    const domain = email.split('@')[1];

    if (!domain || !EmailService.VALID_DOMAINS.has(domain)) {
      throw new BusinessException('INVALID_EMAIL_DOMAIN');
    }

    // 6자리 랜덤 인증 코드 생성
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Redis에 5분간 저장 (5분 = 300초)
    await this.redisService.set(
      EmailService.VERIFY_PREFIX + email,
      code,
      300,
    );

    await this.sendMail(
      email,
      '[BatChar] 이메일 인증 코드',
      EmailTemplateBuilder.buildVerificationEmail(code),
    );
  }

  async verifyEmailCode(email: string, code: string): Promise<void> {
    const savedCode = await this.redisService.get(EmailService.VERIFY_PREFIX + email);

    if (!savedCode || code !== savedCode) {
      throw new BusinessException('INVALID_VERIFICATION_CODE');
    }

    // 인증 완료 처리 - 10분간 보관 (10분 = 600초)
    await this.redisService.set(
      EmailService.VERIFIED_PREFIX + email,
      'true',
      600,
    );

    // 기존 발송된 인증코드는 제거
    await this.redisService.delete(EmailService.VERIFY_PREFIX + email);
  }

  async sendTempPassword(email: string, tempPassword: string): Promise<void> {
    await this.sendMail(
      email,
      '[BatChar] 임시 비밀번호 발급',
      EmailTemplateBuilder.buildTempPasswordEmail(tempPassword),
    );
  }

  async isVerified(email: string): Promise<boolean> {
    const verified = await this.redisService.get(EmailService.VERIFIED_PREFIX + email);
    return verified !== null;
  }

  async deleteVerified(email: string): Promise<void> {
    await this.redisService.delete(EmailService.VERIFIED_PREFIX + email);
  }

  private async sendMail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        html,
      });
    } catch (e) {
      this.logger.error(`Failed to send mail to ${to}`, e);
      throw new BusinessException('EMAIL_SEND_FAILED');
    }
  }
}
