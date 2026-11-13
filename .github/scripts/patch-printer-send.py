from pathlib import Path

p = Path("android/app/src/main/java/com/karuhundeveloper/poskacaw/ThermalPrinterPlugin.java")
s = p.read_text()

# The source archive already sends 1024-byte chunks, but without pacing.
old_chunked = """            // إرسال دفعات صغيرة يقلل انقطاع بعض طابعات SPP مع الصور الطويلة.
            int offset = 0;
            while (offset < bytes.length) {
                int count = Math.min(1024, bytes.length - offset);
                out.write(bytes, offset, count);
                out.flush();
                offset += count;
            }
            // اترك وقتاً للطابعة لتفريغ الذاكرة المؤقتة قبل إغلاق الاتصال.
            try { Thread.sleep(Math.min(1500, Math.max(400, bytes.length / 300))); }
            catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }"""

new_chunked = """            // إرسال أبطأ بدفعات صغيرة حتى لا تتوقف الطابعة أثناء الفواتير الطويلة.
            int offset = 0;
            while (offset < bytes.length) {
                int count = Math.min(512, bytes.length - offset);
                out.write(bytes, offset, count);
                out.flush();
                offset += count;
                try {
                    Thread.sleep(12);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw new java.io.IOException("تم إيقاف إرسال بيانات الطباعة.", interrupted);
                }
            }
            // انتظر انتهاء الطابعة من استقبال آخر دفعة قبل إغلاق الاتصال.
            try { Thread.sleep(Math.min(2500, Math.max(900, bytes.length / 180))); }
            catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }"""

if old_chunked in s:
    s = s.replace(old_chunked, new_chunked, 1)
elif "Thread.sleep(12);" in s and "Math.min(512," in s:
    print("Bluetooth pacing patch already present; no change needed.")
else:
    raise SystemExit("Could not locate supported Bluetooth send loop; no source changed.")

p.write_text(s)
print("Bluetooth transfer patched: 512-byte chunks, 12ms pacing, and longer drain before socket close.")
