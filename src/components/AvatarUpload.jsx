import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { ALLOWED_AVATAR_TYPES, validateAvatar } from '../lib/validateAvatar'
import { crashTest } from '../lib/crashTest'
import Avatar from './Avatar'

// Choose → validate → preview → upload (upsert) → save public URL to profiles.avatar_url.
export default function AvatarUpload({ avatarUrl, onUploaded }) {
  crashTest('avatar')
  const { user } = useAuth()
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)

  // Free the previous object URL whenever the preview changes or we unmount.
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  function clear() {
    setFile(null)
    setPreview(null)
    // Reset the input so choosing the same file again still fires onChange.
    if (inputRef.current) inputRef.current.value = ''
  }

  function choose(e) {
    const picked = e.target.files?.[0] ?? null
    setSaved(false)
    const problem = validateAvatar(picked)
    if (problem) {
      clear()
      setError(problem)
      return
    }
    setError('')
    setFile(picked)
    setPreview(URL.createObjectURL(picked))
  }

  // The type said "image" but the browser can't decode it (e.g. a renamed .txt).
  function previewFailed() {
    clear()
    setError(`"${file?.name}" isn't a readable image.`)
  }

  async function upload() {
    // Check again right before sending. Never upload a file that hasn't passed.
    const problem = validateAvatar(file)
    if (problem) return setError(problem)

    setUploading(true)
    setError('')

    // One fixed path per user, inside their own folder (the storage policy
    // requires the first segment to be auth.uid()). upsert: true overwrites it,
    // so re-uploading replaces the avatar instead of adding another file.
    const path = `${user.id}/avatar`
    const bucket = supabase.storage.from('avatars')
    const { error: uploadError } = await bucket.upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    })
    if (uploadError) {
      setUploading(false)
      return setError(`Upload failed: ${uploadError.message}`)
    }

    // The path never changes, so add a version to get past the browser/CDN cache.
    const url = `${bucket.getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
    const { error: saveError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, avatar_url: url, updated_at: new Date().toISOString() })
    setUploading(false)
    if (saveError) return setError(`Uploaded, but could not save it to your profile: ${saveError.message}`)

    onUploaded(url)
    clear()
    setSaved(true)
  }

  return (
    <section className="section profile">
      <div className={preview ? 'preview-frame' : undefined}>
        {preview ? (
          <img className="avatar" src={preview} alt="Preview of the new avatar" width={72} height={72} onError={previewFailed} />
        ) : (
          <Avatar url={avatarUrl} email={user.email} size={72} />
        )}
      </div>
      <div className="grow">
        <h2>Profile picture</h2>
        <p className="muted small">PNG, JPEG, WebP or GIF, up to 1 MB.</p>
        <div className="row wrap">
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_AVATAR_TYPES.join(',')}
            onChange={choose}
            disabled={uploading}
            aria-label="Choose an avatar image"
            aria-describedby={error ? 'avatar-error' : undefined}
          />
          <button onClick={upload} disabled={!file || uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          {file && !uploading && (
            <button className="ghost" onClick={clear}>
              Cancel
            </button>
          )}
        </div>
        {preview && <p className="muted small">Preview, not uploaded yet.</p>}
        {error && (
          <p id="avatar-error" className="error" role="alert">
            {error}
          </p>
        )}
        {saved && <p className="success small-gap">Avatar updated.</p>}
      </div>
    </section>
  )
}
