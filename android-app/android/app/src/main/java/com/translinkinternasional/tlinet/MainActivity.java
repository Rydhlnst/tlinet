package com.translinkinternasional.tlinet;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

/**
 * Aplikasi TLINET membuka Portal Subnet (server.url di capacitor.config.json) di WebView. Di sini ditambahkan yang
 * tidak bisa dilakukan WebView sendiri: mencetak / menyimpan invoice sebagai PDF, membuka berkas unduhan di peramban,
 * dan tombol kembali yang menutup aplikasi dari Beranda.
 */
public class MainActivity extends BridgeActivity {

    private static final String PORTAL_HOME = "/subnet";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();

        // Dipakai PrintButton di halaman invoice: window.print() tidak berfungsi di WebView.
        webView.addJavascriptInterface(new PrintBridge(webView), "TLINETAndroid");

        // PDF dan berkas lain tidak bisa ditampilkan WebView; serahkan ke peramban atau penampil PDF.
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> openExternal(url));

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                Uri current = Uri.parse(webView.getUrl() == null ? "" : webView.getUrl());
                String path = current.getPath() == null ? "" : current.getPath().replaceAll("/+$", "");
                // Dari Beranda atau halaman masuk, kembali berarti keluar (riwayat sebelumnya hanya halaman masuk).
                if (path.equals(PORTAL_HOME) || path.startsWith(PORTAL_HOME + "/login") || !webView.canGoBack()) {
                    moveTaskToBack(true);
                } else {
                    webView.goBack();
                }
            }
        });
    }

    @Override
    public void onPause() {
        super.onPause();
        // Sesi masuk tersimpan di cookie; tulis ke disk supaya pelanggan tidak perlu masuk lagi setelah aplikasi ditutup.
        CookieManager.getInstance().flush();
    }

    private void openExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, "Tidak ada aplikasi untuk membuka berkas ini.", Toast.LENGTH_SHORT).show();
        }
    }

    private class PrintBridge {

        private final WebView webView;

        PrintBridge(WebView webView) {
            this.webView = webView;
        }

        @JavascriptInterface
        public void print(String title) {
            runOnUiThread(() -> {
                String jobName = title == null || title.isEmpty() ? "Invoice TLINET" : title;
                PrintManager printManager = (PrintManager) getSystemService(PRINT_SERVICE);
                PrintAttributes attributes = new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build();
                printManager.print(jobName, webView.createPrintDocumentAdapter(jobName), attributes);
            });
        }
    }
}
