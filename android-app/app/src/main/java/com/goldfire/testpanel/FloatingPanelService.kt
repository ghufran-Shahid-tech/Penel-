package com.goldfire.testpanel

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import com.goldfire.testpanel.nativebridge.NativeTestEngine

/**
 * Optional draggable, collapsible, resizable floating QA overlay service.
 * Uses Android's supported TYPE_APPLICATION_OVERLAY only after explicit user consent.
 */
class FloatingPanelService : Service() {

    private lateinit var windowManager: WindowManager
    private var overlayView: View? = null
    private lateinit var layoutParams: WindowManager.LayoutParams
    private val nativeEngine = NativeTestEngine()

    private var isCollapsed = false
    private var isExpandedWidth = false

    companion object {
        private const val CHANNEL_ID = "goldfire_floating_panel_channel"
        private const val NOTIFICATION_ID = 7041
    }

    override fun onCreate() {
        super.onCreate()
        if (!Settings.canDrawOverlays(this)) {
            stopSelf()
            return
        }
        startForegroundNotification()
        attachFloatingWindow()
    }

    private fun startForegroundNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Gold Fire Floating QA Overlay",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.overlay_notification_title))
            .setContentText(getString(R.string.overlay_notification_body))
            .setSmallIcon(android.R.drawable.ic_menu_manage)
            .setOngoing(true)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun attachFloatingWindow() {
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        overlayView = LayoutInflater.from(this).inflate(R.layout.floating_panel_overlay, null)

        val density = resources.displayMetrics.density
        val compactWidth = (300 * density).toInt()
        val expandedWidth = (360 * density).toInt()

        layoutParams = WindowManager.LayoutParams(
            compactWidth,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = (24 * density).toInt()
            y = (120 * density).toInt()
        }

        val view = overlayView ?: return
        val dragHandle = view.findViewById<LinearLayout>(R.id.floatingDragHandle)
        val body = view.findViewById<LinearLayout>(R.id.floatingBody)
        val statusText = view.findViewById<TextView>(R.id.tvOverlayStatus)
        val btnMinimize = view.findViewById<Button>(R.id.btnMinimize)
        val btnResize = view.findViewById<Button>(R.id.btnResize)
        val btnClose = view.findViewById<Button>(R.id.btnClose)

        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f

        dragHandle.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = layoutParams.x
                    initialY = layoutParams.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    layoutParams.x = initialX + (event.rawX - initialTouchX).toInt()
                    layoutParams.y = initialY + (event.rawY - initialTouchY).toInt()
                    windowManager.updateViewLayout(view, layoutParams)
                    true
                }
                else -> false
            }
        }

        btnMinimize.setOnClickListener {
            isCollapsed = !isCollapsed
            body.visibility = if (isCollapsed) View.GONE else View.VISIBLE
            btnMinimize.text = if (isCollapsed) "+" else "—"
        }

        btnResize.setOnClickListener {
            isExpandedWidth = !isExpandedWidth
            layoutParams.width = if (isExpandedWidth) expandedWidth else compactWidth
            windowManager.updateViewLayout(view, layoutParams)
        }

        btnClose.setOnClickListener {
            stopSelf()
        }

        view.findViewById<Button>(R.id.btnQuickAim).setOnClickListener {
            val payload = nativeEngine.generateAimAnomalyPayload(820.0, 0.99, 14)
            statusText.text = "Aim Test dispatched · ${payload.take(44)}..."
        }

        view.findViewById<Button>(R.id.btnQuickMove).setOnClickListener {
            val payload = nativeEngine.generateMovementAnomalyPayload(2.85, 42.0, 16)
            statusText.text = "Move Test dispatched · ${payload.take(42)}..."
        }

        view.findViewById<Button>(R.id.btnQuickDamage).setOnClickListener {
            val payload = nativeEngine.generateDamageAnomalyPayload(380.0, 45.0, true)
            statusText.text = "Damage Test dispatched · ${payload.take(40)}..."
        }

        view.findViewById<Button>(R.id.btnQuickAntiCheat).setOnClickListener {
            val payload = nativeEngine.generateFireRateAnomalyPayload(1650, 600)
            statusText.text = "Suite pulse sent · ${payload.take(44)}..."
        }

        windowManager.addView(view, layoutParams)
    }

    override fun onDestroy() {
        overlayView?.let {
            windowManager.removeView(it)
            overlayView = null
        }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
