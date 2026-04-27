"""
youtube_router.py — YouTube Data API v3 latest videos
Env vars required:
  YOUTUBE_API_KEY    — Google Cloud API key with YouTube Data API v3 enabled
  YOUTUBE_CHANNEL_ID — Your YouTube channel ID (starts with UC...)
"""
from fastapi import APIRouter
import httpx
import os

router = APIRouter()

API_KEY    = os.environ.get("YOUTUBE_API_KEY", "")
CHANNEL_ID = os.environ.get("YOUTUBE_CHANNEL_ID", "")


@router.get("/youtube-videos")
async def youtube_videos():
    if not API_KEY or not CHANNEL_ID:
        return {"error": "YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID not configured", "videos": []}

    url = (
        "https://www.googleapis.com/youtube/v3/search"
        f"?part=snippet"
        f"&channelId={CHANNEL_ID}"
        f"&maxResults=6"
        f"&order=date"
        f"&type=video"
        f"&key={API_KEY}"
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(url)
            data = res.json()
    except Exception as e:
        return {"error": str(e), "videos": []}

    videos = []
    for item in data.get("items", []):
        vid_id = item.get("id", {}).get("videoId")
        if not vid_id:
            continue
        snippet = item.get("snippet", {})
        thumbs  = snippet.get("thumbnails", {})
        thumb   = (thumbs.get("maxres") or thumbs.get("high") or thumbs.get("medium") or {}).get("url", "")
        videos.append({
            "videoId":   vid_id,
            "title":     snippet.get("title", ""),
            "thumbnail": thumb,
            "link":      f"https://www.youtube.com/watch?v={vid_id}",
        })
    return {"videos": videos}
