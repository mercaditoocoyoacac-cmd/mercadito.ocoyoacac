package com.mercadito.ocoyoacac.app.compras;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Outline;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.os.Handler;
import android.os.Looper;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.ViewOutlineProvider;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

public class FloatingBubbleView extends View {

    interface Listener {
        void onMove(int deltaX, int deltaY);
        void onTap();
        void onLongPress();
        void onRelease();
    }

    private static final long LONG_PRESS_MS = 600L;
    private static final float BUBBLE_DP = 56f;
    private static final float VIEW_DP = 72f;

    private final Paint circlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint borderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable longPressRunnable = this::fireLongPress;
    private final int touchSlop;
    private final float density;

    private int count;
    private float downX;
    private float downY;
    private float lastX;
    private float lastY;
    private boolean dragging;
    private boolean longPressed;
    private Listener listener;

    FloatingBubbleView(Context context) {
        super(context);
        density = getResources().getDisplayMetrics().density;
        touchSlop = ViewConfiguration.get(context).getScaledTouchSlop();

        circlePaint.setColor(ContextCompat.getColor(context, R.color.colorPrimary));

        borderPaint.setColor(Color.argb(90, 255, 255, 255));
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setStrokeWidth(dp(1.5f));

        textPaint.setColor(Color.WHITE);
        textPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        textPaint.setTextAlign(Paint.Align.CENTER);

        setContentDescription("Sin pedidos pendientes");
        setClickable(true);
        setFocusable(true);
        setElevation(dp(10));
        setOutlineProvider(new ViewOutlineProvider() {
            @Override
            public void getOutline(View view, Outline outline) {
                int inset = Math.round(dp(8));
                outline.setOval(inset, inset, view.getWidth() - inset, view.getHeight() - inset);
            }
        });
    }

    void setListener(Listener listener) {
        this.listener = listener;
    }

    void setCount(int count) {
        this.count = Math.max(0, count);
        if (this.count == 0) {
            setContentDescription("Sin pedidos pendientes");
        } else if (this.count == 1) {
            setContentDescription("1 pedido pendiente");
        } else {
            setContentDescription(this.count + " pedidos pendientes");
        }
        invalidate();
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        int size = Math.round(dp(VIEW_DP));
        setMeasuredDimension(size, size);
    }

    @Override
    protected void onDraw(@NonNull Canvas canvas) {
        super.onDraw(canvas);
        float centerX = getWidth() / 2f;
        float centerY = getHeight() / 2f;
        float radius = dp(BUBBLE_DP) / 2f;

        canvas.drawCircle(centerX, centerY, radius, circlePaint);
        canvas.drawCircle(centerX, centerY, radius - borderPaint.getStrokeWidth() / 2f, borderPaint);

        if (count > 0) {
            String label = count > 99 ? "99+" : String.valueOf(count);
            textPaint.setTextSize(label.length() > 2 ? dp(15) : dp(20));
            float baseline = centerY - (textPaint.descent() + textPaint.ascent()) / 2f;
            canvas.drawText(label, centerX, baseline, textPaint);
        } else {
            canvas.drawCircle(centerX, centerY, dp(5), textPaint);
        }
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                downX = event.getRawX();
                downY = event.getRawY();
                lastX = downX;
                lastY = downY;
                dragging = false;
                longPressed = false;
                handler.postDelayed(longPressRunnable, LONG_PRESS_MS);
                return true;
            case MotionEvent.ACTION_MOVE:
                float totalX = Math.abs(event.getRawX() - downX);
                float totalY = Math.abs(event.getRawY() - downY);
                if (!dragging && totalX + totalY > touchSlop) {
                    dragging = true;
                    handler.removeCallbacks(longPressRunnable);
                    setAlpha(0.9f);
                }
                if (dragging) {
                    int deltaX = Math.round(event.getRawX() - lastX);
                    int deltaY = Math.round(event.getRawY() - lastY);
                    lastX = event.getRawX();
                    lastY = event.getRawY();
                    if (listener != null && (deltaX != 0 || deltaY != 0)) {
                        listener.onMove(deltaX, deltaY);
                    }
                }
                return true;
            case MotionEvent.ACTION_UP:
                handler.removeCallbacks(longPressRunnable);
                setAlpha(1f);
                if (dragging) {
                    if (listener != null) {
                        listener.onRelease();
                    }
                } else if (!longPressed) {
                    performClick();
                }
                return true;
            case MotionEvent.ACTION_CANCEL:
                handler.removeCallbacks(longPressRunnable);
                setAlpha(1f);
                if (dragging && listener != null) {
                    listener.onRelease();
                }
                return true;
            default:
                return super.onTouchEvent(event);
        }
    }

    @Override
    public boolean performClick() {
        super.performClick();
        if (listener != null) {
            listener.onTap();
        }
        return true;
    }

    private void fireLongPress() {
        if (!dragging) {
            longPressed = true;
            if (listener != null) {
                listener.onLongPress();
            }
        }
    }

    private float dp(float value) {
        return value * density;
    }
}
