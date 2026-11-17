import { Injectable } from '@nestjs/common';

import { BusinessException } from '../../../common/exceptions/business.exception';
import { BidRepository } from '../../bid/repository/bid.repository';
import { ProductRepository } from '../../product/repository/product.repository';
import { ProductMediaService } from '../../product/service/product-media.service';
import { UserRepository } from '../../user/repository/user.repository';

import { WishListRequest } from '../dto/wish-list-request.dto';
import { WishSummary } from '../dto/wish-summary.dto';
import { Wish } from '../entities/wish.entity';
import { WishRepository } from '../repository/wish.repository';

@Injectable()
export class WishService {
  constructor(
    private readonly wishRepository: WishRepository,
    private readonly productRepository: ProductRepository,
    private readonly userRepository: UserRepository,
    private readonly bidRepository: BidRepository,
    private readonly productMediaService: ProductMediaService,
  ) {}

  async addWish(productId: number, userId: number): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new BusinessException('PRODUCT_NOT_FOUND');
    }

    const exists = await this.wishRepository.findByUserAndProduct(
      userId,
      productId,
    );
    if (exists) {
      throw new BusinessException('WISH_ALREADY_EXISTS');
    }

    const wish = Wish.create(user, product);
    await this.wishRepository.save(wish);
  }

  async removeWish(productId: number, userId: number): Promise<void> {
    const wish = await this.wishRepository.findByUserAndProduct(
      userId,
      productId,
    );

    if (!wish) {
      throw new BusinessException('WISH_NOT_FOUND');
    }

    await this.wishRepository.remove(wish);
  }

  async getWishes(userId: number, request: WishListRequest) {
    const { page, size } = request;
    const skip = page * size;
    const take = size + 1;

    // JPA의 w.user.id = :userId ORDER BY w.createdAt DESC 와 FETCH JOIN 구현
    const wishes = await this.wishRepository.findPageByUserWithProduct(
      userId,
      skip,
      take,
    );

    const hasNext = wishes.length > size;
    const slicedWishes = hasNext ? wishes.slice(0, size) : wishes;

    const content: WishSummary[] = [];
    for (const wish of slicedWishes) {
      const mainImageUrl = await this.productMediaService.getFirstMediaUrl(
        wish.product.id,
      );
      const bidCount = await this.bidRepository.countDistinctBidders(
        wish.product.id,
      );

      content.push({
        id: wish.id,
        productId: wish.product.id,
        title: wish.product.title,
        startPrice: Number(wish.product.startPrice),
        currentPrice: Number(wish.product.currentPrice),
        status: wish.product.status,
        endTime: wish.product.endTime,
        mainImageUrl,
        bidCount,
      });
    }

    return {
      content,
      hasNext,
    };
  }
}
