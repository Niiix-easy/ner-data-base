export function retryDelay(attempt:number, baseMs=Number(process.env.RETRY_BASE_MS ?? 1000)){
 const exponential=Math.min(baseMs * 2 ** Math.max(0,attempt-1), 60_000);
 const jitter=Math.floor(Math.random()*250);
 return exponential+jitter;
}
export function canRetry(attempt:number,max=Number(process.env.MAX_RETRIES ?? 5)){
 return attempt < max;
}
