import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { User } from '../entities/user.entity';

export class UserMeResponse {
  id: number;

  email: string;

  name: string;

  address: string;

  profileImageUrl: string | null;

  static from(user: User): UserMeResponse {
    const res = new UserMeResponse();
    res.id = user.id;
    res.email = user.email;
    res.name = user.name;
    res.address = user.address;
    res.profileImageUrl = user.profileImageUrl;
    return res;
  }
}

export class UpdateUserRequest {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  address?: string;
}

export class PasswordVerifyRequest {
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ChangePasswordRequest {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 100)
  newPassword: string;
}
