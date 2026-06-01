import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Product } from '../../product/entities/product.entity';
import { User } from '../../user/entities/user.entity';
import { BidStatus } from './bid-status.enum';

@Entity({ name: 'bids' })
export class Bid extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bidder_id' })
  bidder: User;

  @Column({ type: 'bigint', nullable: false })
  price: number;

  @Column({
    type: 'enum',
    enum: BidStatus,
    nullable: false,
  })
  status: BidStatus;

  static place(product: Product, bidder: User, price: number): Bid {
    const bid = new Bid();
    bid.product = product;
    bid.bidder = bidder;
    bid.price = price;
    bid.status = BidStatus.ACTIVE;
    return bid;
  }

  closeAsWon(): void {
    this.status = BidStatus.WON;
  }
}
