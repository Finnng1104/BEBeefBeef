import cloudinary from '../config/cloudinary';

type UploadResult = {
  url: string;
};

const UploadImage = async (file: Express.Multer.File, folder: string): Promise<UploadResult> => {
  return new Promise<UploadResult>((resolve, reject) => {
    const timestamp = Date.now();

    cloudinary.uploader
      .upload_stream(
        {
          resource_type: 'auto',
          folder: folder,
          use_filename: false,
          public_id: `${folder}/${timestamp}`,
        },
        (error, result) => {
          if (error || !result) {
            console.error('Error uploading image to Cloudinary:', error);
            return reject(new Error('Failed to upload image'));
          }

          resolve({
            url: result.secure_url,
          });
        },
      )
      .end(file.buffer);
  });
};

export const DeleteImage = async (public_id: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(public_id);
    console.log(`Deleted image with public_id: ${public_id}`);
  } catch (error) {
    console.error(`Failed to delete image with public_id: ${public_id}`, error);
    throw error;
  }
};

async function deleteImages(images: (string | { url: string; public_id: string })[]) {
  await Promise.all(
    images.map((img) => {
      if (typeof img === 'string') {
        const publicId = extractPublicIdFromUrl(img);
        if (!publicId) {
          console.warn('Cannot extract public_id from URL:', img);
          return Promise.resolve(); // bỏ qua nếu không trích xuất được public_id
        }
        return DeleteImage(publicId);
      } else if (img.public_id) {
        return DeleteImage(img.public_id); // Xóa ảnh nếu public_id có sẵn
      } else {
        console.warn('Image object missing public_id:', img);
        return Promise.resolve(); // Bỏ qua ảnh nếu thiếu public_id
      }
    }),
  );
}

function extractPublicIdFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/');
    const uploadIndex = parts.findIndex((part) => part === 'upload');

    if (uploadIndex === -1) return '';
    const afterUpload = parts.slice(uploadIndex + 1);

    if (afterUpload.length === 0) return '';

    let publicIdParts = afterUpload;
    if (afterUpload[0].startsWith('v') && !isNaN(Number(afterUpload[0].slice(1)))) {
      publicIdParts = afterUpload.slice(1);
    }

    const publicIdWithExt = publicIdParts.join('/');

    const lastDotIndex = publicIdWithExt.lastIndexOf('.');
    if (lastDotIndex === -1) return publicIdWithExt;

    return publicIdWithExt.substring(0, lastDotIndex);
  } catch (error) {
    console.error('Invalid URL:', url, error);
    return '';
  }
}

export default { UploadImage, deleteImages, DeleteImage, extractPublicIdFromUrl };
