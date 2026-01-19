(() => {
  // DATA KANTOR dari backend (database)
  const dataEl = document.getElementById("fp-data");
  const fpData = dataEl ? JSON.parse(dataEl.textContent || "{}") : {};
  
  const offices = (fpData.kantorList || []).map((k) => ({
    id: String(k.id),
    name: String(k.nama || "").toUpperCase(),
  }));
  
  let selectedOfficeId = fpData.kantorId ? String(fpData.kantorId) : (offices[0]?.id || null);
  let selectedOfficeName = fpData.kantorNama ? String(fpData.kantorNama).toUpperCase() : (offices[0]?.name || "KANTOR PENILAIAN");

  function renderOfficeList() {
    const container = document.getElementById("office-list");
    if (!container) return;

    container.innerHTML = offices
      .map(
        (office) => `
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
              <span class="text-xs font-bold text-gray-700 uppercase tracking-wide">
                ${office.name}
              </span>
            </div>
            ${String(office.id) === String(selectedOfficeId) ? '<span class="text-green-600 text-xs font-semibold">Dipilih</span>' : ""}
          </button>
        `
      )
      .join("");
  }

  function openOfficeModal() {
    renderOfficeList();
    const modal = document.getElementById("office-modal");
    if (modal) modal.style.display = "flex";
  }

  function closeOfficeModal() {
    const modal = document.getElementById("office-modal");
    if (modal) modal.style.display = "none";
  }

  function selectOffice(id) {
    const office = offices.find((o) => String(o.id) === String(id));
    if (!office) return;

    // Redirect ke halaman form dengan kantor baru (menggunakan backend)
    window.location.href = `/formPenilaian?kantor=${encodeURIComponent(id)}`;
  }

  // expose ke global karena dipanggil dari onclick di HTML
  window.openOfficeModal = openOfficeModal;
  window.closeOfficeModal = closeOfficeModal;
  window.selectOffice = selectOffice;

  // DATA STATIS KRITERIA 5P sesuai gambar yang dikirimkan (Frontend Only)
  const kategori5P = [
    {
      kode: "P1",
      nama: "Pemilahan",
      urutan: 1,
      kriteria: [
        { 
          id: "1", 
          nama: "Pembagian area & Pemilahan",
          nilaiRentang: {
            "0-20": "Tidak ada pembagian fungsi & tanggungjawab serta belum ada pemilahan.",
            "21-40": "Ada pembagian fungsi & tanggungjawab serta pemilahan barang/alat/dokumen di <strong>sebagian kecil</strong> area kerja",
            "41-60": "Ada pembagian fungsi & tanggungjawab serta pemilahan barang/alat/dokumen di <strong>sebagian besar</strong> area kerja",
            "61-80": "Ada pembagian fungsi & tanggungjawab serta pemilahan barang/alat/dokumen di <strong>hampir seluruh</strong> area kerja",
            "81-100": "Ada pembagian fungsi & tanggungjawab serta pemilahan barang/alat/dokumen di <strong>seluruh</strong> area kerja"
          }
        },
        { 
          id: "2", 
          nama: "Pemindahan ke Tempat Penyimpanan/Pembuangan Sementara",
          nilaiRentang: {
            "0-20": "Tidak ditemukan proses ke TPS",
            "21-40": "Ditemukan hanya ada <strong>sebagian kecil</strong> proses pemindahan ke TPS & <strong>tidak terdokumentasi</strong>",
            "41-60": "Ditemukan ada <strong>sebagian besar</strong> proses pemindahan ke TPS & <strong>terdokumentasi</strong>",
            "61-80": "Ditemukan ada proses pemindahan ke TPS secara <strong>hampir menyeluruh</strong> & <strong>terdokumentasi</strong>",
            "81-100": "Ditemukan ada proses pemindahan ke TPS secara <strong>menyeluruh</strong> & <strong>terdokumentasi</strong>"
          }
        },
        { 
          id: "3", 
          nama: "Standar P1",
          nilaiRentang: {
            "0-20": "Tidak ada standar Pemilahan (P1)",
            "21-40": "Sudah ada standar Pemilahan (P1) tapi <strong>belum dilaksanakan</strong>",
            "41-60": "Sudah ada standar Pemilahan (P1) dan sudah <strong>dilaksanakan dengan cukup baik</strong>",
            "61-80": "Sudah ada standar Pemilahan (P1) dan sudah <strong>dilaksanakan dengan baik & konsisten</strong>",
            "81-100": "Sudah ada standar Pemilahan (P1) secara <strong>detail</strong> dan sudah <strong>dilaksanakan dengan baik & konsisten</strong>"
          }
        }
      ]
    },
    {
      kode: "P2",
      nama: "Penataan",
      urutan: 2,
      kriteria: [
        { 
          id: "4", 
          nama: "Visualisasi Denah Ruang/Area dan jalur evakuasi",
          nilaiRentang: {
            "0-20": "<strong>Tidak ada</strong> visualisasi denah area dan jalur evakuasi.",
            "21-40": "Ditemukan di <strong>sebagian kecil</strong> area memiliki visualisasi denah area dan jalur evakuasi.",
            "41-60": "Ditemukan di <strong>sebagian besar</strong> area memiliki visualisasi denah area dan jalur evakuasi.",
            "61-80": "Ditemukan di <strong>hampir seluruh</strong> area memiliki visualisasi denah area dan jalur evakuasi.",
            "81-100": "Ditemukan di <strong>seluruh</strong> area memiliki visualisasi denah area dan jalur evakuasi."
          }
        },
        { 
          id: "5", 
          nama: "Labeling, Marka, visual control dan Penanggung jawab",
          nilaiRentang: {
            "0-20": "<strong>Tidak</strong> ditemukan labeling, marka, visual control & penanggungjawab area.",
            "21-40": "Ditemukan labeling, marka, visual control & penanggungjawab di <strong>sebagian kecil</strong> area.",
            "41-60": "Ditemukan labeling, marka, visual control & penanggungjawab di <strong>sebagian besar</strong> area.",
            "61-80": "Ditemukan labeling, marka, visual control & penanggungjawab di <strong>hampir seluruh</strong> area.",
            "81-100": "Ditemukan labeling, marka, visual control & penanggungjawab di <strong>seluruh</strong> area."
          }
        },
        { 
          id: "6", 
          nama: "Pengelolaan Barang/Bahan",
          nilaiRentang: {
            "0-20": "Ditemukan <strong>banyak</strong> barang/bahan <strong>tidak tertata rapi</strong>.",
            "21-40": "Ditemukan <strong>sebagian kecil</strong> barang/bahan tertata namun <strong>kurang rapi</strong>.",
            "41-60": "Ditemukan <strong>sebagian besar</strong> barang/bahan tertata rapi & <strong>teratur</strong>.",
            "61-80": "Ditemukan <strong>hampir seluruh</strong> barang/bahan tertata rapi <strong>teratur</strong> & dalam jumlah yang <strong>efisien</strong>.",
            "81-100": "Ditemukan <strong>seluruh</strong> barang/bahan tertata rapi, <strong>teratur</strong> & dalam jumlah yang <strong>efisien dan Sesuai Kebutuhan</strong>."
          }
        },
        { 
          id: "7", 
          nama: "Standar P2",
          nilaiRentang: {
            "0-20": "<strong>Tidak ada</strong> standar Penataan (P2).",
            "21-40": "Ada standar Penataan (P2) tapi <strong>belum dilaksanakan</strong>.",
            "41-60": "Ada standar Penataan (P2) dan dilaksanakan dengan <strong>cukup baik</strong>.",
            "61-80": "Ada standar Penataan (P2) dan dilaksanakan dengan <strong>baik & konsisten</strong>.",
            "81-100": "Ada standar Penataan (P2) secara <strong>detail</strong> dan dilaksanakan dengan <strong>baik & konsisten</strong>."
          }
        }
      ]
    },
    {
      kode: "P3",
      nama: "Pembersihan",
      urutan: 3,
      kriteria: [
        { 
          id: "8", 
          nama: "Pembersihan dan Alat bantu kebersihan",
          nilaiRentang: {
            "0-20": "Tidak ditemukan kegiatan pembersihan",
            "21-40": "Ditemukan kegiatan pembersihan dan alat/sarana kebersihan dalam jumlah yg sesuai dan mudah dijangkau di <strong>sebagian kecil</strong> area",
            "41-60": "Ditemukan kegiatan pembersihan dan alat/sarana kebersihan dalam jumlah yg sesuai dan mudah dijangkau di <strong>sebagian besar</strong> area",
            "61-80": "Ditemukan kegiatan pembersihan dan alat/sarana kebersihan dalam jumlah yg sesuai dan mudah dijangkau di <strong>hampir seluruh</strong> area",
            "81-100": "Ditemukan kegiatan pembersihan dan alat/sarana kebersihan dalam jumlah yg sesuai dan mudah dijangkau di <strong>seluruh</strong> area"
          }
        },
        { 
          id: "9", 
          nama: "Upaya mengatasi sumber kotor & gangguan aktifitas",
          nilaiRentang: {
            "0-20": "Tidak ada upaya mengatasi sumber kotor & gangguan",
            "21-40": "Ada upaya untuk mengatasi sumber kotor & gangguan aktifitas di <strong>sebagian kecil</strong> area",
            "41-60": "Ada upaya untuk mengatasi sumber kotor & gangguan aktifitas di <strong>sebagian besar</strong> area",
            "61-80": "Ada upaya dilakukan untuk mengatasi sumber kotor & gangguan aktifitas di <strong>hampir seluruh</strong> area",
            "81-100": "Ada upaya dilakukan untuk mengatasi sumber kotor & gangguan aktifitas di <strong>seluruh</strong> area"
          }
        },
        { 
          id: "10", 
          nama: "Standar P3",
          nilaiRentang: {
            "0-20": "Tidak ada standar Pembersihan (P3)",
            "21-40": "Ada standar Pembersihan (P3) tapi <strong>belum dilaksanakan</strong>",
            "41-60": "Ada standar Pembersihan (P3) dan dilaksanakan dengan <strong>cukup baik</strong>",
            "61-80": "Ada standar Pembersihan (P3) dan dilaksanakan dengan <strong>baik & konsisten</strong>",
            "81-100": "Ada standar Pembersihan (P3) secara <strong>detail</strong> dan dilaksanakan dengan <strong>baik & konsisten</strong>"
          }
        }
      ]
    },
    {
      kode: "P4",
      nama: "Pemantapan",
      urutan: 4,
      kriteria: [
        { 
          id: "11", 
          nama: "Konsistensi Pelaksanaan P1-P3",
          nilaiRentang: {
            "0-20": "<strong>Tidak ada</strong> Jadwal Rencana & Realisasi Kegiatan serta Rapat Rutin Terkait Implementasi Kegiatan P1-P3 (Berupa Schedule/Notulen Rapat/Foto2 yang Relevan)",
            "21-40": "<strong>Ada</strong> bukti jadwal Rencana Terkait Implementasi Kegiatan P1-P3, tetapi <strong>tidak ada</strong> realisasi kegiatan dan rapat Rutin",
            "41-60": "<strong>Ada</strong> bukti jadwal Rencana & Realisasi Terkait Implementasi Kegiatan P1-P3, tetapi <strong>tidak ada</strong> jadwal rapat Rutin. (Bukti Berupa Schedule/Notulen Rapat/Foto2 yang Relevan)",
            "61-80": "<strong>Ada</strong> bukti jadwal Rencana & Realisasi Terkait Implementasi Kegiatan P1-P3, serta dilakukan rapat Rutin (<strong>Minimal 1 Kali sebulan</strong>). (Bukti Berupa Schedule/Notulen Rapat/Absensi/Foto2 yang Relevan)",
            "81-100": "<strong>Ada</strong> bukti jadwal Rencana & Realisasi Terkait Implementasi Kegiatan P1-P3, serta dilakukan rapat Rutin (<strong>Minimal 2 Kali sebulan</strong>). (Bukti Berupa Schedule/Notulen Rapat/Absensi/Foto2 yang Relevan)"
          }
        },
        { 
          id: "12", 
          nama: "Pemeliharaan P1 - P3",
          nilaiRentang: {
            "0-20": "<strong>Tidak ditemukan</strong> pemeliharaan terhadap P1 - P3 serta aktifitas kegiatan perbaikan berkelanjutan",
            "21-40": "Ditemukan di <strong>sebagian kecil</strong> area ada pemeliharaan terhadap kondisi P1 - P3 & <strong>belum ada</strong> aktifitas kegiatan perbaikan berkelanjutan",
            "41-60": "Ditemukan di <strong>sebagian besar</strong> area ada pemeliharaan terhadap kondisi P1 - P3 & <strong>ada</strong> aktifitas kegiatan perbaikan berkelanjutan (<strong>1 tema</strong>)",
            "61-80": "Ditemukan di <strong>hampir seluruh</strong> area ada pemeliharaan terhadap kondisi P1 - P3 & <strong>ada</strong> aktifitas kegiatan perbaikan berkelanjutan (<strong>lebih dari 2 tema</strong>)",
            "81-100": "Ditemukan di <strong>seluruh</strong> area ada pemeliharaan terhadap kondisi P1 - P3 & <strong>ada</strong> aktifitas kegiatan perbaikan berkelanjutan (<strong>lebih dari 3 tema</strong>)"
          }
        },
        { 
          id: "13", 
          nama: "Standar P4",
          nilaiRentang: {
            "0-20": "<strong>Tidak ada</strong> standar Pemantapan (P4)",
            "21-40": "<strong>Ada</strong> standar Pemantapan (P4) tapi <strong>belum dilaksanakan</strong>",
            "41-60": "<strong>Ada</strong> standar Pemantapan (P4) dan dilaksanakan dengan <strong>cukup baik</strong>",
            "61-80": "<strong>Ada</strong> standar Pemantapan (P4) dan dilaksanakan dengan <strong>baik & konsisten</strong>",
            "81-100": "<strong>Ada</strong> standar Pemantapan (P4) secara <strong>detail</strong> dan dilaksanakan dengan <strong>baik & konsisten</strong>"
          }
        }
      ]
    },
    {
      kode: "P5",
      nama: "Pembiasaan",
      urutan: 5,
      kriteria: [
        { 
          id: "14", 
          nama: "Sikap kerja semua personil sudah menunjukkan kebiasaan positif (atribut kerja, disiplin dan menaati rambu2 serta standart yang dibuat, dll)",
          nilaiRentang: {
            "0-20": "<strong>Sebagian besar</strong> personil organisasi/area kerja belum mempunyai sikap kerja/kebiasaan positif dan disiplin.",
            "21-40": "<strong>Sebagian kecil</strong> personil organisasi/area kerja belum mempunyai sikap kerja/kebiasaan positif dan disiplin.",
            "41-60": "Sikap kerja/kebiasaan positif dan disiplin telah terbentuk tapi <strong>masih harus diikuti dengan reward dan punishment</strong>.",
            "61-80": "Setiap personil dalam organisasi/area kerja sudah <strong>menunjukkan sikap kerja, kebiasaan positif dan disiplin</strong>.",
            "81-100": "Setiap personil dalam organisasi/area kerja sudah <strong>menunjukkan sikap kerja, kebiasaan positif dan disiplin serta mempunyai budaya malu</strong>."
          }
        },
        { 
          id: "15", 
          nama: "Sudah ada papan aktivitas yang menyajikan informasi area masing-masing (hasil Kaizen/Focus Improvement, efisiensi, produktifitas, hasil audit, dll)",
          nilaiRentang: {
            "0-20": "<strong>Tidak ada</strong> papan aktivitas/informasi penerapan 5P di area kerja.",
            "21-40": "<strong>Ada papan aktivitas</strong>, tapi informasi yang disajikan tidak up to date dan tidak memadai.",
            "41-60": "Sudah ada papan aktivitas yang menyajikan informasi penerapan 5P.",
            "61-80": "Activity board/papan informasi 5P tersedia di area kerja dan menyajikan informasi-informasi yang memadai (kegiatan 5P, hasil Kaizen, efisiensi, produktifitas, hasil audit, dll).",
            "81-100": "Activity board/papan informasi 5P tersedia di area kerja dan menyajikan informasi-informasi yang memadai (kegiatan 5P, hasil Kaizen, efisiensi, produktifitas, hasil audit, dll) <strong>serta up to date</strong>."
          }
        },
        { 
          id: "16", 
          nama: "Standar P5",
          nilaiRentang: {
            "0-20": "<strong>Tidak ada</strong> standar Pembiasaan (P5)",
            "21-40": "<strong>Ada</strong> standar Pembiasaan (P5) tapi <strong>belum dilaksanakan</strong>",
            "41-60": "Ada standar Pembiasaan (P5) dan dilaksanakan dengan <strong>cukup baik</strong>",
            "61-80": "Ada standar Pembiasaan (P5) dan dilaksanakan dengan <strong>baik & konsisten</strong>",
            "81-100": "Ada standar Pembiasaan (P5) secara <strong>detail dan dilaksanakan dengan baik & konsisten</strong>"
          }
        }
      ]
    }
  ];

  // criteriaData dipakai modal (versi lengkap dengan nilai rentang)
  const criteriaData = {};
  const steps = (kategori5P || []).map((kat, idx) => {
    const kode = String(kat.kode || `P${idx + 1}`).toUpperCase();
    const namaKat = String(kat.nama || "").toUpperCase();
    const title = `KRITERIA ${kode} - ${namaKat}`;
    const items = (kat.kriteria || []).map((k) => {
      criteriaData[String(k.id)] = {
        name: k.nama,
        nilaiRentang: k.nilaiRentang || {},
      };
      return { id: String(k.id), name: k.nama };
    });
    return { id: idx + 1, title, items };
  });

  let currentStep = 1;

  function renderStep() {
    const stepData = steps.find((s) => s.id === currentStep);
    const container = document.getElementById("dynamic-form-content");
    if (!stepData || !container) return;

    const titleEl = document.getElementById("step-title-display");
    const counterEl = document.getElementById("step-counter");
    if (titleEl) titleEl.innerText = stepData.title;
    if (counterEl) counterEl.innerText = `STEP ${currentStep} OF ${steps.length}`;

    container.innerHTML = "";

    stepData.items.forEach((item, idx) => {
      container.innerHTML += `
        <div class="section-fade-in space-y-5 pb-8 border-b border-gray-100 last:border-0">
          <!-- Input Nama Penginput di bagian atas setiap kriteria -->
          <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-4">
            <label class="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-2">
              <i class="fas fa-user mr-2"></i>Nama Penginput Data
            </label>
            <input 
              type="text" 
              name="nama_penginput_${item.id}" 
              placeholder="Masukkan nama yang menginputkan data penilaian ini..." 
              class="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition text-sm font-medium bg-white"
            >
          </div>

          <h3 class="font-bold text-gray-800 text-lg">${idx + 1}. ${item.name}</h3>

          <div class="grid grid-cols-4 gap-6 items-end">
            <div class="col-span-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nilai (0-100)</label>
              <input type="number" name="nilai_${item.id}" placeholder="0" min="0" max="100" class="w-full border-b-2 border-gray-200 py-2 focus:border-red-600 outline-none transition text-2xl font-bold text-red-600 bg-transparent">
            </div>
            <div class="col-span-3 pb-2">
              <button type="button" onclick="showCriteria('${item.id}')" class="text-red-600 text-xs font-bold flex items-center hover:underline transition">
                <i class="fas fa-chevron-down mr-2"></i> LIHAT KRITERIA
              </button>
            </div>
          </div>

          <div>
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Catatan</label>
            <textarea name="catatan_${item.id}" placeholder="Berikan catatan penilaian (opsional)..." class="w-full border border-gray-200 rounded-lg p-3 h-24 bg-gray-50 focus:bg-white transition text-sm outline-none shadow-inner"></textarea>
          </div>

          <div>
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Dokumentasi Foto Kondisi</label>
            <div class="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-red-50/30 transition cursor-pointer relative group"
              onclick="document.getElementById('file_${item.id}').click()">

              <input type="file" id="file_${item.id}" name="foto_${item.id}" class="hidden" accept="image/*" capture="environment" onchange="previewImage(this, '${item.id}')">

              <div id="ph_${item.id}" class="py-4">
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
                <p class="text-[10px] text-red-600 font-bold mt-2 uppercase tracking-tighter">Klik area ini untuk ganti foto</p>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    updateNavUI();
  }

  function previewImage(input, id) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.getElementById(`img_${id}`);
        if (img) img.src = e.target.result;
        const ph = document.getElementById(`ph_${id}`);
        const pv = document.getElementById(`pv_${id}`);
        if (ph) ph.classList.add("hidden");
        if (pv) pv.classList.remove("hidden");
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  function showCriteria(key) {
    const data = criteriaData[key];
    if (!data || !data.nilaiRentang) return;
    
    const modal = document.getElementById("criteria-modal");
    const body = document.getElementById("modal-body");
    const title = document.getElementById("modal-title");
    
    if (title) title.innerText = data.name;

    if (body) {
      const rentangNilai = ["0-20", "21-40", "41-60", "61-80", "81-100"];
      
      body.innerHTML = `
        <div class="space-y-4">
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p class="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3">Penjelasan Bobot / Nilai Kriteria</p>
            
            <div class="overflow-x-auto">
              <table class="w-full text-xs border-collapse">
                <thead>
                  <tr class="bg-red-600 text-white">
                    <th class="border border-gray-300 px-3 py-2 text-left font-bold">Nilai</th>
                    <th class="border border-gray-300 px-3 py-2 text-left font-bold">Penjelasan</th>
                  </tr>
                </thead>
                <tbody>
                  ${rentangNilai.map((rentang, idx) => {
                    const desc = data.nilaiRentang[rentang] || "Tidak ada penjelasan";
                    const bgColor = idx % 2 === 0 ? "bg-white" : "bg-gray-50";
                    return `
                      <tr class="${bgColor}">
                        <td class="border border-gray-300 px-3 py-2 font-bold text-red-600 text-center">${rentang}</td>
                        <td class="border border-gray-300 px-3 py-2 text-gray-700 leading-relaxed">${desc}</td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
            
            <div class="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p class="text-xs text-gray-600">
                <i class="fas fa-info-circle mr-1"></i>
                <strong>Petunjuk:</strong> Pilih nilai berdasarkan penjelasan di atas yang paling sesuai dengan kondisi aktual di kantor.
              </p>
            </div>
          </div>
        </div>
      `;
    }
    
    if (modal) modal.style.display = "flex";
  }

  function closeModal() {
    const modal = document.getElementById("criteria-modal");
    if (modal) modal.style.display = "none";
  }

  function updateNavUI() {
    for (let i = 1; i <= steps.length; i++) {
      const el = document.getElementById(`nav-${i}`);
      if (!el) continue;
      el.className =
        i === currentStep
          ? "flex flex-col items-center flex-1 py-3 step-active"
          : "flex flex-col items-center flex-1 py-3 text-gray-400 hover:text-red-300 transition";
    }

    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    if (prevBtn) prevBtn.style.visibility = currentStep === 1 ? "hidden" : "visible";
    if (nextBtn) {
      nextBtn.innerText = currentStep === steps.length ? "SUBMIT PENILAIAN" : "Selanjutnya";
      nextBtn.className =
        currentStep === steps.length
          ? "px-12 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md transition text-sm"
          : "px-12 py-2.5 bg-gray-400 text-white rounded-lg font-bold hover:bg-red-600 shadow-md transition text-sm";
    }
  }

  function collectAssessments() {
    const result = [];
    steps.forEach((step) => {
      (step.items || []).forEach((item) => {
        const nilaiEl = document.querySelector(`[name="nilai_${item.id}"]`);
        const catatanEl = document.querySelector(`[name="catatan_${item.id}"]`);
        const namaPenginputEl = document.querySelector(`[name="nama_penginput_${item.id}"]`);
        const nilai = nilaiEl ? nilaiEl.value : "";
        const catatan = catatanEl ? catatanEl.value : "";
        const namaPenginput = namaPenginputEl ? namaPenginputEl.value : "";
        result.push({
          kriteriaId: item.id,
          nilai: nilai === "" ? 0 : Number(nilai),
          catatan: catatan || "",
          namaPenginput: namaPenginput || "",
        });
      });
    });
    return result;
  }

  async function submitPenilaian() {
    if (!confirm("Submit semua penilaian?")) return;
    
    if (!fpData.kantorId) {
      alert("Kantor tidak ditemukan. Silakan pilih kantor terlebih dahulu.");
      return;
    }

    const fd = new FormData();
    fd.append("kantor_id", String(fpData.kantorId));
    fd.append("action", "submit");
    const assessments = collectAssessments();
    fd.append("assessments", JSON.stringify(assessments));

    assessments.forEach((a) => {
      const input = document.getElementById(`file_${a.kriteriaId}`);
      if (input && input.files && input.files[0]) {
        fd.append(`foto_${a.kriteriaId}`, input.files[0]);
      }
    });

    try {
      const res = await fetch("/formPenilaian", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        alert(data.message || "Gagal submit penilaian");
        return;
      }
      alert(data.message || "Penilaian berhasil dikirim");
      if (data.redirect) window.location.href = data.redirect;
    } catch (error) {
      console.error("Error submitting:", error);
      alert("Terjadi kesalahan saat mengirim data. Silakan coba lagi.");
    }
  }

  function changeStep(n) {
    currentStep += n;
    if (currentStep > steps.length) {
      submitPenilaian();
      currentStep = steps.length;
      return;
    }
    renderStep();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function jumpToStep(s) {
    currentStep = s;
    renderStep();
  }

  // expose global untuk onclick HTML
  window.previewImage = previewImage;
  window.showCriteria = showCriteria;
  window.closeModal = closeModal;
  window.changeStep = changeStep;
  window.jumpToStep = jumpToStep;

  // Inisialisasi
  const titleEl = document.getElementById("office-title");
  if (titleEl && !titleEl.textContent.trim()) {
    titleEl.textContent = selectedOfficeName;
  }
  renderStep();
})();
