import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zyoppuozvvrltiqqfeel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b3BwdW96dnZybHRpcXFmZWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDk4MzcsImV4cCI6MjA4NTU4NTgzN30.fLP7qknHcI5OlYM8NA-Bn_426BrMBO9AFYo9PcEhv2s'; // ✅ Updated!

export const supabase = createClient(supabaseUrl, supabaseKey);

export const uploadImage = async (
  file: File,
  bucket: string = 'resident-ids',
  folder: string = ''
): Promise<string> => {
  try {
    console.log('🔍 Upload attempt:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      bucket,
      folder
    });

    if (!file) {
      throw new Error('No file provided');
    }

    if (file.size === 0) {
      throw new Error('File is empty');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size exceeds 5MB limit');
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    console.log('📁 Upload path:', filePath);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      console.error('Error details:', {
        message: error.message,
        statusCode: error.statusCode
      });
      throw new Error(`Upload failed: ${error.message}`);
    }

    console.log('✅ Upload successful:', data);

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      throw new Error('Failed to generate public URL');
    }

    console.log('🔗 Public URL:', urlData.publicUrl);
    return urlData.publicUrl;

  } catch (error: any) {
    console.error('💥 Error uploading image:', error);
    throw new Error(error.message || 'Failed to upload image to storage');
  }
};

export const deleteImage = async (
  imageUrl: string,
  bucket: string = 'resident-ids'
): Promise<void> => {
  try {
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split(`/storage/v1/object/public/${bucket}/`);
    
    if (pathParts.length < 2) {
      console.warn('Invalid image URL format, skipping delete');
      return;
    }

    const filePath = pathParts[1];
    console.log('🗑️ Deleting file:', filePath);

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }

    console.log('✅ File deleted successfully');
  } catch (error) {
    console.error('Error deleting image:', error);
  }
};

export default supabase;