import redis

from lib.settings import REDIS_URL

_redis: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        # RQ erwartet rohe Bytes in Redis; decode_responses=True bricht Job-Pickles.
        # Kurze Timeouts: sonst hängen erste Requests Minuten, wenn Redis nicht erreichbar ist.
        _redis = redis.from_url(
            REDIS_URL,
            decode_responses=False,
            socket_connect_timeout=5,
            socket_timeout=60,
        )
    return _redis
