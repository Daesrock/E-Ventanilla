"""Lee el QR empaquetado y, opcionalmente, capturas completas de la aplicación.

Uso: python scripts/verify-privacy-qr.py [captura.png ...]
Dependencias: Pillow y zxing-cpp==2.3.0.
"""
from pathlib import Path
import sys
import zxingcpp
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = "https://coesa.chiapas.gob.mx/proteccion-de-datos-personales/avisos-de-privacidad"


def verify(path):
    results = zxingcpp.read_barcodes(Image.open(path).convert("RGB"))
    if not any(item.text == EXPECTED for item in results):
        raise RuntimeError(f"No se pudo leer el enlace de privacidad en {path.name}.")
    print(f"Lectura correcta: {path.name}")


if __name__ == "__main__":
    verify(ROOT / "apps/android/app/src/main/res/drawable-nodpi/privacy_qr.png")
    for argument in sys.argv[1:]:
        verify(Path(argument))
