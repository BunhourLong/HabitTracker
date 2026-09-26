// Client-side avatar checks. These are for UX (fast, friendly feedback), not
// security: file.type and file.size come from the browser and a hostile client
// can skip this code entirely. The bucket's size/MIME limits and the storage
// policies in supabase/05_storage_avatars.sql are what actually protect the data.

export const MAX_AVATAR_BYTES = 1024 * 1024 // 1 MB, same as the bucket's file_size_limit

// Raster formats only. SVG is left out on purpose: it can carry <script>.
export const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

const formatMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

// Returns an error message, or null when the file is OK to preview and upload.
export function validateAvatar(file) {
  if (!file) return 'Choose an image to upload.'

  // An empty file would upload fine but render as a broken image.
  if (file.size === 0) return `"${file.name}" is empty.`

  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    const got = file.type || 'an unknown type'
    return `"${file.name}" is ${got}. Please choose a PNG, JPEG, WebP or GIF image.`
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return `"${file.name}" is ${formatMB(file.size)}. The maximum is ${formatMB(MAX_AVATAR_BYTES)}.`
  }

  return null
}
