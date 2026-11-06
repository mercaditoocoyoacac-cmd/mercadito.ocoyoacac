package com.mercaditoocoyoacac.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.WindowManager;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class FloatingBubbleService extends Service implements FloatingBubbleView.Listener {

    static final String ACTION_SHOW = "com.mercaditoocoyoacac.app.action.SHOW_BUBBLE";
    static final String ACTION_HIDE = "com.mercaditoocoyoacac.app.action.HIDE_BUBBLE";
    static final String EXTRA_COUNT = "count";
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_BODY = "body";
    static final String EXTRA_URL = "url";

    private static final String PREFS = "floating_bubble";
    private static final String KEY_RUNNING = "running";
    private static final String KEY_COUNT = "count";
    private static final String KEY_TITLE = "title";
    private static final String KEY_URL = "url";
    private static final String KEY_X = "x";
    private static final String KEY_Y = "y";
    private static final String CHANNEL_ID = "floating_bubble";
    private static final int NOTIFICATION_ID = 7411;

    private WindowManager windowManager;
    private FloatingBubbleView bubbleView;
    private WindowManager.LayoutParams params;
    private int count;
    private String title = "Pedidos pendientes";
    private String url = "";

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_HIDE.equals(intent.getAction())) {
            shutDown();
            return START_NOT_STICKY;
        }

        if (!canDrawOverlays()) {
            shutDown();
            return START_NOT_STICKY;
        }

        if (intent != null) {
            count = intent.getIntExtra(EXTRA_COUNT, count);
            String nextTitle = intent.getStringExtra(EXTRA_TITLE);
            String nextUrl = intent.getStringExtra(EXTRA_URL);
            if (nextTitle != null && !nextTitle.isEmpty()) {
                title = nextTitle;
            }
            if (nextUrl != null && !nextUrl.isEmpty()) {
                url = nextUrl;
            }
        } else {
            SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
            count = prefs.getInt(KEY_COUNT, 0);
            title = prefs.getString(KEY_TITLE, title);
            url = prefs.getString(KEY_URL, url);
        }

        persistState(true);
        try {
            startForeground(NOTIFICATION_ID, buildNotification());
        } catch (RuntimeException error) {
            shutDown();
            return START_NOT_STICKY;
        }
        ensureView();
        updateView();
        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        removeView();
        persistState(false);
        super.onDestroy();
    }

    @Override
    public void onMove(int deltaX, int deltaY) {
        if (params == null || bubbleView == null) {
            return;
        }
        params.x += deltaX;
        params.y += deltaY;
        clampPosition();
        windowManager.updateViewLayout(bubbleView, params);
    }

    @Override
    public void onTap() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (!url.isEmpty()) {
            intent.putExtra(EXTRA_URL, url);
        }
        startActivity(intent);
    }

    @Override
    public void onLongPress() {
        shutDown();
    }

    @Override
    public void onRelease() {
        if (params == null || bubbleView == null) {
            return;
        }
        int screenWidth = getResources().getDisplayMetrics().widthPixels;
        int margin = dp(4);
        if (params.x + params.width / 2 < screenWidth / 2) {
            params.x = margin;
        } else {
            params.x = screenWidth - params.width - margin;
        }
        clampPosition();
        windowManager.updateViewLayout(bubbleView, params);
        getSharedPreferences(PREFS, MODE_PRIVATE)
            .edit()
            .putInt(KEY_X, params.x)
            .putInt(KEY_Y, params.y)
            .apply();
    }

    static boolean isRunning(android.content.Context context) {
        return context.getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(KEY_RUNNING, false);
    }

    static int getCount(android.content.Context context) {
        return context.getSharedPreferences(PREFS, MODE_PRIVATE).getInt(KEY_COUNT, 0);
    }

    private void ensureView() {
        if (bubbleView != null) {
            return;
        }
        bubbleView = new FloatingBubbleView(this);
        bubbleView.setListener(this);
        bubbleView.setCount(count);

        int size = Math.round(dp(72));
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        params = new WindowManager.LayoutParams(
            size,
            size,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;

        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        params.x = prefs.getInt(KEY_X, -1);
        params.y = prefs.getInt(KEY_Y, -1);
        if (params.x < 0) {
            params.x = getResources().getDisplayMetrics().widthPixels - size - dp(4);
        }
        if (params.y < 0) {
            params.y = Math.round(getResources().getDisplayMetrics().heightPixels * 0.45f);
        }
        clampPosition();

        try {
            windowManager.addView(bubbleView, params);
        } catch (RuntimeException error) {
            bubbleView = null;
            params = null;
            stopSelf();
        }
    }

    private void updateView() {
        if (bubbleView != null) {
            bubbleView.setCount(count);
        }
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, buildNotification());
        }
    }

    private void removeView() {
        if (bubbleView != null && windowManager != null) {
            try {
                windowManager.removeView(bubbleView);
            } catch (RuntimeException ignored) {
            }
        }
        bubbleView = null;
        params = null;
    }

    private void shutDown() {
        removeView();
        persistState(false);
        stopForeground(true);
        stopSelf();
    }

    private void persistState(boolean running) {
        getSharedPreferences(PREFS, MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_RUNNING, running)
            .putInt(KEY_COUNT, count)
            .putString(KEY_TITLE, title)
            .putString(KEY_URL, url)
            .apply();
    }

    private void clampPosition() {
        if (params == null) {
            return;
        }
        int screenWidth = getResources().getDisplayMetrics().widthPixels;
        int screenHeight = getResources().getDisplayMetrics().heightPixels;
        params.x = Math.max(0, Math.min(params.x, screenWidth - params.width));
        params.y = Math.max(0, Math.min(params.y, screenHeight - params.height));
    }

    private boolean canDrawOverlays() {
        return Settings.canDrawOverlays(this);
    }

    private Notification buildNotification() {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (!url.isEmpty()) {
            openIntent.putExtra(EXTRA_URL, url);
        }
        PendingIntent contentIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String detail = count > 0
            ? (count == 1 ? "1 pedido pendiente" : count + " pedidos pendientes")
            : "Burbuja activa";

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_bubble)
            .setContentTitle(title)
            .setContentText(detail)
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .setShowWhen(false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Burbuja flotante",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Mantiene visible la burbuja de pedidos pendientes");
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
