import { Body, Controller, Header, Headers, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmailService } from '../common/email/email.service';
import {
  SignupRequest,
  LoginRequest,
  RefreshRequest,
  PasswordResetRequest,
  EmailVerifyCodeRequest,
  EmailVerifyRequest,
} from './dto/auth.dto';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
  ) {}

  @Post('signup')
  @HttpCode(201)
  async signup(@Body() request: SignupRequest) {
    const data = await this.authService.signup(request);
    return {
      data,
      message: '회원가입이 완료되었습니다.',
    };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() request: LoginRequest) {
    const data = await this.authService.login(request);
    return {
      data,
      message: '로그인이 완료되었습니다.',
    };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Headers('Refresh-Token') refreshToken: string) {
    await this.authService.logout(refreshToken);
    return {
      data: null,
      message: '로그아웃이 완료되었습니다.',
    };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() request: RefreshRequest) {
    const data = await this.authService.refresh(request);
    return {
      data,
      message: '액세스 토큰이 재발급되었습니다.',
    };
  }

  @Post('password/reset')
  @HttpCode(200)
  async resetPassword(@Body() request: PasswordResetRequest) {
    await this.authService.resetPassword(request);
    return {
      data: null,
      message: '임시 비밀번호가 이메일로 발송되었습니다.',
    };
  }

  @Post('email/send')
  @HttpCode(200)
  async sendEmailCode(@Body() request: EmailVerifyCodeRequest) {
    await this.emailService.sendEmailCode(request.email);
    return {
      data: null,
      message: '이메일 인증 코드를 보냈습니다.',
    };
  }

  @Post('email/verify')
  @HttpCode(200)
  async verifyEmailCode(@Body() request: EmailVerifyRequest) {
    await this.emailService.verifyEmailCode(request.email, request.code);
    return {
      data: { email: request.email },
      message: '이메일 인증에 성공했습니다.',
    };
  }
}
