// DiaVita's own illustrations in /public/illustrations (original SVG artwork, very small, so pages stay fast).
// `pos` keeps the subject in view when the frame is cropped.
export const PHOTOS = {
  'checking-phone': { alt: 'Illustration of a man at home checking his sugar reading on his phone', pos: 'object-[60%_50%]' },
  'glucometer-high': { alt: 'Illustration of a glucometer showing a high blood sugar reading', pos: 'object-center' },
  'healthy-plate': { alt: 'Illustration of a plate of salad, boiled eggs and grilled chicken', pos: 'object-center' },
  'elder-glucometer': { alt: 'Illustration of an elderly man reading his glucometer at the table', pos: 'object-[50%_40%]' },
  'finger-prick': { alt: 'Illustration of a finger-prick test with a lancet and glucometer', pos: 'object-center' },
  'work-kit': { alt: 'Illustration of a glucose testing kit beside a laptop and coffee', pos: 'object-[50%_70%]' },
  'no-sugar': { alt: 'Illustration of sugar cubes crossed out, meaning no added sugar', pos: 'object-center' },
  'lemon-water': { alt: 'Illustration of a glass of lemon water', pos: 'object-center' },
  'heart-workout': { alt: 'Illustration of a cartoon heart lifting a barbell', pos: 'object-center' },
  'couple-walk': { alt: 'Illustration of an older couple walking together in a park', pos: 'object-[50%_60%]' },
};

export default function Photo({ name, className = '', eager = false }) {
  const p = PHOTOS[name];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/illustrations/${name}.svg`} alt={p.alt} loading={eager ? 'eager' : 'lazy'} decoding="async"
      className={`h-full w-full object-cover ${p.pos} ${className}`}
    />
  );
}
