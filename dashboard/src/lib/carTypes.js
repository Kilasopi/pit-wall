import gtpImg from '@/components/ui/cars/2023_IWSC_GTP_BlankLivery_419x135.png';
import lmp2Img from '@/components/ui/cars/2023_IWSC_LMP2_BlankLivery_419x135.png';
import gt3Img from '@/components/ui/cars/2023_IWSC_GT3_BlankLivery_419x135.png';
import gt4Img from '@/components/ui/cars/2023_IWSC_GT4_BlankLivery_419x135.png';

export const CAR_TYPES = [
  { value: 'GTP', label: 'GTP', img: gtpImg },
  { value: 'LMP2', label: 'LMP2', img: lmp2Img },
  { value: 'GT3', label: 'GT3', img: gt3Img },
  { value: 'GT4', label: 'GT4', img: gt4Img },
];

export function carTypeImage(carType) {
  return CAR_TYPES.find((t) => t.value === carType)?.img ?? null;
}
