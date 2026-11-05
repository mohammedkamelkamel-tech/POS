package com.karuhundeveloper.poskacaw;
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
 @PluginMethod public void availability(PluginCall call) {
  int result=BiometricManager.from(getContext()).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);
  JSObject response=new JSObject(); response.put("available",result==BiometricManager.BIOMETRIC_SUCCESS); response.put("reason",result); call.resolve(response);
 }
 @PluginMethod public void authenticate(PluginCall call) {
  int result=BiometricManager.from(getContext()).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);
  if(result!=BiometricManager.BIOMETRIC_SUCCESS){call.reject("البصمة غير متاحة على هذا الجهاز","biometric_unavailable");return;}
  Executor executor=ContextCompat.getMainExecutor(getContext());
  BiometricPrompt prompt=new BiometricPrompt(getActivity(),executor,new BiometricPrompt.AuthenticationCallback(){
   @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result){call.resolve();}
   @Override public void onAuthenticationError(int code,CharSequence message){call.reject(message==null?"تعذر التحقق بالبصمة":message.toString(),"biometric_auth_error");}
  });
  BiometricPrompt.PromptInfo info=new BiometricPrompt.PromptInfo.Builder().setTitle("الكامل-كاشير").setSubtitle("تحقق من هويتك لفتح التطبيق").setNegativeButtonText("استخدام الرقم السري").setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK).build();
  prompt.authenticate(info);
 }
}