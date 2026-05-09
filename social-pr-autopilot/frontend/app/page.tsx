"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8102";

export default function Home() {
  const [event, setEvent] = useState("Launching an agent that turns one product update into seven days of posts and PR outreach.");
  const [summary, setSummary] = useState("Campaign pack waiting.");
  const [backendStatus, setBackendStatus] = useState("checking backend...");
  const [debugSummary, setDebugSummary] = useState("debug snapshot pending");
  const [campaign, setCampaign] = useState<any>(null);
  const [channelStatus, setChannelStatus] = useState("channels loading...");
  const [publishResult, setPublishResult] = useState("No publish/export action yet.");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/ready`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("not ready")))
      .then((data) => {
        const selected = data.providers?.selected_provider ?? "demo";
        const configured = data.providers?.mistral_configured || data.providers?.gemini_configured;
        setBackendStatus(`backend ready · ${configured ? selected : "demo"} mode`);
      })
      .catch(() => setBackendStatus("backend offline · demo UI only"));
    fetchDebug();
    fetchChannels();
    return () => controller.abort();
  }, []);

  async function fetchDebug() {
    try {
      const response = await fetch(`${API_BASE}/debug`);
      if (!response.ok) throw new Error("debug unavailable");
      const data = await response.json();
      setDebugSummary(`${data.run_count} runs · ${data.recent_events?.length ?? 0} recent events`);
    } catch {
      setDebugSummary("debug endpoint unavailable");
    }
  }

  async function fetchChannels() {
    try {
      const response = await fetch(`${API_BASE}/api/channels`);
      if (!response.ok) throw new Error("channels unavailable");
      const data = await response.json();
      const configured = data.filter((item: any) => item.configured).map((item: any) => item.channel).join(", ");
      setChannelStatus(configured ? `configured: ${configured}` : "no live adapters configured · dry-run/export only");
    } catch {
      setChannelStatus("channel status unavailable");
    }
  }

  async function generateCampaign() {
    setSummary("Generating campaign...");
    try {
      const response = await fetch(`${API_BASE}/api/campaign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      });
      if (!response.ok) throw new Error("Campaign request failed");
      const data = await response.json();
      setCampaign(data);
      setSummary(`run ${data.run_id}: ${data.angle ?? "Campaign generated."}`);
      fetchDebug();
    } catch {
      setSummary("Backend unavailable. Use this dashboard as the campaign control surface.");
    }
  }

  async function publishChannel(channel: "instagram" | "telegram" | "bluesky") {
    const text = campaign?.posts?.[channel] ?? campaign?.angle ?? event;
    setPublishResult(`${channel}: publishing/exporting...`);
    try {
      const response = await fetch(`${API_BASE}/api/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          text,
          campaign_name: campaign?.campaign_name ?? "Manual Campaign",
          image_prompt: campaign?.image_prompts?.[0],
          dry_run: channel !== "instagram",
        }),
      });
      if (!response.ok) throw new Error("publish failed");
      const data = await response.json();
      setPublishResult(`${channel}: ${data.status} · log ${data.publish_log_id} · ${data.next_action ?? "check publish logs"}`);
      fetchDebug();
    } catch {
      setPublishResult(`${channel}: adapter request failed`);
    }
  }

  return (
    <main className="min-h-screen px-6 py-8 text-stone-950">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wide text-orange-700">Autonomous Distribution</p>
          <h1 className="text-4xl font-black tracking-tight">Social PR Autopilot</h1>
          <p className="mt-2 max-w-2xl text-stone-700">
            Convert one launch brief into Instagram assets, Telegram updates, Bluesky/X posts, PR pitches, and a campaign calendar.
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-stone-500">{backendStatus}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-stone-400">{debugSummary}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-stone-400">{channelStatus}</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-orange-200 bg-white p-5 shadow-sm">
            <label className="text-sm font-bold">Launch event</label>
            <textarea
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              className="mt-3 min-h-44 w-full rounded-md border border-orange-200 p-3 text-sm outline-none focus:border-orange-600"
            />
            <button onClick={generateCampaign} className="mt-4 rounded-md bg-orange-700 px-5 py-3 text-sm font-bold text-white">
              Generate Campaign
            </button>
          </div>

          <div className="rounded-lg border border-orange-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">Campaign Output</h2>
            <p className="mt-3 rounded-md bg-orange-50 p-4 text-sm leading-6">{summary}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button onClick={() => publishChannel("instagram")} className="rounded-md border border-orange-100 p-3 text-left text-sm font-semibold hover:border-orange-400">
                Instagram export
              </button>
              <button onClick={() => publishChannel("telegram")} className="rounded-md border border-orange-100 p-3 text-left text-sm font-semibold hover:border-orange-400">
                Telegram dry-run
              </button>
              <button onClick={() => publishChannel("bluesky")} className="rounded-md border border-orange-100 p-3 text-left text-sm font-semibold hover:border-orange-400">
                Bluesky dry-run
              </button>
              {["Press", "Calendar", "QA"].map((item) => (
                <div key={item} className="rounded-md border border-orange-100 p-3 text-sm font-semibold">{item}</div>
              ))}
            </div>
            <p className="mt-4 rounded-md bg-stone-50 p-3 text-xs font-semibold text-stone-600">{publishResult}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
