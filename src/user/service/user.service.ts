import { Injectable, forwardRef, Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { RefreshTokenService } from '../../auth/service/refresh-token.service';
import { BidRepository } from '../../bid/repository/bid.repository';
import { BusinessException } from '../../common/exceptions/business.exception';
import { StorageService } from '../../common/storage/service/storage.service';
import { ProductRepository } from '../../product/repository/product.repository';
import { WishRepository } from '../../wish/repository/wish.repository';

import { ChangePasswordRequest } from '../dto/change-password-request.dto';
import { PasswordVerifyRequest } from '../dto/password-verify-request.dto';
import { UpdateUserRequest } from '../dto/update-user-request.dto';
import { UserMeResponse } from '../dto/user-me-response.dto';
import { UserRepository } from '../repository/user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly productRepository: ProductRepository,
    private readonly bidRepository: BidRepository,
    private readonly wishRepository: WishRepository,
    @Inject(forwardRef(() => RefreshTokenService))
    private readonly refreshTokenService: RefreshTokenService,
    private readonly storageService: StorageService,
  ) {}

  async checkDuplicateEmail(email: string): Promise<void> {
    const exists = await this.userRepository.findByEmail(email);
    if (exists) {
      throw new BusinessException('DUPLICATE_EMAIL');
    }
  }

  async checkDuplicateName(name: string): Promise<void> {
    const exists = await this.userRepository.findByName(name);
    if (exists) {
      throw new BusinessException('DUPLICATE_NAME');
    }
  }

  async getMe(userId: number): Promise<UserMeResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }
    return UserMeResponse.from(user);
  }

  async updateProfileImage(
    userId: number,
    image: Express.Multer.File,
  ): Promise<UserMeResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    const oldImageUrl = user.profileImageUrl;
    const imageUrl = await this.storageService.upload(image);
    user.profileImageUrl = imageUrl;
    await this.userRepository.save(user);

    if (oldImageUrl) {
      this.storageService.delete(oldImageUrl).catch((err) => {
        console.error('Failed to delete old profile image', err);
      });
    }

    return UserMeResponse.from(user);
  }

  async deleteProfileImage(userId: number): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    if (!user.profileImageUrl) {
      throw new BusinessException('PROFILE_IMAGE_NOT_FOUND');
    }

    const oldImageUrl = user.profileImageUrl;
    user.profileImageUrl = null;
    await this.userRepository.save(user);

    this.storageService.delete(oldImageUrl).catch((err) => {
      console.error('Failed to delete profile image', err);
    });
  }

  async patchMe(
    userId: number,
    request: UpdateUserRequest,
  ): Promise<UserMeResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    if (request.name) {
      if (request.name !== user.name) {
        await this.checkDuplicateName(request.name);
        user.name = request.name;
      }
    }
    if (request.address) {
      user.address = request.address;
    }

    await this.userRepository.save(user);
    return UserMeResponse.from(user);
  }

  async verifyPassword(
    userId: number,
    request: PasswordVerifyRequest,
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(request.password, user.password);
    if (!isMatch) {
      throw new BusinessException('INVALID_PASSWORD');
    }
  }

  async changePassword(
    userId: number,
    request: ChangePasswordRequest,
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(
      request.currentPassword,
      user.password,
    );
    if (!isMatch) {
      throw new BusinessException('INVALID_PASSWORD');
    }

    user.password = await bcrypt.hash(request.newPassword, 10);
    await this.userRepository.save(user);
  }

  async deleteMe(userId: number, refreshToken: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    const existsActiveAuction =
      await this.productRepository.findOnSaleBySeller(userId);
    if (existsActiveAuction) {
      throw new BusinessException('HAS_ACTIVE_AUCTION');
    }

    const existsActiveBid = await this.bidRepository.findOnSaleByBidder(userId);
    if (existsActiveBid) {
      throw new BusinessException('HAS_ACTIVE_BID');
    }

    await this.wishRepository.deleteAllByUser(userId);

    await this.refreshTokenService.delete(refreshToken);

    if (user.profileImageUrl) {
      this.storageService.delete(user.profileImageUrl).catch((err) => {
        console.error('Failed to delete profile image on withdraw', err);
      });
    }

    user.withdraw();
    await this.userRepository.save(user);
  }
}
