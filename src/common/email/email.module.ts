import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: () => ({
        transport: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false, // port 587은 STARTTLS를 사용하므로 secure: false로 지정
          auth: {
            user: process.env.MAIL_USERNAME || '',
            pass: process.env.MAIL_PASSWORD || '',
          },
          tls: {
            rejectUnauthorized: false,
          },
        },
        defaults: {
          from: `"BatChar" <${process.env.MAIL_USERNAME}>`,
        },
      }),
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
