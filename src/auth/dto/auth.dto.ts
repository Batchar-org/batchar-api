import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class SignupRequest {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 100)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;
}

export class SignupResponse {
  userId: number;

  accessToken: string;

  refreshToken: string;
}

export class LoginRequest {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class LoginResponse {
  userId: number;

  accessToken: string;

  refreshToken: string;
}

export class RefreshRequest {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class RefreshResponse {
  accessToken: string;

  refreshToken: string;
}

export class PasswordResetRequest {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class EmailVerifyCodeRequest {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class EmailVerifyRequest {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

export class EmailVerifyResponse {
  email: string;
}
