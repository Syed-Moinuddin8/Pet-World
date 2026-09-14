# 🗄️ Database Persistence Guide - Fixing Data Loss on Deployment

## 🔴 **Current Problem**

Every time you push code to GitHub and Vercel redeploys:
- ❌ All sales data is lost
- ❌ Deleted items come back
- ❌ Inventory changes are reset
- ❌ Staff updates disappear

**Why?** The app uses `data/petworld_db.json` which is reset to the Git version on every deployment.

---

## ✅ **SOLUTION: Use Supabase Database**

Your app is already configured to use Supabase! You just need to set it up.

### **Step 1: Create a Supabase Account**

1. Go to https://supabase.com/
2. Click "Start your project"
3. Sign up with GitHub (free tier is perfect)
4. Create a new project:
   - **Name:** `pet-world-db`
   - **Database Password:** Choose a strong password (save it!)
   - **Region:** Choose closest to you (e.g., Mumbai, Singapore)
   - Wait 2-3 minutes for project creation

---

### **Step 2: Get Your Supabase Credentials**

1. In your Supabase dashboard, go to **Project Settings** (⚙️ icon)
2. Click **API** in the left sidebar
3. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

---

### **Step 3: Set Up Database Schema**

1. In Supabase dashboard, click **SQL Editor** (icon on left)
2. Click **+ New Query**
3. Copy and paste this SQL schema:

```sql
-- =========================================================
-- THE PET WORLD - SUPABASE POSTGRESQL SCHEMA
-- =========================================================

-- Master Collections Table (Enables instant sync)
CREATE TABLE IF NOT EXISTS public.petworld_collections (
    collection_name TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.petworld_collections ENABLE ROW LEVEL SECURITY;

-- Allow public read-write
CREATE POLICY "Allow public read-write for PetWorld collections"
    ON public.petworld_collections
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collections_name ON public.petworld_collections(collection_name);
CREATE INDEX IF NOT EXISTS idx_collections_updated ON public.petworld_collections(updated_at);
```

4. Click **RUN** (or press `Ctrl+Enter`)
5. You should see: "Success. No rows returned"

---

### **Step 4: Add Credentials to Vercel**

1. Go to your Vercel Dashboard: https://vercel.com/dashboard
2. Click on your **Pet World** project
3. Go to **Settings** → **Environment Variables**
4. Add these two variables:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | Paste your Project URL |
| `SUPABASE_KEY` | Paste your anon public key |

5. Click **Save** for each
6. **Important:** Click **Redeploy** button to apply changes

---

### **Step 5: Verify Connection**

After Vercel redeploys (wait 2 minutes):

1. Open your app: `https://pet-world-lake.vercel.app`
2. Login as Owner
3. Go to **Settings** tab
4. Look for **Database Connection** section
5. You should see: ✅ "Connected to Supabase project!"

---

### **Step 6: Initial Data Sync**

In the Settings page, you should see a button:
- **"Sync to Supabase"** or **"Backup to Cloud"**

Click it to upload your current data to Supabase.

**First time only:** This copies all your products, branches, staff, etc. to Supabase.

---

## 🎯 **How It Works After Setup**

### **Before (File-based):**
```
User makes changes → Saved to petworld_db.json → ❌ Lost on redeploy
```

### **After (Supabase):**
```
User makes changes → Saved to Supabase → ✅ Persists forever
                   → Also cached in petworld_db.json for speed
```

---

## ✅ **Benefits**

1. **✅ Data Persists** - Sales, inventory, staff changes saved permanently
2. **✅ Multi-Device Sync** - Access from anywhere
3. **✅ Real-time Updates** - Changes sync across all devices
4. **✅ Backup & Recovery** - Data never lost
5. **✅ Scalable** - Handles millions of transactions
6. **✅ Free Tier** - Up to 500MB database, 2GB storage

---

## 🔧 **Alternative: Local Development Only**

If you only want to prevent data loss during **local development** (not production):

### **Option A: Exclude JSON from Git**

Add to `.gitignore`:
```
data/petworld_db.json
```

**Pros:** Your local changes persist  
**Cons:** Production still resets on deploy

### **Option B: Use Environment-Specific Files**

The app could check:
- **Development:** Use `data/petworld_db.json` (not in Git)
- **Production:** Always use Supabase

---

## 🚨 **Important Notes**

### **After Supabase Setup:**

1. **Initial sync required** - Use the "Sync to Supabase" button once
2. **Auto-sync enabled** - All changes automatically save to Supabase
3. **Local file becomes cache** - `petworld_db.json` is just for speed
4. **Safe to redeploy** - Data won't be lost anymore

### **Free Tier Limits:**

- 500MB database storage
- 2GB file storage (for images)
- 50,000 monthly active users
- Unlimited API requests

This is more than enough for your pet shop management system!

---

## 📊 **Verify Data Persistence**

### **Test It:**

1. **Make a sale** → Note the invoice number
2. **Delete a product** → Remember which one
3. **Push code to GitHub** → Trigger redeployment
4. **Wait 2 minutes** → Vercel redeploys
5. **Check your app** → Sale and deletion should still be there! ✅

---

## 🆘 **Troubleshooting**

### **"Supabase credentials not set"**
- Check Vercel environment variables are correct
- Make sure you clicked "Redeploy" after adding them

### **"Connection failed"**
- Verify your Supabase project is not paused (free tier pauses after 7 days inactivity)
- Wake it up by going to Supabase dashboard

### **"Table doesn't exist"**
- Run the SQL schema (Step 3) again
- Check Table Editor in Supabase to verify `petworld_collections` exists

### **Data still resetting**
- Make sure environment variables are in Vercel (not just local `.env`)
- Check Settings page shows "✅ Connected"
- Perform initial sync using the button in Settings

---

## 📝 **Summary**

| Without Supabase | With Supabase |
|------------------|---------------|
| ❌ Data lost on deploy | ✅ Data persists forever |
| ❌ File-based storage | ✅ Cloud database |
| ❌ No backup | ✅ Automatic backup |
| ❌ Single device | ✅ Multi-device sync |
| ❌ Not scalable | ✅ Production-ready |

**Setup time:** 10 minutes  
**Cost:** FREE (up to 500MB)  
**Result:** Never lose data again! 🎉

---

## 🔗 **Quick Links**

- Supabase Dashboard: https://supabase.com/dashboard
- Vercel Dashboard: https://vercel.com/dashboard
- Your App: https://pet-world-lake.vercel.app

---

## ✨ **Need Help?**

If you encounter any issues:
1. Check Supabase project status (not paused)
2. Verify Vercel environment variables
3. Check browser console for errors (F12)
4. Try the initial sync button in Settings

The setup is straightforward and will solve your data persistence problem permanently!
