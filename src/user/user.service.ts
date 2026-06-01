import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Product } from '../product/entities/product.entity';
import { ProductStatus } from '../product/entities/product-status.enum';
import { Bid } from '../bid/entities/bid.entity';
import { Wish } from '../wish/entities/wish.entity';
import { RefreshTokenService } from '../auth/refresh-token.service';
import { StorageService } from '../common/storage/storage.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { UserMeResponse, UpdateUserRequest, PasswordVerifyRequest, ChangePasswordRequest } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Bid)
    private readonly bidRepository: Repository<Bid>,
    @InjectRepository(Wish)
    private readonly wishRepository: Repository<Wish>,
    @Inject(forwardRef(() => RefreshTokenService))
    private readonly refreshTokenService: RefreshTokenService,
    private readonly storageService: StorageService,
  ) {}

  async checkDuplicateEmail(email: string): Promise<void> {
    const exists = await this.userRepository.findOne({ where: { email } });
    if (exists) {
      throw new BusinessException('DUPLICATE_EMAIL');
    }
  }

  async checkDuplicateName(name: string): Promise<void> {
    const exists = await this.userRepository.findOne({ where: { name } });
    if (exists) {
      throw new BusinessException('DUPLICATE_NAME');
    }
  }

  async getMe(userId: number): Promise<UserMeResponse> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }
    return UserMeResponse.from(user);
  }

  async updateProfileImage(userId: number, image: Express.Multer.File): Promise<UserMeResponse> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
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
    const user = await this.userRepository.findOne({ where: { id: userId } });
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

  async patchMe(userId: number, request: UpdateUserRequest): Promise<UserMeResponse> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
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

  async verifyPassword(userId: number, request: PasswordVerifyRequest): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(request.password, user.password);
    if (!isMatch) {
      throw new BusinessException('INVALID_PASSWORD');
    }
  }

  async changePassword(userId: number, request: ChangePasswordRequest): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(request.currentPassword, user.password);
    if (!isMatch) {
      throw new BusinessException('INVALID_PASSWORD');
    }

    user.password = await bcrypt.hash(request.newPassword, 10);
    await this.userRepository.save(user);
  }

  async deleteMe(userId: number, refreshToken: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    const existsActiveAuction = await this.productRepository.findOne({
      where: { seller: { id: userId }, status: ProductStatus.ON_SALE },
    });
    if (existsActiveAuction) {
      throw new BusinessException('HAS_ACTIVE_AUCTION');
    }

    const existsActiveBid = await this.bidRepository.findOne({
      where: { bidder: { id: userId }, product: { status: ProductStatus.ON_SALE } },
    });
    if (existsActiveBid) {
      throw new BusinessException('HAS_ACTIVE_BID');
    }

    await this.wishRepository.delete({ user: { id: userId } });

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
