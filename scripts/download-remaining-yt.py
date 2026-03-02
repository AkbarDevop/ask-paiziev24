"""
Run this script when YouTube rate limit resets (usually ~1-2 hours):
  python3 scripts/download-remaining-yt.py

It downloads transcripts for videos featuring Akmal Paiziev
across external YouTube channels (podcasts, interviews, etc.)
"""
from youtube_transcript_api import YouTubeTranscriptApi
import time, os

api = YouTubeTranscriptApi()
OUTDIR = os.path.join(os.path.dirname(__file__), "..", "data", "youtube")
os.makedirs(OUTDIR, exist_ok=True)

VIDEOS = {
    # Long podcasts (highest value)
    "TG3fy5KMaJo": ("Gigantlar bilan raqobat va biznes qoidalari", "BUSOQQA"),
    "AzRleDIVlOE": ("Davlat ITni rivojlanishiga tosiqmi", "Fikr yetakchilari"),
    # Interviews
    "f6JEoS5Z8ZU": ("Startup nima va u oddiy biznesdan farqi", "QAHVALI SUHBATLAR"),
    "jxozjIyza3o": ("Korzinka.uz Akmal Paizievning aloqasi bormi", "Millat Umidi"),
    "quLEZzKJ1RQ": ("Akmal akani Muhabbat Qissalari", "KAMILOVLAR"),
    "Wj5t1JkVUes": ("IT texnologiyalari orqali savdoni oshirish", "MFaktorUz"),
    # Russian interviews
    "KI0mFgJI1oU": ("Biznes klinika Pandemiya va yetkazib berish", "Biznes Klinika"),
    "0J8DPln6oxI": ("Akmal Paiziev asoschisi NewMax Technology", "Shym IT Podcast"),
    "VGhC13y-eaI": ("Razrabotka strategii internet magazina", "ePark"),
    "9jjj9_KmVlg": ("Blits intervyu Akmal Paiziev MyTaxi", "Kommersant Uz"),
    "YOhAZPfhoBU": ("Laboratoriya biznesa", "Laboratoriya Biznesa"),
    "vzD-WlEvMxM": ("Tech Thursday Night by Amirus", "Amirkhan Omarov"),
    "w9v9ZYC0904": ("Tsifrovaya transformatsiya v kompanii", "ALPHA"),
    "NYxfMOsySvU": ("Kogda v Uzbekistane budet 1 mln aytishnikov", "GeekBrains"),
    "cIGmrc0S20k": ("Akmal Paiziev Startup nima", "ePark"),
    "SfnYoB1LIIU": ("Startup myshlenie eksperimenty v biznese", "GroundZero"),
    "30ZNH3hR4OU": ("3 elementa dlya postroeniya biznesa", "GroundZero"),
    # Panels & talks
    "2mrg0OeX0ek": ("Startupni investitsiyaga tayyorlash TechTalks", "Digital Camp"),
    "7JFxN4OniZ0": ("Startuplarning oddiy bizneslardan farqi", "MFaktorUz"),
    "AJKJVVRdd40": ("STARTAPlardagi eng katta 3 ta XATO", "Modul5"),
    "SCKmVnxHYV4": ("Investitsiyasiz maqsadlaringiz qashshoqlashadi", "AVLO PODCAST"),
    "GQxH5K4hQxQ": ("Gumanoid robotlar AI startap Logistika", "Fikr yetakchilari"),
    "Vef3OZbJmAc": ("From Uzbekistan to Big Tech Documentary", "IT Park"),
    "sZlh9JgrmAk": ("CABEXPO 2025 AQShda logistikada yangi davr", "Sunnat Abdukhakimov"),
    # Own channel missed
    "Ue5MWfOYak4": ("Numeo YC video", "Akmal Paiziev"),
    "0bZRrPjZoUA": ("Express24 va MyTaxi ryukzagida nima", "Spot.uz"),
    "bEHeftjE9lQ": ("Startaplar haqida suhbat", "Akmal Paiziev"),
    "RJ5GdncLIog": ("Laziz Adhamov bilan 10 ta savolga javob", "Akmal Paiziev"),
    "E5cGJ4TGEf0": ("Qanday qilib biznes goya topish 2", "Akmal Paiziev"),
    "eUWoWumrfVA": ("Mijoz bilan intervyu muammoni aniqlash", "Akmal Paiziev"),
    "KyE3ArUDFdA": ("Mijoz bilan intervyu 2-qism", "Akmal Paiziev"),
    "SjDzK7n5M0I": ("Muvaffaqiyatning narxi", "Akmal Paiziev"),
    "fBXXTEwGBAA": ("Internet dokoni ochish MyStart 1-soni", "Akmal Paiziev"),
    "w9iTm5FwzTg": ("MyTaxida dasturchi 18 yoshli Alisher", "Akmal Paiziev"),
    "suDZ03XjVKE": ("Startap va biznes boshlash farqi", "Akmal Paiziev"),
    "ZM0W3TY47Qw": ("Pulga togri munosabat", "Akmal Paiziev"),
    "CvkwDq7-aWA": ("Corona virusga vaksina foydasizmi", "Akmal Paiziev"),
}

# Skip videos already downloaded
existing = set()
for f in os.listdir(OUTDIR):
    if f.endswith(".txt"):
        existing.add(f.replace(".txt", ""))

to_download = {k: v for k, v in VIDEOS.items() if k not in existing}
print(f"Already have {len(existing)} videos, need to download {len(to_download)} more\n")

success = 0
total_chars = 0
no_transcript = []

for i, (vid_id, (title, channel)) in enumerate(to_download.items()):
    try:
        ts_list = api.list(vid_id)
        transcript = None
        for t in ts_list:
            transcript = t
            break
        if not transcript:
            print(f"  SKIP [{i+1}] {title[:40]}... — no transcripts")
            no_transcript.append(vid_id)
            continue
        
        entries = transcript.fetch()
        text = "\n".join(snippet.text for snippet in entries)
        
        with open(os.path.join(OUTDIR, f"{vid_id}.txt"), "w") as f:
            f.write(f'Source: YouTube — Akmal Paiziev on {channel} — "{title}"\n')
            f.write(f"URL: https://www.youtube.com/watch?v={vid_id}\n")
            f.write(f"Channel: {channel}\n")
            f.write(f"Language: {transcript.language}\n\n")
            f.write(text)
        
        print(f"  OK [{i+1}/{len(to_download)}] {title[:40]}... ({len(text):,} chars)")
        success += 1
        total_chars += len(text)
    except Exception as e:
        ename = type(e).__name__
        if ename in ("IpBlocked", "RequestBlocked"):
            print(f"\n  IP BLOCKED after {success} downloads. Wait 1-2 hours and run again.")
            break
        elif ename == "TranscriptsDisabled":
            print(f"  NO SUBS [{i+1}] {title[:40]}... — transcripts disabled")
            no_transcript.append(vid_id)
        else:
            print(f"  ERR [{i+1}] {title[:40]}... — {ename}: {e}")
    
    time.sleep(5)  # 5 second delay to avoid rate limits

print(f"\nDone: {success}/{len(to_download)} downloaded, {total_chars:,} chars")
if no_transcript:
    print(f"Videos with no transcripts: {', '.join(no_transcript)}")
print(f"\nAfter downloading, re-run ingestion:")
print(f"  cd /Users/akbar/Desktop/ask-akmal")
print(f"  source <(grep -v '^#' .env.local | grep '=' | sed 's/^/export /') && npx tsx scripts/chunk-and-embed.ts")
