(() => {
  // ============================================================
  // 1. INITIAL SETUP & DATA
  // ============================================================
  const dataEl = document.getElementById("fp-data");
  const fpData = dataEl ? JSON.parse(dataEl.textContent || "{}") : {};
  
  const offices = (fpData.kantorList || []).map((k) => ({
    id: String(k.id),
    name: String(k.nama || "").toUpperCase(),
  }));
  
  let selectedOfficeId = fpData.kantorId ? String(fpData.kantorId) : (offices[0]?.id || null);
  let selectedOfficeName = fpData.kantorNama ? String(fpData.kantorNama).toUpperCase() : (offices[0]?.name || "KANTOR PENILAIAN");

  // --- STATE MANAGEMENT (PENYIMPANAN SEMENTARA) ---
  // Kita gunakan objek ini untuk menampung data inputan dari semua step
  // Format Key: "P1-1" (Kriteria Key), Value: { nilai, catatan, namaPenginput, file }
  const formState = {}; 

  // ============================================================
  // 2. OFFICE SELECTION LOGIC
  // ============================================================
  function renderOfficeList() {
    const container = document.getElementById("office-list");
    if (!container) return;

    container.innerHTML = offices.map((office) => `
      <button
        type="button"
        onclick="selectOffice('${office.id}')"
        class="w-full flex items-center justify-between px-4 py-3 border rounded-lg hover:bg-red-50 hover:border-red-300 transition text-left
          ${String(office.id) === String(selectedOfficeId) ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"}"
      >
        <div class="flex items-center gap-3">
          <div class="bg-gray-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center">
            <i class="fas fa-building text-xs"></i>
          </div>
          <span class="text-xs font-bold text-gray-700 uppercase tracking-wide">${office.name}</span>
        </div>
        ${String(office.id) === String(selectedOfficeId) ? '<span class="text-green-600 text-xs font-semibold">Dipilih</span>' : ""}
      </button>
    `).join("");
  }

  function openOfficeModal() { renderOfficeList(); document.getElementById("office-modal").style.display = "flex"; }
  function closeOfficeModal() { document.getElementById("office-modal").style.display = "none"; }
  function selectOffice(id) { window.location.href = `/formPenilaian?kantor=${encodeURIComponent(id)}`; }

  window.openOfficeModal = openOfficeModal;
  window.closeOfficeModal = closeOfficeModal;
  window.selectOffice = selectOffice;

  // ============================================================
  // 3. KRITERIA DATA STRUCTURE
  // ============================================================
  const kategori5P = [
    {
      kode: "P1", nama: "Pemilahan",
      kriteria: [
        { id: "1", nama: "Pembagian area & Pemilahan", nilaiRentang: { "0-20": "Buruk", "81-100": "Sangat Baik" } },
        { id: "2", nama: "Pemindahan ke TPS", nilaiRentang: { "0-20": "Tidak ada", "81-100": "Lengkap" } },
        { id: "3", nama: "Standar P1", nilaiRentang: { "0-20": "Tidak ada", "81-100": "Detail" } }
      ]
    },
    {
      kode: "P2", nama: "Penataan",
      kriteria: [
        { id: "4", nama: "Visualisasi Denah & Jalur Evakuasi", nilaiRentang: { "0-20": "Tidak ada", "81-100": "Jelas" } },
        { id: "5", nama: "Labeling & Marka", nilaiRentang: { "0-20": "Tidak ada", "81-100": "Lengkap" } },
        { id: "6", nama: "Pengelolaan Barang", nilaiRentang: { "0-20": "Berantakan", "81-100": "Rapi" } },
        { id: "7", nama: "Standar P2", nilaiRentang: { "0-20": "Tidak ada", "81-100": "Detail" } }
      ]
    },
    {
      kode: "P3", nama: "Pembersihan",
      kriteria: [
        { id: "8", nama: "Kebersihan & Alat", nilaiRentang: { "0-20": "Kotor", "81-100": "Bersih" } },
        { id: "9", nama: "Sumber Kotoran", nilaiRentang: { "0-20": "Dibiarkan", "81-100": "Diantisipasi" } },
        { id: "10", nama: "Standar P3", nilaiRentang: { "0-20": "Tidak ada", "81-100": "Detail" } }
      ]
    },
    {
      kode: "P4", nama: "Pemantapan",
      kriteria: [
        { id: "11", nama: "Konsistensi P1-P3", nilaiRentang: { "0-20": "Jarang", "81-100": "Rutin" } },
        { id: "12", nama: "Pemeliharaan", nilaiRentang: { "0-20": "Rusak", "81-100": "Terawat" } },
        { id: "13", nama: "Standar P4", nilaiRentang: { "0-20": "Tidak ada", "81-100": "Detail" } }
      ]
    },
    {
      kode: "P5", nama: "Pembiasaan",
      kriteria: [
        { id: "14", nama: "Sikap Kerja", nilaiRentang: { "0-20": "Pasif", "81-100": "Disiplin" } },
        { id: "15", nama: "Papan Aktivitas", nilaiRentang: { "0-20": "Tidak ada", "81-100": "Update" } },
        { id: "16", nama: "Standar P5", nilaiRentang: { "0-20": "Tidak ada", "81-100": "Detail" } }
      ]
    }
  ];

  const criteriaData = {};
  const steps = kategori5P.map((kat, idx) => {
    const items = kat.kriteria.map((k) => {
      criteriaData[String(k.id)] = { name: k.nama, nilaiRentang: k.nilaiRentang || {} };
      return { id: String(k.id), name: k.nama, pKode: kat.kode };
    });
    return { id: idx + 1, title: `KRITERIA ${kat.kode} - ${kat.nama.toUpperCase()}`, items };
  });

  let currentStep = 1;

  // ============================================================
  // 4. STATE MANAGEMENT LOGIC (CORE FIX)
  // ============================================================
  
  // Fungsi untuk menyimpan inputan langkah saat ini ke variabel `formState`
  function saveCurrentStepData() {
    const stepData = steps.find(s => s.id === currentStep);
    if (!stepData) return;

    stepData.items.forEach(item => {
      // Buat Unique Key
      const key = `${item.pKode}-${item.id}`; // Contoh: P1-1

      // Ambil elemen
      const nilaiEl = document.querySelector(`[name="nilai_${item.id}"]`);
      const catatanEl = document.querySelector(`[name="catatan_${item.id}"]`);
      const namaEl = document.querySelector(`[name="nama_penginput_${item.id}"]`);
      
      // Ambil file input (Khusus file kita simpan object File-nya)
      const fileEl = document.getElementById(`file_${item.id}`);
      let currentFile = null;
      if (fileEl && fileEl.files && fileEl.files[0]) {
        currentFile = fileEl.files[0];
      } else if (formState[key] && formState[key].file) {
        // Jika tidak ada upload baru, pertahankan file lama jika ada
        currentFile = formState[key].file;
      }

      // Simpan ke State Global
      formState[key] = {
        kriteriaId: item.id,
        pKode: item.pKode,
        namaKriteria: item.name,
        nilai: nilaiEl ? nilaiEl.value : (formState[key]?.nilai || ""),
        catatan: catatanEl ? catatanEl.value : (formState[key]?.catatan || ""),
        namaPenginput: namaEl ? namaEl.value : (formState[key]?.namaPenginput || ""),
        file: currentFile // Simpan objek file
      };
    });
  }

  // ============================================================
  // 5. RENDERING (VIEW)
  // ============================================================
  function renderStep() {
    const stepData = steps.find((s) => s.id === currentStep);
    const container = document.getElementById("dynamic-form-content");
    if (!stepData || !container) return;

    // Update Header Step
    document.getElementById("step-title-display").innerText = stepData.title;
    document.getElementById("step-counter").innerText = `STEP ${currentStep} OF ${steps.length}`;

    container.innerHTML = "";

    stepData.items.forEach((item, idx) => {
      const key = `${item.pKode}-${item.id}`;
      // AMBIL DATA DARI STATE JIKA ADA (Agar tidak hilang saat render ulang)
      const savedData = formState[key] || {};
      const valNilai = savedData.nilai || "";
      const valCatatan = savedData.catatan || "";
      const valNama = savedData.namaPenginput || "";
      const hasFile = savedData.file ? true : false;
      const fileName = hasFile ? savedData.file.name : "";

      container.innerHTML += `
        <div class="section-fade-in space-y-5 pb-8 border-b border-gray-100 last:border-0">
          <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-4">
            <label class="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-2">
              <i class="fas fa-user mr-2"></i>Nama Penginput Data
            </label>
            <input 
              type="text" 
              name="nama_penginput_${item.id}" 
              value="${valNama}" 
              placeholder="Masukkan nama..." 
              class="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition text-sm font-medium bg-white"
            >
          </div>

          <h3 class="font-bold text-gray-800 text-lg">${idx + 1}. ${item.name}</h3>

          <div class="grid grid-cols-4 gap-6 items-end">
            <div class="col-span-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nilai (0-100)</label>
              <input 
                type="number" 
                name="nilai_${item.id}" 
                value="${valNilai}"
                placeholder="0" min="0" max="100" 
                class="w-full border-b-2 border-gray-200 py-2 focus:border-red-600 outline-none transition text-2xl font-bold text-red-600 bg-transparent"
              >
            </div>
            <div class="col-span-3 pb-2">
              <button type="button" onclick="showCriteria('${item.id}')" class="text-red-600 text-xs font-bold flex items-center hover:underline transition">
                <i class="fas fa-chevron-down mr-2"></i> LIHAT KRITERIA
              </button>
            </div>
          </div>

          <div>
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Catatan</label>
            <textarea 
              name="catatan_${item.id}" 
              placeholder="Berikan catatan penilaian (opsional)..." 
              class="w-full border border-gray-200 rounded-lg p-3 h-24 bg-gray-50 focus:bg-white transition text-sm outline-none shadow-inner"
            >${valCatatan}</textarea>
          </div>

          <div>
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Dokumentasi Foto Kondisi</label>
            
            ${hasFile ? `
              <div class="mb-2 px-4 py-2 bg-green-50 border border-green-200 rounded flex items-center justify-between text-green-700 text-xs">
                <span><i class="fas fa-check-circle mr-2"></i>File tersimpan: <strong>${fileName}</strong></span>
              </div>
            ` : ''}

            <div class="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-red-50/30 transition cursor-pointer relative group"
              onclick="document.getElementById('file_${item.id}').click()">

              <input type="file" id="file_${item.id}" name="foto_${item.id}" class="hidden" accept="image/*" capture="environment" onchange="previewImage(this, '${item.id}')">

              <div id="ph_${item.id}" class="py-4 ${hasFile ? 'hidden' : ''}">
                <div class="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-red-100 transition">
                  <i class="fas fa-camera text-gray-400 group-hover:text-red-600"></i>
                </div>
                <p class="text-gray-600 text-sm font-bold tracking-tight">Ambil Foto / Pilih File</p>
                <p class="text-gray-400 text-[10px] mt-1 tracking-wide uppercase font-medium">Klik untuk Membuka Kamera</p>
              </div>

              <div id="pv_${item.id}" class="hidden py-2">
                <div class="relative inline-block">
                  <img id="img_${item.id}" class="h-40 mx-auto rounded-lg shadow-lg border-2 border-white object-cover">
                  <div class="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-lg border border-white">
                    <i class="fas fa-sync"></i>
                  </div>
                </div>
                <p class="text-[10px] text-red-600 font-bold mt-2 uppercase tracking-tighter">Ganti Foto</p>
              </div>

              ${hasFile ? `<p class="text-[10px] text-gray-400 mt-2">(Klik area ini untuk mengganti foto)</p>` : ''}
            </div>
          </div>
        </div>
      `;
    });
    updateNavUI();
  }

  // ============================================================
  // 6. HELPER FUNCTIONS
  // ============================================================
  function previewImage(input, id) {
    if (input.files && input.files[0]) {
      // Simpan langsung ke state saat ada perubahan file
      // agar tidak hilang kalau user pindah tab sebelum next
      const file = input.files[0];
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.getElementById(`img_${id}`);
        if (img) img.src = e.target.result;
        
        const ph = document.getElementById(`ph_${id}`);
        const pv = document.getElementById(`pv_${id}`);
        if (ph) ph.classList.add("hidden");
        if (pv) pv.classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    }
  }

  function showCriteria(id) {
    const data = criteriaData[id];
    if (!data) return;
    document.getElementById("modal-title").innerText = data.name;
    const body = document.getElementById("modal-body");
    const rentang = ["0-20", "21-40", "41-60", "61-80", "81-100"];
    body.innerHTML = `
      <table class="w-full text-xs border">
        <tr class="bg-red-600 text-white"><th>Nilai</th><th>Penjelasan</th></tr>
        ${rentang.map(r => `<tr><td class="border p-2 font-bold text-center">${r}</td><td class="border p-2">${data.nilaiRentang[r] || '-'}</td></tr>`).join('')}
      </table>`;
    document.getElementById("criteria-modal").style.display = "flex";
  }

  function closeModal() { document.getElementById("criteria-modal").style.display = "none"; }

  function updateNavUI() {
    for (let i = 1; i <= steps.length; i++) {
      const el = document.getElementById(`nav-${i}`);
      if (el) el.className = i === currentStep ? "flex flex-col items-center flex-1 py-3 step-active" : "flex flex-col items-center flex-1 py-3 text-gray-400 transition";
    }
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    if (prevBtn) prevBtn.style.visibility = currentStep === 1 ? "hidden" : "visible";
    if (nextBtn) {
      nextBtn.innerText = currentStep === steps.length ? "SUBMIT PENILAIAN" : "Selanjutnya";
      nextBtn.className = currentStep === steps.length ? "px-12 py-2.5 bg-green-600 text-white rounded-lg font-bold" : "px-12 py-2.5 bg-red-600 text-white rounded-lg font-bold";
    }
  }

  function changeStep(n) {
    // 1. Simpan data langkah saat ini SEBELUM pindah
    saveCurrentStepData();

    // 2. Cek apakah ini tombol submit (Step terakhir + 1)
    if (n === 1 && currentStep === steps.length) {
      submitPenilaian();
      return;
    }

    // 3. Pindah langkah
    currentStep += n;
    renderStep(); // Render ulang dengan data dari state
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function jumpToStep(s) {
    saveCurrentStepData(); // Simpan dulu sebelum lompat
    currentStep = s;
    renderStep();
  }

  // ============================================================
  // 7. SUBMIT LOGIC (FIXED)
  // ============================================================
  async function submitPenilaian() {
    // Simpan step terakhir (jaga-jaga jika user belum pindah step)
    saveCurrentStepData();

    // Konfirmasi
    const result = await Swal.fire({
      title: 'Submit Penilaian?',
      text: "Pastikan semua data dari P1 sampai P5 sudah benar.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#C8102E',
      confirmButtonText: 'Ya, Kirim!',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    if (!fpData.kantorId) {
      Swal.fire('Error', 'Kantor belum dipilih.', 'error');
      return;
    }

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

    const fd = new FormData();
    fd.append("kantor_id", String(fpData.kantorId));
    fd.append("action", "submit");

    // Convert formState object to Array
    const allAssessments = Object.values(formState).map(item => ({
      kriteriaId: item.kriteriaId,
      kriteriaKey: `${item.pKode}-${item.kriteriaId}`,
      pKode: item.pKode,
      namaKriteria: item.namaKriteria,
      nilai: Number(item.nilai) || 0,
      catatan: item.catatan || "",
      namaPenginput: item.namaPenginput || ""
    }));

    fd.append("assessments", JSON.stringify(allAssessments));

    // Append files from State
    Object.values(formState).forEach((item) => {
      if (item.file) {
        fd.append(`foto_${item.kriteriaId}`, item.file);
      }
    });

    try {
      const res = await fetch("/formPenilaian", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      
      if (data.success) {
        await Swal.fire('Berhasil!', data.message || "Data berhasil disimpan.", 'success');
        if (data.redirect) window.location.href = data.redirect;
      } else {
        Swal.fire('Gagal', data.message || "Terjadi kesalahan.", 'error');
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Gagal menghubungi server.', 'error');
    }
  }

  // EXPOSE GLOBAL
  window.previewImage = previewImage;
  window.showCriteria = showCriteria;
  window.closeModal = closeModal;
  window.changeStep = changeStep;
  window.jumpToStep = jumpToStep;

  // INIT
  const titleEl = document.getElementById("office-title");
  if (titleEl && !titleEl.textContent.trim()) {
    titleEl.textContent = selectedOfficeName;
  }
  
  // Inisialisasi awal kosong, render step 1
  renderStep();
})();