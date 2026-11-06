package com.claraboya.app;

import android.content.ContentValues;
import android.content.Context;
import android.graphics.Color;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
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
 * mantener la pantalla prendida y vibrar.
 */
public class MainActivity extends BridgeActivity {

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
