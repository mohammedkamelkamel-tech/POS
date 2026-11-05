package com.karuhundeveloper.poskacaw;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

@CapacitorPlugin(name = "DeviceBiometric")
public class DeviceBiometricPlugin extends Plugin {
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private boolean authenticationInProgress = false;

    @PluginMethod
    public void availability(PluginCall call) {
        try {
            int result = BiometricManager.from(getContext()).canAuthenticate(
                BiometricManager.Authenticators.BIOMETRIC_WEAK
            );
            JSObject response = new JSObject();
            response.put("available", result == BiometricManager.BIOMETRIC_SUCCESS);
            response.put("reason", result);
            call.resolve(response);
        } catch (Exception error) {
            JSObject response = new JSObject();
            response.put("available", false);
            response.put("reason", -1);
            call.resolve(response);
        }
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        // BiometricPrompt must be created and started on Android's main UI thread.
        mainHandler.post(() -> {
            Activity activity = getActivity();
            if (activity == null || activity.isFinishing() ||
                (android.os.Build.VERSION.SDK_INT >= 17 && activity.isDestroyed())) {
                call.reject("تعذر فتح نافذة البصمة. أغلق التطبيق وافتحه مجدداً.", "biometric_activity_unavailable");
                return;
            }

            if (authenticationInProgress) {
                call.reject("طلب التحقق بالبصمة قيد التنفيذ بالفعل.", "biometric_busy");
                return;
            }

            int availability = BiometricManager.from(getContext()).canAuthenticate(
                BiometricManager.Authenticators.BIOMETRIC_WEAK
            );
            if (availability != BiometricManager.BIOMETRIC_SUCCESS) {
                call.reject("البصمة غير متاحة على هذا الجهاز. يمكنك استخدام الرقم السري.", "biometric_unavailable");
                return;
            }

            authenticationInProgress = true;
            Executor executor = ContextCompat.getMainExecutor(getContext());

            BiometricPrompt prompt = new BiometricPrompt(
                getActivity(),
                executor,
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                        authenticationInProgress = false;
                        call.resolve();
                    }

                    @Override
                    public void onAuthenticationError(int code, CharSequence message) {
                        authenticationInProgress = false;
                        String errorMessage = message == null
                            ? "تعذر التحقق بالبصمة. يمكنك استخدام الرقم السري."
                            : message.toString();
                        call.reject(errorMessage, "biometric_auth_error");
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        // Keep the system prompt open so the user can try another finger.
                    }
                }
            );

            BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("الكامل-كاشير")
                .setSubtitle("تحقق من هويتك لفتح التطبيق")
                .setNegativeButtonText("استخدام الرقم السري")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK)
                .build();

            try {
                prompt.authenticate(info);
            } catch (RuntimeException error) {
                authenticationInProgress = false;
                call.reject(
                    "تعذر تشغيل البصمة. يمكنك فتح التطبيق بالرقم السري.",
                    "biometric_start_failed"
                );
            }
        });
    }
}
