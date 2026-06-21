import { Html5Qrcode } from "html5-qrcode";

export async function startQrScanner(
  elementId: string,
  onDecode: (text: string) => void,
  onError?: (error: string) => void,
) {
  let backCameraId: string | null = null;

  try {
    const devices = await Html5Qrcode.getCameras();
    if (devices.length === 0) {
      onError?.("No se encontró ninguna cámara");
      return null;
    }
    const back = devices.find(
      (d) => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("trasera"),
    );
    backCameraId = back?.id || devices[0].id;
  } catch {
    onError?.("No se pudo acceder a la cámara");
    return null;
  }

  const scanner = new Html5Qrcode(elementId);

  try {
    await scanner.start(
      backCameraId ? { deviceId: backCameraId } : { facingMode: "environment" },
      { fps: 5 },
      (decodedText) => onDecode(decodedText.trim().toUpperCase()),
      () => {},
    );
    return scanner;
  } catch (err) {
    onError?.(err instanceof Error ? err.message : "Error al iniciar cámara");
    return null;
  }
}

export function stopQrScanner(scanner: Html5Qrcode | null) {
  if (scanner) {
    try { scanner.stop(); } catch {}
  }
}
