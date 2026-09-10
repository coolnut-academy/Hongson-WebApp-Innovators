/**
 * Image Utilities (Client-Side Compression & Validation)
 * Resizes and optimizes uploaded images in the browser using HTML5 Canvas
 */

const ImageUtils = {
  // Allowed MIME types
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],

  /**
   * Validate uploaded file type and pre-compression size
   * @param {File} file
   * @returns {{ valid: boolean, error?: string }}
   */
  validateFile(file) {
    if (!file) {
      return { valid: false, error: 'กรุณาเลือกไฟล์รูปภาพ' };
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'รองรับเฉพาะไฟล์รูปภาพประเภท JPEG, PNG หรือ WEBP เท่านั้น'
      };
    }

    if (file.size > APP_CONFIG.IMAGE_MAX_FILE_SIZE_BYTES) {
      const sizeMB = (APP_CONFIG.IMAGE_MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
      return {
        valid: false,
        error: `ขนาดไฟล์ภาพต้องไม่เกิน ${sizeMB} MB ก่อนการประมวลผล`
      };
    }

    return { valid: true };
  },

  /**
   * Read file as data URL
   * @param {File} file
   * @returns {Promise<string>}
   */
  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
      reader.readAsDataURL(file);
    });
  },

  /**
   * Compress and resize an image file
   * Target: Max 1600x900, maintains aspect ratio, does not upscale smaller images
   * @param {File} file
   * @returns {Promise<{ dataUrl: string, base64: string, mimeType: string, width: number, height: number, originalSize: number, compressedSize: number }>}
   */
  async processCoverImage(file) {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const dataUrl = await this.readFileAsDataURL(file);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxWidth = APP_CONFIG.IMAGE_MAX_WIDTH || 1600;
          const maxHeight = APP_CONFIG.IMAGE_MAX_HEIGHT || 900;
          let { width, height } = img;

          // Scale down if dimensions exceed bounds, maintaining aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          // High quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Attempt WebP, fallback to JPEG
          let outputMime = 'image/webp';
          let outputDataUrl = canvas.toDataURL(outputMime, APP_CONFIG.IMAGE_OUTPUT_QUALITY || 0.85);

          // If browser doesn't support WebP export (returns image/png), fallback to jpeg
          if (!outputDataUrl.startsWith('data:image/webp')) {
            outputMime = 'image/jpeg';
            outputDataUrl = canvas.toDataURL(outputMime, APP_CONFIG.IMAGE_OUTPUT_QUALITY || 0.85);
          }

          // Extract pure Base64 content without data:*/*;base64, prefix
          const base64Index = outputDataUrl.indexOf(';base64,');
          const base64 = base64Index !== -1 ? outputDataUrl.substring(base64Index + 8) : '';
          
          // Estimate byte size from Base64
          const compressedSize = Math.round((base64.length * 3) / 4);

          resolve({
            dataUrl: outputDataUrl,
            base64,
            mimeType: outputMime,
            width,
            height,
            originalSize: file.size,
            compressedSize,
            name: file.name.replace(/\.[^/.]+$/, '') + (outputMime === 'image/webp' ? '.webp' : '.jpg')
          });
        } catch (err) {
          reject(new Error('เกิดข้อผิดพลาดในการปรับขนาดภาพ: ' + err.message));
        }
      };

      img.onerror = () => reject(new Error('ไม่สามารถโหลดรูปภาพเพื่อประมวลผลได้'));
      img.src = dataUrl;
    });
  }
};
