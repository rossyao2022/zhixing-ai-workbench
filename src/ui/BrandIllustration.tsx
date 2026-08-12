type BrandIllustrationProps = {
  src: string
  alt: string
  compact?: boolean
}

export function BrandIllustration({ src, alt, compact = false }: BrandIllustrationProps) {
  return (
    <figure className={`brand-illustration ${compact ? 'compact' : ''}`}>
      <span aria-hidden="true" />
      <img src={src} alt={alt} />
    </figure>
  )
}
