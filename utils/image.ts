import * as FileSystem from 'expo-file-system';
import { projectId, publicAnonKey } from './supabase/info';

/**
 * Converts a local image URI to a Base64 string suitable for upload.
 * @param uri Local file URI
 * @returns Base64 string prefixed with data:image/jpeg;base64,
 */
export const convertImageToBase64 = async (uri: string): Promise<string> => {
    if (uri.startsWith('http')) {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                // Extract only the Base64 data part, ignoring the browser-detected MIME type
                const base64Data = result.split(',')[1];
                resolve(`data:image/jpeg;base64,${base64Data}`);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${base64}`;
};

/**
 * Uploads a base64 image to Supabase Storage via a server-side function.
 * @param base64 Base64 image data
 * @param fileName Desired filename
 * @param fileType MIME type (default: image/jpeg)
 * @returns Public URL of the uploaded image
 */
export const uploadImage = async (base64: string, fileName: string, fileType: string = 'image/jpeg'): Promise<string> => {
    const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/upload-image`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
                fileBase64: base64,
                fileName,
                fileType,
            }),
        }
    );

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Error uploading image:', errorData);
        throw new Error('이미지 업로드 실패');
    }

    const { publicUrl } = await response.json();
    return publicUrl;
};
