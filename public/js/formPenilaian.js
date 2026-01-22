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

  // Load Existing Data
  if (fpData.existingDetails && Array.isArray(fpData.existingDetails)) {
    fpData.existingDetails.forEach(det => {
      const key = det.kunciKriteria; // Asumsi di DB disimpan "P1-1"
      // Parse ID dari key
      const parts = key.split('-');
      const kId = parts[1] || "";

      formState[key] = {
        kriteriaId: kId,
        pKode: det.kategori,
        namaKriteria: "", // Akan diisi saat render atau mapping
        nilai: det.nilai,
        catatan: det.catatan || "",
        namaAnggota: det.namaAnggota || "",
        file: null
      };
    });
  }



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

  // ENSURE ALL CRITERIA EXIST IN STATE (DEFAULT 0)
  // This prevents missing items if user skips steps
  kategori5P.forEach(kat => {
    kat.kriteria.forEach(k => {
      const key = `${kat.kode}-${k.id}`; // e.g. P1-1
      if (!formState[key]) {
        formState[key] = {
          kriteriaId: k.id,
          pKode: kat.kode,
          namaKriteria: k.nama,
          nilai: "", // Default empty string or 0
          catatan: "",
          namaAnggota: "",
          file: null
        };
      } else {
        // Update static info just in case
        formState[key].namaKriteria = k.nama;
      }
    });
  });

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
      // const namaEl removed

      // Ambil file input (Khusus file kita simpan object File-nya)
      const fileEl = document.getElementById(`file_${item.id}`);
      let currentFile = null;
      if (fileEl && fileEl.files && fileEl.files[0]) {
        currentFile = fileEl.files[0];
      } else if (formState[key] && formState[key].file) {
        // Jika tidak ada upload baru, pertahankan file lama jika ada
        currentFile = formState[key].file;
      }

      // Logic Preservasi Author
      // 1. Ambil previous state
      const prevState = formState[key] || {};
      const prevNilai = String(prevState.nilai || "");
      const prevCatatan = String(prevState.catatan || "");

      const currNilai = String(nilaiEl ? nilaiEl.value : "");
      const currCatatan = String(catatanEl ? catatanEl.value : "");

      let author = prevState.namaAnggota || ""; // Default: nama existing DB

      // 2. Deteksi perubahan
      // Jika nilai berubah ATAU catatan berubah, klaim authorship
      if (currNilai !== prevNilai || currCatatan !== prevCatatan) {
        author = fpData.userNama; // Claim by current user
      }

      // Simpan ke State Global
      formState[key] = {
        kriteriaId: item.id,
        pKode: item.pKode,
        namaKriteria: item.name,
        nilai: currNilai,
        catatan: currCatatan,
        namaAnggota: author, // Persist logic
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
      const filledBy = savedData.namaAnggota || ""; // Siapa yang mengisi di DB?

      // Jika filledBy kosong, berarti belum diisi di DB.
      // Jika valNilai sudah ada (dari input user sekarang), filledBy mungkin belum tersimpan di DB kecuali submit.
      // Kita gunakan logic: "Jika ada di DB, tampilkan nama DB. Jika baru ngetik, tampilkan 'Draft (Anda)'?"
      // User request: "muncul di form tersebut anggota mana yang telah mengisi inputan yang sudah ada saja"
      // Jadi kalau loaded from DB, show name.

      const hasFile = savedData.file ? true : false;
      const fileName = hasFile ? savedData.file.name : "";

      container.innerHTML += `
        <div class="section-fade-in space-y-5 pb-8 border-b border-gray-100 last:border-0">
          <!-- INDIKATOR PENGISI (OTOMATIS) -->
          <div class="flex items-center gap-2 mb-2">
             <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
               <i class="fas fa-edit mr-1"></i> Penilai:
             </span>
             ${filledBy
          ? `<span class="text-xs font-bold text-gray-700 bg-green-100 border border-green-200 px-2 py-1 rounded text-green-800">
                    <i class="fas fa-check-circle text-[10px] mr-1"></i> ${filledBy}
                  </span>`
          : `<span class="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    Belum dinilai
                  </span>`
        }
             ${!filledBy ? `<span class="text-[10px] text-gray-400 italic ml-1">(Anda: ${fpData.userNama})</span>` : ''}
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

    // --- TAMBAHAN CHECKBOX VALIDASI PER STEP ---
    container.innerHTML += `
      <div class="mt-8 mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 section-fade-in">
        <label class="flex items-center cursor-pointer">
          <input type="checkbox" id="step_valid_checkbox" class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300" onchange="toggleNextButton(this)">
          <span class="ml-3 text-sm font-medium text-gray-700">
             Saya menyatakan bahwa penilaian di halaman ini sudah benar dan siap disimpan.
          </span>
        </label>
      </div>
    `;

    updateNavUI();
  }

  // Helper Toggle Button
  window.toggleNextButton = function (el) {
    const nextBtn = document.getElementById("nextBtn");
    if (!nextBtn) return;

    // Logic: jika checked -> enable, jika unchecked -> disable
    // Tapi kita perlu handle style visual juga agar user tahu
    if (el.checked) {
      nextBtn.disabled = false;
      nextBtn.classList.remove("bg-gray-400", "cursor-not-allowed");
      nextBtn.classList.add("bg-red-600", "hover:bg-red-700", "shadow-md");
      nextBtn.innerHTML = currentStep === steps.length ? "SUBMIT PENILAIAN" : "Selanjutnya";
    } else {
      nextBtn.disabled = true;
      nextBtn.classList.remove("bg-red-600", "hover:bg-red-700", "shadow-md", "bg-green-600"); // Remove green too if submit
      nextBtn.classList.add("bg-gray-400", "cursor-not-allowed");
    }
  };

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
      // Default DISABLED wait for checkbox
      nextBtn.disabled = true;
      nextBtn.className = "px-12 py-2.5 bg-gray-400 text-white rounded-lg font-bold cursor-not-allowed transition";
    }
  }

  async function changeStep(n) {
    // 1. Simpan data langkah saat ini ke state lokal
    saveCurrentStepData();

    // 2. Logika navigasi
    const targetStep = currentStep + n;

    // Jika MAJU (Next)
    if (n > 0) {
      // Validasi Checkbox
      const cb = document.getElementById('step_valid_checkbox');
      if (!cb || !cb.checked) {
        Swal.fire({
          icon: 'warning',
          title: 'Belum Disetujui',
          text: 'Silakan ceklis pernyataan kebenaran data terlebih dahulu.',
        });
        return;
      }

      // Cek apakah ini tombol submit (Step terakhir + 1)
      if (targetStep > steps.length) {
        submitPenilaian();
        return;
      }

      // Pindah Step Tanpa Save DB
      currentStep = targetStep;
      renderStep();
      window.scrollTo({ top: 0, behavior: "smooth" });

    } else {
      // MUNDUR (Back)
      if (targetStep < 1) return;
      currentStep = targetStep;
      renderStep();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // saveBatchStep removed to implement Save-at-End strategy

  function jumpToStep(s) {
    // Jump navigasi via step number di atas. 
    // Biasanya jump bebas, tapi karena req "harus ceklis baru lanjut", 
    // apakah jump dibolehkan? 
    // Asumsi: Jump boleh, tapi save dulu current step?
    // Atau loose validation?
    // Implementasi aman: Save current local state, pindah. (Tanpa save DB / validasi)
    saveCurrentStepData();
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

    // Convert formState object to Array AND SORT IT
    const allAssessments = Object.values(formState).map(item => ({
      kriteriaId: item.kriteriaId,
      kriteriaKey: `${item.pKode}-${item.kriteriaId}`,
      pKode: item.pKode,
      namaKriteria: item.namaKriteria,
      nilai: Number(item.nilai) || 0,
      catatan: item.catatan || "",
      namaAnggota: item.namaAnggota // Send author info to server
    })).sort((a, b) => {
      // Sort by ID ascending (1, 2, 3 ... 16)
      return parseInt(a.kriteriaId) - parseInt(b.kriteriaId);
    });

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

  // saveSingleItem removed

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