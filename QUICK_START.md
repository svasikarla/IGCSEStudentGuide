# Quick Start - Subject Bulk Import

**Time to test:** 5 minutes

---

## Step 1: Start Servers (2 minutes)

### Terminal 1 - Backend
```bash
cd server
node index.js
```

✅ Look for: `Bulk subject import: http://localhost:3001/api/subjects/bulk`

### Terminal 2 - Frontend
```bash
npm start
```

✅ Opens: `http://localhost:3000`

---

## Step 2: Test Import (3 minutes)

1. **Login** as Teacher or Admin

2. **Navigate:**
   - Click **Admin** tab
   - Click **Subjects**
   - Click **"Bulk Import"** button (green)

3. **Import Chemistry:**
   - Click **"Use Template"**
   - Select **"Chemistry (IGCSE)"**
   - Click **"Import Subject"**

4. **Verify Success:**
   - ✓ Shows: "3 chapters created"
   - ✓ Shows: "10 topics created"
   - Click **"Done"**

5. **Check Result:**
   - See Chemistry in subject list
   - Open Supabase → subjects table
   - Verify: 1 subject, 3 chapters, 10 topics

---

## ✅ Success!

You've successfully imported a complete subject hierarchy in seconds instead of hours!

**Next Steps:**
- Read [TESTING_AND_DEPLOYMENT_GUIDE.md](TESTING_AND_DEPLOYMENT_GUIDE.md) for comprehensive testing
- Review [IMPLEMENTATION_COMPLETE_V2.md](IMPLEMENTATION_COMPLETE_V2.md) for full details

---

## 🚨 Quick Troubleshooting

**"Authentication required"**
→ Make sure you're logged in as Teacher/Admin

**"Template not found"**
→ Copy templates to public folder:
```bash
mkdir -p public/templates/subjects
cp templates/subjects/*.json public/templates/subjects/
```

**Import hangs**
→ Check backend terminal for errors
→ Verify backend is running on port 3001

---

**Questions?** See [TESTING_AND_DEPLOYMENT_GUIDE.md](TESTING_AND_DEPLOYMENT_GUIDE.md)
