import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wish } from './entities/wish.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../user/entities/user.entity';
import { Bid } from '../bid/entities/bid.entity';
import { ProductMediaService } from '../product/product-media.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { WishListRequest, WishSummary } from './dto/wish.dto';

@Injectable()
export class WishService {
  constructor(
    @InjectRepository(Wish)
    private readonly wishRepository: Repository<Wish>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Bid)
    private readonly bidRepository: Repository<Bid>,
    private readonly productMediaService: ProductMediaService,
  ) {}

  async addWish(productId: number, userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new BusinessException('PRODUCT_NOT_FOUND');
    }

    const exists = await this.wishRepository.findOne({
      where: { user: { id: userId }, product: { id: productId } },
    });
    if (exists) {
      throw new BusinessException('WISH_ALREADY_EXISTS');
    }

    const wish = Wish.create(user, product);
    await this.wishRepository.save(wish);
  }

  async removeWish(productId: number, userId: number): Promise<void> {
    const wish = await this.wishRepository.findOne({
      where: { user: { id: userId }, product: { id: productId } },
    });

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
    const wishes = await this.wishRepository.find({
      where: { user: { id: userId } },
      relations: { product: { seller: true } },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    const hasNext = wishes.length > size;
    const slicedWishes = hasNext ? wishes.slice(0, size) : wishes;

    const content: WishSummary[] = [];
    for (const wish of slicedWishes) {
      const mainImageUrl = await this.productMediaService.getFirstMediaUrl(
        wish.product.id,
      );
      const bidCountResult = await this.bidRepository
        .createQueryBuilder('bid')
        .select('COUNT(DISTINCT bid.bidder_id)', 'count')
        .where('bid.product_id = :productId', { productId: wish.product.id })
        .getRawOne<{ count: string }>();
      const bidCount = parseInt(bidCountResult?.count || '0', 10);

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
