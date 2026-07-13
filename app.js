// ================================================================
//  URL BACKEND (sudah diisi dengan URL deploy Anda)
// ================================================================
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbyimpAEnrszgXoBzJ8adCaBoQaNvBSWoNwZnxPIDJGYIzA_lKph0ScLYQJBSrlbPDZSFw/exec';

let authToken = sessionStorage.getItem('authToken') || '';
let currentUser = sessionStorage.getItem('currentUser') || '';
let currentRole = sessionStorage.getItem('currentRole') || '';
let currentUserNama = sessionStorage.getItem('currentUserNama') || '';

// ================================================================
//  FUNGSI API
// ================================================================
function callApi(action, payload, callback) {
    fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload: { ...payload, token: authToken } })
    })
    .then(res => res.json())
    .then(data => data.error ? callback(new Error(data.error), null) : callback(null, data))
    .catch(err => callback(err, null));
}

// ================================================================
//  LOGIN / LOGOUT
// ================================================================
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!username || !password) { showLoginError('Isi username dan password'); return; }

    const btn = document.getElementById('loginBtn');
    btn.innerHTML = '<span class="spinner"></span> Masuk...';
    btn.disabled = true;

    fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'login', payload: { username, password } })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            showLoginError(data.error);
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk';
            btn.disabled = false;
            return;
        }
        authToken = data.token;
        currentUser = data.username;
        currentRole = data.role;
        currentUserNama = data.nama_lengkap || data.username;
        sessionStorage.setItem('authToken', authToken);
        sessionStorage.setItem('currentUser', currentUser);
        sessionStorage.setItem('currentRole', currentRole);
        sessionStorage.setItem('currentUserNama', currentUserNama);
        document.getElementById('loginPage').style.display = 'none';
        document.querySelector('.sidebar').style.display = 'flex';
        document.getElementById('mainContent').style.display = 'flex';
        initApp();
    })
    .catch(() => {
        showLoginError('Terjadi kesalahan koneksi');
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk';
        btn.disabled = false;
    });
});

function showLoginError(msg) {
    const el = document.getElementById('loginError');
    el.textContent = msg;
    el.style.display = 'block';
}

document.getElementById('logoutBtn').addEventListener('click', function() {
    sessionStorage.clear();
    location.reload();
});

// ================================================================
//  INIT APP
// ================================================================
function initApp() {
    document.getElementById('loginPage').style.display = 'none';
    document.querySelector('.sidebar').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'flex';

    if (currentRole === 'admin') {
        document.getElementById('userMenuLabel').style.display = 'block';
        document.getElementById('userMenuLink').style.display = 'flex';
    }

    document.getElementById('sidebarUserName').textContent = currentUserNama || currentUser || '-';
    document.getElementById('sidebarUserRole').textContent = currentRole === 'admin' ? 'Administrator' : 'Guru';

    setCurrentDate();
    loadKelas();
    loadGuruList();
    loadAgenda();
    loadSiswa();
    loadModul();
    loadKategoriPoin();
    loadDashboardStats();
    if (currentRole === 'admin') loadUsers();

    document.querySelectorAll('.sidebar-nav a[data-page]').forEach(el => {
        el.addEventListener('click', function(e) {
            e.preventDefault();
            navigateTo(this.dataset.page);
        });
    });

    document.getElementById('hamburgerBtn').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('sidebarOverlay').classList.toggle('show');
    });
    document.getElementById('sidebarOverlay').addEventListener('click', function() {
        document.getElementById('sidebar').classList.remove('open');
        this.classList.remove('show');
    });

    document.getElementById('agendaForm').addEventListener('submit', handleAgendaSubmit);
    document.getElementById('agendaForm').addEventListener('reset', function() {
        setTimeout(() => loadAgendaPresensiForKelas(''), 0);
    });
    document.getElementById('modulForm').addEventListener('submit', handleModulSubmit);
    document.getElementById('siswaForm').addEventListener('submit', handleSiswaSubmit);
    document.getElementById('kelasForm').addEventListener('submit', handleKelasSubmit);
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
    document.getElementById('poinForm').addEventListener('submit', handlePoinSubmit);
    document.getElementById('kategoriPoinForm').addEventListener('submit', handleKategoriPoinSubmit);

    document.getElementById('fPoinKelas').addEventListener('change', function() {
        populatePoinSiswaDropdown(this.value);
    });
    document.getElementById('fPoinKategori').addEventListener('change', function() {
        const opt = this.selectedOptions[0];
        const badge = document.getElementById('poinTipeBadge');
        if (!opt || !opt.value) { badge.innerHTML = ''; document.getElementById('fPoinNilai').value = ''; return; }
        const tipe = opt.dataset.tipe;
        document.getElementById('fPoinNilai').value = opt.dataset.poin;
        badge.innerHTML = `<span class="badge-status ${tipe==='Prestasi'?'hadir':'sakit'}" style="font-weight:400;">${tipe}</span>`;
    });
    document.getElementById('fPoinTanggal').value = new Date().toISOString().split('T')[0];

    document.getElementById('fTanggal').addEventListener('change', function() {
        document.getElementById('fHari').value = tanggalKeHariIndo(this.value);
    });

    document.getElementById('fAgendaKelas').addEventListener('change', function() {
        loadAgendaPresensiForKelas(this.value);
    });

    document.getElementById('siswaFileInput').addEventListener('change', handleSiswaFileUpload);
    document.getElementById('kelasFileInput').addEventListener('change', handleKelasFileUpload);

    document.getElementById('searchAgenda').addEventListener('input', function() {
        renderAgendaTable(this.value);
    });

    document.getElementById('presensiDate').value = new Date().toISOString().split('T')[0];
}

// ================================================================
//  NAVIGASI
// ================================================================
function navigateTo(page) {
    document.querySelectorAll('.sidebar-nav a[data-page]').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    document.querySelectorAll('.page-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');

    const titles = { dashboard:'Dashboard', agenda:'Agenda Kelas', presensi:'Presensi Siswa',
                     modul:'Modul Ajar', kelas:'Data Kelas', siswa:'Data Siswa', poin:'Poin Siswa', laporan:'Laporan Bulanan', users:'Kelola Pengguna' };
    const icons = { dashboard:'chart-pie', agenda:'calendar-alt', presensi:'clipboard-check',
                    modul:'book-open', kelas:'chalkboard', siswa:'users', poin:'star', laporan:'file-alt', users:'user-cog' };
    document.getElementById('pageTitle').innerHTML =
        `<i class="fas fa-${icons[page] || 'file'}"></i> ${titles[page] || page}`;

    if (page === 'dashboard') loadDashboardStats();
    if (page === 'agenda') loadAgenda();
    if (page === 'siswa') loadSiswa();
    if (page === 'modul') loadModul();
    if (page === 'kelas') loadKelas();
    if (page === 'poin') { loadKategoriPoin(); loadRekapPoin(); loadCatatanPoin(); }
    if (page === 'users' && currentRole === 'admin') loadUsers();

    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
}

// ================================================================
//  DATE, TOAST, MODAL
// ================================================================
function setCurrentDate() {
    const d = new Date();
    document.getElementById('currentDate').textContent = d.toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

function showToast(msg, type='success') {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    toast.className = type;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

function openModal(title, bodyHTML) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalOverlay').classList.add('show');
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); }
document.getElementById('modalOverlay').addEventListener('click', function(e) { if (e.target === this) closeModal(); });

// ================================================================
//  AGENDA
// ================================================================
let agendaData = [];
let agendaPresensiState = []; // [{nis, nama, status, keterangan}] untuk kelas yang sedang dipilih di form

const HARI_INDO = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const BULAN_INDO = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

// dateStr format: YYYY-MM-DD (dari <input type="date">)
function tanggalKeHariIndo(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return HARI_INDO[dateObj.getDay()];
}

function formatTanggalIndo(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${tanggalKeHariIndo(dateStr)}, ${d} ${BULAN_INDO[m-1]} ${y}`;
}

function loadAgenda() {
    callApi('getAgenda', {}, function(err, data) {
        if (err) { showToast('Gagal load agenda', 'error'); return; }
        agendaData = data || [];
        renderAgendaTable();
        updateStats();
    });
}

function renderAgendaTable(search='') {
    const tbody = document.getElementById('agendaTableBody');
    let filtered = agendaData;
    if (search.trim()) {
        const q = search.toLowerCase();
        filtered = agendaData.filter(item =>
            (item.hariTanggal||'').toLowerCase().includes(q) ||
            (item.kelas||'').toLowerCase().includes(q) ||
            (item.pengajar||'').toLowerCase().includes(q) ||
            (item.mapel||'').toLowerCase().includes(q) ||
            (item.aktivitas||'').toLowerCase().includes(q)
        );
    }
    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="14" class="text-center text-muted" style="padding:30px;">Belum ada data agenda</td></tr>`;
        return;
    }
    tbody.innerHTML = filtered.map((item, idx) => `
        <tr>
            <td>${idx+1}</td>
            <td>${item.hariTanggal||'-'}</td>
            <td>${item.jamKe||'-'}</td>
            <td>${item.kelas||'-'}</td>
            <td>${item.pengajar||'-'}</td>
            <td>${item.mapel||'-'}</td>
            <td><span class="siklus-badge ${siklusClass(item.siklus)}">${item.siklus||'-'}</span></td>
            <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.aktivitas||'-'}</td>
            <td><span class="badge-status hadir">${item.hadir||0}</span></td>
            <td><span class="badge-status izin">${item.izin||0}</span></td>
            <td><span class="badge-status sakit">${item.sakit||0}</span></td>
            <td><span class="badge-status alpha">${item.alpha||0}</span></td>
            <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.keterangan||'-'}</td>
            <td>
                <button class="btn-icon" onclick="editAgenda(${item.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-icon danger" onclick="deleteAgenda(${item.id})"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `).join('');
}

function siklusClass(val) {
    const map = { 'Tuning in':'tuning','Finding out':'finding','Sorting out':'sorting',
                  'Going further':'going','Making conclusion':'making',
                  'Taking action':'taking','End of Unit':'end' };
    return map[val] || '';
}

// ----------------------------------------------------------------
//  Checklist presensi siswa otomatis di dalam form Agenda
// ----------------------------------------------------------------
function loadAgendaPresensiForKelas(kelas, existingList) {
    const tbody = document.getElementById('agendaPresensiBody');
    if (!kelas) {
        agendaPresensiState = [];
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:16px;">Pilih kelas terlebih dahulu</td></tr>`;
        updateAgendaPresensiSummary();
        return;
    }
    const roster = siswaData.filter(s => String(s.kelas) === String(kelas));
    if (!roster.length) {
        agendaPresensiState = [];
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:16px;">Belum ada siswa di kelas ini. Tambahkan dulu di menu Data Siswa.</td></tr>`;
        updateAgendaPresensiSummary();
        return;
    }
    agendaPresensiState = roster.map(s => {
        const existing = (existingList||[]).find(e => e.nis === s.nis);
        return {
            nis: s.nis, nama: s.nama,
            status: existing ? existing.status : 'Hadir',
            keterangan: existing ? existing.keterangan : ''
        };
    });
    renderAgendaPresensiTable();
}

function renderAgendaPresensiTable() {
    const tbody = document.getElementById('agendaPresensiBody');
    tbody.innerHTML = agendaPresensiState.map((s, i) => `
        <tr>
            <td>${i+1}</td>
            <td>${s.nis||'-'}</td>
            <td>${s.nama||'-'}</td>
            <td>
                <select class="agenda-presensi-status" data-idx="${i}" style="padding:4px 8px;border-radius:6px;border:1.5px solid #e2e8f0;font-size:13px;">
                    <option value="Hadir" ${s.status==='Hadir'?'selected':''}>Hadir</option>
                    <option value="Izin" ${s.status==='Izin'?'selected':''}>Izin</option>
                    <option value="Sakit" ${s.status==='Sakit'?'selected':''}>Sakit</option>
                    <option value="Alpha" ${s.status==='Alpha'?'selected':''}>Alpha</option>
                </select>
            </td>
            <td><input type="text" class="agenda-presensi-ket" data-idx="${i}" value="${s.keterangan||''}" placeholder="Catatan..." style="padding:4px 8px;border-radius:6px;border:1.5px solid #e2e8f0;font-size:13px;width:100%;" /></td>
        </tr>
    `).join('');

    document.querySelectorAll('.agenda-presensi-status').forEach(el => {
        el.addEventListener('change', function() {
            agendaPresensiState[parseInt(this.dataset.idx)].status = this.value;
            updateAgendaPresensiSummary();
        });
    });
    document.querySelectorAll('.agenda-presensi-ket').forEach(el => {
        el.addEventListener('input', function() {
            agendaPresensiState[parseInt(this.dataset.idx)].keterangan = this.value;
        });
    });
    updateAgendaPresensiSummary();
}

function updateAgendaPresensiSummary() {
    const counts = { Hadir:0, Izin:0, Sakit:0, Alpha:0 };
    agendaPresensiState.forEach(s => { counts[s.status] = (counts[s.status]||0) + 1; });
    const el = document.getElementById('agendaPresensiSummary');
    el.textContent = agendaPresensiState.length
        ? `(Hadir ${counts.Hadir} · Izin ${counts.Izin} · Sakit ${counts.Sakit} · Alpha ${counts.Alpha})`
        : '';
}

function handleAgendaSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('fEditId').value;
    const tanggalISO = document.getElementById('fTanggal').value;
    const jamKe = Array.from(document.querySelectorAll('.fJamKeItem:checked')).map(el => el.value).join(',');
    const kelas = document.getElementById('fAgendaKelas').value;

    if (!tanggalISO) { showToast('Pilih tanggal terlebih dahulu', 'error'); return; }
    if (!jamKe) { showToast('Pilih minimal satu jam ke', 'error'); return; }
    if (!kelas) { showToast('Pilih kelas terlebih dahulu', 'error'); return; }

    const counts = { Hadir:0, Izin:0, Sakit:0, Alpha:0 };
    agendaPresensiState.forEach(s => { counts[s.status] = (counts[s.status]||0) + 1; });

    const payload = {
        hariTanggal: formatTanggalIndo(tanggalISO),
        tanggalISO: tanggalISO,
        jamKe: jamKe,
        kelas: kelas,
        pengajar: document.getElementById('fPengajar').value.trim(),
        mapel: document.getElementById('fMapel').value.trim(),
        siklus: document.getElementById('fSiklus').value,
        aktivitas: document.getElementById('fAktivitas').value.trim(),
        hadir: counts.Hadir,
        izin: counts.Izin,
        sakit: counts.Sakit,
        alpha: counts.Alpha,
        keterangan: document.getElementById('fKeterangan').value.trim(),
    };
    const action = id ? 'updateAgenda' : 'addAgenda';
    if (id) payload.id = parseInt(id);

    const btn = document.getElementById('agendaSubmitBtn');
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
    btn.disabled = true;

    callApi(action, payload, function(err) {
        if (err) {
            btn.innerHTML = '<i class="fas fa-save"></i> Simpan Agenda';
            btn.disabled = false;
            showToast('Gagal menyimpan', 'error');
            return;
        }

        const finishUp = (presensiErr) => {
            btn.innerHTML = '<i class="fas fa-save"></i> Simpan Agenda';
            btn.disabled = false;
            if (presensiErr) {
                showToast('Agenda tersimpan, tapi presensi gagal disimpan', 'error');
            } else {
                showToast(id ? 'Agenda & presensi diperbarui' : 'Agenda & presensi ditambahkan');
            }
            document.getElementById('agendaForm').reset();
            document.getElementById('fEditId').value = '';
            document.getElementById('fHari').value = '';
            loadAgendaPresensiForKelas('');
            loadAgenda();
        };

        if (agendaPresensiState.length) {
            callApi('savePresensi', { tanggal: tanggalISO, kelas, data: agendaPresensiState }, function(err2) {
                finishUp(err2);
            });
        } else {
            finishUp(null);
        }
    });
}

function editAgenda(id) {
    const item = agendaData.find(d => d.id === id);
    if (!item) return;
    document.getElementById('fTanggal').value = item.tanggalISO || '';
    document.getElementById('fHari').value = item.tanggalISO ? tanggalKeHariIndo(item.tanggalISO) : (item.hariTanggal||'').split(',')[0]||'';
    document.querySelectorAll('.fJamKeItem').forEach(el => {
        el.checked = String(item.jamKe||'').split(',').map(v=>v.trim()).includes(el.value);
    });
    document.getElementById('fAgendaKelas').value = item.kelas||'';
    document.getElementById('fPengajar').value = item.pengajar||'';
    document.getElementById('fMapel').value = item.mapel||'';
    document.getElementById('fSiklus').value = item.siklus||'Tuning in';
    document.getElementById('fAktivitas').value = item.aktivitas||'';
    document.getElementById('fKeterangan').value = item.keterangan||'';
    document.getElementById('fEditId').value = id;

    // Muat ulang checklist presensi sesuai kelas & tanggal agenda yang diedit
    if (item.kelas && item.tanggalISO) {
        callApi('getPresensi', { tanggal: item.tanggalISO, kelas: item.kelas }, function(err, presensiList) {
            loadAgendaPresensiForKelas(item.kelas, err ? [] : presensiList);
        });
    } else {
        loadAgendaPresensiForKelas(item.kelas||'');
    }

    document.getElementById('page-agenda').scrollIntoView({ behavior: 'smooth' });
}

function deleteAgenda(id) {
    if (!confirm('Yakin ingin menghapus agenda ini?')) return;
    callApi('deleteAgenda', { id }, function(err) {
        if (err) { showToast('Gagal hapus', 'error'); return; }
        showToast('Agenda dihapus');
        loadAgenda();
    });
}

function loadGuruList() {
    callApi('getGuruList', {}, function(err, data) {
        if (err) return;
        const select = document.getElementById('fPengajar');
        const currentVal = select.value;
        const list = data || [];
        select.innerHTML = '<option value="">-- Pilih Pengajar --</option>' +
            list.map(g => `<option value="${g.nama_lengkap}">${g.nama_lengkap}</option>`).join('');
        if (currentVal) select.value = currentVal;
    });
}

// ================================================================
//  DATA KELAS
// ================================================================
let kelasData = [];

function loadKelas() {
    callApi('getKelas', {}, function(err, data) {
        if (err) return;
        kelasData = data || [];
        renderKelasTable();
        populateKelasDropdowns();
    });
}

function renderKelasTable() {
    const tbody = document.getElementById('kelasTableBody');
    if (!tbody) return;
    if (!kelasData.length) {
        tbody.innerHTML = `<tr><td colspan="2" class="text-center text-muted">Belum ada data kelas</td></tr>`;
        return;
    }
    tbody.innerHTML = kelasData.map(item => `
        <tr>
            <td>${item.namaKelas||'-'}</td>
            <td>
                <button class="btn-icon" onclick="editKelas(${item.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-icon danger" onclick="deleteKelas(${item.id})"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `).join('');
}

// Isi ulang semua dropdown kelas (Data Siswa, Presensi, Modul) sambil mempertahankan pilihan yang sedang aktif
function populateKelasDropdowns() {
    const options = kelasData.map(k => `<option value="${k.namaKelas}">${k.namaKelas}</option>`).join('');

    const plainSelectIds = ['fSiswaKelas', 'presensiKelas', 'fModulKelas'];
    plainSelectIds.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = options || '<option value="">-- Belum ada kelas --</option>';
        if (currentVal && kelasData.some(k => k.namaKelas === currentVal)) select.value = currentVal;
    });

    // fAgendaKelas & fPoinKelas selalu menyertakan opsi kosong agar wajib dipilih secara sadar
    ['fAgendaKelas', 'fPoinKelas'].forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- Pilih Kelas --</option>' + options;
        if (currentVal && kelasData.some(k => k.namaKelas === currentVal)) select.value = currentVal;
    });

    // laporanKelas, rekapPoinKelas, riwayatPoinKelas: opsi kosong berarti "Semua Kelas" (gabungan)
    ['laporanKelas', 'rekapPoinKelas', 'riwayatPoinKelas'].forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- Semua Kelas --</option>' + options;
        if (currentVal && kelasData.some(k => k.namaKelas === currentVal)) select.value = currentVal;
    });
}

function handleKelasSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('fKelasEditId').value;
    const payload = { namaKelas: document.getElementById('fKelasNama').value.trim() };
    const action = editId ? 'updateKelas' : 'addKelas';
    if (editId) payload.id = parseInt(editId);

    const btn = document.getElementById('kelasSubmitBtn');
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
    btn.disabled = true;
    callApi(action, payload, function(err) {
        btn.innerHTML = '<i class="fas fa-save"></i> Simpan Kelas';
        btn.disabled = false;
        if (err) { showToast(err.message || 'Gagal simpan kelas', 'error'); return; }
        showToast(editId ? 'Kelas diperbarui' : 'Kelas ditambahkan');
        document.getElementById('kelasForm').reset();
        document.getElementById('fKelasEditId').value = '';
        loadKelas();
    });
}

function editKelas(id) {
    const item = kelasData.find(d => d.id === id);
    if (!item) return;
    document.getElementById('fKelasNama').value = item.namaKelas||'';
    document.getElementById('fKelasEditId').value = id;
    document.getElementById('page-kelas').scrollIntoView({ behavior: 'smooth' });
}

function deleteKelas(id) {
    if (!confirm('Yakin ingin menghapus kelas ini? Data siswa yang sudah memakai kelas ini tidak akan otomatis berubah.')) return;
    callApi('deleteKelas', { id }, function(err) {
        if (err) { showToast('Gagal hapus', 'error'); return; }
        showToast('Kelas dihapus');
        loadKelas();
    });
}

function downloadTemplateKelas() {
    const wsData = [['Nama Kelas'], ['VII-A'], ['VII-B']];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Kelas');
    XLSX.writeFile(wb, 'Template_Data_Kelas.xlsx');
}

function handleKelasFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const summaryEl = document.getElementById('kelasUploadSummary');
    summaryEl.textContent = 'Memproses file...';

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const wb = XLSX.read(evt.target.result, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
            const namaKelasRows = rows.map(r => {
                const key = Object.keys(r).find(k => k.trim().toLowerCase() === 'nama kelas');
                return key ? String(r[key]).trim() : '';
            }).filter(Boolean);

            if (!namaKelasRows.length) {
                summaryEl.textContent = '';
                showToast('File kosong atau kolom "Nama Kelas" tidak ditemukan', 'error');
                return;
            }

            callApi('bulkUploadKelas', { rows: namaKelasRows }, function(err, result) {
                if (err) { summaryEl.textContent = ''; showToast('Gagal upload: ' + err.message, 'error'); return; }
                summaryEl.textContent = `${result.added} kelas ditambahkan, ${result.skipped} dilewati (sudah ada).`;
                showToast('Upload data kelas berhasil');
                loadKelas();
            });
        } catch (err) {
            summaryEl.textContent = '';
            showToast('Gagal membaca file: ' + err.message, 'error');
        }
        e.target.value = '';
    };
    reader.readAsBinaryString(file);
}

// ================================================================
//  SISWA
// ================================================================
let siswaData = [];

function loadSiswa() {
    callApi('getSiswa', {}, function(err, data) {
        if (err) { showToast('Gagal load siswa', 'error'); return; }
        siswaData = data || [];
        renderSiswaTable();
    });
}

function renderSiswaTable() {
    const tbody = document.getElementById('siswaTableBody');
    if (!siswaData.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Belum ada data siswa</td></tr>`;
        return;
    }
    tbody.innerHTML = siswaData.map(item => `
        <tr>
            <td>${item.nis||'-'}</td>
            <td><span class="avatar-sm">${(item.nama||'?')[0]}</span> ${item.nama||'-'}</td>
            <td>${item.kelas||'-'}</td>
            <td>${item.gender==='L'?'Laki-laki':'Perempuan'}</td>
            <td>
                <button class="btn-icon" onclick="editSiswa(${item.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-icon danger" onclick="deleteSiswa(${item.id})"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `).join('');
}

function handleSiswaSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('fSiswaEditId').value;
    const payload = {
        nis: document.getElementById('fSiswaNis').value.trim(),
        nama: document.getElementById('fSiswaNama').value.trim(),
        kelas: document.getElementById('fSiswaKelas').value,
        gender: document.getElementById('fSiswaGender').value,
    };
    const action = editId ? 'updateSiswa' : 'addSiswa';
    if (editId) payload.id = parseInt(editId);

    const btn = document.getElementById('siswaSubmitBtn');
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
    btn.disabled = true;
    callApi(action, payload, function(err) {
        btn.innerHTML = '<i class="fas fa-save"></i> Simpan Siswa';
        btn.disabled = false;
        if (err) { showToast(err.message || 'Gagal simpan siswa', 'error'); return; }
        showToast(editId ? 'Siswa diperbarui' : 'Siswa ditambahkan');
        document.getElementById('siswaForm').reset();
        document.getElementById('fSiswaEditId').value = '';
        loadSiswa();
    });
}

function editSiswa(id) {
    const item = siswaData.find(d => d.id === id);
    if (!item) return;
    document.getElementById('fSiswaNis').value = item.nis||'';
    document.getElementById('fSiswaNama').value = item.nama||'';
    document.getElementById('fSiswaKelas').value = item.kelas||'';
    document.getElementById('fSiswaGender').value = item.gender||'L';
    document.getElementById('fSiswaEditId').value = id;
    document.getElementById('page-siswa').scrollIntoView({ behavior: 'smooth' });
}

function deleteSiswa(id) {
    if (!confirm('Yakin ingin menghapus siswa ini?')) return;
    callApi('deleteSiswa', { id }, function(err) {
        if (err) { showToast('Gagal hapus', 'error'); return; }
        showToast('Siswa dihapus');
        loadSiswa();
    });
}

function downloadTemplateSiswa() {
    const wsData = [['NISN', 'Nama', 'Kelas', 'Gender'], ['2025001', 'Ahmad Fauzi', 'VII-A', 'L'], ['2025002', 'Siti Aisyah', 'VII-A', 'P']];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
    XLSX.writeFile(wb, 'Template_Data_Siswa.xlsx');
}

function handleSiswaFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const summaryEl = document.getElementById('siswaUploadSummary');
    summaryEl.textContent = 'Memproses file...';

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const wb = XLSX.read(evt.target.result, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

            const findKey = (obj, names) => Object.keys(obj).find(k => names.includes(k.trim().toLowerCase()));

            const mapped = rows.map(r => {
                const nisKey = findKey(r, ['nisn', 'nis']);
                const namaKey = findKey(r, ['nama', 'nama lengkap']);
                const kelasKey = findKey(r, ['kelas']);
                const genderKey = findKey(r, ['gender', 'jenis kelamin']);
                return {
                    nis: nisKey ? String(r[nisKey]).trim() : '',
                    nama: namaKey ? String(r[namaKey]).trim() : '',
                    kelas: kelasKey ? String(r[kelasKey]).trim() : '',
                    gender: genderKey ? String(r[genderKey]).trim() : ''
                };
            }).filter(r => r.nis && r.nama);

            if (!mapped.length) {
                summaryEl.textContent = '';
                showToast('File kosong atau kolom NISN/Nama tidak ditemukan', 'error');
                return;
            }

            callApi('bulkUploadSiswa', { rows: mapped }, function(err, result) {
                if (err) { summaryEl.textContent = ''; showToast('Gagal upload: ' + err.message, 'error'); return; }
                summaryEl.textContent = `${result.added} ditambahkan, ${result.updated} diperbarui, ${result.skipped} dilewati.`;
                showToast('Upload data siswa berhasil');
                loadSiswa();
            });
        } catch (err) {
            summaryEl.textContent = '';
            showToast('Gagal membaca file: ' + err.message, 'error');
        }
        e.target.value = '';
    };
    reader.readAsBinaryString(file);
}

// ================================================================
//  POIN SISWA (kategori, catat, rekap, riwayat)
// ================================================================
let kategoriPoinData = [];

function loadKategoriPoin() {
    callApi('getKategoriPoin', {}, function(err, data) {
        if (err) { showToast('Gagal load kategori poin', 'error'); return; }
        kategoriPoinData = data || [];
        renderKategoriPoinTable();
        populateKategoriPoinDropdown();
    });
}

function renderKategoriPoinTable() {
    const tbody = document.getElementById('kategoriPoinTableBody');
    if (!kategoriPoinData.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Belum ada kategori poin</td></tr>`;
        return;
    }
    tbody.innerHTML = kategoriPoinData.map(item => `
        <tr>
            <td><span class="badge-status ${item.tipe==='Prestasi'?'hadir':'sakit'}">${item.tipe}</span></td>
            <td>${item.nama||'-'}</td>
            <td>${item.tipe==='Prestasi'?'+':'-'}${item.poin}</td>
            <td>
                <button class="btn-icon" onclick="editKategoriPoin(${item.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-icon danger" onclick="deleteKategoriPoin(${item.id})"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `).join('');
}

function populateKategoriPoinDropdown() {
    const select = document.getElementById('fPoinKategori');
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Pilih Kategori --</option>' +
        kategoriPoinData.map(k => `<option value="${k.id}" data-tipe="${k.tipe}" data-poin="${k.poin}">${k.tipe==='Prestasi'?'🟢':'🔴'} ${k.nama} (${k.tipe==='Prestasi'?'+':'-'}${k.poin})</option>`).join('');
    if (currentVal) select.value = currentVal;
}

function handleKategoriPoinSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('fKategoriEditId').value;
    const payload = {
        tipe: document.getElementById('fKategoriTipe').value,
        nama: document.getElementById('fKategoriNama').value.trim(),
        poin: parseInt(document.getElementById('fKategoriPoin').value) || 0
    };
    const action = editId ? 'updateKategoriPoin' : 'addKategoriPoin';
    if (editId) payload.id = parseInt(editId);

    const btn = document.getElementById('kategoriPoinSubmitBtn');
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
    btn.disabled = true;
    callApi(action, payload, function(err) {
        btn.innerHTML = '<i class="fas fa-save"></i> Simpan';
        btn.disabled = false;
        if (err) { showToast(err.message || 'Gagal simpan kategori', 'error'); return; }
        showToast(editId ? 'Kategori diperbarui' : 'Kategori ditambahkan');
        document.getElementById('kategoriPoinForm').reset();
        document.getElementById('fKategoriEditId').value = '';
        loadKategoriPoin();
    });
}

function editKategoriPoin(id) {
    const item = kategoriPoinData.find(d => d.id === id);
    if (!item) return;
    document.getElementById('fKategoriTipe').value = item.tipe;
    document.getElementById('fKategoriNama').value = item.nama;
    document.getElementById('fKategoriPoin').value = item.poin;
    document.getElementById('fKategoriEditId').value = id;
    document.getElementById('page-poin').scrollIntoView({ behavior: 'smooth' });
}

function deleteKategoriPoin(id) {
    if (!confirm('Yakin ingin menghapus kategori ini? Catatan poin yang sudah memakai kategori ini tidak akan terhapus.')) return;
    callApi('deleteKategoriPoin', { id }, function(err) {
        if (err) { showToast('Gagal hapus', 'error'); return; }
        showToast('Kategori dihapus');
        loadKategoriPoin();
    });
}

// Isi dropdown siswa sesuai kelas yang dipilih di form catat poin
function populatePoinSiswaDropdown(kelas) {
    const select = document.getElementById('fPoinSiswa');
    if (!kelas) {
        select.innerHTML = '<option value="">-- Pilih kelas dahulu --</option>';
        return;
    }
    const roster = siswaData.filter(s => String(s.kelas) === String(kelas));
    select.innerHTML = roster.length
        ? '<option value="">-- Pilih Siswa --</option>' + roster.map(s => `<option value="${s.nis}" data-nama="${s.nama}">${s.nama} (${s.nis})</option>`).join('')
        : '<option value="">-- Belum ada siswa di kelas ini --</option>';
}

function handlePoinSubmit(e) {
    e.preventDefault();
    const kelas = document.getElementById('fPoinKelas').value;
    const siswaSelect = document.getElementById('fPoinSiswa');
    const nis = siswaSelect.value;
    const nama = siswaSelect.selectedOptions[0] ? siswaSelect.selectedOptions[0].dataset.nama : '';
    const kategoriSelect = document.getElementById('fPoinKategori');
    const kategoriOpt = kategoriSelect.selectedOptions[0];

    if (!kelas) { showToast('Pilih kelas terlebih dahulu', 'error'); return; }
    if (!nis) { showToast('Pilih siswa terlebih dahulu', 'error'); return; }
    if (!kategoriSelect.value) { showToast('Pilih kategori terlebih dahulu', 'error'); return; }

    const payload = {
        tanggal: document.getElementById('fPoinTanggal').value || new Date().toISOString().split('T')[0],
        kelas, nis, nama,
        kategoriId: kategoriSelect.value,
        kategoriNama: kategoriOpt.textContent,
        tipe: kategoriOpt.dataset.tipe,
        poin: parseInt(document.getElementById('fPoinNilai').value) || 0,
        keterangan: document.getElementById('fPoinKeterangan').value.trim()
    };

    const btn = document.getElementById('poinSubmitBtn');
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
    btn.disabled = true;
    callApi('addCatatanPoin', payload, function(err) {
        btn.innerHTML = '<i class="fas fa-save"></i> Simpan Catatan';
        btn.disabled = false;
        if (err) { showToast(err.message || 'Gagal simpan catatan poin', 'error'); return; }
        showToast('Poin berhasil dicatat');
        document.getElementById('poinForm').reset();
        document.getElementById('poinTipeBadge').innerHTML = '';
        populatePoinSiswaDropdown('');
        loadRekapPoin();
        loadCatatanPoin();
    });
}

function loadRekapPoin() {
    const kelas = document.getElementById('rekapPoinKelas').value;
    callApi('getRekapPoin', { kelas }, function(err, data) {
        if (err) { showToast('Gagal load rekap poin', 'error'); return; }
        const tbody = document.getElementById('rekapPoinTableBody');
        const list = data || [];
        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Belum ada catatan poin</td></tr>`;
            return;
        }
        tbody.innerHTML = list.map(r => `
            <tr>
                <td>${r.nama||'-'}</td>
                <td>${r.kelas||'-'}</td>
                <td><span class="badge-status hadir">+${r.prestasi}</span></td>
                <td><span class="badge-status sakit">-${r.pelanggaran}</span></td>
                <td><strong style="color:${r.total>=0?'#16a34a':'#dc2626'};">${r.total>=0?'+':''}${r.total}</strong></td>
            </tr>
        `).join('');
    });
}

function loadCatatanPoin() {
    const kelas = document.getElementById('riwayatPoinKelas').value;
    callApi('getCatatanPoin', { kelas }, function(err, data) {
        if (err) { showToast('Gagal load riwayat poin', 'error'); return; }
        const tbody = document.getElementById('riwayatPoinTableBody');
        const list = data || [];
        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Belum ada catatan poin</td></tr>`;
            return;
        }
        tbody.innerHTML = list.map(item => `
            <tr>
                <td>${item.tanggal||'-'}</td>
                <td>${item.nama||'-'}</td>
                <td>${item.kelas||'-'}</td>
                <td>${item.kategoriNama||'-'}</td>
                <td><strong style="color:${item.poin>=0?'#16a34a':'#dc2626'};">${item.poin>=0?'+':''}${item.poin}</strong></td>
                <td>${item.keterangan||'-'}</td>
                <td>${item.dicatatOleh||'-'}</td>
                <td><button class="btn-icon danger" onclick="deleteCatatanPoin(${item.id})"><i class="fas fa-trash-alt"></i></button></td>
            </tr>
        `).join('');
    });
}

function deleteCatatanPoin(id) {
    if (!confirm('Yakin ingin menghapus catatan poin ini?')) return;
    callApi('deleteCatatanPoin', { id }, function(err) {
        if (err) { showToast('Gagal hapus', 'error'); return; }
        showToast('Catatan poin dihapus');
        loadRekapPoin();
        loadCatatanPoin();
    });
}

// ================================================================
//  MODUL
// ================================================================
let modulData = [];

function loadModul() {
    callApi('getModul', {}, function(err, data) {
        if (err) { showToast('Gagal load modul', 'error'); return; }
        modulData = data || [];
        renderModulTable();
    });
}

function renderModulTable() {
    const tbody = document.getElementById('modulTableBody');
    if (!modulData.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Belum ada modul ajar</td></tr>`;
        return;
    }
    tbody.innerHTML = modulData.map(item => `
        <tr>
            <td><strong>${item.judul||'-'}</strong></td>
            <td>${item.mapel||'-'}</td>
            <td>${item.kelas||'-'}</td>
            <td>${item.semester||'-'}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.deskripsi||'-'}</td>
            <td><button class="btn-icon danger" onclick="deleteModul(${item.id})"><i class="fas fa-trash-alt"></i></button></td>
        </tr>
    `).join('');
}

function handleModulSubmit(e) {
    e.preventDefault();
    const payload = {
        judul: document.getElementById('fModulJudul').value.trim(),
        mapel: document.getElementById('fModulMapel').value.trim(),
        kelas: document.getElementById('fModulKelas').value,
        semester: document.getElementById('fModulSemester').value,
        deskripsi: document.getElementById('fModulDeskripsi').value.trim(),
    };
    const btn = document.getElementById('modulSubmitBtn');
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
    btn.disabled = true;
    callApi('addModul', payload, function(err) {
        btn.innerHTML = '<i class="fas fa-save"></i> Simpan Modul';
        btn.disabled = false;
        if (err) { showToast('Gagal simpan modul', 'error'); return; }
        showToast('Modul ditambahkan');
        document.getElementById('modulForm').reset();
        loadModul();
    });
}

function deleteModul(id) {
    if (!confirm('Yakin ingin menghapus modul ini?')) return;
    callApi('deleteModul', { id }, function(err) {
        if (err) { showToast('Gagal hapus', 'error'); return; }
        showToast('Modul dihapus');
        loadModul();
    });
}

// ================================================================
//  DASHBOARD STATS
// ================================================================
function updateStats() {
    let hadir=0, izin=0, sakit=0;
    agendaData.forEach(item => {
        hadir += parseInt(item.hadir)||0;
        izin += parseInt(item.izin)||0;
        sakit += parseInt(item.sakit)||0;
    });
    document.getElementById('statAgenda').textContent = agendaData.length;
    document.getElementById('statHadir').textContent = hadir;
    document.getElementById('statIzin').textContent = izin;
    document.getElementById('statSakit').textContent = sakit;
}

function loadDashboardStats() {
    callApi('getAgenda', {}, function(err, data) {
        if (err) return;
        agendaData = data || [];
        updateStats();
        const tbody = document.getElementById('dashboardRecent');
        const recent = agendaData.slice(-5).reverse();
        if (!recent.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Belum ada kegiatan</td></tr>`;
            return;
        }
        tbody.innerHTML = recent.map(item => `
            <tr>
                <td>${item.hariTanggal||'-'}</td>
                <td>${item.mapel||'-'}</td>
                <td>${item.pengajar||'-'}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.aktivitas||'-'}</td>
            </tr>
        `).join('');
    });
}

// ================================================================
//  PRESENSI (read-only, diisi otomatis lewat Agenda Kelas)
// ================================================================
function loadPresensi() {
    const date = document.getElementById('presensiDate').value;
    const kelas = document.getElementById('presensiKelas').value;
    if (!date) { showToast('Pilih tanggal terlebih dahulu', 'error'); return; }
    if (!kelas) { showToast('Pilih kelas terlebih dahulu', 'error'); return; }

    callApi('getPresensi', { tanggal: date, kelas }, function(err, data) {
        if (err) { showToast('Gagal load presensi', 'error'); return; }
        renderPresensiTable(data || []);
    });
}

function renderPresensiTable(list) {
    const tbody = document.getElementById('presensiTableBody');
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Belum ada presensi untuk tanggal &amp; kelas ini. Isi lewat menu Agenda Kelas.</td></tr>`;
        return;
    }
    const statusClass = { Hadir:'hadir', Izin:'izin', Sakit:'sakit', Alpha:'alpha' };
    tbody.innerHTML = list.map((s, i) => `
        <tr>
            <td>${i+1}</td>
            <td>${s.nis||'-'}</td>
            <td>${s.nama||'-'}</td>
            <td><span class="badge-status ${statusClass[s.status]||''}">${s.status||'-'}</span></td>
            <td>${s.keterangan||'-'}</td>
        </tr>
    `).join('');
}

// ================================================================
//  LAPORAN
// ================================================================
function generateLaporan() {
    const bulan = document.getElementById('laporanBulan').value;
    const tahun = document.getElementById('laporanTahun').value;
    const container = document.getElementById('laporanContent');
    container.innerHTML = '<div class="text-center" style="padding:20px;"><span class="spinner" style="border-color:#0f2b4b;border-top-color:transparent;"></span> Memuat laporan...</div>';

    callApi('getLaporan', { bulan, tahun: parseInt(tahun) }, function(err, result) {
        if (err) {
            container.innerHTML = `<p class="text-muted text-center">Gagal memuat laporan: ${err.message}</p>`;
            return;
        }
        const data = result || { total:0, hadir:0, izin:0, sakit:0, alpha:0, topMapel:[] };
        container.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px;">
                <div style="background:#fff;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;"><strong>Total Entri</strong><br><span style="font-size:24px;font-weight:700;">${data.total||0}</span></div>
                <div style="background:#fff;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;"><strong>Hadir</strong><br><span style="font-size:24px;font-weight:700;color:#16a34a;">${data.hadir||0}</span></div>
                <div style="background:#fff;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;"><strong>Izin</strong><br><span style="font-size:24px;font-weight:700;color:#ca8a04;">${data.izin||0}</span></div>
                <div style="background:#fff;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;"><strong>Sakit</strong><br><span style="font-size:24px;font-weight:700;color:#dc2626;">${data.sakit||0}</span></div>
                <div style="background:#fff;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;"><strong>Alpha</strong><br><span style="font-size:24px;font-weight:700;color:#64748b;">${data.alpha||0}</span></div>
            </div>
            <div style="background:#fff;padding:16px;border-radius:10px;border:1px solid #e2e8f0;">
                <strong><i class="fas fa-chart-bar"></i> Top Mata Pelajaran:</strong>
                <ul style="margin-top:8px;list-style:none;display:flex;gap:20px;flex-wrap:wrap;">
                    ${(data.topMapel||[]).map(m => `<li><strong>${m.mapel}</strong>: ${m.count} pertemuan</li>`).join('')}
                    ${(!data.topMapel||data.topMapel.length===0) ? '<li class="text-muted">Tidak ada data</li>' : ''}
                </ul>
            </div>
            <div style="margin-top:12px;text-align:right;font-size:13px;color:#94a3b8;">
                <i class="far fa-calendar-alt"></i> Laporan ${bulan} ${tahun} · SMP Islam Moetiah
            </div>
        `;
        showToast(`Laporan ${bulan} ${tahun} berhasil dibuat`);
    });
}

// Ubah daftar jam ke ("1,2,3") menjadi format ringkas mirip buku agenda ("1-3")
function formatJamKeRange(jamKeStr) {
    if (jamKeStr === null || jamKeStr === undefined || jamKeStr === '') return '-';
    const nums = String(jamKeStr).split(',').map(v => parseInt(v.trim())).filter(n => !isNaN(n)).sort((a,b) => a-b);
    if (!nums.length) return '-';
    const ranges = [];
    let start = nums[0], end = nums[0];
    for (let i = 1; i < nums.length; i++) {
        if (nums[i] === end + 1) { end = nums[i]; }
        else { ranges.push(start === end ? `${start}` : `${start}-${end}`); start = end = nums[i]; }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return ranges.join(', ');
}

function exportLaporanExcel() {
    const bulan = document.getElementById('laporanBulan').value;
    const tahun = parseInt(document.getElementById('laporanTahun').value);
    const kelasFilter = document.getElementById('laporanKelas').value;
    const bulanIndex = BULAN_INDO.indexOf(bulan);

    if (typeof ExcelJS === 'undefined') {
        showToast('Gagal memuat pustaka Excel. Cek koneksi internet / ekstensi pemblokir lalu muat ulang halaman.', 'error');
        return;
    }

    showToast('Menyiapkan file Excel...');

    // Selalu ambil data terbaru dari server, jangan andalkan agendaData yang
    // mungkin belum selesai dimuat di background saat tombol ini diklik.
    callApi('getAgenda', {}, async function(err, data) {
        if (err) { showToast('Gagal mengambil data agenda: ' + err.message, 'error'); return; }
        const source = data || [];

        let rows = source.filter(item => {
            if (!item.tanggalISO) return false;
            const parts = item.tanggalISO.split('-').map(Number);
            const monthMatch = (parts[1] - 1) === bulanIndex && parts[0] === tahun;
            const kelasMatch = !kelasFilter || String(item.kelas) === String(kelasFilter);
            return monthMatch && kelasMatch;
        });

        if (!rows.length) {
            showToast('Tidak ada data agenda untuk bulan & kelas ini', 'error');
            return;
        }

        try {
            // Urutkan berdasarkan tanggal, lalu jam ke
            rows.sort((a, b) => {
                if (a.tanggalISO !== b.tanggalISO) return a.tanggalISO < b.tanggalISO ? -1 : 1;
                const jamA = parseInt(String(a.jamKe||'0').split(',')[0]) || 0;
                const jamB = parseInt(String(b.jamKe||'0').split(',')[0]) || 0;
                return jamA - jamB;
            });

            // Kelompokkan per hari (untuk sel "No" & "Hari, tanggal" yang digabung)
            const groups = [];
            rows.forEach(item => {
                let group = groups.find(g => g.tanggalISO === item.tanggalISO);
                if (!group) { group = { tanggalISO: item.tanggalISO, hariTanggal: item.hariTanggal, items: [] }; groups.push(group); }
                group.items.push(item);
            });

            const isGanjil = bulanIndex >= 6; // Juli-Desember = Ganjil, Januari-Juni = Genap
            const semester = isGanjil ? 'GANJIL' : 'GENAP';
            const tahunAjaran = isGanjil ? `${tahun}/${tahun+1}` : `${tahun-1}/${tahun}`;
            const judulKelas = kelasFilter ? ` KELAS ${kelasFilter}` : '';

            const thinBorder = { style: 'thin', color: { argb: 'FF000000' } };
            const fullBorder = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

            const workbook = new ExcelJS.Workbook();
            const sheetName = `${bulan} ${tahun}`.substring(0, 31);
            const ws = workbook.addWorksheet(sheetName, { views: [{ showGridLines: false }] });

            ws.columns = [
                { width: 4 }, { width: 20 }, { width: 8 }, { width: 24 }, { width: 20 },
                { width: 16 }, { width: 42 }, { width: 32 }, { width: 7 }, { width: 7 }, { width: 7 }, { width: 7 }
            ];

            // ---- Judul (3 baris, merge A:L, bold, center) ----
            const titleLines = [
                { text: `LAPORAN KEGIATAN BELAJAR MENGAJAR BULAN ${bulan.toUpperCase()}${judulKelas}`, size: 13 },
                { text: 'SMP ISLAM MOETIAH', size: 13 },
                { text: `SEMESTER ${semester} TAHUN AJARAN ${tahunAjaran}`, size: 11 }
            ];
            titleLines.forEach((line, i) => {
                const rowNum = i + 1;
                ws.mergeCells(rowNum, 1, rowNum, 12);
                const cell = ws.getCell(rowNum, 1);
                cell.value = line.text;
                cell.font = { bold: true, size: line.size };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });
            ws.addRow([]); // baris kosong ke-4

            // ---- Header tabel (baris ke-5, bold, border, background abu-abu) ----
            const headerLabels = ['No', 'Hari, tanggal', 'Jam ke', 'Nama Pengajar', 'Mata Pelajaran', 'Siklus Inkuiri', 'AktivitasSiswa', 'Keterangan/Catatan', 'Hadir', 'Izin', 'Sakit', 'Alpha'];
            const headerRow = ws.addRow(headerLabels);
            headerRow.eachCell({ includeEmpty: true }, cell => {
                cell.font = { bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
                cell.border = fullBorder;
            });

            // ---- Baris data, dikelompokkan per hari dengan sel No & Hari-tanggal digabung ----
            let dayNo = 1;
            groups.forEach(group => {
                const startRowNum = ws.rowCount + 1;
                group.items.forEach((item, idx) => {
                    const row = ws.addRow([
                        idx === 0 ? dayNo : '',
                        idx === 0 ? group.hariTanggal : '',
                        formatJamKeRange(item.jamKe),
                        item.pengajar || '',
                        item.mapel || '',
                        item.siklus || '',
                        item.aktivitas || '',
                        item.keterangan || '',
                        item.hadir || 0,
                        item.izin || 0,
                        item.sakit || 0,
                        item.alpha || 0
                    ]);
                    row.eachCell({ includeEmpty: true }, cell => {
                        cell.border = fullBorder;
                        cell.alignment = { vertical: 'top', wrapText: true };
                    });
                    // Rata tengah untuk kolom Jam ke, Hadir, Izin, Sakit, Alpha
                    [3, 9, 10, 11, 12].forEach(col => {
                        row.getCell(col).alignment = { horizontal: 'center', vertical: 'top' };
                    });
                });
                const endRowNum = ws.rowCount;
                if (endRowNum > startRowNum) {
                    ws.mergeCells(startRowNum, 1, endRowNum, 1);
                    ws.mergeCells(startRowNum, 2, endRowNum, 2);
                }
                ws.getCell(startRowNum, 1).alignment = { horizontal: 'center', vertical: 'middle' };
                ws.getCell(startRowNum, 2).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                dayNo++;
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const namaFileKelas = kelasFilter ? `_Kelas_${kelasFilter}` : '';
            a.download = `Buku_Agenda${namaFileKelas}_-_${bulan}_${tahun}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast('Laporan Excel berhasil diunduh');
        } catch (exportErr) {
            console.error('Export Excel error:', exportErr);
            showToast('Gagal membuat file Excel: ' + exportErr.message, 'error');
        }
    });
}

// ================================================================
//  MANAJEMEN USER (admin only)
// ================================================================
function loadUsers() {
    if (currentRole !== 'admin') return;
    callApi('getUsers', {}, function(err, data) {
        if (err) { showToast('Gagal load pengguna', 'error'); return; }
        renderUserTable(data||[]);
    });
}

function renderUserTable(users) {
    const tbody = document.getElementById('userTableBody');
    if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Belum ada pengguna</td></tr>`;
        return;
    }
    tbody.innerHTML = users.map(u => `
        <tr>
            <td>${u.id}</td>
            <td>${u.username}</td>
            <td>${u.nama_lengkap||'-'}</td>
            <td><span class="badge-status ${u.role==='admin'?'admin':'user'}">${u.role}</span></td>
            <td>
                <button class="btn-icon" onclick="editUser(${u.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" onclick="resetPasswordUser(${u.id})"><i class="fas fa-key"></i></button>
                <button class="btn-icon danger" onclick="deleteUser(${u.id})"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `).join('');
}

function handleUserSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('fUserEditId').value;
    const payload = {
        username: document.getElementById('fUserUsername').value.trim(),
        password: document.getElementById('fUserPassword').value.trim(),
        nama_lengkap: document.getElementById('fUserNama').value.trim(),
        role: document.getElementById('fUserRole').value
    };
    if (id) {
        payload.id = parseInt(id);
        delete payload.password;
        callApi('updateUser', payload, function(err) {
            if (err) { showToast('Gagal update', 'error'); return; }
            showToast('Pengguna diperbarui');
            document.getElementById('userForm').reset();
            document.getElementById('fUserEditId').value = '';
            loadUsers();
        });
    } else {
        if (!payload.username || !payload.password) {
            showToast('Username dan password wajib', 'error');
            return;
        }
        callApi('addUser', payload, function(err) {
            if (err) { showToast('Gagal tambah: ' + err.message, 'error'); return; }
            showToast('Pengguna ditambahkan');
            document.getElementById('userForm').reset();
            loadUsers();
        });
    }
}

function editUser(id) {
    callApi('getUsers', {}, function(err, data) {
        if (err) return;
        const user = data.find(u => u.id == id);
        if (!user) return;
        document.getElementById('fUserUsername').value = user.username;
        document.getElementById('fUserNama').value = user.nama_lengkap||'';
        document.getElementById('fUserRole').value = user.role;
        document.getElementById('fUserPassword').value = '';
        document.getElementById('fUserEditId').value = id;
        document.getElementById('userForm').scrollIntoView({ behavior: 'smooth' });
    });
}

function resetPasswordUser(id) {
    const newPass = prompt('Masukkan password baru untuk user ID ' + id);
    if (!newPass) return;
    callApi('resetPassword', { id, newPassword: newPass }, function(err) {
        if (err) { showToast('Gagal reset password', 'error'); return; }
        showToast('Password berhasil direset');
    });
}

function deleteUser(id) {
    if (!confirm('Yakin hapus pengguna ini?')) return;
    callApi('deleteUser', { id }, function(err) {
        if (err) { showToast('Gagal hapus', 'error'); return; }
        showToast('Pengguna dihapus');
        loadUsers();
    });
}

// ================================================================
//  SHEET STATUS
// ================================================================
// ================================================================
//  CEK SESSION SAAT LOAD
// ================================================================
if (authToken && currentUser) {
    document.getElementById('loginPage').style.display = 'none';
    document.querySelector('.sidebar').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'flex';
    initApp();
} else {
    document.getElementById('loginPage').style.display = 'flex';
    document.querySelector('.sidebar').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
}

console.log('✅ E-Learning SMP Islam Moetiah loaded.');
console.log('🔗 Backend URL:', BACKEND_URL);
