package com.hndpay.app;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.view.Window;
import androidx.core.content.FileProvider;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "HndNative")
public class HndNativePlugin extends Plugin {
    private final Handler h = new Handler(Looper.getMainLooper());
    private long dlId = -1;

    /** Applies bar colours/icons. Also used by MainActivity at start-up. */
    public static void applyBars(android.app.Activity a, boolean dark) {
        int bg = dark ? 0xFF0F1012 : 0xFFFFFFFF;
        Window w = a.getWindow();
        View content = a.findViewById(android.R.id.content);
        if (content != null) content.setBackgroundColor(bg);
        w.getDecorView().setBackgroundColor(bg);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(w, w.getDecorView());
        c.setAppearanceLightStatusBars(!dark);
        c.setAppearanceLightNavigationBars(!dark);
    }

    @SuppressWarnings("deprecation")
    @PluginMethod
    public void getInfo(PluginCall call) {
        try {
            Context ctx = getContext();
            PackageInfo p = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            JSObject o = new JSObject();
            o.put("version", p.versionName);
            o.put("build", p.versionCode);
            call.resolve(o);
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    @PluginMethod
    public void setBars(final PluginCall call) {
        final boolean dark = Boolean.TRUE.equals(call.getBoolean("dark", false));
        getActivity().runOnUiThread(() -> {
            applyBars(getActivity(), dark);
            call.resolve();
        });
    }

    @PluginMethod
    public void tick(final PluginCall call) {
        getActivity().runOnUiThread(() -> {
            View v = getBridge().getWebView();
            if (v != null) v.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP);
            call.resolve();
        });
    }

    @PluginMethod
    public void exit(PluginCall call) {
        getActivity().moveTaskToBack(true);
        call.resolve();
    }

    @PluginMethod
    public void install(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.startsWith("https://")) {
            call.reject("bad url");
            return;
        }
        final Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= 26 && !ctx.getPackageManager().canRequestPackageInstalls()) {
            Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + ctx.getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(i);
            JSObject o = new JSObject();
            o.put("status", "permission");
            call.resolve(o);
            return;
        }
        File dir = ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        final File f = new File(dir, "HnDPaY-update.apk");
        if (f.exists()) f.delete();
        DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
        r.setTitle("HnDPaY update");
        r.setMimeType("application/vnd.android.package-archive");
        r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
        r.setDestinationUri(Uri.fromFile(f));
        DownloadManager dm = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
        dlId = dm.enqueue(r);
        poll(f);
        JSObject o = new JSObject();
        o.put("status", "started");
        call.resolve(o);
    }

    private void poll(final File f) {
        h.postDelayed(() -> {
            Context ctx = getContext();
            DownloadManager dm = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
            Cursor q = dm.query(new DownloadManager.Query().setFilterById(dlId));
            if (q == null || !q.moveToFirst()) {
                if (q != null) q.close();
                notifyListeners("failed", new JSObject());
                return;
            }
            int st = q.getInt(q.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            long got = q.getLong(q.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            long tot = q.getLong(q.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
            q.close();
            JSObject o = new JSObject();
            o.put("pct", tot > 0 ? (int) (got * 100 / tot) : 0);
            if (st == DownloadManager.STATUS_SUCCESSFUL) {
                o.put("pct", 100);
                notifyListeners("progress", o);
                launchInstaller(ctx, f);
                notifyListeners("done", new JSObject());
                return;
            }
            if (st == DownloadManager.STATUS_FAILED) {
                notifyListeners("failed", new JSObject());
                return;
            }
            notifyListeners("progress", o);
            poll(f);
        }, 400);
    }

    private void launchInstaller(Context ctx, File f) {
        Uri u = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", f);
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(u, "application/vnd.android.package-archive");
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        ctx.startActivity(i);
    }
}
