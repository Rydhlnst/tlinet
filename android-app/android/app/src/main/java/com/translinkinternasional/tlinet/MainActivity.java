package com.translinkinternasional.tlinet;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Log;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Aplikasi TLINET membuka Portal Subnet (server.url di capacitor.config.json) di WebView. Di sini ditambahkan yang
 * tidak bisa dilakukan WebView sendiri: mencetak / menyimpan invoice sebagai PDF, notifikasi koneksi down, membuka berkas
 * unduhan di peramban, tombol kembali yang menutup aplikasi dari Beranda, dan memuat ulang portal bila aplikasi dibuka lagi
 * setelah lama di latar.
 */
public class MainActivity extends BridgeActivity {

    private static final String PORTAL_HOME = "/subnet";
    private static final String CONNECTION_CHANNEL = "connection";
    private static final int CONNECTION_NOTIFICATION = 1;

    /**
     * Aplikasi yang hanya diminimalkan tetap menampilkan halaman lama (data maupun tampilan sebelum situs diperbarui).
     * Setelah selama ini di latar, portal dimuat ulang saat dibuka lagi. Jeda singkat (mis. memilih foto profil atau
     * membuka WhatsApp) tidak memicu muat ulang supaya isian di halaman tidak hilang.
     */
    private static final long RELOAD_AFTER_MS = 5 * 60 * 1000;

    private long pausedAt = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();

        // window.print() dan Notification API tidak berfungsi di WebView: halaman memanggil TLINETAndroid.print / notify.
        webView.addJavascriptInterface(new AppBridge(webView), "TLINETAndroid");
        setupNotifications();

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
        pausedAt = SystemClock.elapsedRealtime();
    }

    @Override
    public void onResume() {
        super.onResume();
        if (pausedAt == 0) return;
        long away = SystemClock.elapsedRealtime() - pausedAt;
        pausedAt = 0;
        if (away >= RELOAD_AFTER_MS && getBridge() != null) {
            Log.d("TLINET", "Memuat ulang portal setelah " + (away / 1000) + " detik di latar");
            getBridge().getWebView().reload();
        }
    }

    /** Saluran notifikasi koneksi, dan izin notifikasi yang wajib diminta di Android 13 ke atas. */
    private void setupNotifications() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CONNECTION_CHANNEL, "Status koneksi", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Pemberitahuan saat koneksi internet down dan saat kembali normal.");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[] { Manifest.permission.POST_NOTIFICATIONS }, 1);
        }
    }

    private void showNotification(String title, String body) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        // Mengetuk notifikasi membuka aplikasi (halaman yang sedang terbuka, karena launchMode singleTask).
        Intent intent = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent open = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CONNECTION_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_tlinet)
            .setColor(0xFF1D4ED8)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(open)
            .setAutoCancel(true);
        // Satu nomor notifikasi: "kembali normal" menggantikan peringatan down sebelumnya.
        NotificationManagerCompat.from(this).notify(CONNECTION_NOTIFICATION, builder.build());
    }

    private void openExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, "Tidak ada aplikasi untuk membuka berkas ini.", Toast.LENGTH_SHORT).show();
        }
    }

    private class AppBridge {

        private final WebView webView;

        AppBridge(WebView webView) {
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

        @JavascriptInterface
        public void notify(String title, String body) {
            if (title == null || title.isEmpty()) return;
            runOnUiThread(() -> showNotification(title, body == null ? "" : body));
        }
    }
}
