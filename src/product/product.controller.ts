import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/jwt/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  ProductCreateRequest,
  ProductListRequest,
  ProductUpdateRequest,
} from './dto/product.dto';

import { Inject, forwardRef } from '@nestjs/common';
import { AuctionCloseManager } from '../auction/auction-close.manager';

// 순환 참조 방지를 위해 AuctionCloseManager의 인터페이스를 명시하거나 forwardRef를 통해 임포트합니다.
@Controller('api/products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    @Inject(forwardRef(() => AuctionCloseManager))
    private readonly auctionCloseManager: AuctionCloseManager,
  ) {}

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files'))
  @Post()
  @HttpCode(201)
  async createProduct(
    @Body() request: ProductCreateRequest,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() sellerId: number,
  ) {
    const data = await this.productService.createProduct(sellerId, request, files);
    return {
      data,
      message: '상품이 등록되었습니다.',
    };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @HttpCode(200)
  async getProducts(
    @Query() request: ProductListRequest,
    @CurrentUser() userId: number | null,
  ) {
    const data = await this.productService.getProducts(userId, request);
    return {
      data,
      message: '상품 리스트를 조회했습니다.',
    };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':productId')
  @HttpCode(200)
  async getProduct(
    @Param('productId') productId: number,
    @CurrentUser() userId: number | null,
  ) {
    const data = await this.productService.getProductDetail(Number(productId), userId);
    return {
      data,
      message: '상품 상세 정보를 조회했습니다.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files'))
  @Patch(':productId')
  @HttpCode(200)
  async updateProduct(
    @Param('productId') productId: number,
    @Body() request: ProductUpdateRequest,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @CurrentUser() userId: number,
  ) {
    const data = await this.productService.updateProduct(Number(productId), userId, request, files);
    return {
      data,
      message: '상품 정보를 수정했습니다.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':productId')
  @HttpCode(200)
  async deleteProduct(
    @Param('productId') productId: number,
    @CurrentUser() userId: number,
  ) {
    const data = await this.productService.deleteProduct(Number(productId), userId);
    return {
      data,
      message: '상품을 삭제했습니다.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':productId/close')
  @HttpCode(200)
  async closeAuction(
    @Param('productId') productId: number,
    @CurrentUser() userId: number,
  ) {
    await this.auctionCloseManager.closeAuctionManually(Number(productId), userId);
    return {
      data: null,
      message: '경매가 마감되었습니다.',
    };
  }
}
