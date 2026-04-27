"""
instagram_router.py — Instagram Basic Display API feed
Env vars required:
  INSTAGRAM_ACCESS_TOKEN  — long-lived token from Meta for Developers
"""
from fastapi import APIRouter
import httpx
import os

router = APIRouter()

ACCESS_TOKEN = os.environ.get("INSTAGRAM_ACCESS_TOKEN", "")


@router.get("/instagram-feed")
async def instagram_feed():
    if not ACCESS_TOKEN:
        return {"error": "INSTAGRAM_ACCESS_TOKEN not configured", "posts": []}

    url = (
        "https://graph.instagram.com/me/media"
        f"?fields=id,caption,media_type,media_url,thumbnail_url,permalink"
        f"&limit=9"
        f"&access_token={ACCESS_TOKEN}"
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(url)
            data = res.json()
    except Exception as e:
        return {"error": str(e), "posts": []}

    posts = []
    for item in data.get("data", []):
        media_type = item.get("media_type", "")
        # For VIDEO posts the image preview is thumbnail_url, not media_url
        image_url = (
            item.get("thumbnail_url")
            if media_type == "VIDEO"
            else item.get("media_url")
        )
        if not image_url:
            continue
        posts.append({
            "id":        item.get("id"),
            "caption":   item.get("caption", ""),
            "media_url": image_url,
            "link":      item.get("permalink"),
            "type":      media_type,
        })
    return {"posts": posts}
