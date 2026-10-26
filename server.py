
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import urllib.request
from datetime import datetime, timezone
from uuid import uuid4

app = FastAPI(title="OrbitRelay API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Demo-only in-memory mission queue.
# Missions disappear when the backend restarts.
missions = []


class Report(BaseModel):
    text: str


class MissionRequest(BaseModel):
    event_type: str
    location: str
    urgency: str = "Medium"
    summary: str = ""
    impact: Optional[str] = "Unknown"


def calculate_priority(mission):
    """Transparent rule-based priority score, from 0 to 100."""
    score = 0

    urgency_scores = {
        "high": 50,
        "medium": 30,
        "low": 10,
    }

    score += urgency_scores.get(
        mission["urgency"].lower(), 10
    )

    event = mission["event_type"].lower()

    # Event type adds a modest, explicit demo weighting.
    if any(word in event for word in ["flood", "wildfire", "fire"]):
        score += 20
    elif any(word in event for word in ["storm", "cyclone"]):
        score += 15
    else:
        score += 5

    impact = (mission.get("impact") or "Unknown").lower()

    if "multiple villages" in impact or "large area" in impact:
        score += 20
    elif "community" in impact or "several" in impact:
        score += 15
    elif impact != "unknown":
        score += 5

    return min(score, 100)


@app.get("/")
def home():
    return {"message": "OrbitRelay is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze-report")
def analyze_report(report: Report):
    prompt = f"""
Analyze this disaster report for a DEMONSTRATION dashboard.
Return only valid JSON with these fields:
event_type, location, urgency, summary.
urgency must be Low, Medium, or High.
Do not invent missing details. Use "Unknown" if needed.

Report: {report.text}
"""

    try:
        body = json.dumps({
            "model": "gemma3:4b",
            "prompt": prompt,
            "stream": False,
            "format": "json",
        }).encode("utf-8")

        request = urllib.request.Request(
            "http://127.0.0.1:11434/api/generate",
            data=body,
            headers={"Content-Type": "application/json"},
        )

        with urllib.request.urlopen(request, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))

        data = json.loads(result["response"])
        data["source"] = "Ollama Gemma 3"
        data["simulation"] = True
        return data

    except Exception:
        text = report.text.lower()

        if any(word in text for word in ["flood", "overflow", "inundation"]):
            event = "Flood"
        elif any(word in text for word in ["fire", "wildfire", "smoke"]):
            event = "Wildfire"
        elif any(word in text for word in ["cyclone", "storm", "hurricane"]):
            event = "Severe storm"
        else:
            event = "Unclassified event"

        return {
            "event_type": event,
            "location": "Requires review",
            "urgency": "Medium",
            "summary": "Fallback analysis. Verify report details manually.",
            "source": "Rule-based fallback",
            "simulation": True,
        }


@app.post("/schedule-mission")
def schedule_mission(request: MissionRequest):
    mission = {
        "id": str(uuid4())[:8].upper(),
        "event_type": request.event_type,
        "location": request.location,
        "urgency": request.urgency.title(),
        "summary": request.summary,
        "impact": request.impact or "Unknown",
        "status": "Queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "simulation": True,
    }

    mission["priority_score"] = calculate_priority(mission)
    missions.append(mission)

    # Highest priority first; creation order breaks ties.
    missions.sort(
        key=lambda item: item["priority_score"],
        reverse=True,
    )

    for index, item in enumerate(missions, start=1):
        item["rank"] = index

    return {
        "message": "Demo mission added to the queue",
        "mission": mission,
        "queue": missions,
        "simulation": True,
    }


@app.get("/missions")
def get_missions():
    return {
        "missions": missions,
        "count": len(missions),
        "simulation": True,
        "note": "Demo queue only; no real satellite task is submitted.",
    }

@app.get("/disasters")
def get_disasters(limit: int = 350, days: Optional[int] = None):
    """Fetch current natural-event records from NASA EONET worldwide."""
    url = f"https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit={min(max(limit, 50), 500)}"
    if days:
        url += f"&days={days}"

    try:
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "OrbitRelay/1.0"},
        )

        with urllib.request.urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))

        disasters = []

        for event in payload.get("events", []):
            coordinates = []

            for geometry in event.get("geometry", []):
                coords = geometry.get("coordinates")
                if not coords:
                    continue

                geom_type = geometry.get("type")

                # 1. Point geometry: [longitude, latitude]
                if geom_type == "Point" and len(coords) >= 2:
                    longitude, latitude = coords[:2]
                    if (
                        isinstance(latitude, (int, float))
                        and isinstance(longitude, (int, float))
                        and -90 <= latitude <= 90
                        and -180 <= longitude <= 180
                    ):
                        coordinates.append({
                            "latitude": float(latitude),
                            "longitude": float(longitude),
                            "date": geometry.get("date"),
                        })

                # 2. Polygon geometry: [[[lon, lat], [lon, lat], ...]]
                elif geom_type == "Polygon" and isinstance(coords, list) and len(coords) > 0:
                    outer_ring = coords[0]
                    if isinstance(outer_ring, list) and len(outer_ring) >= 3:
                        valid_pts = [
                            p for p in outer_ring
                            if isinstance(p, list) and len(p) >= 2
                            and isinstance(p[0], (int, float)) and isinstance(p[1], (int, float))
                            and -180 <= p[0] <= 180 and -90 <= p[1] <= 90
                        ]
                        if valid_pts:
                            avg_lon = sum(p[0] for p in valid_pts) / len(valid_pts)
                            avg_lat = sum(p[1] for p in valid_pts) / len(valid_pts)
                            coordinates.append({
                                "latitude": float(avg_lat),
                                "longitude": float(avg_lon),
                                "date": geometry.get("date"),
                                "is_centroid": True,
                            })

            # Check if event has closed date to distinguish active from historical
            closed = event.get("closed")
            is_active = closed is None

            disasters.append({
                "id": event.get("id"),
                "title": event.get("title", "Unnamed event"),
                "description": event.get("description"),
                "categories": [
                    category.get("title")
                    for category in event.get("categories", [])
                ],
                "sources": event.get("sources", []),
                "coordinates": coordinates,
                "updated": event.get("geometry", [{}])[-1].get("date")
                    if event.get("geometry") else None,
                "closed": closed,
                "is_active": is_active,
                "source": "NASA EONET",
                "simulation": False,
            })

        return {
            "count": len(disasters),
            "source": "NASA EONET",
            "query_url": url,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "disasters": disasters,
        }

    except Exception as exc:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=502,
            detail=f"NASA EONET data could not be fetched: {exc}",
        )


@app.get("/iss-position")
def get_iss_position():
    """Retrieve genuine live ISS telemetry from documented satellite tracker APIs."""
    # Primary source: WhereTheISSAt API (NORAD ID 25544)
    try:
        url = "https://api.wheretheiss.at/v1/satellites/25544"
        req = urllib.request.Request(url, headers={"User-Agent": "OrbitRelay/1.0"})
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode("utf-8"))

        return {
            "latitude": float(data["latitude"]),
            "longitude": float(data["longitude"]),
            "altitude": round(float(data.get("altitude", 420.0)), 2),
            "velocity": round(float(data.get("velocity", 27600.0)), 1),
            "visibility": data.get("visibility", "daylight"),
            "footprint": round(float(data.get("footprint", 4500.0)), 1),
            "solar_lat": data.get("solar_lat"),
            "solar_lon": data.get("solar_lon"),
            "timestamp": int(data.get("timestamp", datetime.now(timezone.utc).timestamp())),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "source": "WhereTheISSAt (NORAD #25544)",
            "is_live": True,
            "status": "online",
        }
    except Exception as exc1:
        # Secondary fallback: Open-Notify ISS tracker
        try:
            fallback_url = "http://api.open-notify.org/iss-now.json"
            req = urllib.request.Request(fallback_url, headers={"User-Agent": "OrbitRelay/1.0"})
            with urllib.request.urlopen(req, timeout=5) as res:
                data = json.loads(res.read().decode("utf-8"))

            pos = data.get("iss_position", {})
            return {
                "latitude": float(pos["latitude"]),
                "longitude": float(pos["longitude"]),
                "altitude": 420.0,
                "velocity": 27600.0,
                "visibility": "unknown",
                "footprint": 4500.0,
                "timestamp": int(data.get("timestamp", datetime.now(timezone.utc).timestamp())),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "source": "Open-Notify (NORAD #25544)",
                "is_live": True,
                "status": "online",
            }
        except Exception as exc2:
            # Clean fallback when offline
            return {
                "latitude": None,
                "longitude": None,
                "altitude": 420.0,
                "velocity": 27600.0,
                "visibility": "unavailable",
                "timestamp": int(datetime.now(timezone.utc).timestamp()),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "source": "Documented Orbital Model (Simulated Fallback)",
                "is_live": False,
                "status": f"telemetry unavailable (primary: {exc1}, secondary: {exc2})",
            }



@app.get("/ai-analysis")
def get_ai_analysis():
    """Analyze live NASA EONET events using local Ollama."""
    ollama_model = "llama3.2:3b"
    ollama_url = "http://127.0.0.1:11434/api/generate"

    try:
        nasa_data = get_disasters(limit=100)
        events = nasa_data.get("disasters", [])

        if not events:
            return {
                "summary": "NASA EONET returned no open events to analyze.",
                "model": f"Ollama ({ollama_model})",
                "ollama_connected": False,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "note": "No open NASA EONET events were available.",
            }

        event_lines = []
        for event in events[:60]:
            categories = ", ".join(event.get("categories") or [])
            coords = event.get("coordinates") or []
            location = ""

            if coords:
                point = coords[0]
                location = (
                    f" lat={point.get('latitude')},"
                    f" lon={point.get('longitude')}"
                )

            event_lines.append(
                f"- {event.get('title', 'Unknown event')} | "
                f"Category: {categories or 'Unspecified'} | "
                f"Active: {event.get('is_active')} | "
                f"Updated: {event.get('updated') or 'Unknown'}"
                f"{location}"
            )

        prompt = f"""
You are OrbitRelay's Earth observation assistant.
Analyze these real event records fetched from NASA EONET.
Do not invent facts, causes, severity, locations, or predictions.
Summarize event categories, monitoring priorities, and data limitations
in 4-6 concise sentences.

NASA source: {nasa_data.get('query_url')}
Fetch time: {nasa_data.get('fetched_at')}
Total events: {nasa_data.get('count')}

EVENT RECORDS:
{chr(10).join(event_lines)}
"""

        body = json.dumps({
            "model": ollama_model,
            "prompt": prompt,
            "stream": False,
        }).encode("utf-8")

        req = urllib.request.Request(
            ollama_url,
            data=body,
            headers={"Content-Type": "application/json"},
        )

        with urllib.request.urlopen(req, timeout=120) as response:
            result = json.loads(response.read().decode("utf-8"))

        generated_text = result.get("response", "").strip()
        if not generated_text:
            raise RuntimeError("Ollama returned an empty response.")

        timestamp = datetime.now(timezone.utc).isoformat()

        print("\n" + "=" * 55)
        print("ORBITRELAY — LLAMA NASA DISASTER ANALYSIS")
        print(f"NASA events fetched: {len(events)}")
        print(generated_text)
        print("=" * 55 + "\n", flush=True)

        return {
            "summary": generated_text,
            "model": f"Ollama ({ollama_model})",
            "ollama_connected": True,
            "timestamp": timestamp,
            "event_count": len(events),
            "source": "NASA EONET",
            "note": "Analysis generated from NASA EONET event records.",
        }

    except Exception as exc:
        print(f"\n[OrbitRelay AI] Analysis failed: {exc}", flush=True)
        return {
            "summary": (
                "AI analysis is temporarily unavailable. Check NASA EONET "
                "connectivity and that Ollama is running."
            ),
            "model": "Ollama unavailable",
            "ollama_connected": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "note": str(exc),
        }
