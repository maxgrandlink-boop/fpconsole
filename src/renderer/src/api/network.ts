import { delay } from './delay';

/** 左下角网络状态。真实探测对象还没定，这里只返回假数据。 */
export interface NetworkStatus {
  ok: boolean;
}

export async function getNetworkStatus(): Promise<NetworkStatus> {
  await delay();
  return { ok: true };
}
