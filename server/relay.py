"""WebSocket relay for therapy sessions.

The relay does not know the game rules. It only moves messages between the one therapist and the students
of a room, remembers the latest state so a student who joins late sees the game at once, and reports who is
connected. The game state itself is owned by the therapist side (see js/authority.js).

Run:  python server/relay.py [port]      (default 8766)
"""

import asyncio
import json
import sys

import websockets

MAX_MESSAGE_BYTES = 64 * 1024
MAX_ROOM_ID = 32
ROOMS = {}  # room id -> {"therapist": ws | None, "students": set(ws), "state": str | None}


def presence_message(room):
    return json.dumps({
        "t": "presence",
        "therapist": room["therapist"] is not None,
        "students": len(room["students"]),
    })


async def send_quietly(ws, message):
    try:
        await ws.send(message)
    except websockets.ConnectionClosed:
        pass


async def broadcast(room, message):
    members = list(room["students"])
    if room["therapist"] is not None:
        members.append(room["therapist"])
    await asyncio.gather(*(send_quietly(ws, message) for ws in members))


async def handler(ws):
    room_id = None
    role = None
    try:
        async for raw in ws:
            try:
                message = json.loads(raw)
            except ValueError:
                continue
            kind = message.get("t")

            if room_id is None:
                if kind != "join":
                    continue
                candidate = str(message.get("room", ""))
                if not candidate.isalnum() or len(candidate) > MAX_ROOM_ID or message.get("role") not in ("therapist", "student"):
                    await ws.close(1008, "bad join")
                    return
                room = ROOMS.setdefault(candidate, {"therapist": None, "students": set(), "state": None})
                room_id, role = candidate, message["role"]
                if role == "therapist":
                    previous = room["therapist"]
                    room["therapist"] = ws
                    if previous is not None and previous is not ws:
                        await previous.close(4000, "replaced by a newer therapist connection")
                else:
                    room["students"].add(ws)
                await send_quietly(ws, json.dumps({"t": "joined", "role": role}))
                if role == "student" and room["state"]:
                    await send_quietly(ws, room["state"])
                await broadcast(room, presence_message(room))
                continue

            room = ROOMS[room_id]
            if kind == "intent" and role == "student" and room["therapist"] is not None:
                await send_quietly(room["therapist"], raw)
            elif kind == "state" and role == "therapist":
                room["state"] = raw
                await asyncio.gather(*(send_quietly(s, raw) for s in list(room["students"])))
    except websockets.ConnectionClosed:
        pass
    finally:
        if room_id is not None and room_id in ROOMS:
            room = ROOMS[room_id]
            room["students"].discard(ws)
            if room["therapist"] is ws:
                room["therapist"] = None
            if room["therapist"] is None and not room["students"]:
                del ROOMS[room_id]
            else:
                await broadcast(room, presence_message(room))


async def main(port):
    async with websockets.serve(handler, "127.0.0.1", port, max_size=MAX_MESSAGE_BYTES):
        print(f"relay listening on ws://127.0.0.1:{port}")
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 8766))
