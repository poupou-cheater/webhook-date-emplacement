import requests
import json
import os

webhook_url = "https://discord.com/api/webhooks/1423929278093066241/_29tW4OOUQV6h6Yw0scIChzVoR2Sq_XWHxGUnsRe9JSm1qmmGRbCeJqvkYHAgI_-JYyC"

# 🖼️ Chemin vers ton image
image_path = r"C:\Users\nikki\Desktop\test\rien\python\discord.webhook\IMG_20251005_035103.jpg"

# 📄 Nom du fichier (important : doit correspondre exactement)
filename = os.path.basename(image_path)  # Ex: "IMG_20251005_035103.jpg"

# 🧾 Embed avec image intégrée
embed = {
    "title": "Photo :",
    "description": "date :\ntime :",
    "color": 39626,
    "author": {
        "name": "poupou",
        "icon_url": "https://cdn.discordapp.com/avatars/675790178123644969/6eee5abbe0f2255023e9cb7699030b79.webp?size=1024"
    },
    "image": {
        "url": f"attachment://{filename}"  # 🔑 Clé : référence l'image uploadée
    }
}

# 📦 Payload complet
payload = {
    "embeds": [embed]
    # Pas de "content" nécessaire, mais tu peux en ajouter si tu veux
}

# 📤 Envoi de la requête
with open(image_path, "rb") as f:
    files = {
        "file": (filename, f, "image/jpeg")  # ⚠️ Utilise "image/png" si c'est un .png
    }
    data = {
        "payload_json": json.dumps(payload, ensure_ascii=False)
    }
    response = requests.post(webhook_url, data=data, files=files)

# ✅ Vérification
if response.status_code == 204:
    print("✅ Embed avec image intégrée envoyé !")
else:
    print(f"❌ Erreur {response.status_code}: {response.text}")