import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zyoppuozvvrltiqqfeel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b3BwdW96dnZybHRpcXFmZWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0NjMyMDAsImV4cCI6MjA1NDAzOTIwMH0.7qQgY7ZcQa0yJ3tZH-mNq4YfcPYl6JZwZQVeJmhIiZI'; // This is your anon public key

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Upload an image file to Supabase Storage
 * @param file - The file to upload
 * @param bucket - The storage bucket name (default: 'resident-ids')
 * @param folder - Optional folder path within the bucket
 * @returns The public URL of the uploaded file
 */
export const uploadImage = async (
  file: File,
  bucket: string = 'resident-ids',
  folder: string = ''
): Promise<string> => {
  try {
    // Generate unique filename with timestamp
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image to storage');
  }
};

/**
 * Delete an image from Supabase Storage using its URL
 * @param imageUrl - The public URL of the image
 * @param bucket - The storage bucket name (default: 'resident-ids')
 */
export const deleteImage = async (
  imageUrl: string,
  bucket: string = 'resident-ids'
): Promise<void> => {
  try {
    // Extract file path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split(`/storage/v1/object/public/${bucket}/`);
    
    if (pathParts.length < 2) {
      throw new Error('Invalid image URL format');
    }

    const filePath = pathParts[1];

    // Delete file from Supabase Storage
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw - allow operation to continue even if delete fails
  }
};

export default supabase;
