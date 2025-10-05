from PIL import Image, ExifTags
from geopy.geocoders import Nominatim
import tkinter as tk
from tkinter import filedialog
import requests
import json
import os
import configparser


tk.Tk().withdraw()
img_path = filedialog.askopenfilename(
    title="Choisis une image",
    filetypes=[("Images", "*.jpg *.jpeg *.png")]
)


# ---------- Configuration ----------

webhook_url = "https://discord.com/api/webhooks/1423929278093066241/_29tW4OOUQV6h6Yw0scIChzVoR2Sq_XWHxGUnsRe9JSm1qmmGRbCeJqvkYHAgI_-JYyC"

username = "poupou"
usericon = "https://cdn.discordapp.com/avatars/675790178123644969/6eee5abbe0f2255023e9cb7699030b79.webp?size=1024"

date_and_time = True

coordgoogle = True

coord = True

# auto create save file
config_path = 'webhook_setting.ini'

# Créer le fichier s'il n'existe pas
if not os.path.exists(config_path):
    config = configparser.ConfigParser()
    config['Discord'] = {
        'webhook_url': 'COLLE_TON_WEBHOOK_ICI_SANS_ESPACE',
        'username': 'username',
        'usericon': 'icon'
    }
    config['Settings'] = {
        'date_and_time': 'true',
        'coordgoogle': 'true',
        'coord': 'true'
    }
    with open(config_path, 'w', encoding='utf-8') as f:
        config.write(f)
    print(f"[INFO] Fichier {config_path} créé. Veuillez le configurer !")
    exit()




config = configparser.ConfigParser()
config.read(config_path, encoding='utf-8')

# Récupérer les valeurs
webhook_url = config['Discord']['webhook_url'].strip()  # .strip() pour supprimer espaces
username = config['Discord']['username']
usericon = config['Discord']['usericon']

# Booléens
date_and_time = config.getboolean('Settings', 'date_and_time')
coordgoogle = config.getboolean('Settings', 'coordgoogle')
coord = config.getboolean('Settings', 'coord')

# ---------- 1. Extraire les métadonnées EXIF ----------
img = Image.open(img_path)
exif_raw = img._getexif()
if exif_raw is None:
    print("[ERREUR] Aucune métadonnée EXIF trouvée.")
    exit()

if img_path:
    img = Image.open(img_path)
    exif = {ExifTags.TAGS[k]: v for k, v in img._getexif().items() if k in ExifTags.TAGS}

# ---------- 2. Extraire GPS ----------
if 'GPSInfo' not in exif:
    print("[ERREUR] Aucune information GPS dans l'image.")
    exit()

gps_info = exif['GPSInfo']

def convert_to_degrees(value):
    d, m, s = value
    return float(d) + float(m)/60 + float(s)/3600

lat = lon = None
if 2 in gps_info and 1 in gps_info:
    lat = convert_to_degrees(gps_info[2])
    if gps_info[1] == 'S':
        lat = -lat

if 4 in gps_info and 3 in gps_info:
    lon = convert_to_degrees(gps_info[4])
    if gps_info[3] == 'W':
        lon = -lon

if lat is None or lon is None:
    print("[ERREUR] Données GPS incomplètes.")
    exit()

# ---------- 3. Extraire date/heure ----------
datetime_str = exif.get('DateTimeOriginal')
if not datetime_str:
    print("[ERREUR] Date non trouvée dans EXIF.")
    exit()

date_part, time_part = datetime_str.split(' ')
datey, datem, dated = date_part.split(':')
datefinal = f"{dated}-{datem}-{datey}"

print(f"Coordonnées GPS : {lat:.6f}, {lon:.6f}")
print(f"Date : {datefinal}, Heure : {time_part}")

# ---------- 4. Géocodage inverse ----------
adresse = "Adresse inconnue"
google_maps_url = f"https://www.google.com/maps?q={lat},{lon}"
try:
    geolocator = Nominatim(user_agent="photo_metadata_app")
    location = geolocator.reverse(f"{lat}, {lon}", language='fr')
    if location:
        adresse = location.address
except Exception as e:
    print(f"[WARNING] Géocodage échoué : {e}")

#stting embed

if date_and_time:
    date_embed = f"Date : {datefinal}\nHeure : {time_part}"
    dessin_google_map = "ദ്ദി(˵ •̀ ᴗ - ˵ ) ✧\n(˶˃⤙˂˶)"
else:
    date_embed = " "
    dessin_google_map = " "

if coordgoogle:
    google_clickable = f"[🌍 Google Maps]({google_maps_url})"
else:
    google_clickable = " "

    
if coord:
    coord_name = "📍 Localisation"
    coord_body = adresse
else:
    coord_name = " "
    coord_body = " "



# ---------- 5. Préparer l'embed Discord ----------


filename = os.path.basename(img_path)

embed = {
    "title": "꧁⎝ 𓆩༺✧༻𓆪 ⎠꧂",
    "description": date_embed,
    "color": 25034,
    "author": {
        "name": username,
        "icon_url": usericon
    },
    "fields": [
        {
            "name": dessin_google_map,
            "value": google_clickable,
            "inline": False
        },
        {
            "name": coord_name,
            "value": coord_body,
            "inline": False
        }
    ],
    "image": {
        "url": f"attachment://{filename}"
    },
    "footer": {
        "text": "/ᐠ - ˕ -マ .݁₊ ⊹  ݁ ⟡ ݁ ⊹ ₊   ₍^. .^₎Ⳋ\n=^◕⩊◕^="
      }
}

payload = {"embeds": [embed]}

# ---------- 6. Envoyer à Discord ----------
with open(img_path, "rb") as f:
    files = {"file": (filename, f, "image/jpeg")}
    data = {"payload_json": json.dumps(payload, ensure_ascii=False)}
    response = requests.post(webhook_url, data=data, files=files)

# ---------- 7. Résultat ----------
if response.status_code == 204:
    print("[OK] Message envoyé à Discord avec succès !")
else:
    print(f"[ERREUR] Code {response.status_code}: {response.text}")