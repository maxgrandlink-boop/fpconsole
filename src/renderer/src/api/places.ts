import { ApiError } from './error';

/** 快速创建里的国家。与 spec 6.1 的两个选项一致。 */
export type CountryName = '美国' | '新加坡';

/** 美国的州。新加坡没有州/省。 */
export type RegionName = '加利福尼亚州' | '纽约州' | '伊利诺伊州' | '得克萨斯州';

export interface Place {
  country: CountryName;
  region: RegionName | null;
  /** slot 前缀，已含结尾的 slot，例如 `us-la-slot`、`sg-slot`。 */
  prefix: string;
  area: 'us' | 'sg';
  /** 旧示例 URI 里出现过的城市 token。得克萨斯、新加坡没有。 */
  city: 'losangeles' | 'newyork' | 'chicago' | null;
  regionLabel: string;
  ip: string | null;
  asn: string | null;
  isp: string | null;
}

const US: Record<RegionName, Place> = {
  加利福尼亚州: {
    country: '美国',
    region: '加利福尼亚州',
    prefix: 'us-la-slot',
    area: 'us',
    city: 'losangeles',
    regionLabel: '美国-洛杉矶',
    ip: '76.89.201.14',
    asn: 'AS20115',
    isp: 'Charter Communications',
  },
  纽约州: {
    country: '美国',
    region: '纽约州',
    prefix: 'us-ny-slot',
    area: 'us',
    city: 'newyork',
    regionLabel: '美国-纽约',
    ip: null,
    asn: null,
    isp: null,
  },
  伊利诺伊州: {
    country: '美国',
    region: '伊利诺伊州',
    prefix: 'us-il-slot',
    area: 'us',
    city: 'chicago',
    regionLabel: '美国-芝加哥',
    ip: null,
    asn: null,
    isp: null,
  },
  得克萨斯州: {
    country: '美国',
    region: '得克萨斯州',
    prefix: 'us-tx-slot',
    area: 'us',
    city: null,
    regionLabel: '美国-达拉斯',
    ip: '12.119.84.203',
    asn: 'AS7018',
    isp: 'AT&T Enterprises',
  },
};

const SG: Place = {
  country: '新加坡',
  region: null,
  prefix: 'sg-slot',
  area: 'sg',
  city: null,
  regionLabel: '新加坡',
  ip: '128.199.85.7',
  asn: 'AS16276',
  isp: 'Datacamp Limited',
};

export function resolvePlace(country: CountryName, region: RegionName | null): Place {
  if (country === '新加坡') return SG;
  if (!region) throw new ApiError(400, '请选择州/省');
  return US[region];
}
