import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';
import { ProductMediaType } from './product-media-type.enum';

@Entity({ name: 'product_media' })
export class ProductMedia {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'media_url', nullable: false })
  mediaUrl: string;

  @Column({
    type: 'enum',
    enum: ProductMediaType,
    nullable: false,
  })
  mediaType: ProductMediaType;

  static from(product: Product, mediaUrl: string, mediaType: ProductMediaType): ProductMedia {
    const pm = new ProductMedia();
    pm.product = product;
    pm.mediaUrl = mediaUrl;
    pm.mediaType = mediaType;
    return pm;
  }
}
