import { ApiError } from './error';
import { delay } from './delay';
import { clone } from './state';

export type LineId = 'asia' | 'europe' | 'america';

export interface Line {
  id: LineId;
  name: string;
}

/** code 参与 slot 前缀。有 regions 时前缀是 `${country.code}-${region.code}-slot`。 */
export interface Region {
  code: string;
  name: string;
}

export interface Country {
  code: string;
  name: string;
  regions?: Region[];
}

const LINES: Line[] = [
  { id: 'asia', name: '亚洲' },
  { id: 'europe', name: '欧洲' },
  { id: 'america', name: '美洲' },
];

const COUNTRIES: Record<LineId, Country[]> = {
  america: [
    {
      code: 'us',
      name: '美国',
      regions: [
        { code: 'la', name: '加利福尼亚州' },
        { code: 'ny', name: '纽约州' },
        { code: 'il', name: '伊利诺伊州' },
        { code: 'tx', name: '得克萨斯州' },
      ],
    },
    { code: 'ca', name: '加拿大' },
  ],
  asia: [
    { code: 'sg', name: '新加坡' },
    { code: 'jp', name: '日本' },
  ],
  europe: [
    { code: 'de', name: '德国' },
    { code: 'gb', name: '英国' },
  ],
};

export async function getLines(): Promise<Line[]> {
  await delay();
  return clone(LINES);
}

export async function getCountries(line: LineId): Promise<Country[]> {
  await delay();
  const list = COUNTRIES[line];
  if (!list) throw new ApiError(400, '线路不存在');
  return clone(list);
}

export function countriesOf(line: LineId): Country[] | undefined {
  return COUNTRIES[line];
}

/** 美国必须带州。其他国家 region 为 null。 */
export function resolveCountry(
  line: LineId,
  countryCode: string,
  regionCode: string | null,
): { country: Country; region: Region | null } {
  const list = COUNTRIES[line];
  if (!list) throw new ApiError(400, '线路不存在');
  const country = list.find((item) => item.code === countryCode);
  if (!country) throw new ApiError(400, '国家不属于该线路');
  if (country.regions && country.regions.length > 0) {
    if (!regionCode) throw new ApiError(400, '请选择州/省');
    const region = country.regions.find((item) => item.code === regionCode);
    if (!region) throw new ApiError(400, '请选择州/省');
    return { country, region };
  }
  if (regionCode) throw new ApiError(400, '该国家无州/省');
  return { country, region: null };
}

export function slotPrefix(country: Country, region: Region | null): string {
  return region ? `${country.code}-${region.code}-slot` : `${country.code}-slot`;
}
