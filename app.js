let currentTariff = '1405';
        let currentMode = 'single';
        let boardMembers = 3;
        let expertCount = 0;
        let isUserCustomPetition = false;

        const defaultDisciplines = [
            'امور ثبتی و نقشه‌برداری',
            'امور ثبتی',
            'نقشه‌برداری و اطلاعات مکانی',
            'راه و ساختمان',
            'حسابداری و حسابرسی',
            'ارزیابی وسائط نقلیه و تصادفات',
            'امور معادن و زمین‌شناسی',
            'برق، ماشین‌آلات و تاسیسات کارخانجات',
            'کشاورزی و منابع طبیعی',
            'سایر رشته‌ها (تایپ دلخواه)'
        ];

        window.onload = function() {
            let today = new Date().toLocaleDateString('fa-IR');
            document.getElementById('expDate').value = today;
            addExpertAccordionField();
            updatePetitionText();
            applySavedAppearance();
            checkPinLockOnLoad();
            trackVisit();
            const savedDefaultMode = (getSettings().defaultCalcMode || 'single');
            if (savedDefaultMode === 'board') setMode('board');
            if (typeof updateSideMenuInstallItem === 'function') updateSideMenuInstallItem();
            const startupView = (getSettings().startupView || 'calc');
            if (startupView !== 'calc') switchView(startupView);
            startReminderAlarmLoop();
        };

        /* Converts Persian/Arabic-Indic digits to plain ASCII digits so amounts
           that were displayed with toLocaleString('fa-IR') (which uses ۰۱۲۳...)
           can be parsed back into numbers correctly. This was the cause of the
           "سهم هر رشته" report showing ناعدد (NaN): totalFee was stored as a
           Persian-digit string, then re-parsed with an ASCII-only regex, which
           silently produced 0 every time. */
        function toEnglishDigits(str) {
            const fa = '۰۱۲۳۴۵۶۷۸۹', ar = '٠١٢٣٤٥٦٧٨٩';
            return String(str == null ? '' : str).replace(/[۰-۹٠-٩]/g, (ch) => {
                const i1 = fa.indexOf(ch); if (i1 !== -1) return i1;
                const i2 = ar.indexOf(ch); if (i2 !== -1) return i2;
                return ch;
            });
        }
        function parseStoredAmount(str) {
            return parseInt(toEnglishDigits(str).replace(/[^0-9]/g, ''), 10) || 0;
        }
        window.toEnglishDigits = toEnglishDigits;
        window.parseStoredAmount = parseStoredAmount;

        function applyBackToTopVisibility() {
            const btn = document.getElementById('backToTopBtn');
            if (btn) btn.style.display = (getSettings().showBackToTop === false) ? 'none' : '';
        }
        function applyCompactBottomNav() {
            document.body.classList.toggle('compact-bottom-nav', !!getSettings().compactBottomNav);
        }
        function applyTelegramBannerVisibility() {
            document.querySelectorAll('.telegram-banner').forEach((el) => {
                el.style.display = getSettings().hideTelegramBanner ? 'none' : '';
            });
        }
        window.checkForAppUpdate = function () {
            if (!('serviceWorker' in navigator)) { alert('این مرورگر از به‌روزرسانی خودکار پشتیبانی نمی‌کند.'); return; }
            navigator.serviceWorker.getRegistration().then((reg) => {
                if (!reg) { alert('برنامه هنوز به‌صورت آفلاین ثبت نشده — یک بار با اینترنت باز کن.'); return; }
                reg.update().then(() => showToast('بررسی شد — اگر نسخه جدیدی باشد، پس از بستن و باز کردن مجدد برنامه اعمال می‌شود.', 'success'));
            });
        };
        window.applyBackToTopVisibility = applyBackToTopVisibility;
        window.applyCompactBottomNav = applyCompactBottomNav;
        window.applyTelegramBannerVisibility = applyTelegramBannerVisibility;

        function applySavedAppearance() {
            const saved = dbRead(K.settings)[0] || {};
            // Default appearance is the light theme. Only switch to dark if the
            // user has explicitly chosen it before (saved.theme === 'dark').
            if (saved.theme !== 'dark') document.body.classList.add('light-mode');
            const s = getSettings();
            const themeToApply = s.colorTheme || 'rosegold';
            if (themeToApply !== 'default') document.body.setAttribute('data-theme', themeToApply);
            applyFontSize(s.fontSize || 'medium');
            applyFontFamily(s.fontFamily || 'vazirmatn');
            applyDensity(s.density || 'comfortable');
            applyReducedMotion(!!s.reducedMotion);
            applyHighContrast(!!s.highContrast);
            applyBackToTopVisibility();
            applyCompactBottomNav();
            applyTelegramBannerVisibility();
        }

        function toggleTheme() {
            document.body.classList.toggle('light-mode');
        }

        function toggleSection(id) {
            document.getElementById(id).classList.toggle('expanded');
        }

        function openModal(id) { document.getElementById(id).classList.add('active'); }
        function closeModal(id) { document.getElementById(id).classList.remove('active'); }
        function closeModalOnOverlay(e, id) { if (e.target.id === id) closeModal(id); }

        function setTariff(year, btn) {
            currentTariff = year;
            document.querySelectorAll('.tab-group .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            calculate();
        }

        function setMode(mode) {
            currentMode = mode;
            document.getElementById('singleCard').classList.toggle('active', mode === 'single');
            document.getElementById('boardCard').classList.toggle('active', mode === 'board');
            document.getElementById('memberCounterGroup').style.display = mode === 'board' ? 'block' : 'none';
            
            if (mode === 'single') {
                document.getElementById('petTypeSingle').checked = true;
            } else {
                document.getElementById('petTypeBoard').checked = true;
            }
            updatePetitionText();
            calculate();
        }

        function changeMembers(delta) {
            boardMembers = Math.max(3, Math.min(21, boardMembers + delta));
            if(boardMembers % 2 === 0) boardMembers += (delta > 0 ? 1 : -1);
            document.getElementById('memberCountText').innerText = boardMembers + ' نفر';
            calculate();
        }

        function toggleBankInput() {
            let isChecked = document.getElementById('chkBank').checked;
            document.getElementById('sub-bank').style.display = isChecked ? 'flex' : 'none';
        }

        function toggleAddon(type) {
            const map = {
                'missionIn': { chk: 'chkMissionIn', item: 'item-missionIn', sub: 'sub-missionIn' },
                'missionOut': { chk: 'chkMissionOut', item: 'item-missionOut', sub: 'sub-missionOut' },
                'tamin': { chk: 'chkTamin', item: 'item-tamin', sub: null },
                'aerial': { chk: 'chkAerial', item: 'item-aerial', sub: 'sub-aerial' },
                'mapMatch': { chk: 'chkMapMatch', item: 'item-mapMatch', sub: 'sub-mapMatch' },
                'strength': { chk: 'chkStrength', item: 'item-strength', sub: 'sub-strength' },
                'poverty': { chk: 'chkPoverty', item: 'item-poverty', sub: null },
                'm39': { chk: 'chkM39', item: 'item-m39', sub: 'sub-m39' },
                'm40': { chk: 'chkM40', item: 'item-m40', sub: 'sub-m40' },
                'm41': { chk: 'chkM41', item: 'item-m41', sub: 'sub-m41' },
                'm43': { chk: 'chkM43', item: 'item-m43', sub: 'sub-m43' },
                'm20': { chk: 'chkM20', item: 'item-m20', sub: 'sub-m20' },
                'm31': { chk: 'chkM31', item: 'item-m31', sub: 'sub-m31' },
                'm15': { chk: 'chkM15', item: 'item-m15', sub: 'sub-m15' },
                'mwater': { chk: 'chkMWater', item: 'item-mwater', sub: 'sub-mwater' },
                'mrange': { chk: 'chkMRange', item: 'item-mrange', sub: 'sub-mrange' },
                'm46': { chk: 'chkM46', item: 'item-m46', sub: 'sub-m46' }
            };
            const cfg = map[type];
            const isChecked = document.getElementById(cfg.chk).checked;
            document.getElementById(cfg.item).classList.toggle('active', isChecked);
            if (cfg.sub) document.getElementById(cfg.sub).style.display = isChecked ? 'flex' : 'none';

            if (type === 'missionIn' && isChecked) {
                document.getElementById('chkMissionOut').checked = false;
                toggleAddon('missionOut');
            } else if (type === 'missionOut' && isChecked) {
                document.getElementById('chkMissionIn').checked = false;
                toggleAddon('missionIn');
            }
            calculate();
        }

        function updateM20Range() {
            let type = document.getElementById('widthM20').value;
            let range = document.getElementById('rateM20');
            let max = type === 'narrow' ? 80000000 : 120000000;
            range.max = max;
            range.value = 20000000;
            document.getElementById('rateM20Display').innerText = '۲۰,۰۰۰,۰۰۰ ریال';
            calculate();
        }

        function updateMRangeRange() {
            let key = document.getElementById('selMRange').value;
            let it = mRangeItems[key];
            let range = document.getElementById('rangeMRange');
            range.min = it.min;
            range.max = it.max;
            range.value = it.min;
            document.getElementById('rangeMRangeDisplay').innerText = it.min.toLocaleString('fa-IR') + ' ریال';
            calculate();
        }

        function togglePetitionSection() {
            let isChecked = document.getElementById('chkPetition').checked;
            document.getElementById('petitionSubContainer').style.display = isChecked ? 'flex' : 'none';
            calculate();
        }

        function handlePetitionAmount(input) {
            let val = input.value.replace(/[^0-9]/g, '');
            if(!val) {
                input.value = '';
                document.getElementById('petitionWordsHint').innerText = '';
                updatePetitionText();
                calculate();
                return;
            }
            let num = parseInt(val, 10);
            input.value = num.toLocaleString('en-US');
            let toman = Math.floor(num / 10);
            document.getElementById('petitionWordsHint').innerText = 'معادل: ' + numberToWords(toman) + ' تومان';
            updatePetitionText();
            calculate();
        }

        function saveCustomPetitionText() {
            isUserCustomPetition = true;
        }

        function updatePetitionText() {
            if (isUserCustomPetition) return;

            let isBoard = document.getElementById('petTypeBoard').checked;
            let targetWord = isBoard ? "هیات" : "اینجانب کارشناس رسمی";
            let rawVal = document.getElementById('petitionAmount').value.replace(/[^0-9]/g, '');
            let rialStr = rawVal ? parseInt(rawVal, 10).toLocaleString('fa-IR') : "......";
            let tomanNum = rawVal ? Math.floor(parseInt(rawVal, 10) / 10) : 0;
            let tomanStr = tomanNum ? numberToWords(tomanNum) : "....";

            let defaultText = `در خاتمه با توجه به اقدامات انجام شده و وسعت پلاک و قطعات مورد رسیدگی با لحاظ تعرفه مصوب 1405 ریاست محترم قوه قضائیه جهت کارشناسان رسمی دادگستری خواهشمند است علاوه بر مبالغ تودیع شده نسبت به افزایش دستمزد کارشناسی جهت ${targetWord} به مبلغ ${rialStr} ریال معادل ${tomanStr} تومان موافقت و در صورت تصویب مقرر فرمایید قبل از ابلاغ نظریه نسبت به تودیع آن اقدام نمایند.`;
            
            document.getElementById('petitionText').value = defaultText;
        }

        function copyPetitionText() {
            let txt = document.getElementById('petitionText').value;
            navigator.clipboard.writeText(txt);
            alert('متن لایحه در حافظه کپی شد.');
        }

        function handleInput(input) {
            let val = input.value.replace(/[^0-9]/g, '');
            if(!val) {
                input.value = '';
                document.getElementById('wordsHint').innerText = '';
                document.getElementById('resultsBox').style.display = 'none';
                document.getElementById('actionButtons').style.display = 'none';
                return;
            }
            let num = parseInt(val, 10);
            input.value = num.toLocaleString('en-US');
            let toman = Math.floor(num / 10);
            document.getElementById('wordsHint').innerText = 'معادل: ' + numberToWords(toman) + ' تومان';
            calculate();
        }

        function calculateBaseFee(val, tariff) {
            if (val <= 0) return 0;
            let total = 0;
            if (tariff === '1405') {
                const brackets = [
                    { limit: 500e6, fixed: 20000000, rate: 0 },
                    { limit: 1000e6, fixed: 0, rate: 0.0045 },
                    { limit: 5000e6, fixed: 0, rate: 0.004 },
                    { limit: 30000e6, fixed: 0, rate: 0.002 },
                    { limit: 150000e6, fixed: 0, rate: 0.0012 },
                    { limit: 500000e6, fixed: 0, rate: 0.0009 },
                    { limit: 1000000e6, fixed: 0, rate: 0.00031 },
                    { limit: 2000000e6, fixed: 0, rate: 0.00023 },
                    { limit: 4000000e6, fixed: 0, rate: 0.000185 },
                    { limit: Infinity, fixed: 0, rate: 0.00015 }
                ];
                let prev = 0;
                for (let b of brackets) {
                    if (val > prev) {
                        let portion = Math.min(val, b.limit) - prev;
                        if (b.fixed > 0) total += b.fixed;
                        else total += portion * b.rate;
                        prev = b.limit;
                    } else break;
                }
            } else {
                const brackets = [
                    { limit: 250e6, fixed: 6000000, rate: 0 },
                    { limit: 1000e6, fixed: 0, rate: 0.0045 },
                    { limit: 5000e6, fixed: 0, rate: 0.003 },
                    { limit: 30000e6, fixed: 0, rate: 0.0015 },
                    { limit: 150000e6, fixed: 0, rate: 0.0009 },
                    { limit: 500000e6, fixed: 0, rate: 0.0007 },
                    { limit: 1000000e6, fixed: 0, rate: 0.0003 },
                    { limit: 2000000e6, fixed: 0, rate: 0.00022 },
                    { limit: 4000000e6, fixed: 0, rate: 0.00018 },
                    { limit: Infinity, fixed: 0, rate: 0.00012 }
                ];
                let prev = 0;
                for (let b of brackets) {
                    if (val > prev) {
                        let portion = Math.min(val, b.limit) - prev;
                        if (b.fixed > 0) total += b.fixed;
                        else total += portion * b.rate;
                        prev = b.limit;
                    } else break;
                }
            }
            return total;
        }

        function calculateAddons() {
            let sum = 0;
            if (document.getElementById('chkMissionIn').checked) {
                sum += (parseInt(document.getElementById('daysMissionIn').value, 10) || 1) * 7500000;
            }
            if (document.getElementById('chkMissionOut').checked) {
                sum += (parseInt(document.getElementById('daysMissionOut').value, 10) || 1) * 15000000;
            }
            if (document.getElementById('chkTamin').checked) sum += 20000000;
            if (document.getElementById('chkAerial').checked) {
                let photos = parseInt(document.getElementById('photosAerial').value, 10) || 1;
                let years = parseInt(document.getElementById('yearsAerial').value, 10) || 0;
                let extra = parseInt(document.getElementById('extraAerial').value, 10) || 0;
                let perPhoto = 20000000 * (1 + (years * 0.10) + (extra * 0.40));
                sum += perPhoto * photos;
            }
            if (document.getElementById('chkMapMatch').checked) {
                let fee = (parseFloat(document.getElementById('areaMapMatch').value) || 0) * 30000;
                sum += Math.max(20000000, Math.min(100000000, fee));
            }
            if (document.getElementById('chkStrength').checked) {
                sum += calculateMadde36();
            }
            if (document.getElementById('chkM39').checked) sum += calculateMadde39();
            if (document.getElementById('chkM40').checked) sum += calculateMadde40();
            if (document.getElementById('chkM41').checked) sum += calculateMadde41();
            if (document.getElementById('chkM43').checked) sum += calculateMadde43();
            if (document.getElementById('chkM20').checked) sum += calculateMadde20();
            if (document.getElementById('chkM31').checked) sum += calculateMadde31();
            if (document.getElementById('chkM15').checked) sum += calculateMadde15();
            if (document.getElementById('chkMWater').checked) sum += calculateMWater();
            if (document.getElementById('chkMRange').checked) sum += calculateMRange();
            if (document.getElementById('chkM46').checked) sum += calculateMadde46();
            return sum;
        }

        function calculateMadde36() {
            let type = document.getElementById('typeStrength').value;
            let area = parseFloat(document.getElementById('areaStrength').value) || 0;
            const table = {
                arch: { rate: 25000, min: 20000000, max: 150000000 },
                structure: { rate: 30000, min: 20000000, max: 200000000 },
                strength: { rate: 25000, min: 20000000, max: 150000000 }
            };
            if (type === 'approve') {
                let t = table.strength;
                let raw = area * t.rate;
                let base = Math.max(t.min, Math.min(t.max, raw));
                return base * 0.5;
            }
            let t = table[type];
            let raw = area * t.rate;
            return Math.max(t.min, Math.min(t.max, raw));
        }

        function calculateMadde39Core(area, hasGozar) {
            let base = hasGozar ? 20000000 : 30000000;
            let cap = hasGozar ? 200000000 : 250000000;
            let fee;
            if (area <= 1000) fee = base;
            else if (area <= 100000) fee = base + (area - 1000) * 1200;
            else fee = base + 99000 * 1200 + (area - 100000) * 800;
            return Math.min(fee, cap);
        }

        function calculateMadde39() {
            let area = parseFloat(document.getElementById('areaM39').value) || 0;
            let hasGozar = document.getElementById('gozarM39').value === '1';
            return calculateMadde39Core(area, hasGozar);
        }

        function calculateMadde40() {
            let area = parseFloat(document.getElementById('areaM40').value) || 0;
            return calculateMadde39Core(area, false);
        }

        function calculateMadde41() {
            let area = parseFloat(document.getElementById('areaM41').value) || 0;
            let fee;
            if (area <= 1000) fee = 20000000;
            else if (area <= 5000) fee = 20000000 + (area - 1000) * 4000;
            else if (area <= 50000) fee = 20000000 + 4000 * 4000 + (area - 5000) * 2000;
            else fee = 20000000 + 4000 * 4000 + 45000 * 2000 + (area - 50000) * 1000;
            return Math.min(fee, 150000000);
        }

        function calculateMadde43() {
            let hectares = parseFloat(document.getElementById('areaM43').value) || 0;
            if (hectares <= 0) return 0;
            if (hectares <= 1) return 20000000;
            let raw = 20000000 * (1 + 0.2 * (hectares - 1));
            return Math.min(raw, 60000000);
        }

        function calculateMadde20() {
            let km = parseFloat(document.getElementById('kmM20').value) || 0;
            let rate = parseFloat(document.getElementById('rateM20').value) || 0;
            return km * rate;
        }

        function calculateMadde31() {
            let checks = document.querySelectorAll('.m31-chip:checked');
            let sum = checks.length * 20000000;
            if (checks.length >= 2 && sum > 30000000) sum = 30000000;
            if (sum > 70000000) sum = 70000000;
            return sum;
        }

        function calculateMadde15() {
            let flow = parseFloat(document.getElementById('flowM15').value) || 0;
            let fee;
            if (flow <= 50) fee = 20000000;
            else if (flow <= 1000) fee = 20000000 + (flow - 50) * 6000;
            else fee = 20000000 + 950 * 6000 + (flow - 1000) * 3000;
            return Math.min(fee, 90000000);
        }

        const mWaterItems = {
            '16': { label: 'تعیین کیفیت شیمیایی و آلودگی آب (ماده ۱۶)', fee: 20000000 },
            '17': { label: 'بررسی فنی سفره‌های سطحی/زیرزمینی (ماده ۱۷)', fee: 30000000 },
            '19': { label: 'تعیین کیفیت حفاری چاه و قنوات (ماده ۱۹)', fee: 30000000 },
            '21': { label: 'رسیدگی به آب‌های پس از آلودگی (ماده ۲۱)', fee: 20000000 }
        };
        function calculateMWater() {
            let key = document.getElementById('selMWater').value;
            return mWaterItems[key].fee;
        }

        const mRangeItems = {
            '24': { label: 'پزشکی، دارویی و سم‌شناسی (ماده ۲۴)', min: 20000000, max: 90000000 },
            '27': { label: 'بازرگانی (ماده ۲۷)', min: 20000000, max: 100000000 },
            '29': { label: 'بانک، بورس و بیمه (ماده ۲۹)', min: 20000000, max: 100000000 },
            '30': { label: 'آمار (ماده ۳۰)', min: 20000000, max: 60000000 }
        };
        function calculateMRange() {
            let val = parseFloat(document.getElementById('rangeMRange').value) || 0;
            return val;
        }

        function calculateMadde46() {
            let docs = parseFloat(document.getElementById('docsM46').value) || 0;
            let base = 20000000;
            let raw = docs <= 1 ? base : base * (1 + 0.2 * (docs - 1));
            return Math.min(raw, 80000000);
        }

        function calculate() {
            let category = document.getElementById('categorySelect').value;
            let rawVal = document.getElementById('amountInput').value.replace(/[^0-9]/g, '');
            let addonsFee = calculateAddons();

            let petitionFee = 0;
            if (document.getElementById('chkPetition').checked) {
                let rawPet = document.getElementById('petitionAmount').value.replace(/[^0-9]/g, '');
                petitionFee = parseInt(rawPet, 10) || 0;
            }

            if (category === 'rent') {
                document.getElementById('valuationLabel').innerText = 'میزان اجاره‌بها (ماهیانه/سالانه):';
                document.getElementById('rentAssessBtn').style.display = 'block';
            } else {
                document.getElementById('valuationLabel').innerText = 'ارزش موضوع کارشناسی (برآورد):';
                document.getElementById('rentAssessBtn').style.display = 'none';
            }

            let value = parseInt(rawVal, 10) || 0;
            let baseFee = calculateBaseFee(value, currentTariff);

            if (category === 'contract') baseFee *= 2.0;
            else if (category === 'delay' || category === 'brand' || category === 'audit' || category === 'software') baseFee *= 1.5;
            else if (category === 'household' || category === 'landSplit' || category === 'agriSplit') baseFee *= 1.2;

            let cap = currentTariff === '1405' ? 1350000000 : 1180000000;
            let finalSingleFee = Math.min(baseFee, cap);
            let evaluationTotal = 0;

            if (currentMode === 'single') {
                evaluationTotal = finalSingleFee;
                document.getElementById('perMemberRow').style.display = 'none';
            } else {
                let perMember = Math.min(baseFee * 0.7, cap);
                evaluationTotal = perMember * boardMembers;
                document.getElementById('perMemberRow').style.display = 'flex';
                document.getElementById('perMemberVal').innerText = Math.round(perMember).toLocaleString('fa-IR') + ' ریال';
            }

            let subTotal = evaluationTotal + addonsFee + petitionFee;

            if (document.getElementById('chkPoverty').checked) {
                subTotal *= 0.5;
            }

            let vat = document.getElementById('chkVat').checked ? subTotal * 0.10 : 0;
            let tax104 = document.getElementById('chkTax104').checked ? subTotal * 0.05 : 0;
            let kanonShare = document.getElementById('chkKanonShare').checked ? subTotal * 0.05 : 0;

            let totalPayable = subTotal + vat - tax104 - kanonShare;

            document.getElementById('baseFeeVal').innerText = Math.round(baseFee).toLocaleString('fa-IR') + ' ریال';
            
            if (addonsFee > 0) {
                document.getElementById('addonsRow').style.display = 'flex';
                document.getElementById('addonsFeeVal').innerText = Math.round(addonsFee).toLocaleString('fa-IR') + ' ریال';
            } else {
                document.getElementById('addonsRow').style.display = 'none';
            }

            if (petitionFee > 0) {
                document.getElementById('petitionRow').style.display = 'flex';
                document.getElementById('petitionFeeVal').innerText = Math.round(petitionFee).toLocaleString('fa-IR') + ' ریال';
            } else {
                document.getElementById('petitionRow').style.display = 'none';
            }

            if (vat > 0) {
                document.getElementById('vatRow').style.display = 'flex';
                document.getElementById('vatVal').innerText = Math.round(vat).toLocaleString('fa-IR') + ' ریال';
            } else { document.getElementById('vatRow').style.display = 'none'; }

            if (tax104 > 0) {
                document.getElementById('tax104Row').style.display = 'flex';
                document.getElementById('tax104Val').innerText = '(' + Math.round(tax104).toLocaleString('fa-IR') + ' ریال)';
            } else { document.getElementById('tax104Row').style.display = 'none'; }

            if (kanonShare > 0) {
                document.getElementById('kanonRow').style.display = 'flex';
                document.getElementById('kanonVal').innerText = '(' + Math.round(kanonShare).toLocaleString('fa-IR') + ' ریال)';
            } else { document.getElementById('kanonRow').style.display = 'none'; }

            document.getElementById('totalFeeVal').innerText = Math.round(totalPayable).toLocaleString('fa-IR') + ' ریال';
            document.getElementById('tomanVal').innerText = 'معادل ' + numberToWords(Math.floor(totalPayable / 10)) + ' تومان';

            let fee1402 = calculateBaseFee(value, '1402');
            let diff = baseFee - fee1402;
            if (value > 0) {
                document.getElementById('diffBox').innerText = `تفاوت با تعرفه ۱۴۰۲: ${Math.round(diff).toLocaleString('fa-IR')} ریال افزایش`;
            } else {
                document.getElementById('diffBox').innerText = '';
            }

            document.getElementById('resultsBox').style.display = 'block';
            document.getElementById('actionButtons').style.display = 'grid';
        }

        function addExpertAccordionField() {
            expertCount++;
            let id = expertCount;
            let container = document.getElementById('expertsAccordionContainer');
            let item = document.createElement('div');
            item.className = 'accordion-item active';
            item.id = `expItem_${id}`;

            let optionsHtml = defaultDisciplines.map(d => `<option value="${d}">${d}</option>`).join('');

            item.innerHTML = `
                <div class="accordion-header" onclick="toggleAccordion(${id})">
                    <span>مشخصات کارشناس شماره ${id}</span>
                    <span style="color:var(--accent-rose); cursor:pointer;" onclick="removeExpertAccordion(${id}, event)">حذف</span>
                </div>
                <div class="accordion-body">
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <input type="text" class="exp-name-field" placeholder="نام و نام خانوادگی کارشناس">
                        <select class="exp-disc-select" onchange="handleDiscChange(${id}, this)">
                            ${optionsHtml}
                        </select>
                        <input type="text" class="exp-custom-disc" id="customDisc_${id}" placeholder="عنوان رشته کارشناسی را تایپ کنید..." style="display:none;">
                        <input type="text" class="exp-license-field" placeholder="شماره پروانه کارشناسی">
                        <input type="text" class="exp-phone-field" placeholder="شماره تلفن همراه">
                    </div>
                </div>
            `;
            container.appendChild(item);
        }

        function handleDiscChange(id, select) {
            let customInput = document.getElementById(`customDisc_${id}`);
            if (select.value.includes('سایر')) {
                customInput.style.display = 'block';
            } else {
                customInput.style.display = 'none';
            }
        }

        function toggleAccordion(id) {
            let item = document.getElementById(`expItem_${id}`);
            item.classList.toggle('active');
        }

        function removeExpertAccordion(id, e) {
            e.stopPropagation();
            let item = document.getElementById(`expItem_${id}`);
            if (document.querySelectorAll('.accordion-item').length > 1) {
                item.remove();
            } else {
                alert('حداقل اطلاعات یک کارشناس باید درج شود.');
            }
        }

        function openExpertModal() {
            openModal('expertModal');
            populateQuickPicks();
            ['sectionBillCaseInfo', 'sectionBillExperts', 'sectionBillExtras'].forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('expanded');
            });
        }

        function populateQuickPicks() {
            const experts = dbRead(K.experts);
            const expSelect = document.getElementById('expertQuickPick');
            if (expSelect) {
                expSelect.innerHTML = '<option value="">+ انتخاب سریع از کارشناسان ذخیره‌شده...</option>' +
                    experts.map((e) => `<option value="${e.id}">${escapeHtml(e.fullName)}${e.discipline ? ' — ' + escapeHtml(e.discipline) : ''}</option>`).join('');
            }
            const applicants = dbRead(K.applicants);
            const apSelect = document.getElementById('applicantQuickPick');
            if (apSelect) {
                apSelect.innerHTML = '<option value="">+ انتخاب سریع از متقاضیان ذخیره‌شده...</option>' +
                    applicants.map((a) => `<option value="${a.id}">${escapeHtml(a.fullName)}${a.phone ? ' — ' + escapeHtml(a.phone) : ''}</option>`).join('');
            }
        }

        window.quickPickApplicant = function (id) {
            if (!id) return;
            const item = dbRead(K.applicants).find((a) => a.id === id);
            if (item) document.getElementById('clientName').value = item.fullName;
        };

        /* ---------------- Rent Assessment Calculator (Article 13) ---------------- */
        function rentAssessCalc() {
            const monthly = parseInt((document.getElementById('rentMonthly').value || '0').replace(/[^0-9]/g, ''), 10) || 0;
            const mortgage = parseInt((document.getElementById('rentMortgage').value || '0').replace(/[^0-9]/g, ''), 10) || 0;
            const duration = parseInt(document.getElementById('rentDuration').value, 10) || 12;
            const total = (monthly * duration) + Math.round(mortgage * 0.36);
            document.getElementById('rentResultVal').innerText = fmtMoney(total) + ' ریال';
            document.getElementById('rentResultWords').innerText = total > 0 ? (numberToWords(total) + ' ریال') : '';
            return total;
        }
        window.applyRentAssessment = function () {
            const total = rentAssessCalc();
            if (total <= 0) { alert('لطفا حداقل یکی از مقادیر اجاره‌بها یا ودیعه/رهن را وارد نمایید.'); return; }
            document.getElementById('categorySelect').value = 'rent';
            document.getElementById('amountInput').value = total.toString();
            handleInput(document.getElementById('amountInput'));
            calculate();
            closeModal('rentModal');
        };

        // Saves a name typed directly into the pre-invoice form as a reusable record,
        // without creating a duplicate if a matching name already exists.
        function autoUpsertApplicant(fullName) {
            fullName = (fullName || '').trim();
            if (!fullName) return;
            const list = dbRead(K.applicants);
            const existing = list.find((a) => a.fullName.trim() === fullName);
            if (!existing) crudSave(K.applicants, { fullName });
        }
        function autoUpsertExpert(fullName, discipline, licenseNumber, phone) {
            fullName = (fullName || '').trim();
            if (!fullName) return;
            const list = dbRead(K.experts);
            const existing = list.find((e) => e.fullName.trim() === fullName);
            if (existing) {
                const changed = (discipline && existing.discipline !== discipline) ||
                    (licenseNumber && existing.licenseNumber !== licenseNumber) ||
                    (phone && existing.phone !== phone);
                if (changed) {
                    crudSave(K.experts, Object.assign({}, existing, {
                        discipline: discipline || existing.discipline,
                        licenseNumber: licenseNumber || existing.licenseNumber,
                        phone: phone || existing.phone
                    }));
                }
            } else {
                crudSave(K.experts, { fullName, discipline: discipline || '', licenseNumber: licenseNumber || '', phone: phone || '' });
            }
        }

        window.quickAddExpert = function (id) {
            if (!id) return;
            const item = dbRead(K.experts).find((e) => e.id === id);
            if (!item) return;
            addExpertAccordionField();
            const container = document.getElementById('expertsAccordionContainer');
            const lastItem = container.lastElementChild;
            if (!lastItem) return;
            const nameField = lastItem.querySelector('.exp-name-field');
            const licenseField = lastItem.querySelector('.exp-license-field');
            const phoneField = lastItem.querySelector('.exp-phone-field');
            const discSelect = lastItem.querySelector('.exp-disc-select');
            const customDisc = lastItem.querySelector('.exp-custom-disc');
            if (nameField) nameField.value = item.fullName || '';
            if (licenseField) licenseField.value = item.licenseNumber || '';
            if (phoneField) phoneField.value = item.phone || '';
            if (discSelect && item.discipline) {
                const match = [...discSelect.options].find((o) => o.value === item.discipline);
                if (match) {
                    discSelect.value = item.discipline;
                } else {
                    const otherOpt = [...discSelect.options].find((o) => o.value.includes('سایر'));
                    if (otherOpt) discSelect.value = otherOpt.value;
                    if (customDisc) { customDisc.style.display = 'block'; customDisc.value = item.discipline; }
                }
            }
        };

        function generateBill() {
            closeModal('expertModal');

            const invoiceTpl = (typeof getSettings === 'function' ? (getSettings().invoiceTemplate || 'modern') : 'modern');
            const printArea = document.getElementById('billPrintArea');
            const ALL_TPL_CLASSES = ['tpl-modern', 'tpl-formal', 'tpl-classic', 'tpl-minimal', 'tpl-colorful', 'tpl-elegant', 'tpl-compact', 'tpl-boldtitle', 'tpl-watermark', 'tpl-stamp'];
            printArea.classList.remove(...ALL_TPL_CLASSES);
            printArea.classList.add('tpl-' + invoiceTpl);
            let bismillahEl = printArea.querySelector('.bismillah-line');
            if (invoiceTpl === 'formal') {
                if (!bismillahEl) {
                    bismillahEl = document.createElement('div');
                    bismillahEl.className = 'bismillah-line';
                    bismillahEl.innerText = 'بسمه‌تعالی';
                    printArea.insertBefore(bismillahEl, printArea.firstChild);
                }
            } else if (bismillahEl) {
                bismillahEl.remove();
            }

            document.getElementById('billExpDate').innerText = document.getElementById('expDate').value || 'درج نشده';
            document.getElementById('billCaseNum').innerText = document.getElementById('caseNum').value || 'درج نشده';
            document.getElementById('billClient').innerText = document.getElementById('clientName').value || 'درج نشده';
            document.getElementById('billCourt').innerText = document.getElementById('courtBranch').value || 'درج نشده';

            autoUpsertApplicant(document.getElementById('clientName').value);

            let expertsContainer = document.getElementById('billExpertsContainer');
            let sigsContainer = document.getElementById('signaturesContainer');
            expertsContainer.innerHTML = '';
            sigsContainer.innerHTML = '';

            document.querySelectorAll('.accordion-item').forEach((item, idx) => {
                let name = item.querySelector('.exp-name-field').value || `کارشناس شماره ${idx+1}`;
                let discSelect = item.querySelector('.exp-disc-select').value;
                let customDisc = item.querySelector('.exp-custom-disc').value;
                let discipline = discSelect.includes('سایر') ? (customDisc || 'کارشناس رسمی') : discSelect;
                let lic = item.querySelector('.exp-license-field').value;
                let phone = item.querySelector('.exp-phone-field').value;

                autoUpsertExpert(name, discipline, lic, phone);

                let div = document.createElement('div');
                div.className = 'expert-line-item';
                div.innerHTML = `<strong>${idx + 1}. ${name}</strong> (${discipline}) ${lic ? `| پروانه: <strong>${lic}</strong>` : ''} ${phone ? `| همراه: <strong>${phone}</strong>` : ''}`;
                expertsContainer.appendChild(div);

                let sigCard = document.createElement('div');
                sigCard.className = 'signature-card';
                sigCard.innerHTML = `
                    <div class="signature-card-name">${name}</div>
                    <div class="signature-card-lic">کارشناس رشته ${discipline}</div>
                    <div class="signature-space">محل امضاء و مهر</div>
                `;
                sigsContainer.appendChild(sigCard);
            });

            document.getElementById('billVal').innerText = document.getElementById('amountInput').value || '۰';
            let tbody = document.getElementById('billTableBody');
            tbody.innerHTML = '';

            tbody.innerHTML += `<tr><td>حق‌الزحمه ارزیابی پایه (تعرفه سال ${currentTariff})</td><td>${document.getElementById('baseFeeVal').innerText}</td></tr>`;

            if (document.getElementById('chkMissionIn').checked) {
                let days = document.getElementById('daysMissionIn').value || 1;
                let fee = days * 7500000;
                tbody.innerHTML += `<tr><td>فوق‌العاده مأموریت داخل استان (${days} روز)</td><td>${fee.toLocaleString('fa-IR')} ریال</td></tr>`;
            }
            if (document.getElementById('chkMissionOut').checked) {
                let days = document.getElementById('daysMissionOut').value || 1;
                let fee = days * 15000000;
                tbody.innerHTML += `<tr><td>فوق‌العاده مأموریت خارج استان (${days} روز)</td><td>${fee.toLocaleString('fa-IR')} ریال</td></tr>`;
            }
            if (document.getElementById('chkTamin').checked) {
                tbody.innerHTML += `<tr><td>حق‌الزحمه قرار تأمین دلیل</td><td>۲۰,۰۰۰,۰۰۰ ریال</td></tr>`;
            }
            if (document.getElementById('chkAerial').checked) {
                let photos = parseInt(document.getElementById('photosAerial').value, 10) || 1;
                let years = parseInt(document.getElementById('yearsAerial').value, 10) || 0;
                let extra = parseInt(document.getElementById('extraAerial').value, 10) || 0;
                let perPhoto = 20000000 * (1 + (years * 0.10) + (extra * 0.40));
                let fee = perPhoto * photos;
                tbody.innerHTML += `<tr><td>تفسیر عکس‌های هوایی/ماهواره‌ای (${photos} مورد، ${years} سال قدمت)</td><td>${fee.toLocaleString('fa-IR')} ریال</td></tr>`;
            }
            if (document.getElementById('chkMapMatch').checked) {
                let area = parseFloat(document.getElementById('areaMapMatch').value) || 0;
                let fee = Math.max(20000000, Math.min(100000000, area * 30000));
                tbody.innerHTML += `<tr><td>تطبیق نقشه با محل (${area} مترمربع)</td><td>${fee.toLocaleString('fa-IR')} ریال</td></tr>`;
            }
            if (document.getElementById('chkStrength').checked) {
                let area = parseFloat(document.getElementById('areaStrength').value) || 0;
                let fee = calculateMadde36();
                let typeLabel = document.getElementById('typeStrength').selectedOptions[0].text;
                tbody.innerHTML += `<tr><td>کنترل نقشه/سازه و استحکام بنا - ${typeLabel} (${area} مترمربع)</td><td>${Math.round(fee).toLocaleString('fa-IR')} ریال</td></tr>`;
            }
            if (document.getElementById('chkM39').checked) {
                let area = parseFloat(document.getElementById('areaM39').value) || 0;
                let fee = calculateMadde39();
                tbody.innerHTML += `<tr><td>پیاده کردن محدوده پلاک ثبتی - ماده ۳۹ (${area} مترمربع)</td><td>${Math.round(fee).toLocaleString('fa-IR')} ریال</td></tr>`;
            }
            if (document.getElementById('chkM40').checked) {
                let area = parseFloat(document.getElementById('areaM40').value) || 0;
                let fee = calculateMadde40();
                tbody.innerHTML += `<tr><td>نقشه‌برداری اراضی و تهیه پروفیل - ماده ۴۰ (${area} مترمربع)</td><td>${Math.round(fee).toLocaleString('fa-IR')} ریال</td></tr>`;
            }
            if (document.getElementById('chkM41').checked) {
                let area = parseFloat(document.getElementById('areaM41').value) || 0;
                let fee = calculateMadde41();
                tbody.innerHTML += `<tr><td>مطالعه پرونده و تعیین محل پلاک - ماده ۴۱ (${area} مترمربع)</td><td>${Math.round(fee).toLocaleString('fa-IR')} ریال</td></tr>`;
            }
            if (document.getElementById('chkM43').checked) {
                let hectares = parseFloat(document.getElementById('areaM43').value) || 0;
                let fee = calculateMadde43();
                tbody.innerHTML += `<tr><td>تشخیص حدود ثبتی - ماده ۴۳ (${hectares} هکتار)</td><td>${Math.round(fee).toLocaleString('fa-IR')} ریال</td></tr>`;
            }
            if (document.getElementById('chkM20').checked) {
                let km = parseFloat(document.getElementById('kmM20').value) || 0;
                let fee = calculateMadde20();
                tbody.innerHTML += `<tr><td>تعیین حریم کانال/رودخانه - ماده ۲۰ (${km} کیلومتر)</td><td>${Math.round(fee).toLocaleString('fa-IR')} ریال</td></tr>`;
            }
            if (document.getElementById('chkM31').checked) {
                let fee = calculateMadde31();
                tbody.innerHTML += `<tr><td>کارشناسی وسایل نقلیه زمینی - ماده ۳۱</td><td>${Math.round(fee).toLocaleString('fa-IR')} ریال</td></tr>`;
            }
            if (document.getElementById('chkM15').checked) {
                let flow = parseFloat(document.getElementById('flowM15').value) || 0;
                let fee = calculateMadde15();
                tbody.innerHTML += `<tr><td>اندازه‌گیری آب و حقابه - ماده ۱۵ (${flow} لیتر/ثانیه)</td><td>${Math.round(fee).toLocaleString('fa-IR')} ریال</td></tr>`;
            }
            if (document.getElementById('chkMWater').checked) {
                let label = document.getElementById('selMWater').selectedOptions[0].text;
                let fee = calculateMWater();
                tbody.innerHTML += `<tr><td>${label}</td><td>${Math.round(fee).toLocaleString('fa-IR')} ریال</td></tr>`;
            }
            if (document.getElementById('chkMRange').checked) {
                let label = document.getElementById('selMRange').selectedOptions[0].text;
                let fee = calculateMRange();
                tbody.innerHTML += `<tr><td>${label} (دستمزد پیشنهادی)</td><td>${Math.round(fee).toLocaleString('fa-IR')} ریال</td></tr>`;
            }
            if (document.getElementById('chkM46').checked) {
                let docs = parseFloat(document.getElementById('docsM46').value) || 0;
                let fee = calculateMadde46();
                tbody.innerHTML += `<tr><td>بررسی اصالت خط/امضا/اثر انگشت - ماده ۴۶ (${docs} مستند)</td><td>${Math.round(fee).toLocaleString('fa-IR')} ریال</td></tr>`;
            }

            if (document.getElementById('chkPetition').checked) {
                let rawPet = document.getElementById('petitionAmount').value.replace(/[^0-9]/g, '');
                let petAmt = parseInt(rawPet, 10) || 0;
                if (petAmt > 0) {
                    tbody.innerHTML += `<tr><td>مبلغ درخواستی افزایش دستمزد (طبق لایحه)</td><td>${petAmt.toLocaleString('fa-IR')} ریال</td></tr>`;
                }
            }

            if (document.getElementById('chkPoverty').checked) {
                tbody.innerHTML += `<tr style="color:red;"><td>اعمال تخفیف عدم استطاعت مالی / اعسار (۵۰٪)</td><td>منظور شد</td></tr>`;
            }

            if (document.getElementById('chkVat').checked) {
                tbody.innerHTML += `<tr><td>مالیات بر ارزش افزوده (۱۰٪)</td><td>${document.getElementById('vatVal').innerText}</td></tr>`;
            }
            if (document.getElementById('chkTax104').checked) {
                tbody.innerHTML += `<tr style="color:red;"><td>کسر مالیات تکلیفی (۵٪ ماده ۱۰۴)</td><td>${document.getElementById('tax104Val').innerText}</td></tr>`;
            }
            if (document.getElementById('chkKanonShare').checked) {
                tbody.innerHTML += `<tr style="color:red;"><td>کسر ۵٪ سهم کانون / مرکز کارشناسان</td><td>${document.getElementById('kanonVal').innerText}</td></tr>`;
            }

            if (document.getElementById('chkPetition').checked) {
                document.getElementById('billPetitionBox').style.display = 'block';
                document.getElementById('billPetitionTextDisplay').innerText = document.getElementById('petitionText').value;
            } else {
                document.getElementById('billPetitionBox').style.display = 'none';
            }

            if (document.getElementById('chkBank').checked) {
                let bank = document.getElementById('bankAccount').value;
                if (bank) {
                    document.getElementById('billBankBox').style.display = 'block';
                    document.getElementById('billBankDisplay').innerText = bank;
                } else {
                    document.getElementById('billBankBox').style.display = 'none';
                }
            } else {
                document.getElementById('billBankBox').style.display = 'none';
            }

            let notes = document.getElementById('billNotes').value;
            document.getElementById('billNotesArea').innerText = notes ? `توضیحات: ${notes}` : '';

            document.getElementById('billTotal').innerText = document.getElementById('totalFeeVal').innerText;

            saveCaseRecord(Object.assign(buildCaseRecordFromForm(), { status: 'final', invoiceIssued: true }));

            openModal('billModal');
            if (getSettings().autoResetAfterInvoice) resetForm();
            editingCaseId = null;
        }

        let editingCaseId = null;

        /* Gathers the current calculator form + expert list into one record,
           shared by invoice issuance, "save case" and "save draft". */
        function buildCaseRecordFromForm() {
            const experts = [];
            document.querySelectorAll('#expertsAccordionContainer .accordion-item').forEach((item) => {
                const name = (item.querySelector('.exp-name-field').value || '').trim();
                if (!name) return;
                experts.push(name);
                const discSelect = item.querySelector('.exp-disc-select').value;
                const customDisc = item.querySelector('.exp-custom-disc').value;
                const discipline = discSelect.includes('سایر') ? (customDisc || 'کارشناس رسمی') : discSelect;
                const lic = item.querySelector('.exp-license-field').value;
                const phone = item.querySelector('.exp-phone-field').value;
                autoUpsertExpert(name, discipline, lic, phone);
            });
            const rec = {
                expDate: document.getElementById('expDate').value || '',
                caseNum: document.getElementById('caseNum').value || '',
                clientName: document.getElementById('clientName').value || '',
                courtBranch: document.getElementById('courtBranch').value || '',
                tariffYear: currentTariff,
                category: document.getElementById('categorySelect').value,
                amount: document.getElementById('amountInput').value || '',
                totalFee: document.getElementById('totalFeeVal').innerText || '',
                expertsSummary: experts.join('، ')
            };
            if (editingCaseId) {
                const original = dbRead(K.cases).find((c) => c.id === editingCaseId);
                const originalDate = (original && original.expDate) || (original && original.createdAt ? new Date(original.createdAt).toLocaleDateString('fa-IR') : 'نامشخص');
                rec.id = editingCaseId;
                rec.editNote = `اصل پرونده در تاریخ ${originalDate} وارد شده و در تاریخ ${new Date().toLocaleDateString('fa-IR')} ویرایش شده است.`;
            } else {
                rec.createdAt = Date.now();
            }
            return rec;
        }

        window.editCase = function (id) {
            const c = dbRead(K.cases).find((x) => x.id === id);
            if (!c) return;
            editingCaseId = id;
            switchView('calc');
            setTimeout(() => {
                if (c.tariffYear) {
                    const btn = document.querySelector(`.tab-btn[onclick*="setTariff('${c.tariffYear}'"]`);
                    if (btn) setTariff(c.tariffYear, btn);
                }
                if (c.category) { document.getElementById('categorySelect').value = c.category; }
                document.getElementById('amountInput').value = c.amount || '';
                document.getElementById('expDate').value = c.expDate || '';
                document.getElementById('caseNum').value = c.caseNum || '';
                document.getElementById('clientName').value = c.clientName || '';
                document.getElementById('courtBranch').value = c.courtBranch || '';
                calculate();
                showToast('در حال ویرایش این پرونده هستی — پس از تغییرات، دوباره ذخیره یا صادر کن.', 'info');
                document.getElementById('expDate').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
        };

        window.saveCaseAsFinal = function () {
            const clientName = document.getElementById('clientName').value || '';
            if (clientName.trim()) autoUpsertApplicant(clientName);
            saveCaseRecord(Object.assign(buildCaseRecordFromForm(), { status: 'final' }));
            showToast('پرونده با موفقیت ذخیره شد.', 'success');
            closeModal('expertModal');
            editingCaseId = null;
        };

        window.saveCaseAsDraft = function () {
            saveCaseRecord(Object.assign(buildCaseRecordFromForm(), { status: 'draft' }));
            showToast('پیش‌نویس ذخیره شد — از بخش «پرونده‌ها» قابل تکمیل است.', 'success');
            closeModal('expertModal');
            editingCaseId = null;
        };

        function downloadBillAsHTML() {
            let content = document.getElementById('billPrintArea').outerHTML;
            let fullHTML = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>پیش‌فاکتور</title><style>body{font-family:sans-serif;padding:20px;}.bill-template{border:1px solid #ccc;padding:20px;}.bill-table{width:100%;border-collapse:collapse;}.bill-table th, .bill-table td{border:1px solid #ccc;padding:8px;text-align:center;}</style></head><body>${content}</body></html>`;
            let blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
            let link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `PreInvoice_${Date.now()}.html`;
            link.click();
        }

        function shareSummary() {
            let text = `پیش‌فاکتور دستمزد کارشناسی رسمی:\nمبلغ کل قابل پرداخت: ${document.getElementById('totalFeeVal').innerText}\n${document.getElementById('tomanVal').innerText}`;
            if (navigator.share) {
                navigator.share({ title: 'پیش فاکتور کارشناسی', text: text });
            } else {
                navigator.clipboard.writeText(text);
                alert('متن پیش‌فاکتور با موفقیت کپی شد.');
            }
        }

        function resetForm() {
            document.getElementById('amountInput').value = '';
            document.getElementById('wordsHint').innerText = '';
            document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
            document.querySelectorAll('.addon-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.addon-subinput').forEach(s => s.style.display = 'none');
            document.getElementById('petitionSubContainer').style.display = 'none';
            document.getElementById('resultsBox').style.display = 'none';
            document.getElementById('actionButtons').style.display = 'none';
        }

        function numberToWords(num) {
            if (num === 0) return 'صفر';
            const yekan = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
            const dahtan = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هیجده', 'نوزده'];
            const dahgan = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
            const sadgan = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
            const basess = ['', ' هزار', ' میلیون', ' میلیارد', ' تریلیون'];

            function convertSection(n) {
                let res = [];
                let c = Math.floor(n / 100), b = Math.floor((n % 100) / 10), a = n % 10;
                if (c > 0) res.push(sadgan[c]);
                if (b === 1) res.push(dahtan[a]);
                else {
                    if (b > 1) res.push(dahgan[b]);
                    if (a > 0) res.push(yekan[a]);
                }
                return res.join(' و ');
            }

            let parts = [], i = 0;
            while (num > 0) {
                let section = num % 1000;
                if (section > 0) parts.unshift(convertSection(section) + basess[i]);
                num = Math.floor(num / 1000); i++;
            }
            return parts.join(' و ');
        }

        /* ---------------- PWA INSTALL HANDLING ---------------- */
        let deferredInstallPrompt = null;

        function isStandaloneMode() {
            return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        }

        function isIOSDevice() {
            return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        }

        function showInstallUI() {
            if (isStandaloneMode()) return;
            scheduleInstallBanner();
            updateSideMenuInstallItem();
        }

        function updateSideMenuInstallItem() {
            const item = document.getElementById('sideMenuInstallItem');
            if (!item) return;
            item.style.display = isStandaloneMode() ? 'none' : 'flex';
        }

        let installBannerTimer = null;
        function scheduleInstallBanner() {
            if (localStorage.getItem('installBannerDismissed') === '1') return;
            if (installBannerTimer) return;
            installBannerTimer = setTimeout(() => {
                if (isStandaloneMode()) return;
                if (localStorage.getItem('installBannerDismissed') === '1') return;
                const banner = document.getElementById('installBanner');
                if (banner) banner.style.display = 'flex';
            }, 20000);
        }

        function hideInstallUI() {
            const banner = document.getElementById('installBanner');
            if (banner) banner.style.display = 'none';
        }

        function dismissInstallBanner() {
            document.getElementById('installBanner').style.display = 'none';
            localStorage.setItem('installBannerDismissed', '1');
        }

        async function triggerInstall() {
            if (deferredInstallPrompt) {
                deferredInstallPrompt.prompt();
                try { await deferredInstallPrompt.userChoice; } catch (e) {}
                deferredInstallPrompt = null;
            } else {
                showManualInstallInstructions();
            }
        }

        function showManualInstallInstructions() {
            const body = document.getElementById('installInstructionsBody');
            if (isIOSDevice()) {
                body.innerHTML = `
                    <p style="margin-bottom:10px;">برای نصب این ابزار روی آیفون به‌صورت اپلیکیشن مستقل:</p>
                    <p>۱. در مرورگر <strong>Safari</strong>، دکمه <strong>Share</strong> (مربع با فلش رو به بالا، پایین یا بالای صفحه) را بزنید.</p><br>
                    <p>۲. از لیست گزینه‌ها، <strong>«Add to Home Screen»</strong> را انتخاب کنید.</p><br>
                    <p>۳. روی <strong>«Add»</strong> بزنید. آیکون برنامه به صفحه اصلی گوشی شما اضافه می‌شود و بدون نوار آدرس مرورگر باز می‌شود.</p>
                `;
            } else {
                body.innerHTML = `
                    <p style="margin-bottom:10px;">برای نصب این ابزار به‌صورت اپلیکیشن مستقل روی گوشی یا رایانه:</p>
                    <p>از منوی سه‌نقطه بالای مرورگر (Chrome / Edge)، گزینه <strong>«Add to Home screen»</strong> یا <strong>«Install App»</strong> را بزنید. در برخی مرورگرها آیکون نصب کنار نوار آدرس هم نمایش داده می‌شود.</p>
                `;
            }
            openModal('installModal');
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredInstallPrompt = e;
            showInstallUI();
        });

        window.addEventListener('appinstalled', () => {
            hideInstallUI();
            localStorage.setItem('installBannerDismissed', '1');
            updateSideMenuInstallItem();
        });

        document.addEventListener('DOMContentLoaded', () => {
            updateSideMenuInstallItem();
            if (!isStandaloneMode() && isIOSDevice()) {
                showInstallUI();
            }
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('sw.js').catch(() => {});
                let swRefreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (swRefreshing) return;
                    swRefreshing = true;
                    location.reload();
                });
            }
        });

        /* ---------- Local case storage (always works, online or offline) ---------- */
        const LOCAL_CASES_KEY = 'karshenas_plus_cases';
        const CLOUD_TOAST_SHOWN_KEY = 'karshenas_cloud_toast_shown';

        // Called every time a pre-invoice/case is generated. Always saves locally first
        // (via crudSave, defined further below), then hands off to the Firebase module
        // (if it managed to load and the user is signed in) for cloud sync.
        function saveCaseRecord(record) {
            crudSave(LOCAL_CASES_KEY, record);
        }

        /* ---------- Friendly reminder to sign in, shown once after ~1 minute of use ---------- */
        function dismissCloudToast() {
            const toast = document.getElementById('cloudToast');
            if (toast) toast.classList.remove('show');
            sessionStorage.setItem(CLOUD_TOAST_SHOWN_KEY, '1');
        }
        window.dismissCloudToast = dismissCloudToast;

        setTimeout(() => {
            const alreadySignedIn = !!(window.karshenasCurrentUser);
            const alreadyShown = sessionStorage.getItem(CLOUD_TOAST_SHOWN_KEY) === '1';
            if (!alreadySignedIn && !alreadyShown) {
                const toast = document.getElementById('cloudToast');
                if (toast) toast.classList.add('show');
            }
        }, 60000);

        /* =========================================================================
           STAGE 2 — Full app screens: Dashboard, Cases, Applicants, Experts,
           Tariffs, Reports, Reminders, Backup, Settings.
           Everything here reads/writes the SAME localStorage keys that
           cloudSyncItem()/pullAndMergeAll() (Firebase module below) already sync.
           ========================================================================= */

        const K = {
            cases: 'karshenas_plus_cases',
            experts: 'karshenas_plus_experts',
            applicants: 'karshenas_plus_applicants',
            reminders: 'karshenas_plus_reminders',
            settings: 'karshenas_plus_settings'
        };
        const CLOUD_NAME = { cases: 'cases', experts: 'experts', applicants: 'applicants', reminders: 'reminders' };

        function dbRead(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } }
        function dbWrite(key, list) { localStorage.setItem(key, JSON.stringify(list)); }
        function genId() { return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); }
        function fmtMoney(n) {
            n = Math.round(Number(n) || 0);
            return (getSettings().digitStyle === 'en') ? n.toLocaleString('en-US') : n.toLocaleString('fa-IR');
        }
        function escapeHtml(s) { return (s || '').toString().replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

        // Generic save: upserts into a collection, marks it unsynced, then hands off
        // to the Firebase module (if signed in) to push it to Firestore by id.
        function crudSave(storeKey, item) {
            const list = dbRead(storeKey);
            if (!item.id) {
                item.id = genId();
                item.createdAt = item.createdAt || new Date().toISOString();
                list.unshift(item);
            } else {
                const idx = list.findIndex((x) => x.id === item.id);
                item.updatedAt = new Date().toISOString();
                if (idx > -1) list[idx] = Object.assign({}, list[idx], item);
                else list.unshift(item);
            }
            item._cloudSynced = false;
            dbWrite(storeKey, list);
            const cloudName = { [K.cases]: 'cases', [K.experts]: 'experts', [K.applicants]: 'applicants', [K.reminders]: 'reminders' }[storeKey];
            if (cloudName && typeof window.cloudSyncItem === 'function') window.cloudSyncItem(cloudName, item);
            return list;
        }
        function crudDelete(storeKey, id) {
            let list = dbRead(storeKey);
            list = list.filter((x) => x.id !== id);
            dbWrite(storeKey, list);
            const cloudName = { [K.cases]: 'cases', [K.experts]: 'experts', [K.applicants]: 'applicants', [K.reminders]: 'reminders' }[storeKey];
            if (cloudName && typeof window.cloudDeleteItem === 'function') window.cloudDeleteItem(cloudName, id);
            return list;
        }

        /* ---------------- Navigation ---------------- */
        function switchView(name) {
            document.querySelectorAll('.app-view').forEach((v) => v.classList.remove('active'));
            const target = document.getElementById('view-' + name);
            if (target) target.classList.add('active');
            document.querySelectorAll('.bn-item').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
            const renderers = {
                dashboard: renderDashboard, cases: renderCases, applicants: renderApplicants,
                experts: renderExperts, tariffs: renderTariffs, reports: renderReports,
                reminders: renderReminders, backup: renderBackup, settings: renderSettings
            };
            if (renderers[name]) renderers[name]();
            window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
        }
        window.switchView = switchView;
        window.refreshAllViews = function () {
            const active = document.querySelector('.app-view.active');
            if (active) switchView(active.id.replace('view-', ''));
        };

        /* ---------------- Dashboard ---------------- */
        const CATEGORY_LABELS = {
            general: 'ارزیابی عمومی', contract: 'پیمانکاری', delay: 'تخلف/تأخیر', brand: 'برند',
            audit: 'حسابرسی', household: 'لوازم خانگی', landSplit: 'افراز املاک', agriSplit: 'افراز کشاورزی',
            software: 'نرم‌افزار', rent: 'اجاره‌بها'
        };

        function renderDashboard() {
            const cases = dbRead(K.cases);
            const reminders = dbRead(K.reminders).filter((r) => !r.completed);
            const totalFee = cases.reduce((sum, c) => sum + (parseStoredAmount(c.totalFee)), 0);
            const thisMonth = cases.length; // simple count, no Jalali month parsing needed for a useful glance

            let html = `
                <div class="view-header"><span class="view-title">داشبورد</span></div>
                <div class="stat-grid">
                    <div class="stat-card"><div class="stat-val" data-countup="${cases.length}">۰</div><div class="stat-label">تعداد پرونده‌های ثبت‌شده</div></div>
                    <div class="stat-card"><div class="stat-val" data-countup="${totalFee}" data-money="1">۰</div><div class="stat-label">جمع کل دستمزد (ریال)</div></div>
                    <div class="stat-card"><div class="stat-val" data-countup="${dbRead(K.experts).length}">۰</div><div class="stat-label">کارشناسان ثبت‌شده</div></div>
                    <div class="stat-card"><div class="stat-val" data-countup="${reminders.length}">۰</div><div class="stat-label">یادآوری‌های باز</div></div>
                </div>
                <div class="section-box">
                    <div class="section-title"><span>آخرین پرونده‌ها</span></div>
                    ${cases.slice(0, 5).map((c) => `
                        <div class="list-item" onclick="switchView('cases')">
                            <div class="list-item-row">
                                <div>
                                    <div class="list-item-title">${escapeHtml(c.clientName || 'بدون نام متقاضی')}</div>
                                    <div class="list-item-sub">${CATEGORY_LABELS[c.category] || c.category || ''} · ${escapeHtml(c.caseNum || 'بدون کلاسه')}</div>
                                </div>
                                <div class="list-item-sub" style="font-weight:800; color:var(--accent-cyan);">${escapeHtml(c.totalFee || '')}</div>
                            </div>
                        </div>`).join('') || '<div class="empty-state">هنوز هیچ پرونده‌ای ثبت نشده. از تب «محاسبه» شروع کن.</div>'}
                </div>`;
            document.getElementById('dashboardContent').innerHTML = html;
            runCountUpAnimations();
        }

        /* ---------------- Cases History ---------------- */
        /* ---------------- Shared multi-select + grid-layout system, used by
           Cases / Applicants / Experts list views ---------------- */
        const selectionState = { cases: new Set(), applicants: new Set(), experts: new Set() };
        const selectionModeOn = { cases: false, applicants: false, experts: false };

        function getGridLayout(kind) { return getSettings()[kind + 'GridLayout'] || '1'; }
        window.setGridLayout = function (kind, cols) {
            saveSettings({ [kind + 'GridLayout']: cols });
            rerenderKind(kind);
        };
        function rerenderKind(kind) {
            if (kind === 'cases') renderCases();
            else if (kind === 'applicants') renderApplicants();
            else renderExperts();
        }
        window.toggleSelectionMode = function (kind) {
            selectionModeOn[kind] = !selectionModeOn[kind];
            selectionState[kind].clear();
            rerenderKind(kind);
        };
        window.toggleItemSelected = function (kind, id) {
            if (!selectionModeOn[kind]) return;
            const set = selectionState[kind];
            if (set.has(id)) set.delete(id); else set.add(id);
            const card = document.getElementById(kind + 'Card-' + id);
            if (card) card.classList.toggle('selected', set.has(id));
            updateSelectionToolbar(kind);
        };
        window.selectAllVisible = function (kind, ids) {
            ids.forEach((id) => selectionState[kind].add(id));
            ids.forEach((id) => { const c = document.getElementById(kind + 'Card-' + id); if (c) c.classList.add('selected'); });
            updateSelectionToolbar(kind);
        };
        window.deselectAllVisible = function (kind) {
            selectionState[kind].forEach((id) => { const c = document.getElementById(kind + 'Card-' + id); if (c) c.classList.remove('selected'); });
            selectionState[kind].clear();
            updateSelectionToolbar(kind);
        };
        function updateSelectionToolbar(kind) {
            const el = document.getElementById(kind + 'SelCount');
            if (el) el.innerText = selectionState[kind].size.toLocaleString('fa-IR');
        }
        function layoutPickerHtml(kind) {
            const cur = getGridLayout(kind);
            const opts = [['1', '۱×۱'], ['3', '۳×۳'], ['4', '۴×۴']];
            return `<div class="layout-picker">${opts.map(([v, l]) => `<button class="${cur === v ? 'active' : ''}" title="چیدمان ${l}" onclick="setGridLayout('${kind}', '${v}')">${l}</button>`).join('')}</div>`;
        }
        function selectionToolbarHtml(kind, allIds) {
            if (!selectionModeOn[kind]) {
                return `<button class="nav-btn" style="height:34px; padding:0 10px;" onclick="toggleSelectionMode('${kind}')">حالت انتخاب</button>`;
            }
            return `
                <button class="nav-btn" style="height:34px; padding:0 10px;" onclick="toggleSelectionMode('${kind}')">پایان انتخاب</button>
                <div class="selection-toolbar" style="width:100%;">
                    <span>انتخاب‌شده: <span class="sel-count" id="${kind}SelCount">${selectionState[kind].size.toLocaleString('fa-IR')}</span></span>
                    <button class="nav-btn" style="height:28px; padding:0 8px; font-size:0.68rem;" onclick="selectAllVisible('${kind}', ${JSON.stringify(allIds)})">انتخاب همه</button>
                    <button class="nav-btn" style="height:28px; padding:0 8px; font-size:0.68rem;" onclick="deselectAllVisible('${kind}')">لغو انتخاب</button>
                    <button class="nav-btn" style="height:28px; padding:0 8px; font-size:0.68rem;" onclick="printSelectedEntities('${kind}')">چاپ</button>
                    <button class="nav-btn" style="height:28px; padding:0 8px; font-size:0.68rem;" onclick="shareSelectedEntities('${kind}')">اشتراک‌گذاری</button>
                </div>`;
        }

        /* Animates [data-countup] elements from 0 to their target value — small
           visual touch that makes the dashboard/report numbers feel alive. */
        function runCountUpAnimations() {
            document.querySelectorAll('[data-countup]').forEach((el) => {
                const target = Number(el.getAttribute('data-countup')) || 0;
                const isMoney = el.getAttribute('data-money') === '1';
                const duration = 600;
                const start = performance.now();
                function tick(now) {
                    const p = Math.min(1, (now - start) / duration);
                    const eased = 1 - Math.pow(1 - p, 3);
                    const val = Math.round(target * eased);
                    el.textContent = isMoney ? fmtMoney(val) : val.toLocaleString('fa-IR');
                    if (p < 1) requestAnimationFrame(tick);
                }
                requestAnimationFrame(tick);
            });
        }
        window.runCountUpAnimations = runCountUpAnimations;

        /* Deterministic color per discipline/category name, so the same
           category always gets the same accent color across the app. */
        const CHIP_COLORS = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#0891b2', '#7c3aed', '#db2777', '#65a30d'];
        function colorForLabel(label) {
            let hash = 0;
            const s = String(label || '');
            for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
            return CHIP_COLORS[hash % CHIP_COLORS.length];
        }
        window.colorForLabel = colorForLabel;

        function emptyStateHtml(message) {
            return `<div class="empty-state">
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.35; margin-bottom:8px;">
                    <rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="3" y1="12" x2="21" y2="12"/>
                </svg>
                <div>${escapeHtml(message)}</div>
            </div>`;
        }
        window.emptyStateHtml = emptyStateHtml;

        function renderCases(searchTerm, statusFilter) {
            searchTerm = (searchTerm != null) ? searchTerm : (document.getElementById('caseSearchInput') ? document.getElementById('caseSearchInput').value : '');
            statusFilter = (statusFilter != null) ? statusFilter : (document.getElementById('caseStatusFilter') ? document.getElementById('caseStatusFilter').value : 'all');
            const all = dbRead(K.cases);
            const q = (searchTerm || '').trim();
            const cases = all.filter((c) => {
                if (statusFilter && statusFilter !== 'all' && (c.status || 'final') !== statusFilter) return false;
                if (!q) return true;
                const hay = [c.clientName, c.caseNum, c.courtBranch, c.expertsSummary].join(' ');
                return hay.includes(q);
            });
            const cols = getGridLayout('cases');
            const selOn = selectionModeOn.cases;
            let html = `
                <div class="view-header">
                    <span class="view-title">تاریخچه پرونده‌ها (${cases.length.toLocaleString('fa-IR')} از ${all.length.toLocaleString('fa-IR')})</span>
                    ${layoutPickerHtml('cases')}
                </div>
                <div class="section-box" style="display:flex; gap:8px; flex-wrap:wrap;">
                    <input id="caseSearchInput" type="text" placeholder="جستجو بر اساس نام، شماره کلاسه، شعبه یا کارشناس..." value="${escapeHtml(q)}"
                        style="flex:1; min-width:180px;" oninput="renderCases(this.value)">
                    <select id="caseStatusFilter" style="width:auto;" onchange="renderCases(document.getElementById('caseSearchInput').value, this.value)">
                        <option value="all" ${statusFilter==='all'?'selected':''}>همه</option>
                        <option value="final" ${statusFilter==='final'?'selected':''}>نهایی‌شده</option>
                        <option value="draft" ${statusFilter==='draft'?'selected':''}>پیش‌نویس</option>
                    </select>
                    ${selectionToolbarHtml('cases', cases.map((c) => c.id))}
                </div>
                <div class="entity-grid ${cols === '3' ? 'cols-3' : cols === '4' ? 'cols-4' : ''}">
                ${cases.map((c) => `
                    <div class="section-box list-item ${selOn ? 'selectable' : ''} ${selectionState.cases.has(c.id) ? 'selected' : ''}" id="casesCard-${c.id}"
                         style="cursor:pointer;" onclick="${selOn ? `toggleItemSelected('cases','${c.id}')` : `toggleSection('casesCard-${c.id}')`}">
                        <div class="list-item-row">
                            <div>
                                <div class="list-item-title">
                                    ${escapeHtml(c.clientName || 'بدون نام متقاضی')}
                                    ${(c.status === 'draft') ? '<span style="font-size:0.62rem; font-weight:800; color:var(--accent-amber); border:1px solid var(--accent-amber); border-radius:6px; padding:1px 6px; margin-inline-start:6px;">پیش‌نویس</span>' : ''}
                                </div>
                                <div class="list-item-sub"><span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${colorForLabel(CATEGORY_LABELS[c.category] || c.category)}; margin-inline-end:4px;"></span>${CATEGORY_LABELS[c.category] || c.category || ''} · کلاسه: ${escapeHtml(c.caseNum || '-')} · شعبه: ${escapeHtml(c.courtBranch || '-')}</div>
                                <div class="list-item-sub" style="margin-top:4px; font-weight:800; color:var(--accent-cyan);">${escapeHtml(c.totalFee || '')} ریال</div>
                            </div>
                            ${!selOn ? `
                            <div class="list-item-actions">
                                <button title="ویرایش" onclick="event.stopPropagation(); editCase('${c.id}')">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                </button>
                                <button class="danger" title="حذف" onclick="event.stopPropagation(); deleteCase('${c.id}')">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></svg>
                                </button>
                            </div>` : ''}
                        </div>
                        <div class="section-content-wrap">
                            <div style="padding-top:10px; border-top:1px solid var(--border-color); margin-top:10px; font-size:0.78rem; line-height:2;">
                                <div><strong>۱. اطلاعات پرونده:</strong> تاریخ ${escapeHtml(c.expDate || '-')} · تعرفه سال ${escapeHtml(String(c.tariffYear || ''))}</div>
                                <div><strong>۲. کارشناسان:</strong> ${escapeHtml(c.expertsSummary || 'ثبت نشده')}</div>
                                <div><strong>۳. مبلغ:</strong> ${escapeHtml(c.amount || '-')} → جمع کل ${escapeHtml(c.totalFee || '')} ریال</div>
                                ${c.editNote ? `<div><strong>۴. یادداشت ویرایش:</strong> ${escapeHtml(c.editNote)}</div>` : ''}
                            </div>
                        </div>
                    </div>`).join('') || emptyStateHtml('موردی یافت نشد.')}
                </div>`;
            document.getElementById('casesContent').innerHTML = html;
        }
        window.renderCases = renderCases;
        window.deleteCase = function (id) {
            if (getSettings().confirmDelete !== false && !confirm('این پرونده حذف شود؟')) return;
            crudDelete(K.cases, id);
            renderCases();
        };

        /* ---------------- Applicants ---------------- */
        function renderApplicants(searchTerm, folderFilter) {
            searchTerm = (searchTerm != null) ? searchTerm : (document.getElementById('apSearchInput') ? document.getElementById('apSearchInput').value : '');
            folderFilter = (folderFilter != null) ? folderFilter : (document.getElementById('apFolderFilter') ? document.getElementById('apFolderFilter').value : 'all');
            const all = dbRead(K.applicants);
            const folders = Array.from(new Set(all.map((a) => (a.folder || '').trim()).filter(Boolean))).sort();
            const q = (searchTerm || '').trim();
            const list = all.filter((a) => {
                if (folderFilter === 'none' && a.folder) return false;
                if (folderFilter !== 'all' && folderFilter !== 'none' && (a.folder || '') !== folderFilter) return false;
                if (!q) return true;
                return [a.fullName, a.phone, a.nationalId, a.address, a.folder].join(' ').includes(q);
            });
            const cols = getGridLayout('applicants');
            const selOn = selectionModeOn.applicants;
            let html = `
                <div class="view-header">
                    <span class="view-title">متقاضیان (${list.length.toLocaleString('fa-IR')} از ${all.length.toLocaleString('fa-IR')})</span>
                    <div style="display:flex; align-items:center; gap:8px;">
                        ${layoutPickerHtml('applicants')}
                        <button class="fab-add" onclick="openApplicantForm()" title="افزودن متقاضی">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                        </button>
                    </div>
                </div>
                <div class="section-box" style="display:flex; gap:8px; flex-wrap:wrap;">
                    <input id="apSearchInput" type="text" placeholder="جستجو بر اساس نام، شهر/پوشه، شماره تماس..." value="${escapeHtml(q)}"
                        style="flex:1; min-width:180px;" oninput="renderApplicants(this.value)">
                    <select id="apFolderFilter" style="width:auto;" onchange="renderApplicants(document.getElementById('apSearchInput').value, this.value)">
                        <option value="all" ${folderFilter==='all'?'selected':''}>همه پوشه‌ها</option>
                        <option value="none" ${folderFilter==='none'?'selected':''}>بدون پوشه</option>
                        ${folders.map((f) => `<option value="${escapeHtml(f)}" ${folderFilter===f?'selected':''}>${escapeHtml(f)}</option>`).join('')}
                    </select>
                    ${selectionToolbarHtml('applicants', list.map((a) => a.id))}
                </div>
                <div id="applicantFormBox"></div>
                <div class="entity-grid ${cols === '3' ? 'cols-3' : cols === '4' ? 'cols-4' : ''}">
                ${list.map((a) => `
                    <div class="list-item ${selOn ? 'selectable' : ''} ${selectionState.applicants.has(a.id) ? 'selected' : ''}" id="applicantsCard-${a.id}"
                         ${selOn ? `onclick="toggleItemSelected('applicants','${a.id}')" style="cursor:pointer;"` : ''}>
                        <div class="list-item-row">
                            <div>
                                <div class="list-item-title">
                                    ${escapeHtml(a.fullName)}
                                    ${a.folder ? `<span style="font-size:0.62rem; font-weight:800; color:var(--accent-cyan); border:1px solid var(--accent-cyan); border-radius:6px; padding:1px 6px; margin-inline-start:6px;">${escapeHtml(a.folder)}</span>` : ''}
                                </div>
                                <div class="list-item-sub">${escapeHtml(a.phone || '')} ${a.nationalId ? '· کدملی: ' + escapeHtml(a.nationalId) : ''}</div>
                                ${a.address ? `<div class="list-item-sub" style="margin-top:2px;">${escapeHtml(a.address)}</div>` : ''}
                            </div>
                            ${!selOn ? `
                            <div class="list-item-actions">
                                <button title="ویرایش" onclick="openApplicantForm('${a.id}')">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                </button>
                                <button class="danger" title="حذف" onclick="deleteApplicant('${a.id}')">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></svg>
                                </button>
                            </div>` : ''}
                        </div>
                    </div>`).join('') || emptyStateHtml('موردی یافت نشد.')}
                </div>`;
            document.getElementById('applicantsContent').innerHTML = html;
        }
        window.renderApplicants = renderApplicants;
        window.openApplicantForm = function (id) {
            const list = dbRead(K.applicants);
            const item = id ? list.find((x) => x.id === id) : null;
            document.getElementById('applicantFormBox').innerHTML = `
                <div class="section-box">
                    <div class="mini-form-grid">
                        <input type="text" id="apFullName" placeholder="نام و نام خانوادگی" value="${escapeHtml(item ? item.fullName : '')}">
                        <input type="text" id="apFolder" placeholder="پوشه/دسته‌بندی (مثلاً: تهران، دماوند...)" value="${escapeHtml(item ? item.folder : '')}">
                        <input type="text" id="apPhone" placeholder="شماره تماس" value="${escapeHtml(item ? item.phone : '')}">
                        <input type="text" id="apNationalId" placeholder="کد ملی" value="${escapeHtml(item ? item.nationalId : '')}">
                        <input type="text" id="apAddress" placeholder="آدرس" value="${escapeHtml(item ? item.address : '')}">
                        <textarea id="apNotes" placeholder="توضیحات">${escapeHtml(item ? item.notes : '')}</textarea>
                    </div>
                    <button class="calc-btn" style="margin:0;" onclick="saveApplicantForm('${item ? item.id : ''}')">ذخیره متقاضی</button>
                </div>`;
        };
        window.saveApplicantForm = function (id) {
            const fullName = document.getElementById('apFullName').value.trim();
            if (!fullName) { alert('نام متقاضی را وارد کنید.'); return; }
            crudSave(K.applicants, {
                id: id || undefined,
                fullName,
                folder: document.getElementById('apFolder').value.trim(),
                phone: document.getElementById('apPhone').value.trim(),
                nationalId: document.getElementById('apNationalId').value.trim(),
                address: document.getElementById('apAddress').value.trim(),
                notes: document.getElementById('apNotes').value.trim()
            });
            renderApplicants();
        };
        window.deleteApplicant = function (id) {
            if (getSettings().confirmDelete !== false && !confirm('این متقاضی حذف شود؟')) return;
            crudDelete(K.applicants, id);
            renderApplicants();
        };

        /* ---------------- Experts ---------------- */
        function renderExperts(searchTerm, folderFilter) {
            searchTerm = (searchTerm != null) ? searchTerm : (document.getElementById('exSearchInput') ? document.getElementById('exSearchInput').value : '');
            folderFilter = (folderFilter != null) ? folderFilter : (document.getElementById('exFolderFilter') ? document.getElementById('exFolderFilter').value : 'all');
            const all = dbRead(K.experts);
            const folders = Array.from(new Set(all.map((e) => (e.folder || '').trim()).filter(Boolean))).sort();
            const q = (searchTerm || '').trim();
            const list = all.filter((e) => {
                if (folderFilter === 'none' && e.folder) return false;
                if (folderFilter !== 'all' && folderFilter !== 'none' && (e.folder || '') !== folderFilter) return false;
                if (!q) return true;
                return [e.fullName, e.discipline, e.licenseNumber, e.phone, e.folder].join(' ').includes(q);
            });
            const cols = getGridLayout('experts');
            const selOn = selectionModeOn.experts;
            let html = `
                <div class="view-header">
                    <span class="view-title">کارشناسان (${list.length.toLocaleString('fa-IR')} از ${all.length.toLocaleString('fa-IR')})</span>
                    <div style="display:flex; align-items:center; gap:8px;">
                        ${layoutPickerHtml('experts')}
                        <button class="fab-add" onclick="openExpertForm()" title="افزودن کارشناس">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                        </button>
                    </div>
                </div>
                <div class="section-box" style="display:flex; gap:8px; flex-wrap:wrap;">
                    <input id="exSearchInput" type="text" placeholder="جستجو بر اساس نام، رشته، پوشه، شماره پروانه..." value="${escapeHtml(q)}"
                        style="flex:1; min-width:180px;" oninput="renderExperts(this.value)">
                    <select id="exFolderFilter" style="width:auto;" onchange="renderExperts(document.getElementById('exSearchInput').value, this.value)">
                        <option value="all" ${folderFilter==='all'?'selected':''}>همه پوشه‌ها</option>
                        <option value="none" ${folderFilter==='none'?'selected':''}>بدون پوشه</option>
                        ${folders.map((f) => `<option value="${escapeHtml(f)}" ${folderFilter===f?'selected':''}>${escapeHtml(f)}</option>`).join('')}
                    </select>
                    ${selectionToolbarHtml('experts', list.map((e) => e.id))}
                </div>
                <div id="expertFormBox"></div>
                <div class="entity-grid ${cols === '3' ? 'cols-3' : cols === '4' ? 'cols-4' : ''}">
                ${list.map((e) => `
                    <div class="list-item ${selOn ? 'selectable' : ''} ${selectionState.experts.has(e.id) ? 'selected' : ''}" id="expertsCard-${e.id}"
                         ${selOn ? `onclick="toggleItemSelected('experts','${e.id}')" style="cursor:pointer;"` : ''}>
                        <div class="list-item-row">
                            <div>
                                <div class="list-item-title">
                                    ${escapeHtml(e.fullName)}
                                    ${e.folder ? `<span style="font-size:0.62rem; font-weight:800; color:var(--accent-cyan); border:1px solid var(--accent-cyan); border-radius:6px; padding:1px 6px; margin-inline-start:6px;">${escapeHtml(e.folder)}</span>` : ''}
                                </div>
                                <div class="list-item-sub">${escapeHtml(e.discipline || '')} ${e.licenseNumber ? '· پروانه: ' + escapeHtml(e.licenseNumber) : ''}</div>
                                <div class="list-item-sub">${escapeHtml(e.phone || '')}</div>
                            </div>
                            ${!selOn ? `
                            <div class="list-item-actions">
                                <button title="ویرایش" onclick="openExpertForm('${e.id}')">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                </button>
                                <button class="danger" title="حذف" onclick="deleteExpert('${e.id}')">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></svg>
                                </button>
                            </div>` : ''}
                        </div>
                    </div>`).join('') || emptyStateHtml('موردی یافت نشد.')}
                </div>`;
            document.getElementById('expertsContent').innerHTML = html;
        }
        window.renderExperts = renderExperts;
        window.openExpertForm = function (id) {
            const list = dbRead(K.experts);
            const item = id ? list.find((x) => x.id === id) : null;
            document.getElementById('expertFormBox').innerHTML = `
                <div class="section-box">
                    <div class="mini-form-grid">
                        <input type="text" id="exFullName" placeholder="نام و نام خانوادگی" value="${escapeHtml(item ? item.fullName : '')}">
                        <input type="text" id="exFolder" placeholder="پوشه/دسته‌بندی (مثلاً: تهران، دماوند...)" value="${escapeHtml(item ? item.folder : '')}">
                        <input type="text" id="exDiscipline" placeholder="رشته کارشناسی" value="${escapeHtml(item ? item.discipline : '')}">
                        <input type="text" id="exLicense" placeholder="شماره پروانه" value="${escapeHtml(item ? item.licenseNumber : '')}">
                        <input type="text" id="exPhone" placeholder="شماره تماس" value="${escapeHtml(item ? item.phone : '')}">
                        <input type="text" id="exBank" placeholder="شماره کارت / شبا" value="${escapeHtml(item ? item.bankAccountOrSheba : '')}">
                        <textarea id="exNotes" placeholder="توضیحات">${escapeHtml(item ? item.notes : '')}</textarea>
                    </div>
                    <button class="calc-btn" style="margin:0;" onclick="saveExpertForm('${item ? item.id : ''}')">ذخیره کارشناس</button>
                </div>`;
        };
        window.saveExpertForm = function (id) {
            const fullName = document.getElementById('exFullName').value.trim();
            if (!fullName) { alert('نام کارشناس را وارد کنید.'); return; }
            crudSave(K.experts, {
                id: id || undefined,
                fullName,
                folder: document.getElementById('exFolder').value.trim(),
                discipline: document.getElementById('exDiscipline').value.trim(),
                licenseNumber: document.getElementById('exLicense').value.trim(),
                phone: document.getElementById('exPhone').value.trim(),
                bankAccountOrSheba: document.getElementById('exBank').value.trim(),
                notes: document.getElementById('exNotes').value.trim()
            });
            renderExperts();
        };
        window.deleteExpert = function (id) {
            if (getSettings().confirmDelete !== false && !confirm('این کارشناس حذف شود؟')) return;
            crudDelete(K.experts, id);
            renderExperts();
        };

        /* ---------------- Beautiful selective print for applicants/experts lists ---------------- */
        let printPickDataset = [];
        window.printFolderList = function (kind) {
            const isApplicant = kind === 'applicants';
            const all = dbRead(isApplicant ? K.applicants : K.experts);
            if (!all.length) { alert('موردی برای چاپ وجود ندارد.'); return; }
            printPickDataset = all;
            const folders = Array.from(new Set(all.map((x) => (x.folder || '').trim()).filter(Boolean))).sort();
            const rowsHtml = all.map((x) => `
                <label class="checkbox-label" style="display:flex; gap:8px; padding:6px 0; border-bottom:1px solid var(--border-color);">
                    <input type="checkbox" class="print-pick" value="${x.id}" checked>
                    <span>${escapeHtml(x.fullName)}${x.folder ? ' — ' + escapeHtml(x.folder) : ''}</span>
                </label>`).join('');
            document.getElementById('printPickBody').innerHTML = `
                <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:10px;">موارد موردنظر برای چاپ را انتخاب کن:</p>
                <div style="display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
                    <button class="nav-btn" style="height:30px; padding:0 8px; font-size:0.7rem;" onclick="document.querySelectorAll('.print-pick').forEach(c=>c.checked=true)">انتخاب همه</button>
                    <button class="nav-btn" style="height:30px; padding:0 8px; font-size:0.7rem;" onclick="document.querySelectorAll('.print-pick').forEach(c=>c.checked=false)">لغو همه</button>
                    ${folders.map((f) => `<button class="nav-btn" style="height:30px; padding:0 8px; font-size:0.7rem;" onclick="filterPrintPicksByFolder('${escapeHtml(f).replace(/'/g, "\\'")}')">فقط ${escapeHtml(f)}</button>`).join('')}
                </div>
                <div style="max-height:40vh; overflow-y:auto;">${rowsHtml}</div>
                <button class="calc-btn" style="margin-top:14px;" onclick="doPrintFolderList('${kind}')">چاپ فهرست انتخاب‌شده</button>`;
            openModal('printPickModal');
        };

        window.filterPrintPicksByFolder = function (folderName) {
            document.querySelectorAll('.print-pick').forEach((c) => {
                const item = printPickDataset.find((x) => x.id === c.value);
                c.checked = !!(item && (item.folder || '').trim() === folderName);
            });
        };

        window.doPrintFolderList = function (kind) {
            const picked = printPickDataset.filter((x) => document.querySelector(`.print-pick[value="${x.id}"]`)?.checked);
            if (!picked.length) { alert('چیزی انتخاب نشده.'); return; }
            printPeopleTable(kind, picked);
        };

        function printPeopleTable(kind, picked) {
            const isApplicant = kind === 'applicants';
            const title = isApplicant ? 'فهرست متقاضیان' : 'فهرست کارشناسان';
            const rows = picked.map((x, i) => `
                <tr>
                    <td>${(i + 1).toLocaleString('fa-IR')}</td>
                    <td>${escapeHtml(x.fullName)}</td>
                    ${isApplicant
                        ? `<td>${escapeHtml(x.phone || '-')}</td><td>${escapeHtml(x.nationalId || '-')}</td>`
                        : `<td>${escapeHtml(x.discipline || '-')}</td><td>${escapeHtml(x.licenseNumber || '-')}</td>`}
                    <td>${escapeHtml(x.folder || '-')}</td>
                </tr>`).join('');
            const w = window.open('', '_blank');
            if (!w) { alert('اجازه باز کردن پنجره چاپ داده نشد.'); return; }
            w.document.write(`<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="UTF-8"><title>${title}</title>
                <style>
                    body{font-family:Tahoma,'Vazirmatn',sans-serif;padding:24px;color:#0f172a;}
                    h2{border-bottom:3px solid #0f172a;padding-bottom:8px;margin-bottom:4px;}
                    .meta{color:#64748b;font-size:12px;margin-bottom:18px;}
                    table{width:100%;border-collapse:collapse;}
                    th,td{border:1px solid #cbd5e1;padding:8px;text-align:center;font-size:13px;}
                    th{background:#0f172a;color:#fff;}
                    tr:nth-child(even){background:#f8fafc;}
                    .footer{margin-top:24px;font-size:11px;color:#94a3b8;text-align:center;}
                </style></head><body>
                <h2>${title} — کارشناس پلاس</h2>
                <div class="meta">تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')} · تعداد: ${picked.length.toLocaleString('fa-IR')} نفر</div>
                <table>
                    <thead><tr><th>#</th><th>نام و نام خانوادگی</th>${isApplicant ? '<th>تلفن</th><th>کد ملی</th>' : '<th>رشته</th><th>شماره پروانه</th>'}<th>پوشه</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="footer">تولید شده توسط اپلیکیشن کارشناس پلاس</div>
                </body></html>`);
            w.document.close();
            w.onload = () => { w.focus(); w.print(); };
        }

        function printCasesTable(picked) {
            const rows = picked.map((c, i) => `
                <tr>
                    <td>${(i + 1).toLocaleString('fa-IR')}</td>
                    <td>${escapeHtml(c.clientName || '-')}</td>
                    <td>${escapeHtml(c.caseNum || '-')}</td>
                    <td>${escapeHtml(c.courtBranch || '-')}</td>
                    <td>${escapeHtml(c.expDate || '-')}</td>
                    <td>${escapeHtml(CATEGORY_LABELS[c.category] || c.category || '-')}</td>
                    <td>${escapeHtml(c.expertsSummary || '-')}</td>
                    <td>${escapeHtml(c.totalFee || '-')}</td>
                    <td>${c.status === 'draft' ? 'پیش‌نویس' : 'نهایی'}</td>
                </tr>`).join('');
            const w = window.open('', '_blank');
            if (!w) { alert('اجازه باز کردن پنجره چاپ داده نشد.'); return; }
            w.document.write(`<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="UTF-8"><title>فهرست پرونده‌ها</title>
                <style>
                    body{font-family:Tahoma,'Vazirmatn',sans-serif;padding:20px;color:#0f172a;}
                    h2{border-bottom:3px solid #0f172a;padding-bottom:8px;margin-bottom:4px;}
                    .meta{color:#64748b;font-size:12px;margin-bottom:18px;}
                    table{width:100%;border-collapse:collapse;}
                    th,td{border:1px solid #cbd5e1;padding:6px;text-align:center;font-size:11px;}
                    th{background:#0f172a;color:#fff;}
                    tr:nth-child(even){background:#f8fafc;}
                    .footer{margin-top:24px;font-size:11px;color:#94a3b8;text-align:center;}
                </style></head><body>
                <h2>فهرست پرونده‌ها — کارشناس پلاس</h2>
                <div class="meta">تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')} · تعداد: ${picked.length.toLocaleString('fa-IR')} پرونده</div>
                <table>
                    <thead><tr><th>#</th><th>متقاضی</th><th>کلاسه</th><th>شعبه</th><th>تاریخ</th><th>رشته</th><th>کارشناسان</th><th>مبلغ (ریال)</th><th>وضعیت</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="footer">تولید شده توسط اپلیکیشن کارشناس پلاس</div>
                </body></html>`);
            w.document.close();
            w.onload = () => { w.focus(); w.print(); };
        }

        function getEntityList(kind) {
            if (kind === 'cases') return dbRead(K.cases);
            if (kind === 'applicants') return dbRead(K.applicants);
            return dbRead(K.experts);
        }

        window.printSelectedEntities = function (kind) {
            const all = getEntityList(kind);
            const ids = selectionState[kind].size ? Array.from(selectionState[kind]) : all.map((x) => x.id);
            const picked = all.filter((x) => ids.includes(x.id));
            if (!picked.length) { alert('چیزی برای چاپ وجود ندارد.'); return; }
            if (kind === 'cases') printCasesTable(picked); else printPeopleTable(kind, picked);
        };

        window.shareSelectedEntities = function (kind) {
            const all = getEntityList(kind);
            const ids = selectionState[kind].size ? Array.from(selectionState[kind]) : all.map((x) => x.id);
            const picked = all.filter((x) => ids.includes(x.id));
            if (!picked.length) { alert('چیزی برای اشتراک‌گذاری وجود ندارد.'); return; }
            let text;
            if (kind === 'cases') {
                text = picked.map((c, i) => `${i + 1}. ${c.clientName || '-'} — کلاسه ${c.caseNum || '-'} — ${c.totalFee || '-'} ریال`).join('\n');
            } else {
                text = picked.map((x, i) => `${i + 1}. ${x.fullName}${x.folder ? ' — ' + x.folder : ''}`).join('\n');
            }
            const title = kind === 'cases' ? 'فهرست پرونده‌ها' : (kind === 'applicants' ? 'فهرست متقاضیان' : 'فهرست کارشناسان');
            if (navigator.share) {
                navigator.share({ title: title + ' — کارشناس پلاس', text }).catch(() => {});
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => showToast('فهرست در کلیپ‌بورد کپی شد.', 'success'));
            }
        };

        /* ---------------- Tariffs (reference view) ---------------- */
        function renderTariffs() {
            document.getElementById('tariffsContent').innerHTML = `
                <div class="view-header"><span class="view-title">تعرفه‌های موجود</span></div>
                <div class="section-box">
                    <div class="section-title"><span>تعرفه ۱۴۰۵ (ابلاغی)</span></div>
                    <p style="font-size:0.78rem; color:var(--text-muted); line-height:1.9;">
                        سقف هر کارشناسی: ۱,۳۵۰,۰۰۰,۰۰۰ ریال — سقف کل موضوع: ۳,۰۰۰,۰۰۰,۰۰۰ ریال. محاسبه بر اساس نرخ‌های پلکانی ماده ۱۱.
                        این تعرفه، تعرفه پیش‌فرض و فعال محاسبه‌گر است.
                    </p>
                    <button class="btn-action" style="width:100%;" onclick="closeModal('moreModal'); switchView('calc'); setTariff('1405', document.querySelector('.tab-btn'));">
                        <span>استفاده در محاسبه جدید</span>
                    </button>
                </div>
                <div class="section-box">
                    <div class="section-title"><span>تعرفه ۱۴۰۲</span></div>
                    <p style="font-size:0.78rem; color:var(--text-muted); line-height:1.9;">
                        تعرفه سال قبل، برای مقایسه یا پرونده‌های مربوط به آن دوره در دسترس است.
                    </p>
                    <button class="btn-action" style="width:100%;" onclick="closeModal('moreModal'); switchView('calc'); setTariff('1402', document.querySelectorAll('.tab-btn')[1]);">
                        <span>استفاده در محاسبه جدید</span>
                    </button>
                </div>
                <p style="font-size:0.68rem; color:var(--text-muted); text-align:center;">افزودن تعرفه سفارشی در نسخه‌های بعدی اضافه می‌شود.</p>`;
        }

        /* ---------------- Reports ---------------- */
        const DONUT_COLORS = ['#4f46e5', '#22b8cf', '#12b981', '#f5a524', '#f24365', '#6366f1', '#0ea5e9', '#a855f7', '#84cc16', '#ec4899'];
        function buildDonutSVG(rows, total) {
            if (!rows.length || total <= 0) return '';
            const r = 60, cx = 70, cy = 70, circumference = 2 * Math.PI * r;
            let offset = 0;
            const segments = rows.map(([label, val], i) => {
                const frac = val / total;
                const dash = frac * circumference;
                const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${DONUT_COLORS[i % DONUT_COLORS.length]}" stroke-width="20"
                    stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"></circle>`;
                offset += dash;
                return seg;
            }).join('');
            return `<svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="نمودار دایره‌ای سهم هر رشته از دستمزد">${segments}</svg>`;
        }
        function renderReports() {
            const cases = dbRead(K.cases);
            const byCategory = {};
            const countByCategory = {};
            let totalFee = 0;
            cases.forEach((c) => {
                const fee = parseStoredAmount(c.totalFee);
                totalFee += fee;
                const key = CATEGORY_LABELS[c.category] || c.category || 'سایر';
                byCategory[key] = (byCategory[key] || 0) + fee;
                countByCategory[key] = (countByCategory[key] || 0) + 1;
            });
            const maxVal = Math.max(1, ...Object.values(byCategory));
            const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

            document.getElementById('reportsContent').innerHTML = `
                <div class="view-header">
                    <span class="view-title">گزارش‌ها</span>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        <button class="nav-btn no-print" style="height:34px; padding:0 10px;" onclick="printReports()">چاپ خلاصه</button>
                        <button class="nav-btn no-print" style="height:34px; padding:0 10px;" onclick="exportReportsCSV()">CSV خلاصه</button>
                        <button class="nav-btn no-print" style="height:34px; padding:0 10px; font-weight:800;" onclick="printFullDetailedReport()">گزارش کامل (چاپ)</button>
                        <button class="nav-btn no-print" style="height:34px; padding:0 10px; font-weight:800;" onclick="exportFullReportCSV()">گزارش کامل (CSV)</button>
                    </div>
                </div>
                <div class="stat-grid">
                    <div class="stat-card"><div class="stat-val" data-countup="${cases.length}">۰</div><div class="stat-label">تعداد کل پرونده‌ها</div></div>
                    <div class="stat-card"><div class="stat-val" data-countup="${totalFee}" data-money="1">۰</div><div class="stat-label">جمع کل دستمزد (ریال)</div></div>
                </div>
                <div class="section-box">
                    <div class="section-title"><span>جمع دستمزد بر اساس نوع کارشناسی</span></div>
                    ${rows.map(([label, val]) => `
                        <div class="bar-chart-row">
                            <div class="bar-chart-label">${escapeHtml(label)}</div>
                            <div class="bar-chart-track"><div class="bar-chart-fill" style="width:${Math.max(4, (val / maxVal) * 100)}%"></div></div>
                            <div class="bar-chart-val">${fmtMoney(val)}</div>
                        </div>`).join('') || '<div class="empty-state">هنوز داده‌ای برای گزارش وجود ندارد.</div>'}
                </div>
                ${rows.length ? `
                <div class="section-box">
                    <div class="section-title"><span>سهم هر رشته از کل دستمزد</span></div>
                    <div class="donut-report-row">
                        ${buildDonutSVG(rows, totalFee)}
                        <div class="donut-legend">
                            ${rows.map(([label, val], i) => `
                                <div class="donut-legend-item">
                                    <span class="donut-legend-dot" style="background:${DONUT_COLORS[i % DONUT_COLORS.length]}"></span>
                                    <span class="donut-legend-label">${escapeHtml(label)}</span>
                                    <span class="donut-legend-pct">${(totalFee > 0 ? (val / totalFee) * 100 : 0).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪</span>
                                </div>`).join('')}
                        </div>
                    </div>
                </div>
                <div class="section-box" style="overflow-x:auto;">
                    <div class="section-title"><span>جدول گزارش تفصیلی</span></div>
                    <table class="report-table">
                        <thead><tr><th>رشته کارشناسی</th><th>تعداد پرونده</th><th>جمع دستمزد (ریال)</th><th>سهم</th></tr></thead>
                        <tbody>
                            ${rows.map(([label, val]) => `
                                <tr>
                                    <td>${escapeHtml(label)}</td>
                                    <td>${(countByCategory[label] || 0).toLocaleString('fa-IR')}</td>
                                    <td>${fmtMoney(val)}</td>
                                    <td>${(totalFee > 0 ? (val / totalFee) * 100 : 0).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪</td>
                                </tr>`).join('')}
                            <tr class="report-table-total"><td>جمع کل</td><td>${cases.length.toLocaleString('fa-IR')}</td><td>${fmtMoney(totalFee)}</td><td>۱۰۰٪</td></tr>
                        </tbody>
                    </table>
                </div>` : ''}`;
            runCountUpAnimations();
        }

        window.printReports = function () {
            const original = document.body.innerHTML;
            const box = document.getElementById('reportsContent');
            if (!box) return;
            const w = window.open('', '_blank');
            if (!w) { alert('اجازه باز کردن پنجره چاپ داده نشد.'); return; }
            w.document.write(`<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="UTF-8">
                <title>گزارش‌ها — کارشناس پلاس</title>
                <style>
                    body{font-family:Tahoma,'Vazirmatn',sans-serif;padding:20px;color:#0f172a;}
                    .stat-grid{display:flex;gap:12px;margin-bottom:16px;}
                    .stat-card{border:1px solid #cbd5e1;border-radius:8px;padding:10px 14px;}
                    .section-box{border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin-bottom:14px;}
                    .no-print{display:none !important;}
                    table{width:100%;border-collapse:collapse;}
                    th,td{border:1px solid #cbd5e1;padding:6px;text-align:center;font-size:13px;}
                    .bar-chart-row{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:12px;}
                    .bar-chart-track{flex:1;background:#eef2f7;border-radius:6px;height:10px;overflow:hidden;}
                    .bar-chart-fill{background:#4f46e5;height:100%;}
                </style></head><body>${box.innerHTML}</body></html>`);
            w.document.close();
            w.onload = () => { w.focus(); w.print(); };
        };

        window.exportReportsCSV = function () {
            const cases = dbRead(K.cases);
            const byCategory = {};
            const countByCategory = {};
            cases.forEach((c) => {
                const fee = parseStoredAmount(c.totalFee);
                const key = CATEGORY_LABELS[c.category] || c.category || 'سایر';
                byCategory[key] = (byCategory[key] || 0) + fee;
                countByCategory[key] = (countByCategory[key] || 0) + 1;
            });
            const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
            let csv = '\uFEFFرشته کارشناسی,تعداد پرونده,جمع دستمزد (ریال)\n';
            rows.forEach(([label, val]) => { csv += `"${label}",${countByCategory[label] || 0},${val}\n`; });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `گزارش_کارشناس_پلاس_${Date.now()}.csv`;
            link.click();
        };

        /* Comprehensive report — every single case with every field, not just
           category totals. Addresses "screenshot isn't useful, I want the full
           story of every case" — this is a real data export, not a picture. */
        window.printFullDetailedReport = function () {
            const cases = dbRead(K.cases);
            const applicants = dbRead(K.applicants);
            const experts = dbRead(K.experts);
            if (!cases.length) { alert('هنوز پرونده‌ای ثبت نشده.'); return; }
            let totalFee = 0;
            const byCategory = {};
            cases.forEach((c) => { totalFee += parseStoredAmount(c.totalFee); const k = CATEGORY_LABELS[c.category] || c.category || 'سایر'; byCategory[k] = (byCategory[k] || 0) + parseStoredAmount(c.totalFee); });
            const sortedCases = [...cases].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            const rows = sortedCases.map((c, i) => `
                <tr>
                    <td>${(i + 1).toLocaleString('fa-IR')}</td>
                    <td>${escapeHtml(c.expDate || '-')}</td>
                    <td>${escapeHtml(c.clientName || '-')}</td>
                    <td>${escapeHtml(c.caseNum || '-')}</td>
                    <td>${escapeHtml(c.courtBranch || '-')}</td>
                    <td>${escapeHtml(CATEGORY_LABELS[c.category] || c.category || '-')}</td>
                    <td>${escapeHtml(c.tariffYear ? String(c.tariffYear) : '-')}</td>
                    <td style="text-align:right; direction:ltr;">${escapeHtml(c.expertsSummary || '-')}</td>
                    <td>${escapeHtml(c.amount || '-')}</td>
                    <td style="font-weight:800;">${escapeHtml(c.totalFee || '-')}</td>
                    <td>${c.status === 'draft' ? 'پیش‌نویس' : 'نهایی'}</td>
                    <td>${escapeHtml(c.editNote || '-')}</td>
                </tr>`).join('');
            const catRows = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
                .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${fmtMoney(v)}</td><td>${(totalFee > 0 ? (v / totalFee) * 100 : 0).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪</td></tr>`).join('');
            const w = window.open('', '_blank');
            if (!w) { alert('اجازه باز کردن پنجره چاپ داده نشد.'); return; }
            w.document.write(`<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="UTF-8"><title>گزارش کامل — کارشناس پلاس</title>
                <style>
                    body{font-family:Tahoma,'Vazirmatn',sans-serif;padding:18px;color:#0f172a;}
                    h1{font-size:18px;border-bottom:3px solid #0f172a;padding-bottom:8px;margin-bottom:4px;}
                    h2{font-size:14px;margin-top:22px;margin-bottom:6px;}
                    .meta{color:#64748b;font-size:11px;margin-bottom:14px;}
                    .stat-grid{display:flex;gap:10px;margin-bottom:16px;}
                    .stat-card{border:1px solid #cbd5e1;border-radius:8px;padding:8px 12px;font-size:12px;}
                    .stat-card b{display:block;font-size:16px;}
                    table{width:100%;border-collapse:collapse;margin-bottom:10px;}
                    th,td{border:1px solid #cbd5e1;padding:5px;text-align:center;font-size:10.5px;}
                    th{background:#0f172a;color:#fff;}
                    tr:nth-child(even){background:#f8fafc;}
                    .footer{margin-top:20px;font-size:10px;color:#94a3b8;text-align:center;}
                    @page { size: A4 landscape; margin: 12mm; }
                </style></head><body>
                <h1>گزارش کامل و تفصیلی پرونده‌ها — کارشناس پلاس</h1>
                <div class="meta">تاریخ تهیه گزارش: ${new Date().toLocaleDateString('fa-IR')} — ${new Date().toLocaleTimeString('fa-IR')}</div>
                <div class="stat-grid">
                    <div class="stat-card">تعداد کل پرونده‌ها<b>${cases.length.toLocaleString('fa-IR')}</b></div>
                    <div class="stat-card">جمع کل دستمزد<b>${fmtMoney(totalFee)} ریال</b></div>
                    <div class="stat-card">تعداد متقاضیان ثبت‌شده<b>${applicants.length.toLocaleString('fa-IR')}</b></div>
                    <div class="stat-card">تعداد کارشناسان ثبت‌شده<b>${experts.length.toLocaleString('fa-IR')}</b></div>
                </div>
                <h2>سهم هر رشته از کل دستمزد</h2>
                <table><thead><tr><th>رشته</th><th>جمع دستمزد (ریال)</th><th>سهم</th></tr></thead><tbody>${catRows}</tbody></table>
                <h2>فهرست کامل پرونده‌ها (${cases.length.toLocaleString('fa-IR')} مورد)</h2>
                <table>
                    <thead><tr><th>#</th><th>تاریخ</th><th>متقاضی</th><th>کلاسه</th><th>شعبه</th><th>رشته</th><th>تعرفه</th><th>کارشناسان</th><th>مبلغ موضوع</th><th>دستمزد نهایی</th><th>وضعیت</th><th>یادداشت ویرایش</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="footer">تولید شده توسط اپلیکیشن کارشناس پلاس — این گزارش شامل تمام جزئیات ثبت‌شده در دستگاه است.</div>
                </body></html>`);
            w.document.close();
            w.onload = () => { w.focus(); w.print(); };
        };

        window.exportFullReportCSV = function () {
            const cases = dbRead(K.cases);
            if (!cases.length) { alert('هنوز پرونده‌ای ثبت نشده.'); return; }
            const sortedCases = [...cases].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            let csv = '\uFEFFردیف,تاریخ,متقاضی,شماره کلاسه,شعبه,رشته کارشناسی,سال تعرفه,کارشناسان,مبلغ موضوع دعوی,دستمزد نهایی (ریال),وضعیت,یادداشت ویرایش\n';
            sortedCases.forEach((c, i) => {
                const cells = [
                    i + 1, c.expDate || '', c.clientName || '', c.caseNum || '', c.courtBranch || '',
                    CATEGORY_LABELS[c.category] || c.category || '', c.tariffYear || '', c.expertsSummary || '',
                    c.amount || '', parseStoredAmount(c.totalFee), c.status === 'draft' ? 'پیش‌نویس' : 'نهایی', c.editNote || ''
                ];
                csv += cells.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `گزارش_کامل_کارشناس_پلاس_${Date.now()}.csv`;
            link.click();
        };

        /* ---------------- Reminders ---------------- */
        function renderReminders() {
            const list = dbRead(K.reminders).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
            const notifOn = !!getSettings().reminderNotifications;
            let html = `
                <div class="view-header">
                    <span class="view-title">یادآوری‌ها (${list.filter((r) => !r.completed).length.toLocaleString('fa-IR')} باز)</span>
                    <button class="fab-add" onclick="openReminderForm()" title="افزودن یادآوری">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                </div>
                ${!notifOn ? `<div class="install-banner no-print" style="display:flex; cursor:pointer;" onclick="toggleReminderNotifications(true); renderReminders();">
                    <div class="install-banner-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
                    <div class="install-banner-text"><div class="install-banner-title">آلارم یادآوری‌ها فعال نیست</div><div class="install-banner-sub">برای دریافت اعلان و صدا هنگام سررسید، لمس کنید تا فعال شود</div></div>
                </div>` : ''}
                <div id="reminderFormBox"></div>
                ${list.map((r) => `
                    <div class="list-item" style="${r.completed ? 'opacity:0.5;' : ''}">
                        <div class="list-item-row">
                            <div>
                                <div class="list-item-title">${escapeHtml(r.title)}</div>
                                <div class="list-item-sub">موعد: ${escapeHtml(r.dueDate || '-')} ${r.dueTime ? escapeHtml(r.dueTime) : ''}</div>
                                ${r.notes ? `<div class="list-item-sub" style="margin-top:2px;">${escapeHtml(r.notes)}</div>` : ''}
                            </div>
                            <div class="list-item-actions">
                                <button title="افزودن به تقویم گوشی" onclick="addReminderToPhoneCalendar('${r.id}')">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                </button>
                                <button title="اشتراک‌گذاری یادآوری" onclick="shareReminder('${r.id}')">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                                </button>
                                <button title="${r.completed ? 'برگردان به باز' : 'انجام شد'}" onclick="toggleReminder('${r.id}')">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
                                </button>
                                <button class="danger" title="حذف" onclick="deleteReminder('${r.id}')">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>`).join('') || '<div class="empty-state">یادآوری‌ای ثبت نشده.</div>'}`;
            document.getElementById('remindersContent').innerHTML = html;
        }
        window.openReminderForm = function () {
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const todayISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
            document.getElementById('reminderFormBox').innerHTML = `
                <div class="section-box">
                    <div class="mini-form-grid">
                        <input type="text" id="rmTitle" placeholder="عنوان یادآوری (مثلاً: پیگیری پرونده ۹۹۰۹۹۸)">
                        <input type="date" id="rmDueDate" value="${todayISO}">
                        <input type="time" id="rmDueTime" value="09:00">
                        <textarea id="rmNotes" placeholder="توضیحات"></textarea>
                    </div>
                    <button class="calc-btn" style="margin:0;" onclick="saveReminderForm()">ذخیره یادآوری</button>
                </div>`;
        };
        window.saveReminderForm = function () {
            const title = document.getElementById('rmTitle').value.trim();
            if (!title) { alert('عنوان یادآوری را وارد کنید.'); return; }
            crudSave(K.reminders, {
                title,
                dueDate: document.getElementById('rmDueDate').value.trim(),
                dueTime: document.getElementById('rmDueTime').value.trim(),
                notes: document.getElementById('rmNotes').value.trim(),
                completed: false,
                alarmFired: false
            });
            if (!getSettings().reminderNotifications) toggleReminderNotifications(true);
            renderReminders();
        };
        window.toggleReminder = function (id) {
            const list = dbRead(K.reminders);
            const item = list.find((x) => x.id === id);
            if (item) crudSave(K.reminders, Object.assign({}, item, { completed: !item.completed }));
            renderReminders();
        };
        window.deleteReminder = function (id) {
            if (getSettings().confirmDelete !== false && !confirm('این یادآوری حذف شود؟')) return;
            crudDelete(K.reminders, id);
            renderReminders();
        };

        /* Real (in-app) alarm: while the app/tab is open, checks every 20s
           whether any open reminder's due date/time has arrived, and if so
           fires a browser notification + a short beep. This cannot wake a
           closed tab (no push server), so it's a best-effort in-app alarm. */
        window.toggleReminderNotifications = function (checked) {
            if (checked && 'Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().then((perm) => {
                    saveSettings({ reminderNotifications: perm === 'granted' });
                    if (document.getElementById('view-reminders').classList.contains('active')) renderReminders();
                    if (document.getElementById('view-settings') && document.getElementById('view-settings').classList.contains('active')) renderSettings();
                });
            } else {
                saveSettings({ reminderNotifications: checked });
            }
        };
        function playReminderBeep() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'sine'; osc.frequency.value = 880;
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                osc.start();
                osc.stop(ctx.currentTime + 0.35);
            } catch (e) {}
        }
        function checkReminderAlarms() {
            const s = getSettings();
            if (!s.reminderNotifications) return;
            const list = dbRead(K.reminders);
            const now = new Date();
            let changed = false;
            list.forEach((r) => {
                if (r.completed || r.alarmFired || !r.dueDate) return;
                const due = new Date(`${r.dueDate}T${r.dueTime || '00:00'}:00`);
                if (isNaN(due.getTime())) return;
                const leadMs = (parseInt(s.reminderLeadMinutes, 10) || 0) * 60000;
                if ((due.getTime() - leadMs) > now.getTime()) return;
                if ('Notification' in window && Notification.permission === 'granted') {
                    try { new Notification('یادآوری کارشناس پلاس', { body: r.title, tag: 'reminder-' + r.id }); } catch (e) {}
                }
                if (s.reminderSound !== false) playReminderBeep();
                r.alarmFired = true;
                changed = true;
            });
            if (changed) dbWrite(K.reminders, list);
        }
        let reminderAlarmInterval = null;
        function startReminderAlarmLoop() {
            checkReminderAlarms();
            if (reminderAlarmInterval) clearInterval(reminderAlarmInterval);
            reminderAlarmInterval = setInterval(checkReminderAlarms, 20000);
        }

        /* Adds a reminder to the phone's calendar. On Android this opens the
           Calendar app directly (Google Calendar's web intent is routed straight
           into the installed app by the OS) instead of forcing a download-then-
           import step. iOS/desktop still use a downloadable .ics, since there's
           no equivalent one-tap deep link into Apple's Calendar from the web. */
        window.addReminderToPhoneCalendar = function (id) {
            const list = dbRead(K.reminders);
            const r = list.find((x) => x.id === id);
            if (!r) return;
            const digits = (str) => (str || '').toString().replace(/[۰-۹]/g, (d) => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]);
            const dateStr = digits(r.dueDate).replace(/-/g, '');
            const timeStr = (digits(r.dueTime) || '09:00').replace(':', '') + '00';
            if (!/^\d{8}$/.test(dateStr)) { alert('تاریخ سررسید این یادآوری معتبر نیست.'); return; }
            const dtStart = `${dateStr}T${timeStr}`;

            const isAndroid = /Android/i.test(navigator.userAgent);
            if (isAndroid) {
                // End time = start + 1 hour, in the same YYYYMMDDTHHMMSS format
                const endDate = new Date(
                    +dateStr.slice(0, 4), +dateStr.slice(4, 6) - 1, +dateStr.slice(6, 8),
                    +timeStr.slice(0, 2), +timeStr.slice(2, 4)
                );
                endDate.setHours(endDate.getHours() + 1);
                const pad = (n) => String(n).padStart(2, '0');
                const dtEnd = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;
                const url = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
                    + '&text=' + encodeURIComponent(r.title || 'یادآوری کارشناس پلاس')
                    + '&dates=' + dtStart + '/' + dtEnd
                    + '&details=' + encodeURIComponent(r.notes || '');
                window.open(url, '_blank');
                return;
            }

            const ics = [
                'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Karshenas Plus//Reminders//FA',
                'BEGIN:VEVENT',
                'UID:' + r.id + '@karshenasplus',
                'DTSTAMP:' + dtStart,
                'DTSTART:' + dtStart,
                'SUMMARY:' + (r.title || 'یادآوری').replace(/\n/g, ' '),
                r.notes ? ('DESCRIPTION:' + r.notes.replace(/\n/g, ' ')) : '',
                'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', 'DESCRIPTION:یادآوری', 'END:VALARM',
                'END:VEVENT', 'END:VCALENDAR'
            ].filter(Boolean).join('\r\n');
            const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'yadavari.ics';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 4000);
        };

        window.shareReminder = function (id) {
            const r = dbRead(K.reminders).find((x) => x.id === id);
            if (!r) return;
            const text = `یادآوری: ${r.title || ''}\nموعد: ${r.dueDate || ''} ${r.dueTime || ''}\n${r.notes || ''}`.trim();
            if (navigator.share) {
                navigator.share({ title: 'یادآوری کارشناس پلاس', text: text }).catch(() => {});
            } else if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => showToast('متن یادآوری کپی شد.', 'success'));
            }
        };

        /* ---------------- Backup / Restore (fully offline, no login needed) ---------------- */
        function renderBackup() {
            document.getElementById('backupContent').innerHTML = `
                <div class="view-header"><span class="view-title">پشتیبان‌گیری آفلاین</span></div>
                <div class="section-box">
                    <p style="font-size:0.78rem; color:var(--text-muted); line-height:1.9; margin-bottom:12px;">
                        یک فایل پشتیبان از تمام پرونده‌ها، کارشناسان، متقاضیان، یادآوری‌ها و تنظیمات روی همین گوشی می‌سازد —
                        بدون نیاز به اینترنت یا ورود با گوگل. این فایل را جایی امن نگه دار.
                    </p>
                    <button class="calc-btn" style="margin:0 0 10px;" onclick="downloadBackup()">دانلود فایل پشتیبان (JSON)</button>
                    <label class="btn-action" style="width:100%; display:flex; cursor:pointer;">
                        <span>بازیابی از فایل پشتیبان</span>
                        <input type="file" accept="application/json" style="display:none;" onchange="restoreBackup(event)">
                    </label>
                </div>`;
        }
        window.downloadBackup = function () {
            const payload = {
                version: '1.0', exportedAt: new Date().toISOString(),
                cases: dbRead(K.cases), experts: dbRead(K.experts),
                applicants: dbRead(K.applicants), reminders: dbRead(K.reminders),
                settings: dbRead(K.settings)
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `karshenas-plus-backup-${Date.now()}.json`;
            link.click();
        };
        window.restoreBackup = function (event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    if (!confirm('این کار اطلاعات فعلی روی گوشی را با اطلاعات فایل پشتیبان جایگزین می‌کند. ادامه می‌دهید؟')) return;
                    if (data.cases) dbWrite(K.cases, data.cases);
                    if (data.experts) dbWrite(K.experts, data.experts);
                    if (data.applicants) dbWrite(K.applicants, data.applicants);
                    if (data.reminders) dbWrite(K.reminders, data.reminders);
                    if (data.settings) dbWrite(K.settings, data.settings);
                    alert('بازیابی با موفقیت انجام شد.');
                    window.refreshAllViews();
                } catch (e) {
                    alert('فایل پشتیبان معتبر نیست.');
                }
            };
            reader.readAsText(file);
        };

        /* ---------------- Settings ---------------- */
        function getSettings() {
            return Object.assign({ currencyUnit: 'rial', theme: document.body.classList.contains('light-mode') ? 'light' : 'dark' }, dbRead(K.settings)[0] || {});
        }
        function saveSettings(patch) {
            const current = getSettings();
            const merged = Object.assign({}, current, patch);
            dbWrite(K.settings, [merged]);
        }
        function applyFontSize(size) {
            document.documentElement.setAttribute('data-font-size', size || 'medium');
        }
        function applyFontFamily(family) {
            document.documentElement.setAttribute('data-font-family', family || 'vazirmatn');
        }
        window.setFontFamily = function (family) { applyFontFamily(family); saveSettings({ fontFamily: family }); };
        function applyDensity(density) {
            document.documentElement.setAttribute('data-density', density || 'comfortable');
        }
        function applyReducedMotion(on) {
            document.documentElement.setAttribute('data-reduced-motion', on ? 'true' : 'false');
        }
        function applyHighContrast(on) {
            document.documentElement.setAttribute('data-high-contrast', on ? 'true' : 'false');
        }
        window.setFontSize = function (size) { applyFontSize(size); saveSettings({ fontSize: size }); };
        window.setDensity = function (density) { applyDensity(density); saveSettings({ density: density }); };
        window.toggleReducedMotion = function (checked) { applyReducedMotion(checked); saveSettings({ reducedMotion: checked }); };
        window.toggleHighContrast = function (checked) { applyHighContrast(checked); saveSettings({ highContrast: checked }); };
        function renderSettings() {
            const s = getSettings();
            const themeOptions = [
                { id: 'rosegold', label: 'رز طلایی (پیش‌فرض)' },
                { id: 'default', label: 'نیلی و فیروزه‌ای' },
                { id: 'emerald', label: 'زمردی' },
                { id: 'slate', label: 'خاکستری مینیمال' },
                { id: 'ocean', label: 'آبی اقیانوسی' },
                { id: 'sunset', label: 'غروب نارنجی' },
                { id: 'violet', label: 'بنفش' },
                { id: 'forest', label: 'سبز جنگلی' },
                { id: 'crimson', label: 'قرمز آجری' },
                { id: 'graphite', label: 'زغالی مدرن' }
            ];
            const invoiceTemplates = [
                { id: 'modern', label: 'مدرن (پیش‌فرض)' },
                { id: 'formal', label: 'رسمی و دولتی' },
                { id: 'classic', label: 'کلاسیک' },
                { id: 'minimal', label: 'مینیمال (بدون کادر)' },
                { id: 'colorful', label: 'رنگی (هم‌رنگ تم)' },
                { id: 'elegant', label: 'شیک با کادر دوتایی' },
                { id: 'compact', label: 'فشرده (کم‌مصرف کاغذ)' },
                { id: 'boldtitle', label: 'عنوان درشت' },
                { id: 'watermark', label: 'با واترمارک' },
                { id: 'stamp', label: 'با محل مهر مشخص' }
            ];
            document.getElementById('settingsContent').innerHTML = `
                <div class="view-header"><span class="view-title">تنظیمات</span></div>
                <div class="section-box">
                    <div class="settings-row">
                        <div><div class="settings-row-label">حالت تاریک</div><div class="settings-row-sub">تغییر ظاهر برنامه</div></div>
                        <label class="switch"><input type="checkbox" id="stThemeSwitch" ${document.body.classList.contains('light-mode') ? '' : 'checked'} onchange="settingsToggleTheme(this)"><span class="switch-slider"></span></label>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">رنگ‌بندی برنامه</div><div class="settings-row-sub">چند تم رنگی برای شخصی‌سازی ظاهر</div></div>
                        <select id="stColorTheme" style="width:auto; padding:6px 10px;" onchange="setColorTheme(this.value)">
                            ${themeOptions.map((t) => `<option value="${t.id}" ${((s.colorTheme || 'rosegold') === t.id) ? 'selected' : ''}>${t.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">قالب پیش‌فاکتور</div><div class="settings-row-sub">ظاهر سند چاپی صادر شده</div></div>
                        <select id="stInvoiceTemplate" style="width:auto; padding:6px 10px;" onchange="saveSettings({invoiceTemplate:this.value})">
                            ${invoiceTemplates.map((t) => `<option value="${t.id}" ${((s.invoiceTemplate || 'modern') === t.id) ? 'selected' : ''}>${t.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">واحد پول در نمایش سریع</div><div class="settings-row-sub">ریال یا تومان (فعلاً محاسبات بر پایه ریال است)</div></div>
                        <select id="stCurrency" style="width:auto; padding:6px 10px;" onchange="saveSettings({currencyUnit:this.value})">
                            <option value="rial" ${s.currencyUnit === 'rial' ? 'selected' : ''}>ریال</option>
                            <option value="toman" ${s.currencyUnit === 'toman' ? 'selected' : ''}>تومان</option>
                        </select>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">حساب کاربری گوگل</div><div class="settings-row-sub" id="stAccountSub">مدیریت ورود و همگام‌سازی ابری</div></div>
                        <button class="nav-btn" onclick="openModal('accountModal')" style="height:34px; padding:0 10px;">مدیریت</button>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">حریم خصوصی و نگهداری داده</div><div class="settings-row-sub">توضیح اینکه داده‌هایتان کجا ذخیره می‌شود</div></div>
                        <button class="nav-btn" onclick="openModal('privacyModal')" style="height:34px; padding:0 10px;">مشاهده</button>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">راهنما و متن تعرفه ۱۴۰۵</div><div class="settings-row-sub">احکام تعرفه و راهنمای استفاده از برنامه</div></div>
                        <button class="nav-btn" onclick="openModal('helpModal')" style="height:34px; padding:0 10px;">مشاهده</button>
                    </div>
                </div>
                <div class="section-box">
                    <div class="section-title"><span>ظاهر و نمایش</span></div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">اندازه فونت</div><div class="settings-row-sub">بزرگ‌نمایی متن در کل برنامه</div></div>
                        <select id="stFontSize" style="width:auto; padding:6px 10px;" onchange="setFontSize(this.value)">
                            <option value="small" ${(s.fontSize||'medium')==='small'?'selected':''}>کوچک</option>
                            <option value="medium" ${(s.fontSize||'medium')==='medium'?'selected':''}>متوسط (پیش‌فرض)</option>
                            <option value="large" ${(s.fontSize||'medium')==='large'?'selected':''}>بزرگ</option>
                            <option value="xlarge" ${(s.fontSize||'medium')==='xlarge'?'selected':''}>خیلی بزرگ</option>
                        </select>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">فونت برنامه</div><div class="settings-row-sub">در چاپ پیش‌فاکتور هم همین فونت استفاده می‌شود</div></div>
                        <select id="stFontFamily" style="width:auto; padding:6px 10px;" onchange="setFontFamily(this.value)">
                            <option value="vazirmatn" ${(s.fontFamily||'vazirmatn')==='vazirmatn'?'selected':''}>وزیرمتن (پیش‌فرض)</option>
                            <option value="sahel" ${(s.fontFamily||'vazirmatn')==='sahel'?'selected':''}>ساحل</option>
                            <option value="shabnam" ${(s.fontFamily||'vazirmatn')==='shabnam'?'selected':''}>شبنم</option>
                            <option value="samim" ${(s.fontFamily||'vazirmatn')==='samim'?'selected':''}>صمیم</option>
                            <option value="parastoo" ${(s.fontFamily||'vazirmatn')==='parastoo'?'selected':''}>پرستو</option>
                        </select>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">تراکم چیدمان</div><div class="settings-row-sub">فاصله‌گذاری فشرده یا راحت بین عناصر</div></div>
                        <select id="stDensity" style="width:auto; padding:6px 10px;" onchange="setDensity(this.value)">
                            <option value="comfortable" ${(s.density||'comfortable')==='comfortable'?'selected':''}>راحت (پیش‌فرض)</option>
                            <option value="compact" ${(s.density||'comfortable')==='compact'?'selected':''}>فشرده</option>
                        </select>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">کاهش جلوه‌های متحرک</div><div class="settings-row-sub">غیرفعال کردن انیمیشن‌ها و ترنزیشن‌ها</div></div>
                        <label class="switch"><input type="checkbox" id="stReducedMotion" ${s.reducedMotion ? 'checked' : ''} onchange="toggleReducedMotion(this.checked)"><span class="switch-slider"></span></label>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">کنتراست بالا</div><div class="settings-row-sub">خطوط و مرزها پررنگ‌تر نمایش داده شوند</div></div>
                        <label class="switch"><input type="checkbox" id="stHighContrast" ${s.highContrast ? 'checked' : ''} onchange="toggleHighContrast(this.checked)"><span class="switch-slider"></span></label>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">صفحه شروع برنامه</div><div class="settings-row-sub">اولین صفحه‌ای که هنگام باز شدن دیده می‌شود</div></div>
                        <select id="stStartupView" style="width:auto; padding:6px 10px;" onchange="saveSettings({startupView:this.value})">
                            <option value="calc" ${(s.startupView||'calc')==='calc'?'selected':''}>محاسبه‌گر (پیش‌فرض)</option>
                            <option value="dashboard" ${(s.startupView||'calc')==='dashboard'?'selected':''}>داشبورد</option>
                            <option value="cases" ${(s.startupView||'calc')==='cases'?'selected':''}>پرونده‌ها</option>
                            <option value="reminders" ${(s.startupView||'calc')==='reminders'?'selected':''}>یادآوری‌ها</option>
                        </select>
                    </div>
                </div>
                <div class="section-box">
                    <div class="section-title"><span>یادآوری‌ها</span></div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">اعلان و آلارم یادآوری‌ها</div><div class="settings-row-sub">وقتی برنامه باز است، سررسید یادآوری‌ها با اعلان و صدا اطلاع داده می‌شود</div></div>
                        <label class="switch"><input type="checkbox" id="stReminderNotif" ${s.reminderNotifications ? 'checked' : ''} onchange="toggleReminderNotifications(this.checked)"><span class="switch-slider"></span></label>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">صدای آلارم یادآوری</div><div class="settings-row-sub">پخش صدا هنگام رسیدن موعد یادآوری</div></div>
                        <label class="switch"><input type="checkbox" id="stReminderSound" ${s.reminderSound !== false ? 'checked' : ''} onchange="saveSettings({reminderSound:this.checked})"><span class="switch-slider"></span></label>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">هشدار زودتر از موعد</div><div class="settings-row-sub">چند دقیقه قبل از سررسید هم اعلان بده</div></div>
                        <select id="stReminderLead" style="width:auto; padding:6px 10px;" onchange="saveSettings({reminderLeadMinutes:this.value})">
                            <option value="0" ${(s.reminderLeadMinutes||'0')==='0'?'selected':''}>دقیقاً سر موعد</option>
                            <option value="10" ${(s.reminderLeadMinutes||'0')==='10'?'selected':''}>۱۰ دقیقه زودتر</option>
                            <option value="30" ${(s.reminderLeadMinutes||'0')==='30'?'selected':''}>۳۰ دقیقه زودتر</option>
                            <option value="60" ${(s.reminderLeadMinutes||'0')==='60'?'selected':''}>۱ ساعت زودتر</option>
                        </select>
                    </div>
                </div>
                <div class="section-box">
                    <div class="section-title"><span>بهبود و شخصی‌سازی برنامه</span></div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">تأیید قبل از حذف موارد</div><div class="settings-row-sub">نمایش پیام تأیید پیش از حذف پرونده، متقاضی، کارشناس یا یادآوری</div></div>
                        <label class="switch"><input type="checkbox" ${s.confirmDelete !== false ? 'checked' : ''} onchange="saveSettings({confirmDelete:this.checked})"><span class="switch-slider"></span></label>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">دکمه بازگشت به بالا</div><div class="settings-row-sub">نمایش دکمه شناور برای برگشت سریع به ابتدای صفحه</div></div>
                        <label class="switch"><input type="checkbox" ${s.showBackToTop !== false ? 'checked' : ''} onchange="saveSettings({showBackToTop:this.checked}); applyBackToTopVisibility();"><span class="switch-slider"></span></label>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">پاک‌سازی خودکار فرم</div><div class="settings-row-sub">پس از صدور پیش‌فاکتور، فرم محاسبه خالی شود</div></div>
                        <label class="switch"><input type="checkbox" ${s.autoResetAfterInvoice ? 'checked' : ''} onchange="saveSettings({autoResetAfterInvoice:this.checked})"><span class="switch-slider"></span></label>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">صدای کلیک دکمه‌ها</div><div class="settings-row-sub">پخش یک تیک صدای کوتاه هنگام لمس دکمه‌های اصلی</div></div>
                        <label class="switch"><input type="checkbox" ${s.uiClickSound ? 'checked' : ''} onchange="saveSettings({uiClickSound:this.checked})"><span class="switch-slider"></span></label>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">لرزش لمسی دکمه‌ها</div><div class="settings-row-sub">ویبره سبک هنگام ضربه روی دکمه‌های ناوبری (در گوشی‌های پشتیبان)</div></div>
                        <label class="switch"><input type="checkbox" ${s.hapticFeedback !== false ? 'checked' : ''} onchange="saveSettings({hapticFeedback:this.checked})"><span class="switch-slider"></span></label>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">ارقام نمایشی در گزارش‌ها</div><div class="settings-row-sub">فارسی یا انگلیسی نمایش داده شود</div></div>
                        <select id="stDigitStyle" style="width:auto; padding:6px 10px;" onchange="saveSettings({digitStyle:this.value}); if(typeof renderReports==='function') renderReports();">
                            <option value="fa" ${(s.digitStyle||'fa')==='fa'?'selected':''}>فارسی (۱۲۳...)</option>
                            <option value="en" ${(s.digitStyle||'fa')==='en'?'selected':''}>انگلیسی (123...)</option>
                        </select>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">نوار پایین فشرده</div><div class="settings-row-sub">فقط آیکون، بدون عنوان متنی زیر آن</div></div>
                        <label class="switch"><input type="checkbox" ${s.compactBottomNav ? 'checked' : ''} onchange="saveSettings({compactBottomNav:this.checked}); applyCompactBottomNav();"><span class="switch-slider"></span></label>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">بنر کانال تلگرام</div><div class="settings-row-sub">نمایش دعوت به عضویت در کانال، پایین منوی همبرگری</div></div>
                        <label class="switch"><input type="checkbox" ${s.hideTelegramBanner ? '' : 'checked'} onchange="saveSettings({hideTelegramBanner:!this.checked}); applyTelegramBannerVisibility();"><span class="switch-slider"></span></label>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">حالت پیش‌فرض محاسبه‌گر</div><div class="settings-row-sub">تک‌کارشناسه یا هیئتی، هنگام باز کردن برنامه</div></div>
                        <select id="stDefaultCalcMode" style="width:auto; padding:6px 10px;" onchange="saveSettings({defaultCalcMode:this.value})">
                            <option value="single" ${(s.defaultCalcMode||'single')==='single'?'selected':''}>تک‌کارشناسه</option>
                            <option value="board" ${(s.defaultCalcMode||'single')==='board'?'selected':''}>هیئت کارشناسی</option>
                        </select>
                    </div>
                    <div class="settings-row">
                        <div><div class="settings-row-label">به‌روزرسانی برنامه</div><div class="settings-row-sub">بررسی نسخه جدید و بارگذاری فوری</div></div>
                        <button class="nav-btn" style="height:34px; padding:0 12px;" onclick="checkForAppUpdate()">بررسی الان</button>
                    </div>
                </div>
                <div class="section-box">
                    <div class="settings-row">
                        <div><div class="settings-row-label">قفل امنیتی PIN</div><div class="settings-row-sub">درخواست رمز ۴ رقمی هنگام باز شدن برنامه</div></div>
                        <label class="switch"><input type="checkbox" id="stPinSwitch" ${s.pinEnabled ? 'checked' : ''} onchange="togglePinLock(this.checked)"><span class="switch-slider"></span></label>
                    </div>
                    ${s.pinEnabled ? `<button class="nav-btn" style="width:100%; margin-top:8px; height:36px;" onclick="openModal('pinSetupModal')">تغییر رمز PIN</button>` : ''}
                </div>
                <div class="section-box">
                    <div class="settings-row">
                        <div><div class="settings-row-label" style="color:var(--accent-rose);">پاک‌سازی کامل اطلاعات این گوشی</div><div class="settings-row-sub">پرونده‌ها، کارشناسان، متقاضیان و یادآوری‌های محلی حذف می‌شوند</div></div>
                    </div>
                    <button class="btn-action" style="width:100%; margin-top:10px; color:var(--accent-rose); border-color:var(--accent-rose);" onclick="wipeLocalData()">پاک‌سازی اطلاعات محلی</button>
                </div>
                <p class="empty-state" id="hiddenFooterTap" style="cursor:pointer; user-select:none;" onclick="handleFooterTap()">کارشناس پلاس — نسخه ۱.۰</p>`;
        }
        window.setColorTheme = function (id) {
            document.body.setAttribute('data-theme', id === 'default' ? '' : id);
            saveSettings({ colorTheme: id });
        };
        window.settingsToggleTheme = function () {
            toggleTheme();
            saveSettings({ theme: document.body.classList.contains('light-mode') ? 'light' : 'dark' });
        };
        window.togglePinLock = function (enabled) {
            if (enabled) {
                openModal('pinSetupModal');
            } else {
                saveSettings({ pinEnabled: false, pinCode: '' });
                renderSettings();
            }
        };
        window.savePinCode = function () {
            const p1 = document.getElementById('pinNewInput').value.trim();
            const p2 = document.getElementById('pinConfirmInput').value.trim();
            if (!/^\d{4}$/.test(p1)) { alert('رمز باید دقیقاً ۴ رقم باشد.'); return; }
            if (p1 !== p2) { alert('رمزها با هم مطابقت ندارند.'); return; }
            saveSettings({ pinEnabled: true, pinCode: p1 });
            document.getElementById('pinNewInput').value = '';
            document.getElementById('pinConfirmInput').value = '';
            closeModal('pinSetupModal');
            renderSettings();
            alert('قفل امنیتی فعال شد.');
        };

        let pinEnteredDigits = '';
        function renderPinDots() {
            const box = document.getElementById('pinDots');
            if (!box) return;
            box.innerHTML = [0, 1, 2, 3].map((i) => `<div style="width:14px; height:14px; border-radius:50%; border:2px solid ${i < pinEnteredDigits.length ? 'var(--accent-cyan)' : 'var(--border-color)'}; background:${i < pinEnteredDigits.length ? 'var(--accent-cyan)' : 'transparent'};"></div>`).join('');
        }
        window.pinKeyPress = function (digit) {
            if (pinEnteredDigits.length >= 4) return;
            pinEnteredDigits += digit;
            renderPinDots();
            document.getElementById('pinError').innerText = '';
            if (pinEnteredDigits.length === 4) {
                const s = getSettings();
                if (pinEnteredDigits === s.pinCode) {
                    document.getElementById('pinLockScreen').style.display = 'none';
                    pinEnteredDigits = '';
                } else {
                    document.getElementById('pinError').innerText = 'رمز ورود اشتباه است.';
                    setTimeout(() => { pinEnteredDigits = ''; renderPinDots(); }, 500);
                }
            }
        };
        window.pinKeyBackspace = function () {
            pinEnteredDigits = pinEnteredDigits.slice(0, -1);
            renderPinDots();
        };
        function checkPinLockOnLoad() {
            const s = getSettings();
            if (s.pinEnabled && s.pinCode) {
                document.getElementById('pinLockScreen').style.display = 'flex';
                pinEnteredDigits = '';
                renderPinDots();
            }
        }
        /* ---------------- Hidden panel — cryptographically gated (ECDSA P-256) ----------------
           No password or secret code lives anywhere in this file. This only holds a PUBLIC
           key, which is safe to expose — it can verify a signature but cannot create one.
           A valid signature can only be produced by whoever holds the matching PRIVATE key,
           in the separate offline signer tool that never gets published anywhere. */
        const PANEL_PUBLIC_KEY_JWK = {"kty":"EC","x":"4HBbFwlKoKK3CeJip2uz350pOF1f1mn1ZoL-fkBbwzg","y":"J50I8bZ81aWUPL1GPmfKxaZq3a8XQufoGwp9zWSmaHE","crv":"P-256"};
        let footerTapCount = 0;
        let footerTapTimer = null;
        let currentAdminChallenge = '';

        function randomChallenge() {
            const bytes = crypto.getRandomValues(new Uint8Array(24));
            return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }

        window.handleFooterTap = function () {
            footerTapCount++;
            if (footerTapTimer) clearTimeout(footerTapTimer);
            footerTapTimer = setTimeout(() => { footerTapCount = 0; }, 3000);
            if (footerTapCount >= 7) {
                footerTapCount = 0;
                currentAdminChallenge = randomChallenge();
                document.getElementById('adminChallengeBox').value = currentAdminChallenge;
                document.getElementById('adminSigInput').value = '';
                openModal('adminCodeModal');
            }
        };
        window.copyAdminChallenge = function () {
            const box = document.getElementById('adminChallengeBox');
            box.select();
            document.execCommand('copy');
        };
        window.verifyAdminSignature = async function () {
            const sigB64 = document.getElementById('adminSigInput').value.trim();
            if (!sigB64 || !currentAdminChallenge) { alert('کد و پاسخ امضاشده را کامل وارد کن.'); return; }
            try {
                const pubKey = await crypto.subtle.importKey(
                    'jwk', PANEL_PUBLIC_KEY_JWK,
                    { name: 'ECDSA', namedCurve: 'P-256' },
                    false, ['verify']
                );
                const sigBytes = ub64u(sigB64);
                const msgBytes = new TextEncoder().encode(currentAdminChallenge);
                const valid = await crypto.subtle.verify(
                    { name: 'ECDSA', hash: 'SHA-256' },
                    pubKey, sigBytes, msgBytes
                );
                if (!valid) { alert('پاسخ نامعتبر است.'); return; }

                closeModal('adminCodeModal');
                openModal('adminStatsModal');
                document.getElementById('adminStatsBody').innerText = 'در حال بارگذاری...';
                if (typeof window.fetchVisitStats === 'function') {
                    const stats = await window.fetchVisitStats();
                    document.getElementById('adminStatsBody').innerHTML = stats ? renderAdminStats(stats) : '<div class="empty-state">اتصال به سرور آمار برقرار نشد. مطمئن شو قانون siteMeta در Firestore Rules فعال و منتشر شده باشد.</div>';
                } else {
                    document.getElementById('adminStatsBody').innerHTML = '<div class="empty-state">ماژول آماری هنوز بارگذاری نشده.</div>';
                }
            } catch (err) {
                console.error(err);
                alert('پاسخ قابل بررسی نبود — احتمالاً فرمتش درست نیست.');
            }
        };
        function ub64u(s) {
            s = s.replace(/-/g, '+').replace(/_/g, '/');
            while (s.length % 4) s += '=';
            return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
        }
        function renderAdminStats(stats) {
            const countryRows = (stats.countries || []).slice(0, 6);
            const maxC = Math.max(1, ...countryRows.map((c) => c.count));
            const hourRows = stats.hours || [];
            const maxH = Math.max(1, ...hourRows.map((h) => h.count));
            return `
                <div class="stat-grid">
                    <div class="stat-card"><div class="stat-val">${(stats.total || 0).toLocaleString('fa-IR')}</div><div class="stat-label">کل بازدیدها</div></div>
                    <div class="stat-card"><div class="stat-val">${(stats.today || 0).toLocaleString('fa-IR')}</div><div class="stat-label">بازدید امروز</div></div>
                    <div class="stat-card"><div class="stat-val">${(stats.yesterday || 0).toLocaleString('fa-IR')}</div><div class="stat-label">بازدید دیروز</div></div>
                    <div class="stat-card"><div class="stat-val">${stats.busiestHour !== null ? stats.busiestHour + ':00' : '-'}</div><div class="stat-label">شلوغ‌ترین ساعت (UTC)</div></div>
                </div>
                <div class="section-box">
                    <div class="section-title"><span>پربازدیدترین کشورها</span></div>
                    ${countryRows.map((c) => `
                        <div class="bar-chart-row">
                            <div class="bar-chart-label">${escapeHtml(c.name)}</div>
                            <div class="bar-chart-track"><div class="bar-chart-fill" style="width:${Math.max(4, (c.count / maxC) * 100)}%"></div></div>
                            <div class="bar-chart-val">${c.count.toLocaleString('fa-IR')}</div>
                        </div>`).join('') || '<div class="empty-state">هنوز داده کشور ثبت نشده.</div>'}
                </div>
                <div class="section-box">
                    <div class="section-title"><span>ترافیک به تفکیک ساعت (UTC)</span></div>
                    ${hourRows.map((h) => `
                        <div class="bar-chart-row">
                            <div class="bar-chart-label">${h.hour}:00</div>
                            <div class="bar-chart-track"><div class="bar-chart-fill" style="width:${Math.max(4, (h.count / maxH) * 100)}%"></div></div>
                            <div class="bar-chart-val">${h.count.toLocaleString('fa-IR')}</div>
                        </div>`).join('') || '<div class="empty-state">هنوز داده‌ای ثبت نشده.</div>'}
                </div>`;
        }
        // Called once per page load; the actual Firestore write happens in the
        // Firebase module below (works even for visitors who never sign in).
        function trackVisit() {
            if (typeof window.trackVisitCloud === 'function') window.trackVisitCloud();
        }
        window.wipeLocalData = function () {
            if (!confirm('همه پرونده‌ها، کارشناسان، متقاضیان و یادآوری‌های ذخیره‌شده روی این گوشی حذف می‌شوند (اطلاعات ابری شما دست‌نخورده باقی می‌ماند). ادامه می‌دهید؟')) return;
            [K.cases, K.experts, K.applicants, K.reminders].forEach((k) => dbWrite(k, []));
            window.refreshAllViews();
            alert('اطلاعات محلی پاک شد.');
        };

        /* ---------------- Privacy policy modal content (referenced from Settings) ---------------- */
        document.addEventListener('DOMContentLoaded', () => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.id = 'privacyModal';
            overlay.setAttribute('onclick', "closeModalOnOverlay(event, 'privacyModal')");
            overlay.innerHTML = `
                <div class="modal-card">
                    <div class="modal-header">
                        <div class="modal-title">حریم خصوصی و نگهداری داده</div>
                        <button class="modal-close" onclick="closeModal('privacyModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p style="font-size:0.8rem; line-height:2;">
                            بدون ورود با گوگل، تمام اطلاعات شما (پرونده‌ها، کارشناسان، متقاضیان، یادآوری‌ها) فقط روی همین گوشی و در حافظه مرورگر ذخیره می‌شود
                            و به هیچ سروری ارسال نمی‌گردد.<br><br>
                            در صورت ورود با حساب گوگل، همین اطلاعات علاوه‌بر گوشی شما، در پایگاه‌داده Firestore (سرویس گوگل) هم ذخیره می‌شود تا در صورت تعویض گوشی یا نصب مجدد از بین نروند
                            و بتوانید از چند دستگاه به آن‌ها دسترسی داشته باشید. این اطلاعات فقط برای خود شما (بر اساس حساب گوگلتان) قابل مشاهده است و در اختیار شخص یا سرویس دیگری قرار نمی‌گیرد.
                        </p>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            // Render the initial screen for whichever view is active on load (default: calc, no render needed).
        });


        // internet), these keep the buttons from throwing errors. The module overwrites
        // them with the real, working versions once it loads successfully.
        window.signInWithGoogle = function () {
            alert('برای ورود با گوگل به اتصال اینترنت نیاز است. لطفاً اتصال خود را بررسی و دوباره تلاش کنید.');
        };
        window.signOutOfGoogle = function () {};
