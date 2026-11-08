package com.claraboya.app;

import android.app.DownloadManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Color;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Claraboya: la app es la web de las herramientas guardada adentro del teléfono.
 * Este puente le da lo que un navegador no tiene: guardar archivos en Descargas,
 * mantener la pantalla prendida, vibrar y actualizarse sola (bajar la APK nueva y abrir el instalador).
 */
public class MainActivity extends BridgeActivity {

    private static final String APK_UPDATE = "Claraboya-actualizacion.apk";
    private long descargaId = -1;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(Color.BLACK);
            getBridge().getWebView().addJavascriptInterface(new Puente(this), "ClaraboyaNativo");
        }
    }

    public class Puente {
        private final Context ctx;

        Puente(Context ctx) { this.ctx = ctx; }

        @JavascriptInterface
        public String version() {
            try {
                return ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public void pantallaEncendida(final boolean prendida) {
            runOnUiThread(() -> {
                if (prendida) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        @JavascriptInterface
        public void vibrar(int ms) {
            try {
                Vibrator v = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
                if (v == null) return;
                if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(Math.max(1, ms), VibrationEffect.DEFAULT_AMPLITUDE));
                else v.vibrate(Math.max(1, ms));
            } catch (Exception ignored) { }
        }

        /* ---------- actualización ---------- */

        /** ¿Android ya le dio permiso a Claraboya para instalar su actualización? */
        @JavascriptInterface
        public boolean puedeInstalar() {
            return Build.VERSION.SDK_INT < 26 || ctx.getPackageManager().canRequestPackageInstalls();
        }

        /** Abre el ajuste "Permitir de esta fuente" para Claraboya. */
        @JavascriptInterface
        public void pedirPermisoInstalar() {
            if (Build.VERSION.SDK_INT < 26) return;
            runOnUiThread(() -> {
                try {
                    Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + ctx.getPackageName()));
                    startActivity(i);
                } catch (Exception ignored) { }
            });
        }

        /** Empieza a bajar la APK nueva. Devuelve "bajando" o un mensaje de error. */
        @JavascriptInterface
        public String actualizar(String url) {
            try {
                DownloadManager dm = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
                if (dm == null) return "No se pudo bajar la actualización.";
                if (descargaId != -1) dm.remove(descargaId);
                File viejo = new File(ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), APK_UPDATE);
                if (viejo.exists()) viejo.delete();
                DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
                r.setTitle("Claraboya");
                r.setDescription("Bajando la versión nueva");
                r.setMimeType("application/vnd.android.package-archive");
                r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
                r.setDestinationInExternalFilesDir(ctx, Environment.DIRECTORY_DOWNLOADS, APK_UPDATE);
                descargaId = dm.enqueue(r);
                return "bajando";
            } catch (Exception e) {
                return "No se pudo bajar la actualización (" + e.getMessage() + ").";
            }
        }

        /** Estado de la descarga: {"estado":"bajando|listo|error|nada","progreso":0-100} */
        @JavascriptInterface
        public String estadoActualizacion() {
            if (descargaId == -1) return "{\"estado\":\"nada\",\"progreso\":0}";
            DownloadManager dm = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
            try (Cursor c = dm.query(new DownloadManager.Query().setFilterById(descargaId))) {
                if (c == null || !c.moveToFirst()) return "{\"estado\":\"error\",\"progreso\":0}";
                int st = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                long hecho = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                long total = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                int pct = total > 0 ? (int) Math.min(100, hecho * 100 / total) : 0;
                String estado = st == DownloadManager.STATUS_SUCCESSFUL ? "listo" : st == DownloadManager.STATUS_FAILED ? "error" : "bajando";
                return "{\"estado\":\"" + estado + "\",\"progreso\":" + (estado.equals("listo") ? 100 : pct) + "}";
            } catch (Exception e) {
                return "{\"estado\":\"error\",\"progreso\":0}";
            }
        }

        /** Abre el instalador de Android con la APK que se bajó. */
        @JavascriptInterface
        public String instalarActualizacion() {
            try {
                DownloadManager dm = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
                Uri apk;
                if (Build.VERSION.SDK_INT >= 24) {
                    apk = dm.getUriForDownloadedFile(descargaId);
                } else {
                    apk = Uri.fromFile(new File(ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), APK_UPDATE));
                }
                if (apk == null) return "No encontré la actualización bajada.";
                final Intent i = new Intent(Intent.ACTION_VIEW);
                i.setDataAndType(apk, "application/vnd.android.package-archive");
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                runOnUiThread(() -> startActivity(i));
                return "ok";
            } catch (Exception e) {
                return "No se pudo abrir el instalador (" + e.getMessage() + ").";
            }
        }

        /** Guarda un archivo en Descargas/Claraboya. Devuelve el mensaje para mostrar. */
        @JavascriptInterface
        public String guardarArchivo(String base64, String nombre, String mime) {
            try {
                byte[] datos = Base64.decode(base64, Base64.DEFAULT);
                String tipo = (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime;
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.Downloads.DISPLAY_NAME, nombre);
                    v.put(MediaStore.Downloads.MIME_TYPE, tipo);
                    v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Claraboya");
                    Uri uri = ctx.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    if (uri == null) return "No se pudo guardar el archivo.";
                    try (OutputStream out = ctx.getContentResolver().openOutputStream(uri)) {
                        if (out == null) return "No se pudo guardar el archivo.";
                        out.write(datos);
                    }
                } else {
                    File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "Claraboya");
                    if (!dir.exists() && !dir.mkdirs()) {
                        dir = ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                    }
                    File f = new File(dir, nombre);
                    try (FileOutputStream out = new FileOutputStream(f)) { out.write(datos); }
                    MediaScannerConnection.scanFile(ctx, new String[]{ f.getAbsolutePath() }, new String[]{ tipo }, null);
                }
                final String msg = "Guardado en Descargas/Claraboya: " + nombre;
                runOnUiThread(() -> Toast.makeText(ctx, msg, Toast.LENGTH_SHORT).show());
                return msg;
            } catch (Exception e) {
                return "No se pudo guardar el archivo (" + e.getMessage() + ").";
            }
        }
    }
}
