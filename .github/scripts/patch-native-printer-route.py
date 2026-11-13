from pathlib import Path

def remove_old_import(text):
    return "\n".join(line for line in text.splitlines()
                     if "import { printReceiptViaAndroid }" not in line) + "\n"

p = Path("src/pages/pos/PosPage.vue")
s = remove_old_import(p.read_text())
old = "    await printReceiptViaAndroid(job, { paperMm: usePrinterStore().paperMm, contentMm: usePrinterStore().contentMm, marginMm: usePrinterStore().marginMm, fontPx: usePrinterStore().fontPx })"
if old in s:
    s = s.replace(old, "    await printer.print(job)", 1)
elif "await printer.print(job)" not in s:
    raise SystemExit("Checkout print call not found.")
p.write_text(s)

p = Path("src/pages/transactions/TransactionDetailPage.vue")
s = remove_old_import(p.read_text())
start = s.find("async function printReceipt() {")
if start < 0:
    raise SystemExit("Transaction print function not found.")
brace = s.find("{", start)
depth = 0
end = -1
for i in range(brace, len(s)):
    if s[i] == "{": depth += 1
    elif s[i] == "}":
        depth -= 1
        if depth == 0:
            end = i + 1
            break
if end < 0:
    raise SystemExit("Transaction print function is malformed.")
fn = s[start:end]
if "printReceiptViaAndroid(" in fn:
    fn = fn.replace("await printReceiptViaAndroid(", "await printer.print(")
    fn = fn.replace("""    }),
    { paperMm: usePrinterStore().paperMm, contentMm: usePrinterStore().contentMm, marginMm: usePrinterStore().marginMm, fontPx: usePrinterStore().fontPx },
  )""", """    }),
  )""")
    s = s[:start] + fn + s[end:]
elif "await printer.print(" not in fn:
    raise SystemExit("Transaction print call not found.")
p.write_text(s)

p = Path("src/pages/printer/PrinterPage.vue")
s = remove_old_import(p.read_text())
old = "  await printReceiptViaAndroid(job, { paperMm: paperMm.value, contentMm: contentMm.value, marginMm: marginMm.value, fontPx: fontPx.value })"
if old in s:
    s = s.replace(old, """  if (!cap.value || !(await cap.value.isAvailable())) throw new Error('اختر الطابعة المقترنة من إعدادات البلوتوث أولاً.')
  await cap.value.print(job)""", 1)
elif "await cap.value.print(job)" not in s:
    raise SystemExit("Preview print call not found.")
p.write_text(s)

print("All actual receipt print actions now use the selected native ESC/POS printer.")
