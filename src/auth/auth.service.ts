import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../user/entities/user.entity';
import { RefreshTokenService } from './refresh-token.service';
import { EmailService } from '../common/email/email.service';
import { BusinessException } from '../common/exceptions/business.exception';
import {
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  PasswordResetRequest,
  RefreshRequest,
  RefreshResponse,
} from './dto/auth.dto';

type AuthTokenPayload = {
  sub: string;
  tokenVersion?: number;
};

@Injectable()
export class AuthService {
  private static readonly ALPHANUMERIC =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  private static readonly TEMP_PASSWORD_LENGTH = 12;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly emailService: EmailService,
  ) {}

  async signup(request: SignupRequest): Promise<SignupResponse> {
    const { email, password, name, address } = request;

    // 1. 이메일 인증 여부 검증
    const isVerified = await this.emailService.isVerified(email);
    if (!isVerified) {
      throw new BusinessException('EMAIL_NOT_VERIFIED');
    }

    // 2. 이메일 중복 체크
    const existsEmail = await this.userRepository.findOne({ where: { email } });
    if (existsEmail) {
      throw new BusinessException('DUPLICATE_EMAIL');
    }

    // 3. 닉네임 중복 체크
    const existsName = await this.userRepository.findOne({ where: { name } });
    if (existsName) {
      throw new BusinessException('DUPLICATE_NAME');
    }

    // 4. 비밀번호 암호화 및 유저 저장
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User();
    user.email = email;
    user.password = hashedPassword;
    user.name = name;
    user.address = address;
    user.suspendedAt = null;
    user.suspendedUntil = null;
    user.withdrawnAt = null;
    user.isAdmin = false;
    user.tokenVersion = 0;

    await this.userRepository.save(user);

    // 5. 토큰 발급
    const userId = user.id;
    const accessToken = this.createAccessToken(user);
    const refreshToken = this.createRefreshToken(user);

    const refreshExpMs = parseInt(
      process.env.JWT_REFRESH_EXPIRATION || '1209600000',
      10,
    );
    await this.refreshTokenService.save(refreshToken, userId, refreshExpMs);

    // 6. 인증 정보 삭제
    await this.emailService.deleteVerified(email);

    return { userId, accessToken, refreshToken };
  }

  async login(request: LoginRequest): Promise<LoginResponse> {
    const { email, password } = request;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new BusinessException('INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new BusinessException('INVALID_CREDENTIALS');
    }

    this.assertUserCanAuthenticate(user);

    const userId = user.id;
    const accessToken = this.createAccessToken(user);
    const refreshToken = this.createRefreshToken(user);

    const refreshExpMs = parseInt(
      process.env.JWT_REFRESH_EXPIRATION || '1209600000',
      10,
    );
    await this.refreshTokenService.save(refreshToken, userId, refreshExpMs);

    return { userId, accessToken, refreshToken };
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      this.jwtService.verify(refreshToken);
    } catch {
      throw new BusinessException('INVALID_TOKEN');
    }
    await this.refreshTokenService.delete(refreshToken);
  }

  async resetPassword(request: PasswordResetRequest): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email: request.email },
    });
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    const tempPassword = this.generateTempPassword();
    user.password = await bcrypt.hash(tempPassword, 10);
    await this.userRepository.save(user);

    await this.emailService.sendTempPassword(user.email, tempPassword);
  }

  async refresh(request: RefreshRequest): Promise<RefreshResponse> {
    const token = request.refreshToken;
    let payload: AuthTokenPayload;
    try {
      payload = this.jwtService.verify<AuthTokenPayload>(token);
    } catch {
      throw new BusinessException('INVALID_TOKEN');
    }

    const userId = await this.refreshTokenService.getUserId(token);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }
    this.assertUserCanAuthenticate(user);
    if (payload.tokenVersion !== user.tokenVersion) {
      throw new BusinessException('INVALID_TOKEN');
    }

    const accessToken = this.createAccessToken(user);
    const refreshToken = this.createRefreshToken(user);

    const refreshExpMs = parseInt(
      process.env.JWT_REFRESH_EXPIRATION || '1209600000',
      10,
    );
    await this.refreshTokenService.delete(token);
    await this.refreshTokenService.save(refreshToken, userId, refreshExpMs);

    return { accessToken, refreshToken };
  }

  private createAccessToken(user: User): string {
    const expirationMs = parseInt(
      process.env.JWT_ACCESS_EXPIRATION || '1800000',
      10,
    );
    return this.jwtService.sign(
      { sub: String(user.id), tokenVersion: user.tokenVersion },
      { expiresIn: `${Math.floor(expirationMs / 1000)}s` },
    );
  }

  private createRefreshToken(user: User): string {
    const expirationMs = parseInt(
      process.env.JWT_REFRESH_EXPIRATION || '1209600000',
      10,
    );
    return this.jwtService.sign(
      { sub: String(user.id), tokenVersion: user.tokenVersion },
      { expiresIn: `${Math.floor(expirationMs / 1000)}s` },
    );
  }

  private assertUserCanAuthenticate(user: User): void {
    if (user.withdrawnAt) {
      throw new BusinessException('USER_SUSPENDED');
    }
    if (user.isSuspended()) {
      throw new BusinessException('USER_SUSPENDED', {
        suspended_until: user.suspendedUntil?.toISOString(),
        remaining_seconds: user.getSuspensionRemainingSeconds(),
      });
    }
  }

  private generateTempPassword(): string {
    let result = '';
    const charactersLength = AuthService.ALPHANUMERIC.length;
    for (let i = 0; i < AuthService.TEMP_PASSWORD_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * charactersLength);
      result += AuthService.ALPHANUMERIC.charAt(randomIndex);
    }
    return result;
  }
}
