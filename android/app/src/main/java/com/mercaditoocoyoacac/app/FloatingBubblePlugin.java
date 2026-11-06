package com.mercaditoocoyoacac.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "FloatingBubble")
public class FloatingBubblePlugin extends Plugin {

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject result = new JSObject();
        result.put("supported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.O);
        call.resolve(result);
    }

    @PluginMethod
    public void hasPermission(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", canDrawOverlays());
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (canDrawOverlays()) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }

        Context context = getContext();
        Intent intent = new Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + context.getPackageName())
        );
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);

        JSObject result = new JSObject();
        result.put("granted", false);
        call.resolve(result);
    }

    @PluginMethod
    public void show(PluginCall call) {
        if (!canDrawOverlays()) {
            call.reject("overlay_permission");
            return;
        }

        Context context = getContext();
        Intent intent = new Intent(context, FloatingBubbleService.class);
        intent.setAction(FloatingBubbleService.ACTION_SHOW);
        intent.putExtra(FloatingBubbleService.EXTRA_COUNT, call.getInt("count", 0));
        intent.putExtra(FloatingBubbleService.EXTRA_TITLE, call.getString("title", "Pedidos pendientes"));
        intent.putExtra(FloatingBubbleService.EXTRA_BODY, call.getString("body", ""));
        intent.putExtra(FloatingBubbleService.EXTRA_URL, call.getString("url", ""));

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (RuntimeException error) {
            call.reject("bubble_start_failed");
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void hide(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, FloatingBubbleService.class);
        intent.setAction(FloatingBubbleService.ACTION_HIDE);
        try {
            context.startService(intent);
        } catch (RuntimeException error) {
            call.reject("bubble_stop_failed");
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void getState(PluginCall call) {
        Context context = getContext();
        JSObject result = new JSObject();
        result.put("running", FloatingBubbleService.isRunning(context));
        result.put("count", FloatingBubbleService.getCount(context));
        call.resolve(result);
    }

    private boolean canDrawOverlays() {
        return Settings.canDrawOverlays(getContext());
    }
}
