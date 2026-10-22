'use client';
import { useEffect, useRef, useState } from 'react';

// Photos in /public/photos (WebP, cropped and resized). `pos` keeps the subject in view when the frame is cropped.
// The photos are third-party images kept out of the public repository; if one is missing, a palette tile is shown instead.
export const PHOTOS = {
  'checking-phone': { alt: 'Man at home checking his sugar reading on his phone', pos: 'object-[50%_35%]' },
  'glucometer-high': { alt: 'Glucometer showing a high blood sugar reading', pos: 'object-[50%_55%]' },
  'healthy-plate': { alt: 'Plate of salad, boiled eggs and grilled chicken', pos: 'object-center' },
  'elder-glucometer': { alt: 'Elderly man reading his glucometer at the kitchen table', pos: 'object-[50%_28%]' },
  'finger-prick': { alt: 'Finger-prick test with a lancet and glucometer', pos: 'object-[50%_45%]' },
  'work-kit': { alt: 'Glucose testing kit on a desk beside a laptop and coffee', pos: 'object-[50%_85%]' },
  'no-sugar': { alt: 'Spoon of sugar spelling “no sugar” with sugar cubes', pos: 'object-[50%_55%]' },
  'lemon-water': { alt: 'Glass of lemon water with ginger', pos: 'object-[40%_45%]' },
  'heart-workout': { alt: 'Cartoon heart lifting a barbell', pos: 'object-[50%_45%]' },
  'couple-walk': { alt: 'Older couple walking together in a park', pos: 'object-[40%_0%]' },
};

export default function Photo({ name, className = '', eager = false }) {
  const [missing, setMissing] = useState(false);
  const imgRef = useRef(null);
  const p = PHOTOS[name];

  // An image that failed before the page became interactive never reaches onError, so check once on mount
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setMissing(true);
  }, []);

  if (missing) return <div role="img" aria-label={p.alt} className="h-full w-full bg-gradient-to-br from-sky via-ice to-mint" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef} src={`/photos/${name}.webp`} alt={p.alt} loading={eager ? 'eager' : 'lazy'} decoding="async"
      onError={() => setMissing(true)}
      className={`h-full w-full object-cover ${p.pos} ${className}`}
    />
  );
}
