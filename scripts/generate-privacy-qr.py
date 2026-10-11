"""Reproduce el QR institucional y comprueba su lectura con el logo incluido.

Dependencias: Pillow, qrcode==8.2, zxing-cpp==2.3.0.
El QR es un recurso estático: la app no necesita estas herramientas.
"""
from pathlib import Path
import hashlib
import json
import qrcode
import zxingcpp
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
DRAWABLE = ROOT / "apps/android/app/src/main/res/drawable-nodpi"
URL = "https://coesa.chiapas.gob.mx/proteccion-de-datos-personales/avisos-de-privacidad"


def main():
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=12, border=4)
    qr.add_data(URL)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    logo = Image.open(DRAWABLE / "logo_coesa.png").convert("RGBA")
    width = int(qr.modules_count * qr.box_size * 0.20)
    height = round(width * logo.height / logo.width)
    logo = logo.resize((width, height), Image.Resampling.LANCZOS)
    left = (image.width - width) // 2
    top = (image.height - height) // 2
    padding = qr.box_size
    ImageDraw.Draw(image).rectangle(
        (left - padding, top - padding, left + width + padding, top + height + padding), fill="white"
    )
    image.paste(logo, (left, top), logo)
    result = zxingcpp.read_barcode(image)
    if result is None or result.text != URL:
        raise RuntimeError("El QR con logo no se pudo leer correctamente.")
    output = DRAWABLE / "privacy_qr.png"
    image.save(output)
    metadata = {
        "url": URL, "errorCorrection": "H", "quietZoneModules": qr.border,
        "modules": qr.modules_count, "logoWidthRatio": 0.20,
        "logoSource": "logo_coesa.png", "decoded": result.text,
        "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
    }
    print(json.dumps(metadata, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
