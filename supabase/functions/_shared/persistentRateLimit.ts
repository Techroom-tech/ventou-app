export async function checkPersistentRateLimit(
  admin: any,
  key: string,
  limit: number,
  windowMs: number,
  blockMs: number,
): Promise<{ blocked: boolean; retryAfterSeconds?: number }> {
  const now = new Date();

  const { data: current } = await admin
    .from("edge_rate_limits")
    .select("key, count, window_start, blocked_until")
    .eq("key", key)
    .maybeSingle();

  if (!current) {
    await admin.from("edge_rate_limits").insert({
      key,
      count: 1,
      window_start: now.toISOString(),
      blocked_until: null,
      updated_at: now.toISOString(),
    });
    return { blocked: false };
  }

  if (current.blocked_until && new Date(current.blocked_until).getTime() > now.getTime()) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((new Date(current.blocked_until).getTime() - now.getTime()) / 1000),
    );
    return { blocked: true, retryAfterSeconds };
  }

  const windowStart = new Date(current.window_start).getTime();
  const isNewWindow = now.getTime() - windowStart > windowMs;

  if (isNewWindow) {
    await admin
      .from("edge_rate_limits")
      .update({
        count: 1,
        window_start: now.toISOString(),
        blocked_until: null,
        updated_at: now.toISOString(),
      })
      .eq("key", key);
    return { blocked: false };
  }

  const newCount = Number(current.count || 0) + 1;
  if (newCount > limit) {
    const blockedUntil = new Date(now.getTime() + blockMs).toISOString();
    await admin
      .from("edge_rate_limits")
      .update({
        count: newCount,
        blocked_until: blockedUntil,
        updated_at: now.toISOString(),
      })
      .eq("key", key);

    return { blocked: true, retryAfterSeconds: Math.ceil(blockMs / 1000) };
  }

  await admin
    .from("edge_rate_limits")
    .update({
      count: newCount,
      updated_at: now.toISOString(),
    })
    .eq("key", key);

  return { blocked: false };
}
