import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { ProductStatus } from './product-status.enum';

@Entity({ name: 'products' })
export class Product extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'winner_id' })
  winner: User | null;

  @Column({ nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  description: string;

  @Column({ nullable: false })
  category: string;

  @Column({ name: 'start_price', type: 'bigint', nullable: false })
  startPrice: number;

  @Column({ name: 'current_price', type: 'bigint', nullable: false })
  currentPrice: number;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    nullable: false,
  })
  status: ProductStatus;

  @Column({ name: 'start_time', type: 'timestamp', nullable: false })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: false })
  endTime: Date;

  static create(
    seller: User,
    title: string,
    description: string,
    category: string,
    startPrice: number,
    endTime: Date,
  ): Product {
    const product = new Product();
    product.seller = seller;
    product.winner = null;
    product.title = title;
    product.description = description;
    product.category = category;
    product.startPrice = startPrice;
    product.currentPrice = startPrice;
    product.status = ProductStatus.ON_SALE;
    product.startTime = new Date();
    product.endTime = endTime;
    return product;
  }

  updateInfo(title?: string, description?: string, category?: string, endTime?: Date): void {
    if (title) this.title = title;
    if (description) this.description = description;
    if (category) this.category = category;
    if (endTime) this.endTime = endTime;
  }

  raisePriceTo(newPrice: number): void {
    this.currentPrice = newPrice;
  }

  isOnSale(): boolean {
    return this.status === ProductStatus.ON_SALE && this.endTime.getTime() > Date.now();
  }

  isSeller(userId: number): boolean {
    // Lazy 관계일 수도 있으므로 id 비교 시 seller 객체 및 id 확인
    return Number(this.seller.id) === Number(userId);
  }

  isValidBidPrice(bidPrice: number): boolean {
    return this.currentPrice < bidPrice;
  }

  closeAsFailed(): void {
    this.status = ProductStatus.FAILED;
  }

  closeWithWinner(winner: User): void {
    this.winner = winner;
    this.status = ProductStatus.ENDED;
  }

  isClosed(): boolean {
    return this.status !== ProductStatus.ON_SALE;
  }

  markAsTraded(): void {
    this.status = ProductStatus.TRADED;
  }
}
