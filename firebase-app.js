import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
        import {
            getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
            getRedirectResult, signOut, onAuthStateChanged, setPersistence,
            browserLocalPersistence
        } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
        import {
            getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, increment, serverTimestamp, enableIndexedDbPersistence
        } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

        const firebaseConfig = {
            apiKey: "AIzaSyA9g82CVZvjxh9GN_wpcaZLki_yL_K0IFE",
            authDomain: "karshenas-plus.firebaseapp.com",
            projectId: "karshenas-plus",
            storageBucket: "karshenas-plus.firebasestorage.app",
            messagingSenderId: "976092092272",
            appId: "1:976092092272:web:09dc07dd01149e1c3ba1b5",
            measurementId: "G-QH0D3L15F7"
        };

        const fbApp = initializeApp(firebaseConfig);
        const auth = getAuth(fbApp);
        const db = getFirestore(fbApp);
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        console.log('[karshenas-plus] running on host:', location.hostname, '— must match an Authorized domain in Firebase Auth settings.');

        // Keep the user signed in on this device/browser across visits & restarts.
        setPersistence(auth, browserLocalPersistence).catch(() => {});
        try { enableIndexedDbPersistence(db); } catch (e) { /* offline cache best-effort */ }

        function setSyncDots(state) {
            // state: 'idle' | 'syncing' | 'synced'
            document.querySelectorAll('.sync-dot').forEach((dot) => {
                dot.classList.remove('synced', 'syncing');
                if (state === 'syncing') dot.classList.add('syncing');
                if (state === 'synced') dot.classList.add('synced');
            });
            const statusText = document.getElementById('syncStatusText');
            if (statusText) {
                statusText.innerText = state === 'syncing'
                    ? 'در حال همگام‌سازی با فضای ابری...'
                    : 'همگام‌سازی با فضای ابری فعال است';
            }
        }

        function updateAccountUI(user) {
            const label = document.getElementById('accountLabel');
            const avatar = document.getElementById('accountAvatar');
            const loggedOutView = document.getElementById('accountLoggedOutView');
            const loggedInView = document.getElementById('accountLoggedInView');
            if (!label || !avatar || !loggedOutView || !loggedInView) return;

            if (user) {
                const initial = (user.displayName || user.email || '؟').charAt(0).toUpperCase();
                label.innerText = user.displayName ? user.displayName.split(' ')[0] : 'حساب من';
                avatar.innerHTML = user.photoURL
                    ? `<img src="${user.photoURL}" referrerpolicy="no-referrer" alt="">`
                    : initial;

                loggedOutView.style.display = 'none';
                loggedInView.style.display = 'block';
                document.getElementById('accountPanelName').innerText = user.displayName || 'بدون نام';
                document.getElementById('accountPanelEmail').innerText = user.email || '';
                const panelAvatar = document.getElementById('accountPanelAvatar');
                panelAvatar.innerHTML = user.photoURL
                    ? `<img src="${user.photoURL}" referrerpolicy="no-referrer" alt="">`
                    : initial;

                setSyncDots('syncing');
                const toast = document.getElementById('cloudToast');
                if (toast) toast.classList.remove('show');
            } else {
                label.innerText = 'ورود با گوگل';
                avatar.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
                loggedOutView.style.display = 'block';
                loggedInView.style.display = 'none';
                setSyncDots('idle');
            }
        }

        /* ---------- Generic multi-collection cloud sync ---------- */
        const SYNC_COLLECTIONS = {
            karshenas_plus_cases: 'cases',
            karshenas_plus_experts: 'experts',
            karshenas_plus_applicants: 'applicants',
            karshenas_plus_reminders: 'reminders'
        };
        function readLocalList(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } }
        function writeLocalList(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }

        // On sign-in: pull down anything from the cloud not yet on this device, then push
        // up anything on this device not yet in the cloud. Runs for every collection.
        async function pullAndMergeAll(user, opts) {
            opts = opts || {};
            setSyncDots('syncing');
            let hadError = false;
            for (const [localKey, cloudName] of Object.entries(SYNC_COLLECTIONS)) {
                try {
                    const snap = await getDocs(collection(db, 'users', user.uid, cloudName));
                    const local = readLocalList(localKey);
                    const localIds = new Set(local.map((x) => x.id));
                    snap.forEach((docSnap) => {
                        if (!localIds.has(docSnap.id)) {
                            const data = docSnap.data();
                            data.id = docSnap.id;
                            data._cloudSynced = true;
                            local.push(data);
                        }
                    });
                    writeLocalList(localKey, local);

                    const pending = local.filter((x) => !x._cloudSynced);
                    for (const item of pending) {
                        await setDoc(doc(db, 'users', user.uid, cloudName, item.id), Object.assign({}, item, {
                            ownerUid: user.uid, syncedAt: serverTimestamp()
                        }));
                        item._cloudSynced = true;
                    }
                    writeLocalList(localKey, local);
                } catch (err) {
                    hadError = true;
                    console.error('Sync error for', cloudName, err);
                }
            }
            setSyncDots(hadError ? 'idle' : 'synced');
            if (typeof window.refreshAllViews === 'function') window.refreshAllViews();
            if (hadError && opts.manual) {
                alert('همگام‌سازی با یک خطا مواجه شد. اتصال اینترنت را بررسی کن و دوباره امتحان کن. (جزئیات خطا در کنسول مرورگر قابل مشاهده است)');
            } else if (!hadError && opts.manual) {
                alert('همگام‌سازی با موفقیت انجام شد.');
            }
            return !hadError;
        }
        window.manualCloudSync = function () {
            const user = window.karshenasCurrentUser;
            if (!user) { alert('برای همگام‌سازی دستی، ابتدا با گوگل وارد شو.'); return; }
            pullAndMergeAll(user, { manual: true });
        };

        onAuthStateChanged(auth, (user) => {
            window.karshenasCurrentUser = user;
            updateAccountUI(user);
            if (user) pullAndMergeAll(user);
        });

        // Completes the sign-in if we just came back from a redirect (mobile flow).
        getRedirectResult(auth).then((result) => {
            if (result && result.user) console.log('Redirect sign-in completed for', result.user.email);
        }).catch((err) => {
            console.error('Redirect sign-in error:', err);
            if (err && err.code && err.code !== 'auth/no-auth-event') {
                alert('ورود با گوگل ناموفق بود (' + err.code + '). اگر فایل را مستقیم از روی گوشی/کامپیوتر باز کرده‌اید (file://)، باید حتماً از آدرس اینترنتی واقعی سایت (https://...github.io/...) وارد شوید.');
            }
        });

        function explainAuthError(err) {
            const code = (err && err.code) || 'unknown';
            if (code === 'auth/unauthorized-domain') {
                return 'این دامنه در فایربیس مجاز نشده. برو Authentication ← Settings ← Authorized domains و آدرس سایتت رو اضافه کن.';
            }
            if (code === 'auth/operation-not-allowed') {
                return 'ورود با گوگل در فایربیس فعال نیست. برو Authentication ← Sign-in method ← Google رو Enable کن.';
            }
            if (code === 'auth/popup-blocked') {
                return 'مرورگر پنجره ورود را مسدود کرد؛ در حال امتحان روش دوم...';
            }
            if (code === 'auth/network-request-failed') {
                return 'اتصال اینترنت برقرار نیست.';
            }
            return 'خطای ورود: ' + code + (err && err.message ? ' — ' + err.message : '');
        }

        window.signInWithGoogle = async function () {
            if (location.protocol === 'file:') {
                alert('این صفحه مستقیم از روی حافظه باز شده (file://) — ورود با گوگل فقط روی آدرس اینترنتی واقعی سایت کار می‌کند، نه وقتی فایل را دابل‌کلیک می‌کنی.');
                return;
            }
            try {
                await signInWithPopup(auth, provider);
                if (typeof closeModal === 'function') closeModal('accountModal');
            } catch (err) {
                const code = err && err.code;
                if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
                    return; // user closed it on purpose, no need to alert
                }
                if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment' || code === 'auth/internal-error') {
                    try {
                        await signInWithRedirect(auth, provider);
                    } catch (e2) {
                        alert(explainAuthError(e2));
                    }
                    return;
                }
                alert(explainAuthError(err));
            }
        };

        window.signOutOfGoogle = async function () {
            try {
                await signOut(auth);
                if (typeof closeModal === 'function') closeModal('accountModal');
            } catch (err) { /* ignore */ }
        };

        // Called by crudSave() (main script) right after ANY item (case, expert,
        // applicant, reminder) is saved locally, so it also lands in Firestore when
        // the user is signed in. Uses the item's own id as the Firestore doc id, so
        // repeated saves overwrite in place instead of creating duplicates.
        window.cloudSyncItem = async function (cloudName, item) {
            const user = window.karshenasCurrentUser;
            if (!user || !item || !item.id) return;
            try {
                setSyncDots('syncing');
                await setDoc(doc(db, 'users', user.uid, cloudName, item.id), Object.assign({}, item, {
                    ownerUid: user.uid, syncedAt: serverTimestamp()
                }));
                const localKey = Object.keys(SYNC_COLLECTIONS).find((k) => SYNC_COLLECTIONS[k] === cloudName);
                if (localKey) {
                    const list = readLocalList(localKey);
                    const match = list.find((x) => x.id === item.id);
                    if (match) { match._cloudSynced = true; writeLocalList(localKey, list); }
                }
                setSyncDots('synced');
            } catch (err) {
                console.error('Save to cloud failed:', err);
                setSyncDots('idle');
            }
        };

        // Called by crudDelete() (main script) when an item is removed locally, so it's
        // also removed from Firestore for the signed-in user.
        window.cloudDeleteItem = async function (cloudName, id) {
            const user = window.karshenasCurrentUser;
            if (!user || !id) return;
            try { await deleteDoc(doc(db, 'users', user.uid, cloudName, id)); }
            catch (err) { console.error('Cloud delete failed:', err); }
        };

        /* ---------- Hidden visitor counter (works for every visitor, logged in or not) ----------
           Requires this addition to firestore.rules:
           match /siteMeta/{doc} { allow get, create, update: if true; }
           Stores only AGGREGATE counters (totals, per-day, per-country, per-hour) —
           deliberately no raw IP addresses or per-person logs are stored, to keep this
           low-stakes and not a privacy liability if the rule is ever read by someone. */
        const VISIT_SESSION_KEY = 'karshenas_visit_counted_session';

        async function detectCountryCode() {
            try {
                const res = await fetch('https://ipwho.is/?fields=success,country,country_code');
                const data = await res.json();
                if (data && data.success && data.country) return { code: data.country_code || 'XX', name: data.country };
            } catch (err) { /* offline or blocked — skip country for this visit */ }
            return null;
        }

        window.trackVisitCloud = async function () {
            if (sessionStorage.getItem(VISIT_SESSION_KEY) === '1') return;
            sessionStorage.setItem(VISIT_SESSION_KEY, '1');
            const now = new Date();
            const todayKey = now.toISOString().slice(0, 10);
            const hourKey = now.getUTCHours();
            const payload = {
                count: increment(1),
                ['day_' + todayKey]: increment(1),
                ['hour_' + hourKey]: increment(1),
                lastVisitAt: serverTimestamp()
            };
            const country = await detectCountryCode();
            if (country) {
                payload['country_' + country.code] = increment(1);
                payload['countryName_' + country.code] = country.name;
            }
            try {
                await setDoc(doc(db, 'siteMeta', 'visits'), payload, { merge: true });
            } catch (err) {
                console.error('Visit tracking failed (this is harmless):', err);
            }
        };

        window.fetchVisitStats = async function () {
            try {
                const snap = await getDoc(doc(db, 'siteMeta', 'visits'));
                if (!snap.exists()) return { total: 0, today: 0, yesterday: 0, busiestHour: null, countries: [], hours: [] };
                const data = snap.data();
                const now = new Date();
                const todayKey = now.toISOString().slice(0, 10);
                const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);

                const countries = [];
                const hours = [];
                let busiestHour = null, busiestHourCount = -1;
                Object.keys(data).forEach((key) => {
                    if (key.startsWith('country_')) {
                        const code = key.slice(8);
                        countries.push({ code, name: data['countryName_' + code] || code, count: data[key] || 0 });
                    }
                    if (key.startsWith('hour_')) {
                        const h = parseInt(key.slice(5), 10);
                        const c = data[key] || 0;
                        hours.push({ hour: h, count: c });
                        if (c > busiestHourCount) { busiestHourCount = c; busiestHour = h; }
                    }
                });
                countries.sort((a, b) => b.count - a.count);
                hours.sort((a, b) => a.hour - b.hour);

                return {
                    total: data.count || 0,
                    today: data['day_' + todayKey] || 0,
                    yesterday: data['day_' + yesterday] || 0,
                    busiestHour,
                    countries,
                    hours
                };
            } catch (err) {
                console.error('Fetching visit stats failed:', err);
                return null;
            }
        };
