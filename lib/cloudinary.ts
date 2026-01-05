import { v2 as cloudinary } from 'cloudinary';

// Configuração do Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

/**
 * Faz upload de uma imagem para o Cloudinary
 * @param file - Arquivo base64 ou buffer
 * @param folder - Pasta no Cloudinary (ex: 'juntin/avatars')
 * @returns URL da imagem uploadada
 */
export async function uploadImage(file: string, folder: string = 'juntin/avatars'): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    return result.secure_url;
  } catch (error) {
    console.error('Erro ao fazer upload no Cloudinary:', error);
    throw new Error('Falha no upload da imagem');
  }
}

/**
 * Deleta uma imagem do Cloudinary pelo public_id
 * @param publicId - ID público da imagem no Cloudinary
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Erro ao deletar imagem do Cloudinary:', error);
  }
}

/**
 * Extrai o public_id de uma URL do Cloudinary
 * @param url - URL completa da imagem
 * @returns public_id da imagem
 */
export function extractPublicId(url: string): string | null {
  try {
    const match = url.match(/\/v\d+\/(.+)\.\w+$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
