import { BusinessException } from '../../common/exceptions/business.exception';

export enum ProductMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'avi', 'webm']);

export function getProductMediaTypeFromFileName(fileName: string): ProductMediaType {
  if (!fileName) {
    throw new BusinessException('UNSUPPORTED_MEDIA_TYPE');
  }
  const ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) {
    return ProductMediaType.IMAGE;
  }
  if (VIDEO_EXTENSIONS.has(ext)) {
    return ProductMediaType.VIDEO;
  }
  throw new BusinessException('UNSUPPORTED_MEDIA_TYPE');
}
