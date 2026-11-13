/** 未指定时 100~400ms。检测类接口沿用旧 mock 里单独写的更长等待。 */
export function delay(ms?: number): Promise<void> {
  const wait = ms === undefined ? 100 + Math.floor(Math.random() * 300) : ms;
  return new Promise((resolve) => {
    setTimeout(resolve, wait);
  });
}
