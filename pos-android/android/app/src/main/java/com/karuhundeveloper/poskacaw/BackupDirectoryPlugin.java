package com.karuhundeveloper.poskacaw;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackupDirectory")
public class BackupDirectoryPlugin extends Plugin {
    private String savedTree() {
        return getContext().getSharedPreferences("backup_settings", 0).getString("tree_uri", null);
    }
    @PluginMethod public void choose(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, i, "picked");
    }
    @ActivityCallback private void picked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != android.app.Activity.RESULT_OK || result.getData() == null) { call.reject("لم يتم اختيار مجلد"); return; }
        Uri uri = result.getData().getData();
        if (uri == null) { call.reject("المجلد غير صالح"); return; }
        int flags = result.getData().getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        getContext().getContentResolver().takePersistableUriPermission(uri, flags);
        getContext().getSharedPreferences("backup_settings", 0).edit().putString("tree_uri", uri.toString()).apply();
        JSObject ret = new JSObject(); ret.put("uri", uri.toString()); ret.put("name", uri.getLastPathSegment()); call.resolve(ret);
    }
    @PluginMethod public void getSelected(PluginCall call) {
        JSObject ret = new JSObject(); ret.put("uri", savedTree()); call.resolve(ret);
    }
    private String find(Uri tree, String name) {
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree));
        try (Cursor c = getContext().getContentResolver().query(children, new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME}, null, null, null)) {
            if (c != null) while (c.moveToNext()) if (name.equals(c.getString(1))) return c.getString(0);
        } catch (Exception ignored) {}
        return null;
    }
    private Uri doc(Uri tree, String id) { return DocumentsContract.buildDocumentUriUsingTree(tree, id); }
    @PluginMethod public void writeText(PluginCall call) {
        String name=call.getString("name"), data=call.getString("data"), raw=savedTree();
        if(raw==null || name==null || data==null) { call.reject("حدد مجلد النسخ أولاً"); return; }
        try {
            Uri tree=Uri.parse(raw); String id=find(tree,name); Uri file;
            if(id==null) file=DocumentsContract.createDocument(getContext().getContentResolver(),doc(tree,DocumentsContract.getTreeDocumentId(tree)),"application/json",name);
            else file=doc(tree,id);
            if(file==null) throw new Exception("تعذر إنشاء الملف");
            try(OutputStream out=getContext().getContentResolver().openOutputStream(file,"wt")) { if(out==null) throw new Exception("تعذر فتح الملف"); out.write(data.getBytes(StandardCharsets.UTF_8)); }
            call.resolve();
        } catch(Exception e) { call.reject("فشل حفظ النسخة: "+e.getMessage()); }
    }
    @PluginMethod public void listFiles(PluginCall call) {
        String raw=savedTree(); if(raw==null){call.reject("حدد مجلد النسخ أولاً");return;}
        try {
            Uri tree=Uri.parse(raw), children=DocumentsContract.buildChildDocumentsUriUsingTree(tree,DocumentsContract.getTreeDocumentId(tree));
            JSArray files=new JSArray();
            try(Cursor c=getContext().getContentResolver().query(children,new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID,DocumentsContract.Document.COLUMN_DISPLAY_NAME,DocumentsContract.Document.COLUMN_SIZE},null,null,null)) {
                if(c!=null) while(c.moveToNext()) { String name=c.getString(1); if(name==null || !name.startsWith("alkamel-cashier-backup-") || !name.endsWith(".json")) continue; JSObject item=new JSObject(); item.put("name",name); item.put("size",c.isNull(2)?0:c.getLong(2)); files.put(item); }
            }
            JSObject ret=new JSObject(); ret.put("files",files); call.resolve(ret);
        } catch(Exception e){call.reject("تعذر قراءة المجلد: "+e.getMessage());}
    }
    @PluginMethod public void readText(PluginCall call) {
        String raw=savedTree(), name=call.getString("name"); if(raw==null||name==null){call.reject("بيانات القراءة ناقصة");return;}
        try {
            Uri tree=Uri.parse(raw); String id=find(tree,name); if(id==null) throw new Exception("الملف غير موجود");
            try(InputStream in=getContext().getContentResolver().openInputStream(doc(tree,id)); ByteArrayOutputStream out=new ByteArrayOutputStream()) {
                if(in==null) throw new Exception("تعذرت قراءة الملف"); byte[] b=new byte[8192]; int n; while((n=in.read(b))>0) out.write(b,0,n);
                JSObject ret=new JSObject(); ret.put("data",out.toString("UTF-8")); call.resolve(ret);
            }
        } catch(Exception e){call.reject("فشلت قراءة النسخة: "+e.getMessage());}
    }
    @PluginMethod public void deleteFile(PluginCall call) {
        String raw=savedTree(), name=call.getString("name"); if(raw==null||name==null){call.reject("بيانات الحذف ناقصة");return;}
        try { Uri tree=Uri.parse(raw); String id=find(tree,name); if(id==null) throw new Exception("الملف غير موجود"); if(!DocumentsContract.deleteDocument(getContext().getContentResolver(),doc(tree,id))) throw new Exception("تعذر الحذف"); call.resolve(); }
        catch(Exception e){call.reject("فشل حذف النسخة: "+e.getMessage());}
    }
}
