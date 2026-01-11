import { db } from './supabaseClient';




export const Core = db.integrations.Core;

export const InvokeLLM = db.integrations.Core.InvokeLLM;

export const SendEmail = db.integrations.Core.SendEmail;

export const UploadFile = db.integrations.Core.UploadFile;

export const GenerateImage = db.integrations.Core.GenerateImage;

export const ExtractDataFromUploadedFile = db.integrations.Core.ExtractDataFromUploadedFile;

export const CreateFileSignedUrl = db.integrations.Core.CreateFileSignedUrl;

export const UploadPrivateFile = db.integrations.Core.UploadPrivateFile;






