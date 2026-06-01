import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Headers,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  UpdateUserRequest,
  PasswordVerifyRequest,
  ChangePasswordRequest,
} from './dto/user.dto';

@Controller('api/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('email/duplicate')
  @HttpCode(200)
  async checkDuplicateEmail(@Query('email') email: string) {
    await this.userService.checkDuplicateEmail(email);
    return {
      data: null,
      message: '사용 가능한 이메일입니다.',
    };
  }

  @Get('name/duplicate')
  @HttpCode(200)
  async checkDuplicateName(@Query('name') name: string) {
    await this.userService.checkDuplicateName(name);
    return {
      data: null,
      message: '사용 가능한 닉네임입니다.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(200)
  async getMe(@CurrentUser() userId: number) {
    const data = await this.userService.getMe(userId);
    return {
      data,
      message: '마이페이지 조회에 성공했습니다.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @Patch('me/profile-image')
  @HttpCode(200)
  async updateProfileImage(
    @CurrentUser() userId: number,
    @UploadedFile() image: Express.Multer.File,
  ) {
    const data = await this.userService.updateProfileImage(userId, image);
    return {
      data,
      message: '프로필 사진이 변경되었습니다.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/profile-image')
  @HttpCode(200)
  async deleteProfileImage(@CurrentUser() userId: number) {
    await this.userService.deleteProfileImage(userId);
    return {
      data: null,
      message: '프로필 사진이 삭제되었습니다.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @HttpCode(200)
  async patchMe(@CurrentUser() userId: number, @Body() request: UpdateUserRequest) {
    const data = await this.userService.patchMe(userId, request);
    return {
      data,
      message: '유저 정보가 수정되었습니다.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  @HttpCode(200)
  async deleteMe(
    @CurrentUser() userId: number,
    @Headers('Refresh-Token') refreshToken: string,
  ) {
    await this.userService.deleteMe(userId, refreshToken);
    return {
      data: null,
      message: '회원 탈퇴가 되었습니다.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/password/verify')
  @HttpCode(200)
  async verifyPassword(
    @CurrentUser() userId: number,
    @Body() request: PasswordVerifyRequest,
  ) {
    await this.userService.verifyPassword(userId, request);
    return {
      data: null,
      message: '비밀번호 검증에 성공했습니다.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  @HttpCode(200)
  async changePassword(
    @CurrentUser() userId: number,
    @Body() request: ChangePasswordRequest,
  ) {
    await this.userService.changePassword(userId, request);
    return {
      data: null,
      message: '비밀번호를 변경했습니다.',
    };
  }
}
