/**
 * Core Integrations
 *
 * Provides AI, file upload, and email functionality using Supabase Edge Functions.
 */

import { functions, storage } from './supabaseClient';

/**
 * Invoke LLM (Claude/OpenAI) for text generation
 */
export const InvokeLLM = async ({ prompt, model = 'claude-3-sonnet', ...options }) => {
  return functions.invoke('invokeLLM', { prompt, model, ...options });
};

/**
 * Send email via Edge Function
 */
export const SendEmail = async ({ to, subject, body, html }) => {
  return functions.invoke('sendEmail', { to, subject, body, html });
};

/**
 * Upload file to Supabase Storage
 */
export const UploadFile = async ({ file, bucket = 'uploads', path }) => {
  const fileName = path || `${Date.now()}-${file.name}`;
  const { data, error } = await storage.upload(bucket, fileName, file);

  if (error) throw error;

  const publicUrl = storage.getPublicUrl(bucket, data.path);
  return { file_url: publicUrl, path: data.path };
};

/**
 * Generate image via Edge Function
 */
export const GenerateImage = async ({ prompt, size = '1024x1024' }) => {
  return functions.invoke('generateImage', { prompt, size });
};

/**
 * Extract data from uploaded file
 */
export const ExtractDataFromUploadedFile = async ({ file_url, type }) => {
  return functions.invoke('extractFileData', { file_url, type });
};

/**
 * Create signed URL for private file access
 */
export const CreateFileSignedUrl = async ({ bucket, path, expiresIn = 3600 }) => {
  return functions.invoke('createSignedUrl', { bucket, path, expiresIn });
};

/**
 * Upload private file to Supabase Storage
 */
export const UploadPrivateFile = async ({ file, bucket = 'private', path }) => {
  const fileName = path || `${Date.now()}-${file.name}`;
  const { data, error } = await storage.upload(bucket, fileName, file, {
    cacheControl: '3600',
    upsert: false
  });

  if (error) throw error;

  return { path: data.path };
};

// Core namespace for backwards compatibility
export const Core = {
  InvokeLLM,
  SendEmail,
  UploadFile,
  GenerateImage,
  ExtractDataFromUploadedFile,
  CreateFileSignedUrl,
  UploadPrivateFile
};

export default Core;
