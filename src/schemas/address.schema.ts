import { z } from 'zod';
import { HCM_ADDRESS_DATA } from '../utils/address';

export const CreateAddressSchema = z
  .object({
    full_name: z.string().min(1),
    phone: z.string().regex(/^[0-9]{9,11}$/),
    province: z.literal('TP. Hồ Chí Minh'),
    district: z.string(),
    ward: z.string(),
    street_address: z.string().min(1),
    address_type: z.enum(['HOME', 'WORK', 'other']).default('HOME'),
    is_default: z.boolean().optional(),
    lat: z.number(),
    lon: z.number(),
  })
  .superRefine((data, ctx) => {
    const { province, district, ward } = data;

    const districtData =
      HCM_ADDRESS_DATA[province as keyof typeof HCM_ADDRESS_DATA]?.[
        district as keyof (typeof HCM_ADDRESS_DATA)[typeof province]
      ];
    if (!districtData) {
      ctx.addIssue({
        path: ['district'],
        code: z.ZodIssueCode.custom,
        message: 'Quận/Huyện không thuộc TP. Hồ Chí Minh',
      });
    } else if (!(districtData.wards as unknown as string[]).includes(ward)) {
      ctx.addIssue({
        path: ['ward'],
        code: z.ZodIssueCode.custom,
        message: `Phường/Xã không thuộc ${district}`,
      });
    }
  });
