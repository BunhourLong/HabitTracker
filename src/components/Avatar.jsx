// A round avatar image, or the first letter of the email when there is no image yet.
export default function Avatar({ url, email = '', size = 40 }) {
  const style = { width: size, height: size, fontSize: size * 0.42 }
  if (url) return <img className="avatar" src={url} alt="Your avatar" style={style} />
  return (
    <span className="avatar placeholder" style={style} aria-hidden="true">
      {email.charAt(0).toUpperCase() || '?'}
    </span>
  )
}
