package com.alkamel.lahmpos;

import android.app.Activity;
import android.os.Bundle;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.widget.*;
import java.text.DecimalFormat;
import java.text.SimpleDateFormat;
import java.util.*;

public class MainActivity extends Activity {
    final int BG=0xFF09241F, PANEL=0xFF12332D, BORDER=0xFF244A42, TEAL=0xFF45A997, WHITE=0xFFF1F7F4, MUTED=0xFFA6BDB5, GOLD=0xFFE1B85A;
    Db db; LinearLayout root,body; int page=0; DecimalFormat fmt=new DecimalFormat("#,##0.##");
    @Override public void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(BG);getWindow().setNavigationBarColor(BG);db=new Db(this);seed();show(0);}
    void seed(){if(db.count()==0){db.add("لحم غنم",6500);db.add("لحم بقري",4800);db.add("كبدة",7000);db.add("مفروم",6000);db.add("شحم",2500);}}
    int dp(int n){return (int)(n*getResources().getDisplayMetrics().density+.5f);}
    GradientDrawable shape(int c){GradientDrawable d=new GradientDrawable();d.setColor(c);d.setCornerRadius(dp(15));d.setStroke(dp(1),BORDER);return d;}
    TextView label(String s,int size,int color,boolean bold){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(color);t.setGravity(Gravity.RIGHT|Gravity.CENTER_VERTICAL);t.setTypeface(null,bold?Typeface.BOLD:Typeface.NORMAL);t.setPadding(dp(8),dp(7),dp(8),dp(7));return t;}
    LinearLayout col(){LinearLayout l=new LinearLayout(this);l.setOrientation(1);return l;}
    LinearLayout row(){LinearLayout l=new LinearLayout(this);l.setOrientation(0);l.setGravity(Gravity.CENTER_VERTICAL);return l;}
    void card(View v){v.setBackground(shape(PANEL));v.setPadding(dp(10),dp(8),dp(10),dp(8));LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.bottomMargin=dp(9);body.addView(v,p);}
    EditText edit(String hint,boolean decimal){EditText e=new EditText(this);e.setSingleLine(true);e.setHint(hint);e.setTextColor(WHITE);e.setHintTextColor(MUTED);e.setGravity(Gravity.RIGHT|Gravity.CENTER_VERTICAL);e.setBackground(shape(PANEL));e.setInputType(decimal?8194:1);e.setPadding(dp(10),dp(6),dp(10),dp(6));return e;}
    Button btn(String s,Runnable r){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextColor(BG);b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(TEAL));b.setOnClickListener(v->r.run());return b;}
    void show(int p){page=p;root=col();root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);root.setBackgroundColor(BG);LinearLayout head=col();head.setPadding(dp(16),dp(12),dp(16),dp(6));head.addView(label("الكامل للحوم",24,WHITE,true));head.addView(label(p==0?"بيع وفاتورة سريعة":p==1?"الأصناف والأسعار":p==2?"التقارير اليومية":"حول التطبيق",14,MUTED,false));root.addView(head);
        ScrollView sc=new ScrollView(this);body=col();body.setPadding(dp(14),dp(8),dp(14),dp(12));sc.addView(body);root.addView(sc,new LinearLayout.LayoutParams(-1,0,1));
        LinearLayout nav=row();nav.setBackgroundColor(PANEL);String[] a={"البيع","الأصناف","التقارير","حول"};for(int i=0;i<a.length;i++){final int n=i;TextView t=label((p==i?"● ":"")+a[i],14,p==i?TEAL:MUTED,true);t.setGravity(Gravity.CENTER);nav.addView(t,new LinearLayout.LayoutParams(0,dp(52),1));t.setOnClickListener(v->show(n));}root.addView(nav);setContentView(root);
        if(p==0)sales();else if(p==1)products();else if(p==2)reports();else about();}
    void sales(){body.addView(label("فاتورة بيع جديدة",19,WHITE,true));Spinner sp=new Spinner(this);ArrayList<String> names=db.names();sp.setAdapter(new ArrayAdapter<String>(this,android.R.layout.simple_spinner_dropdown_item,names));card(sp);
        EditText weight=edit("الوزن بالكيلو (مثال 1.25)",true);card(weight);EditText price=edit("سعر الكيلو بالريال",true);card(price);TextView total=label("الإجمالي: 0 ريال",20,GOLD,true);total.setGravity(Gravity.CENTER);card(total);
        Button calc=btn("احسب الإجمالي",()->{try{double w=Double.parseDouble(weight.getText().toString()),pr=Double.parseDouble(price.getText().toString());if(w<=0||pr<0)throw new Exception();total.setText("الإجمالي: "+fmt.format(w*pr)+" ريال");}catch(Exception e){toast("أدخل الوزن والسعر بشكل صحيح");}});card(calc);
        EditText customer=edit("اسم العميل (اختياري)",false);card(customer);
        Button save=btn("حفظ الفاتورة نقدًا",()->{try{double w=Double.parseDouble(weight.getText().toString()),pr=Double.parseDouble(price.getText().toString());if(w<=0||pr<0)throw new Exception();db.sale(customer.getText().toString().trim(),(String)sp.getSelectedItem(),w,pr,w*pr);toast("تم حفظ الفاتورة محليًا");show(0);}catch(Exception e){toast("أدخل الوزن والسعر أولًا");}});card(save);
    }
    void products(){body.addView(label("إضافة صنف جديد",19,WHITE,true));EditText n=edit("اسم الصنف",false);card(n);EditText p=edit("سعر الكيلو بالريال",true);card(p);card(btn("حفظ الصنف",()->{try{String name=n.getText().toString().trim();double price=Double.parseDouble(p.getText().toString().trim());if(name.isEmpty()||price<0)throw new Exception();db.add(name,price);toast("تم حفظ الصنف");show(1);}catch(Exception e){toast("تحقق من اسم الصنف والسعر");}}));body.addView(label("الأصناف الحالية",18,WHITE,true));Cursor c=db.products();while(c.moveToNext()){LinearLayout r=row();r.addView(label(c.getString(1),16,WHITE,true),new LinearLayout.LayoutParams(0,-2,1));r.addView(label(fmt.format(c.getDouble(2))+" ر.ي/كجم",14,GOLD,true));card(r);}c.close();}
    void reports(){Cursor c=db.summary();c.moveToFirst();double sum=c.getDouble(0);int count=c.getInt(1);c.close();TextView t=label("مبيعات اليوم\n"+fmt.format(sum)+" ريال",22,GOLD,true);t.setGravity(Gravity.CENTER);card(t);card(label("عدد الفواتير اليوم: "+count,17,WHITE,true));body.addView(label("آخر الفواتير",18,WHITE,true));Cursor r=db.recent();while(r.moveToNext())card(label("#"+r.getInt(0)+"  "+r.getString(1)+" — "+fmt.format(r.getDouble(2))+" ريال",14,WHITE,false));r.close();}
    void about(){card(label("الكامل للحوم\nنظام بيع أولي يعمل دون إنترنت، ويحفظ الأصناف والفواتير على الهاتف.\n\nهذه نسخة مصدر أولية وتحتاج إلى اختبار وبناء قبل الاستخدام التجاري.",16,WHITE,false));}
    void toast(String s){Toast.makeText(this,s,Toast.LENGTH_SHORT).show();}
    static class Db extends SQLiteOpenHelper{
        Db(Activity a){super(a,"lahmpos.db",null,1);}
        public void onCreate(SQLiteDatabase d){d.execSQL("CREATE TABLE products(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,price REAL)");d.execSQL("CREATE TABLE sales(id INTEGER PRIMARY KEY AUTOINCREMENT,customer TEXT,name TEXT,weight REAL,price REAL,total REAL,date TEXT)");}
        public void onUpgrade(SQLiteDatabase d,int o,int n){}
        int count(){Cursor c=getReadableDatabase().rawQuery("SELECT COUNT(*) FROM products",null);c.moveToFirst();int n=c.getInt(0);c.close();return n;}
        void add(String n,double p){ContentValues v=new ContentValues();v.put("name",n);v.put("price",p);getWritableDatabase().insert("products",null,v);}
        ArrayList<String> names(){ArrayList<String>a=new ArrayList<>();Cursor c=getReadableDatabase().rawQuery("SELECT name FROM products ORDER BY id",null);while(c.moveToNext())a.add(c.getString(0));c.close();return a;}
        Cursor products(){return getReadableDatabase().rawQuery("SELECT id,name,price FROM products ORDER BY name",null);}
        void sale(String customer,String name,double w,double p,double total){ContentValues v=new ContentValues();v.put("customer",customer);v.put("name",name);v.put("weight",w);v.put("price",p);v.put("total",total);v.put("date",new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(new Date()));getWritableDatabase().insert("sales",null,v);}
        Cursor summary(){String date=new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(new Date());return getReadableDatabase().rawQuery("SELECT COALESCE(SUM(total),0),COUNT(*) FROM sales WHERE date=?",new String[]{date});}
        Cursor recent(){return getReadableDatabase().rawQuery("SELECT id, name, total FROM sales ORDER BY id DESC LIMIT 20",null);}
    }
}