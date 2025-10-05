import './style.css'
import exif from "exifreader";

const DEFAULT_CONFIG = {
  webhook_url: 'ur webhook',
  username: 'username',
  user_icon: 'image url',
  date_and_time: true,
  coordgoogle: true,
  coord: true
}

function loadConfig() {
  const saved = localStorage.getItem('discord-webhook-config')
  if (saved) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) }
    } catch {
      return DEFAULT_CONFIG
    }
  }
  return DEFAULT_CONFIG
}

let currentConfig = loadConfig()

// Send image to Discord webhook
async function sendImageToDiscord(file: File, config: typeof DEFAULT_CONFIG) {
  const exifData = exif.load(await file.arrayBuffer())
  if (!exifData) {
    console.log("No EXIF data found in the image.");
    return { success: false, message: 'No EXIF data found in the image.' }
  }
  let dateString = exifData['DateTime']?.value?.toString();
  if (dateString) {
    // EXIF DateTime format: "YYYY:MM:DD HH:MM:SS"
    dateString = dateString.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
  } else {
    dateString = new Date().toISOString();
  }
  const date = new Date(dateString);

  console.log("Extracted EXIF Data:", exifData);


  // Format date as "Date: DD-MM-YYYY\nHeure: HHhMM"
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  const formattedDate = `Date: ${day}-${month}-${year}\nHeure: ${hours}h${minutes}:${seconds}`;

  // Helper to convert EXIF GPS coordinates to decimal
  function exifCoordToDecimal(coord: any, ref: string | undefined): number | null {
    if (!coord || !Array.isArray(coord.value) || coord.value.length !== 3) return null;
    // Each value is an array: [numerator, denominator]
    function rationalPairToNumber(pair: any): number {
      if (Array.isArray(pair) && pair.length === 2 && typeof pair[0] === 'number' && typeof pair[1] === 'number' && pair[1] !== 0) {
        return pair[0] / pair[1];
      }
      return NaN;
    }
    const [deg, min, sec] = coord.value.map(rationalPairToNumber);
    if ([deg, min, sec].some(isNaN)) return null;
    let decimal = deg + min / 60 + sec / 3600;
    if (ref === 'S' || ref === 'W') decimal = -decimal;
    return decimal;
  }

  // Extracts the ref string from EXIFReader's GPS ref field
  function getGpsRef(refObj: any): string | undefined {
    if (!refObj) return undefined;
    if (typeof refObj === 'string') return refObj;
    if (Array.isArray(refObj.value) && typeof refObj.value[0] === 'string') return refObj.value[0];
    if (typeof refObj.value === 'string') return refObj.value;
    if (typeof refObj.description === 'string') return refObj.description;
    return undefined;
  }

  const latitude = exifCoordToDecimal(exifData['GPSLatitude'], getGpsRef(exifData['GPSLatitudeRef']));
  const longitude = exifCoordToDecimal(exifData['GPSLongitude'], getGpsRef(exifData['GPSLongitudeRef']));
  const googleMapsLink = (latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude))
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : null;
  // Prepare fields for the embed
  let date_embed = '';
  let dessin_google_map = '';
  let google_clickable = '';
  let coord_name = '';
  let coord_body = '';
  const filename = file.name;

  // Date and time
  if (config.date_and_time) {
    date_embed = formattedDate;
    dessin_google_map = "ദ്ദി(˵ •̀ ᴗ - ˵ ) ✧\n(˶˃⤙˂˶)";
  } else {
    date_embed = " ";
    dessin_google_map = " ";
  }

  // Google Maps clickable link
  if (config.coordgoogle && googleMapsLink) {
    google_clickable = `[🌍 Google Maps](${googleMapsLink})`;
  } else {
    google_clickable = " ";
  }

  // Reverse geocoding (address)
  let adresse = "Adresse inconnue";
  if (config.coord && latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude)) {
    try {
      // Use Nominatim API for reverse geocoding
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=fr`, {
        headers: { 'User-Agent': 'photo_metadata_app' }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.display_name) {
          adresse = data.display_name;
        }
      }
    } catch (e) {
      // Ignore geocoding errors
    }
    coord_name = "📍 Localisation";
    coord_body = adresse;
  } else {
    coord_name = " ";
    coord_body = " ";
  }

  // Compose the embed object
  const embed = {
    title: "꧁⎝ 𓆩༺✧༻𓆪 ⎠꧂",
    description: date_embed,
    color: 25034,
    author: {
      name: config.username,
      icon_url: config.user_icon
    },
    fields: [
      {
        name: dessin_google_map,
        value: google_clickable,
        inline: false
      },
      {
        name: coord_name,
        value: coord_body,
        inline: false
      }
    ],
    image: {
      url: `attachment://${filename}`
    },
    footer: {
      text: "/ᐠ - ˕ -マ .݁₊ ⊹  ݁ ⟡ ݁ ⊹ ₊   ₍^. .^₎Ⳋ\n=^◕⩊◕^="
    }
  };

  console.log("Prepared Embed:", embed);

  const formData = new FormData()
  formData.append('file', file)
  formData.append('payload_json', JSON.stringify({
    username: config.username,
    avatar_url: config.user_icon,
    embeds: [embed]
  }))

  const response = await fetch(config.webhook_url, {
    method: 'POST',
    body: formData
  })

  if (response.ok) {
    return { success: true, message: 'Image sent successfully!' }
  } else {
    return { success: false, message: `Error: ${response.status} ${response.statusText}` }
  }
}

// Image preview
const fileInput = document.getElementById('fileInput') as HTMLInputElement
const imagePreview = document.getElementById('imagePreview') as HTMLDivElement

fileInput.addEventListener('change', () => {
  imagePreview.innerHTML = ''
  const file = fileInput.files?.[0]
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = document.createElement('img')
      img.src = e.target?.result as string
      img.style.maxWidth = '200px'
      img.style.maxHeight = '200px'
      imagePreview.appendChild(img)
    }
    reader.readAsDataURL(file)
  }
})

// Form submission
const webhookForm = document.getElementById('webhookForm') as HTMLFormElement
const statusDiv = document.getElementById('status') as HTMLDivElement
const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement

webhookForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  statusDiv.innerHTML = ''
  const file = fileInput.files?.[0]

  if (!file) {
    statusDiv.innerHTML = '<div class="error">Please select an image file.</div>'
    return
  }

  sendBtn.disabled = true
  sendBtn.innerHTML = '<span class="btn-text">Sending...</span>'
  statusDiv.innerHTML = '<div class="loading">Sending image...</div>'

  const result = await sendImageToDiscord(file, currentConfig)

  if (result.success) {
    statusDiv.innerHTML = `<div class="success">${result.message}</div>`
    webhookForm.reset()
    imagePreview.innerHTML = ''
  } else {
    statusDiv.innerHTML = `<div class="error">${result.message}</div>`
  }

  sendBtn.disabled = false
  sendBtn.innerHTML = '<span class="btn-text">Send Image to Discord</span>'
})

// Get references to new inputs
const usernameInput = document.getElementById('usernameInput') as HTMLInputElement;
const iconUrlInput = document.getElementById('iconUrlInput') as HTMLInputElement;
const dateTimeCheckbox = document.getElementById('dateTimeCheckbox') as HTMLInputElement;
const coordinatesCheckbox = document.getElementById('coordinatesCheckbox') as HTMLInputElement;
const googleMapsCheckbox = document.getElementById('googleMapsCheckbox') as HTMLInputElement;
const webhookUrlInput = document.getElementById('webhookUrl') as HTMLInputElement;

// Update config and localStorage when inputs change
function updateConfigFromInputs() {
  currentConfig.username = usernameInput.value;
  currentConfig.user_icon = iconUrlInput.value;
  currentConfig.date_and_time = dateTimeCheckbox.checked;
  currentConfig.coord = coordinatesCheckbox.checked;
  currentConfig.coordgoogle = googleMapsCheckbox.checked;
  currentConfig.webhook_url = webhookUrlInput.value;

  // Save all feature checkboxes as a features object in localStorage
  const features = {
    date_and_time: dateTimeCheckbox.checked,
    coord: coordinatesCheckbox.checked,
    coordgoogle: googleMapsCheckbox.checked
  };
  currentConfig.features = features; // Optionally keep in config object

  localStorage.setItem('discord-webhook-config', JSON.stringify(currentConfig));
  localStorage.setItem('discord-webhook-features', JSON.stringify(features));

  // Optionally update UI username/avatar
  const currentUsernameSpan = document.getElementById('currentUsername');
  if (currentUsernameSpan) currentUsernameSpan.textContent = currentConfig.username;
  const userAvatarImg = document.getElementById('userAvatar') as HTMLImageElement;
  if (userAvatarImg) userAvatarImg.src = currentConfig.user_icon;
}

// On load, restore feature checkboxes from localStorage if present
const savedFeatures = localStorage.getItem('discord-webhook-features');
if (savedFeatures) {
  try {
    const features = JSON.parse(savedFeatures);
    if (typeof features.date_and_time === 'boolean') dateTimeCheckbox.checked = features.date_and_time;
    if (typeof features.coord === 'boolean') coordinatesCheckbox.checked = features.coord;
    if (typeof features.coordgoogle === 'boolean') googleMapsCheckbox.checked = features.coordgoogle;
  } catch {}
}

// Set initial values from config (in case of reload)
usernameInput.value = currentConfig.username;
iconUrlInput.value = currentConfig.user_icon;
dateTimeCheckbox.checked = currentConfig.date_and_time;
coordinatesCheckbox.checked = currentConfig.coord;
googleMapsCheckbox.checked = currentConfig.coordgoogle;
webhookUrlInput.value = currentConfig.webhook_url;

// Add listeners
usernameInput.addEventListener('input', updateConfigFromInputs);
iconUrlInput.addEventListener('input', updateConfigFromInputs);
dateTimeCheckbox.addEventListener('change', updateConfigFromInputs);
coordinatesCheckbox.addEventListener('change', updateConfigFromInputs);
googleMapsCheckbox.addEventListener('change', updateConfigFromInputs);
webhookUrlInput.addEventListener('input', updateConfigFromInputs);