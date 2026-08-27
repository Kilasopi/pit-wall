import porsche911GT3R992 from '@/components/ui/cars/porsche_911_gt3_r_992.jpg';

const CAR_MODEL_IMAGES = {
  'Porsche 911 GT3 R (992)': porsche911GT3R992,
};

export function carModelImage(carName) {
  return CAR_MODEL_IMAGES[carName] ?? null;
}
