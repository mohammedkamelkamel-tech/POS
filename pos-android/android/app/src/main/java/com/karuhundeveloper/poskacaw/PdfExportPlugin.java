package com.karuhundeveloper.poskacaw;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PdfExport")
public class PdfExportPlugin extends Plugin {
    @PluginMethod
    public void printHtml(PluginCall call) {
        String html = call.getString("html");
        String filename = call.getString("filename", "تقرير الكامل-كاشير");
        if (html == null || html.trim().isEmpty()) {
            call.reject("لا توجد بيانات لإنشاء ملف PDF.");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                WebView webView = new WebView(getContext());
                webView.getSettings().setJavaScriptEnabled(false);
                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        PrintManager printManager = (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
                        String jobName = filename.replaceAll("[\\\\/:*?\"<>|]", "_");
                        PrintAttributes attributes = new PrintAttributes.Builder()
                                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                .setResolution(new PrintAttributes.Resolution("pdf", "PDF", 300, 300))
                                .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                                .build();
                        printManager.print(jobName, view.createPrintDocumentAdapter(jobName), attributes);
                        call.resolve();
                    }
                });
                webView.loadDataWithBaseURL("https://localhost/", html, "text/html", "UTF-8", null);
            } catch (Exception error) {
                call.reject("تعذر تجهيز ملف PDF: " + error.getMessage());
            }
        });
    }
}
