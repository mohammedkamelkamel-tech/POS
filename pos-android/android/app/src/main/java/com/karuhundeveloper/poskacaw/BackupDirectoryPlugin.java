package com.karuhundeveloper.poskacaw;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.activity.result.ActivityResult;

@CapacitorPlugin(name = "BackupDirectory")
public class BackupDirectoryPlugin extends Plugin {
    @PluginMethod
    public void choose(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "picked");
    }

    @ActivityCallback
    private void picked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != android.app.Activity.RESULT_OK || result.getData() == null) {
            call.reject("لم يتم اختيار مجلد"); return;
        }
        Uri uri = result.getData().getData();
        if (uri == null) { call.reject("المجلد غير صالح"); return; }
        int flags = result.getData().getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        getContext().getContentResolver().takePersistableUriPermission(uri, flags);
        getContext().getSharedPreferences("backup_settings", 0).edit().putString("tree_uri", uri.toString()).apply();
        JSObject ret = new JSObject();
        ret.put("uri", uri.toString());
        ret.put("name", uri.getLastPathSegment());
        call.resolve(ret);
    }

    @PluginMethod
    public void getSelected(PluginCall call) {
        String uri = getContext().getSharedPreferences("backup_settings", 0).getString("tree_uri", null);
        JSObject ret = new JSObject();
        ret.put("uri", uri);
        call.resolve(ret);
    }
}
