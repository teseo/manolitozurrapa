#!/usr/bin/env python3
"""
Download VOD chat from Twitch using GQL API.

Usage:
    python download-vod-chat.py <video_id> <duration>

    video_id: Twitch VOD ID (e.g., 2677280693)
    duration: Video duration in format HH:MM:SS (e.g., 2:44:47)

Example:
    python download-vod-chat.py 2677280693 2:44:47
"""
import json
import urllib.request
import sys

# Twitch public web client ID
CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko"

def parse_duration(duration_str):
    """Parse duration string HH:MM:SS or MM:SS to seconds."""
    parts = duration_str.split(':')
    if len(parts) == 3:
        h, m, s = map(int, parts)
    elif len(parts) == 2:
        h = 0
        m, s = map(int, parts)
    else:
        raise ValueError(f"Invalid duration format: {duration_str}")
    return h * 3600 + m * 60 + s

if len(sys.argv) < 3:
    print(__doc__, file=sys.stderr)
    sys.exit(1)

VIDEO_ID = sys.argv[1]
VIDEO_LENGTH = parse_duration(sys.argv[2])

def fetch(video_id, offset=0):
    q = """query($v:ID!,$o:Int!){
        video(id:$v){
            comments(contentOffsetSeconds:$o,first:100){
                edges{node{contentOffsetSeconds commenter{displayName}message{fragments{text emote{emoteID}}}}}
                pageInfo{hasNextPage}
            }
        }
    }"""
    data = json.dumps({"query": q, "variables": {"v": video_id, "o": offset}}).encode()
    req = urllib.request.Request("https://gql.twitch.tv/gql", data=data,
        headers={"Client-ID": CLIENT_ID, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return None

def fmt(s):
    h, m = divmod(int(s), 3600)
    m, s = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"

all_comments = {}
offsets = list(range(0, VIDEO_LENGTH, 300))  # Cada 5 minutos

print(f"Descargando chat completo ({len(offsets)} segmentos)...", file=sys.stderr)

for i, offset in enumerate(offsets):
    r = fetch(VIDEO_ID, offset)
    if not r: continue

    v = r.get("data", {}).get("video")
    if not v: continue

    edges = v.get("comments", {}).get("edges", [])
    for e in edges:
        n = e.get("node", {})
        t = n.get("contentOffsetSeconds", 0)
        if t in all_comments: continue  # Evitar duplicados

        frags = n.get("message", {}).get("fragments", [])
        msg = "".join(f.get("text","") or f"[{f.get('emote',{}).get('emoteID','')}]" for f in frags)
        commenter = n.get("commenter")
        u = commenter.get("displayName", "[deleted]") if commenter else "[deleted]"
        all_comments[t] = {"t": fmt(t), "u": u, "m": msg, "offset": t}

    if (i+1) % 10 == 0 or i == len(offsets)-1:
        print(f"  Progreso: {i+1}/{len(offsets)} | Mensajes: {len(all_comments)}", file=sys.stderr)

# Ordenar por tiempo
sorted_comments = sorted(all_comments.values(), key=lambda x: x["offset"])

out = f"/tmp/chat_vod_{VIDEO_ID}_full.txt"
with open(out, "w", encoding="utf-8") as f:
    f.write(f"=== CHAT COMPLETO VOD {VIDEO_ID} ===\n")
    f.write(f"Duración: {fmt(VIDEO_LENGTH)}\n")
    f.write(f"Total: {len(sorted_comments)} mensajes\n")
    f.write("=" * 50 + "\n\n")
    for c in sorted_comments:
        f.write(f"[{c['t']}] {c['u']}: {c['m']}\n")

print(f"\n✅ {out}", file=sys.stderr)
print(f"📊 {len(sorted_comments)} mensajes", file=sys.stderr)
