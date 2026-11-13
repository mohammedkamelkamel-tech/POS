from pathlib import Path
p = Path("android/app/src/main/java/com/karuhundeveloper/poskacaw/ThermalPrinterPlugin.java")
s = p.read_text()
old = """            out.write(bytes);
            out.flush();
            // beri jeda supaya buffer benar-benar terkirim sebelum socket ditutup
            try { Thread.sleep(250); } catch (InterruptedException ignored) {}"""
new = """            // Kirim bertahap agar buffer kecil pada printer thermal Bluetooth
            // tidak penuh lalu memutus/mengehentikan cetakan di tengah struk.
            final int chunkSize = 512;
            for (int offset = 0; offset < bytes.length; offset += chunkSize) {
                int length = Math.min(chunkSize, bytes.length - offset);
                out.write(bytes, offset, length);
                out.flush();
                try {
                    Thread.sleep(12);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw new java.io.IOException("تم إيقاف إرسال بيانات الطباعة.", interrupted);
                }
            }
            // انتظر تصريف آخر جزء من بيانات الطباعة قبل إغلاق اتصال البلوتوث.
            try { Thread.sleep(700); } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }"""
if old not in s:
    raise SystemExit("Could not locate Bluetooth bulk-write block; no source changed.")
p.write_text(s.replace(old, new, 1))
print("Bluetooth receipt transfer now sends 512-byte chunks with pacing and a longer final drain.")
