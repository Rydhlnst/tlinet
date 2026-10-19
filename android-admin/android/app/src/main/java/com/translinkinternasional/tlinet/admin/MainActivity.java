package com.translinkinternasional.tlinet.admin;

import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.SystemClock;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.util.Log;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

/**
 * Aplikasi internal TLINET Admin membuka dashboard /admin (server.url di capacitor.config.json) di WebView. Di sini
 * ditambahkan yang tidak bisa dilakukan WebView sendiri: mencetak / menyimpan invoice sebagai PDF, mengunduh berkas
 * dashboard (mis. bukti transfer) dengan sesi login yang sama, tombol kembali yang menutup aplikasi dari halaman awal,
 * dan memuat ulang dashboard bila aplikasi dibuka lagi setelah lama di latar.
 */
public class MainActivity extends BridgeActivity {

    private static final String DASHBOARD_HOME = "/admin";

    /** Setelah selama ini di latar, dashboard dimuat ulang saat dibuka lagi supaya datanya tidak basi. */
    private static final long RELOAD_AFTER_MS = 5 * 60 * 1000;

    private long pausedAt = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();

        // Dipakai PrintButton di halaman invoice: window.print() tidak berfungsi di WebView.
        webView.addJavascriptInterface(new PrintBridge(webView), "TLINETAndroid");

        // Berkas dari dashboard sendiri butuh cookie sesi, jadi diunduh di dalam aplikasi; tautan lain ke peramban.
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            String appHost = Uri.parse(getBridge().getServerUrl()).getHost();
            if (appHost != null && appHost.equals(Uri.parse(url).getHost())) {
                download(url, userAgent, contentDisposition, mimeType);
            } else {
                openExternal(url);
            }
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                Uri current = Uri.parse(webView.getUrl() == null ? "" : webView.getUrl());
                String path = current.getPath() == null ? "" : current.getPath().replaceAll("/+$", "");
                // Dari halaman awal atau halaman masuk, kembali berarti keluar dari aplikasi.
                if (path.equals(DASHBOARD_HOME) || path.startsWith(DASHBOARD_HOME + "/login") || !webView.canGoBack()) {
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
        // Sesi masuk tersimpan di cookie; tulis ke disk supaya tidak perlu masuk lagi setelah aplikasi ditutup.
        CookieManager.getInstance().flush();
        pausedAt = SystemClock.elapsedRealtime();
    }

    @Override
    public void onResume() {
        super.onResume();
        if (pausedAt == 0) return;
        long away = SystemClock.elapsedRealtime() - pausedAt;
        pausedAt = 0;
        if (away >= RELOAD_AFTER_MS && getBridge() != null) {
            Log.d("TLINET", "Memuat ulang dashboard setelah " + (away / 1000) + " detik di latar");
            getBridge().getWebView().reload();
        }
    }

    /** Mengunduh ke folder Download HP lewat DownloadManager, dengan cookie sesi dashboard. */
    private void download(String url, String userAgent, String contentDisposition, String mimeType) {
        try {
            String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url))
                .addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url))
                .addRequestHeader("User-Agent", userAgent)
                .setMimeType(mimeType)
                .setTitle(fileName)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
            ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(request);
            Toast.makeText(this, "Mengunduh " + fileName, Toast.LENGTH_SHORT).show();
        } catch (RuntimeException e) {
            Log.w("TLINET", "Unduhan gagal", e);
            Toast.makeText(this, "Berkas tidak bisa diunduh.", Toast.LENGTH_SHORT).show();
        }
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
