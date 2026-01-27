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
  // Format Key: "P1-1" (Kriteria Key), Value: { nilai, catatan, namaPenginput, files }
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
        files: []
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
        {
          id: "1", nama: "Pembagian area & Pemilahan", nilaiRentang: {
            "0-20": "Tidak ada pembagian fungsi & tanggungjawab serta belum ada pemilahan.",
            "21-40": "Ada pembagian fungsi & tanggungjawab serta pemilahan barang/alat/dokumen di sebagian kecil area kerja",
            "41-60": "Ada pembagian fungsi & tanggungjawab serta pemilahan barang/alat/dokumen di sebagian besar area kerja",
            "61-80": "Ada pembagian fungsi & tanggungjawab serta pemilahan barang/alat/dokumen di hampir seluruh area kerja",
            "81-100": "Ada pembagian fungsi & tanggungjawab serta pemilahan barang/alat/dokumen di seluruh area kerja"
          }
        },
        {
          id: "2", nama: "Pemindahan ke TPS", nilaiRentang: {
            "0-20": "Tidak ditemukan proses ke TPS",
            "21-40": "Ditemukan hanya ada sebagian kecil proses pemindahan ke TPS & tidak terdokumentasi",
            "41-60": "Ditemukan ada sebagian besar proses pemindahan ke TPS & terdokumentasi",
            "61-80": "Ditemukan ada proses pemindahan ke TPS secara hampir menyeluruh & terdokumentasi",
            "81-100": "Ditemukan ada proses pemindahan ke TPS secara menyeluruh & terdokumentasi"
          }
        },
        {
          id: "3", nama: "Standar P1", nilaiRentang: {
            "0-20": "Tidak ada standar Pemilahan (P1)",
            "21-40": "Sudah ada standar Pemilahan (P1) tapi belum dilaksanakan",
            "41-60": "Sudah ada standar Pemilahan (P1) dan sudah dilaksanakan dengan cukup baik",
            "61-80": "Sudah ada standar Pemilahan (P1) dan sudah dilaksanakan dengan baik & konsisten",
            "81-100": "Sudah ada standar Pemilahan (P1) secara detail dan sudah dilaksanakan dengan baik & konsisten"
          }
        }
      ]
    },
    {
      kode: "P2", nama: "Penataan",
      kriteria: [
        {
          id: "4", nama: "Visualisasi Denah & Jalur Evakuasi", nilaiRentang: {
            "0-20": "Tidak ada visualisasi denah area dan jalur evakuasi",
            "21-40": "Ditemukan di sebagian kecil area memiliki visualisasi denah area dan jalur evakuasi",
            "41-60": "Ditemukan di sebagian besar area memiliki visualisasi denah area dan jalur evakuasi",
            "61-80": "Ditemukan di hampir seluruh area memiliki visualisasi denah area dan jalur evakuasi",
            "81-100": "Ditemukan di seluruh area memiliki visualisasi denah area dan jalur evakuasi"
          }
        },
        {
          id: "5", nama: "Labeling & Marka", nilaiRentang: {
            "0-20": "Tidak ditemukan labeling, marka, visual control & penanggungjawab area",
            "21-40": "Ditemukan labeling, marka, visual control & penanggungjawab di sebagian kecil area",
            "41-60": "Ditemukan labeling, marka, visual control & penanggungjawab di sebagian besar area",
            "61-80": "Ditemukan labeling, marka, visual control & penanggungjawab di hampir seluruh area",
            "81-100": "Ditemukan labeling, marka, visual control & penanggungjawab di seluruh area"
          }
        },
        {
          id: "6", nama: "Pengelolaan Barang", nilaiRentang: {
            "0-20": "Ditemukan banyak barang/bahan tidak tertata rapi",
            "21-40": "Ditemukan sebagian kecil barang/bahan tertata namun kurang rapi",
            "41-60": "Ditemukan sebagian besar barang/bahan tertata rapi & teratur",
            "61-80": "Ditemukan hampir seluruh barang/bahan tertata rapi teratur & dalam jumlah yang efisien",
            "81-100": "Ditemukan seluruh barang/bahan tertata rapi, teratur & dalam jumlah yang efisien dan sesuai kebutuhan"
          }
        },
        {
          id: "7", nama: "Standar P2", nilaiRentang: {
            "0-20": "Tidak ada standar Penataan (P2)",
            "21-40": "Ada standar Penataan (P2) tapi belum dilaksanakan",
            "41-60": "Ada standar Penataan (P2) dan dilaksanakan dengan cukup baik",
            "61-80": "Ada standar Penataan (P2) dan dilaksanakan dengan baik & konsisten",
            "81-100": "Ada standar Penataan (P2) secara detail dan dilaksanakan dengan baik & konsisten"
          }
        }
      ]
    },
    {
      kode: "P3", nama: "Pembersihan",
      kriteria: [
        {
          id: "8", nama: "Kebersihan & Alat", nilaiRentang: {
            "0-20": "Tidak ditemukan kegiatan pembersihan",
            "21-40": "Ditemukan kegiatan pembersihan dan alat/sarana kebersihan dalam jumlah yg sesuai dan mudah dijangkau di sebagian kecil area",
            "41-60": "Ditemukan kegiatan pembersihan dan alat/sarana kebersihan dalam jumlah yg sesuai dan mudah dijangkau di sebagian besar area",
            "61-80": "Ditemukan kegiatan pembersihan dan alat/sarana kebersihan dalam jumlah yg sesuai dan mudah dijangkau di hampir seluruh area",
            "81-100": "Ditemukan kegiatan pembersihan dan alat/sarana kebersihan dalam jumlah yg sesuai dan mudah dijangkau di seluruh area"
          }
        },
        {
          id: "9", nama: "Sumber Kotoran", nilaiRentang: {
            "0-20": "Tidak ada upaya mengatasi sumber kotor & gangguan",
            "21-40": "Ada upaya untuk mengatasi sumber kotor & gangguan aktifitas di sebagian kecil area",
            "41-60": "Ada upaya untuk mengatasi sumber kotor & gangguan aktifitas di sebagian besar area",
            "61-80": "Ada upaya dilakukan untuk mengatasi sumber kotor & gangguan aktifitas di hampir seluruh area",
            "81-100": "Ada upaya dilakukan untuk mengatasi sumber kotor & gangguan aktifitas di seluruh area"
          }
        },
        {
          id: "10", nama: "Standar P3", nilaiRentang: {
            "0-20": "Tidak ada standar Pembersihan (P3)",
            "21-40": "Ada standar Pembersihan (P3) tapi belum dilaksanakan",
            "41-60": "Ada standar Pembersihan (P3) dan dilaksanakan dengan cukup baik",
            "61-80": "Ada standar Pembersihan (P3) dan dilaksanakan dengan baik & konsisten",
            "81-100": "Ada standar Pembersihan (P3) secara detail dan dilaksanakan dengan baik & konsisten"
          }
        }
      ]
    },
    {
      kode: "P4", nama: "Pemantapan",
      kriteria: [
        {
          id: "11", nama: "Konsistensi P1-P3", nilaiRentang: {
            "0-20": "Tidak ada Jadwal Rencana & Realisasi Kegiatan serta Rapat Rutin Terkait Implementasi Kegiatan P1-P3 ( Berupa Schedule/Notulen Rapat/Foto2 yang Relevan )",
            "21-40": "Ada bukti jadwal Rencana Terkait Implementasi Kegiatan P1-P3, tetapi tidak ada realisasi kegiatan dan rapat Rutin",
            "41-60": "Ada bukti jadwal Rencana & Realisasi Terkait Implementasi Kegiatan P1-P3, tetapi tidak ada jadwal rapat Rutin. (Bukti Berupa Schedule/Notulen Rapat/Foto2 yang Relevan )",
            "61-80": "Ada bukti jadwal Rencana & Realisasi Terkait Implementasi Kegiatan P1-P3 ,serta dilakukan rapat Rutin ( Minimal 1 Kali sebulan ).(Bukti Berupa Schedule/Notulen Rapat/Absensi/Foto2 yang Relevan )",
            "81-100": "Ada bukti jadwal Rencana & Realisasi Terkait implementasi Kegiatan P1-P3 ,serta dilakukan rapat Rutin ( Minimal 2 Kali sebulan ).( Bukti Berupa Schedule/Notulen Rapat/Absensi/Foto2 yang Relevan )"
          }
        },
        {
          id: "12", nama: "Pemeliharaan", nilaiRentang: {
            "0-20": "Tidak ditemukan pemeliharaan terhadap P1 - P3 serta aktifitas kegiatan perbaikan berkelanjutan",
            "21-40": "Ditemukan di sebagian kecil area ada pemeliharaan terhadap kondisi P1 - P3 & belum ada aktifitas kegiatan perbaikan berkelanjutan",
            "41-60": "Ditemukan di sebagian besar area ada pemeliharaan terhadap kondisi P1 - P3 & ada aktifitas kegiatan perbaikan berkelanjutan ( 1 tema)",
            "61-80": "Ditemukan di hampir seluruh area ada pemeliharaan terhadap kondisi P1 - P3 & ada aktifitas kegiatan perbaikan berkelanjutan (lebih dari 2 tema)",
            "81-100": "Ditemukan di seluruh area ada pemeliharaan terhadap kondisi P1 - P3 & ada aktifitas kegiatan perbaikan berkelanjutan ( lebih dari 3 tema)"
          }
        },
        {
          id: "13", nama: "Standar P4", nilaiRentang: {
            "0-20": "Tidak ada standar Pemantapan (P4)",
            "21-40": "Ada standar Pemantapan (P4) tapi belum dilaksanakan",
            "41-60": "Ada standar Pemantapan (P4) dan dilaksanakan dengan cukup baik",
            "61-80": "Ada standar Pemantapan (P4) dan dilaksanakan dengan baik & konsisten",
            "81-100": "Ada standar Pemantapan (P4) secara detail dan dilaksanakan dengan baik & konsisten"
          }
        }
      ]
    },
    {
      kode: "P5", nama: "Pembiasaan",
      kriteria: [
        {
          id: "14", nama: "Sikap Kerja", nilaiRentang: {
            "0-20": "Sebagian besar personil organisasi/area kerja belum mempunyai sikap kerja/kebiasaan positif dan disiplin.",
            "21-40": "Sebagian kecil personil organisasi/area kerja belum mempunyai sikap kerja/kebiasaan positif dan disiplin.",
            "41-60": "Sikap kerja/kebiasaan positif dan disiplin telah terbentuk tapi masih harus diikuti dengan reward dan punishment.",
            "61-80": "Setiap personil dalam organisasi/area kerja sudah menunjukkan sikap kerja, kebiasaan positif dan disiplin.",
            "81-100": "Setiap personil dalam organisasi/area kerja sudah menunjukkan sikap kerja, kebiasaan positif dan disiplin serta mempunyai budaya malu."
          }
        },
        {
          id: "15", nama: "Papan Aktivitas", nilaiRentang: {
            "0-20": "Tidak ada papan aktivitas/informasi penerapan 5P di area kerja.",
            "21-40": "Ada papan aktivitas, tapi informasi yang disajikan tidak up to date dan tidak memadai.",
            "41-60": "Sudah ada papan aktivitas yang menyajikan informasi penerapan 5P.",
            "61-80": "Activity board/papan informasi 5P tersedia di area kerja dan menyajikan informasi-informasi yang memadai (kegiatan 5P, hasil Kaizen, efisiensi, produktifitas, hasil audit, dll).",
            "81-100": "Activity board/papan informasi 5P tersedia di area kerja dan menyajikan informasi-informasi yang memadai (kegiatan 5P, hasil Kaizen, efisiensi, produktifitas, hasil audit, dll) serta up to date."
          }
        },
        {
          id: "16", nama: "Standar P5", nilaiRentang: {
            "0-20": "Tidak ada standar Pembiasaan (P5)",
            "21-40": "Ada standar Pembiasaan (P5) tapi belum dilaksanakan",
            "41-60": "Ada standar Pembiasaan (P5) dan dilaksanakan dengan cukup baik",
            "61-80": "Ada standar Pembiasaan (P5) dan dilaksanakan dengan baik & konsisten",
            "81-100": "Ada standar Pembiasaan (P5) secara detail dan dilaksanakan dengan baik & konsisten"
          }
        }
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
          files: []
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
  // NOTE: File handling kini dipisah ke handleFileUpload agar real-time.
  // Fungsi ini hanya menyimpan data teks (Nilai & Catatan) saat navigasi.
  function saveCurrentStepData() {
    const stepData = steps.find(s => s.id === currentStep);
    if (!stepData) return;

    stepData.items.forEach(item => {
      // Buat Unique Key
      const key = `${item.pKode}-${item.id}`; // Contoh: P1-1

      // Ambil elemen
      const nilaiEl = document.querySelector(`[name="nilai_${item.id}"]`);
      const catatanEl = document.querySelector(`[name="catatan_${item.id}"]`);

      // Logic Preservasi Author
      const prevState = formState[key] || {};
      const prevNilai = String(prevState.nilai || "");
      const prevCatatan = String(prevState.catatan || "");

      const currNilai = String(nilaiEl ? nilaiEl.value : "");
      const currCatatan = String(catatanEl ? catatanEl.value : "");

      let author = prevState.namaAnggota || "";

      // Deteksi perubahan
      if (currNilai !== prevNilai || currCatatan !== prevCatatan) {
        author = fpData.userNama;
      }

      // Pertahankan files yang sudah ada di state
      const currentFiles = prevState.files || [];

      // Simpan ke State Global
      formState[key] = {
        kriteriaId: item.id,
        pKode: item.pKode,
        namaKriteria: item.name,
        nilai: currNilai,
        catatan: currCatatan,
        namaAnggota: author,
        files: currentFiles
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
      // AMBIL DATA DARI STATE JIKA ADA 
      const savedData = formState[key] || {};
      const valNilai = savedData.nilai || "";
      const valCatatan = savedData.catatan || "";
      const filledBy = savedData.namaAnggota || "";

      const files = savedData.files || [];

      // Generate HTML for File Previews
      let filesHtml = "";
      if (files.length > 0) {
        filesHtml = `<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">`;
        files.forEach((f, i) => {
          // Create Object URL for preview (if it's a File object)
          // Note: If using multiple reads, memory management is important but browser handles basic ref.
          let url = "";
          if (f instanceof File || f instanceof Blob) {
            url = URL.createObjectURL(f);
          } else {
            // Fallback / Unknown type
            url = "#";
          }

          filesHtml += `
            <div class="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                <img src="${url}" class="w-full h-full object-cover">
                <button type="button" onclick="removeFile('${item.id}', ${i})" class="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:scale-110 transition z-10">
                    <i class="fas fa-times text-xs"></i>
                </button>
                <div class="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 truncate text-center">
                    ${f.name}
                </div>
            </div>`;
        });
        filesHtml += `</div>`;
      }

      container.innerHTML += `
        <div class="section-fade-in space-y-5 pb-8 border-b border-gray-100 last:border-0">
          <!-- INDIKATOR PENGISI -->
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
            
            <div class="flex flex-col md:flex-row gap-4">
                <button type="button" onclick="document.getElementById('file_${item.id}').click()" 
                    class="flex-1 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 hover:border-red-400 hover:text-red-600 text-gray-500 transition flex flex-col items-center justify-center gap-2 group">
                    <i class="fas fa-cloud-upload-alt text-xl group-hover:scale-110 transition"></i>
                    <span class="text-xs font-bold uppercase">Upload Foto</span>
                </button>
                <input type="file" id="file_${item.id}" class="hidden" accept="image/*" multiple onchange="handleFileUpload(this, '${item.id}')">

                <button type="button" onclick="openCamera('${item.id}')"
                    class="flex-1 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 hover:border-red-400 hover:text-red-600 text-gray-500 transition flex flex-col items-center justify-center gap-2 group">
                    <i class="fas fa-camera text-xl group-hover:scale-110 transition"></i>
                    <span class="text-xs font-bold uppercase">Ambil Foto (Kamera)</span>
                </button>
            </div>

            ${filesHtml}
          </div>
        </div>
      `;
    });

    // --- REKOMENDASI FORM (HANYA DI STEP TERAKHIR / P5) ---
    if (currentStep === steps.length) {
      const recKey = "rekomendasi_akhir";
      // Ambil dari global formState agar persisten saat bolak-balik step
      // Kita simpan di formState dengan key khusus? Atau terpisah?
      // Agar konsisten, kita simpan di formState['rekomendasi']?
      const recValue = formState[recKey] || "";

      container.innerHTML += `
        <div class="mt-8 pt-8 border-t-2 border-dashed border-gray-200 section-fade-in">
            <h3 class="font-bold text-gray-800 text-lg mb-4">
                <i class="fas fa-comment-dots text-red-600 mr-2"></i>Rekomendasi / Kesimpulan
            </h3>
            <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4 text-sm text-blue-700">
                Silakan berikan rekomendasi atau kesimpulan menyeluruh terkait kondisi 5P di kantor ini sebelum melakukan submit.
            </div>
            <textarea 
                id="rekomendasi_input"
                name="rekomendasi" 
                oninput="updateRekomendasi(this.value)"
                placeholder="Tuliskan rekomendasi perbaikan atau kesimpulan penilaian..." 
                class="w-full border border-gray-300 rounded-lg p-4 h-32 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition shadow-sm"
            >${recValue}</textarea>
        </div>
      `;
    }

    // --- CHECKBOX VALIDASI HANYA DI STEP TERAKHIR ---
    if (currentStep === steps.length) {
      container.innerHTML += `
        <div class="mt-8 mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 section-fade-in">
            <label class="flex items-center cursor-pointer">
            <input type="checkbox" id="step_valid_checkbox" class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300" onchange="toggleNextButton(this)">
            <span class="ml-3 text-sm font-medium text-gray-700">
                Saya menyatakan bahwa seluruh penilaian di semua step (P1-P5) sudah benar dan siap disubmit.
            </span>
            </label>
        </div>
        `;
    }

    updateNavUI();

    // Sync all file inputs with current state (so they contain the files even after nav)
    stepData.items.forEach(item => syncInputFiles(item.id));
  }

  // Override updateNavUI to handle conditional disabling
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

      // Logic Enable/Disable
      if (currentStep === steps.length) {
        // Last Step: Disable by default (until checked)
        const cb = document.getElementById('step_valid_checkbox');
        const isChecked = cb && cb.checked;
        nextBtn.disabled = !isChecked;
        nextBtn.className = isChecked
          ? "px-12 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-md transition text-sm"
          : "px-12 py-2.5 bg-gray-400 text-white rounded-lg font-bold cursor-not-allowed transition";
      } else {
        // Other Steps: Always Enable
        nextBtn.disabled = false;
        nextBtn.className = "px-12 py-2.5 bg-gray-400 text-white rounded-lg font-bold hover:bg-red-600 shadow-md transition text-sm";
      }
    }
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

  async function changeStep(n) {
    // 1. Simpan data langkah saat ini ke state lokal
    saveCurrentStepData();

    // 2. Logika navigasi
    const targetStep = currentStep + n;

    // Jika MAJU (Next)
    if (n > 0) {
      // Validasi Checkbox hanya di step terakhir
      if (currentStep === steps.length) {
        const cb = document.getElementById('step_valid_checkbox');
        if (!cb || !cb.checked) {
          Swal.fire({
            icon: 'warning',
            title: 'Belum Disetujui',
            text: 'Silakan ceklis pernyataan kebenaran data terlebih dahulu.',
          });
          return;
        }
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
    // Only include valid assessment items (must be object and have kriteriaId)
    const allAssessments = Object.values(formState)
      .filter(item => item && typeof item === 'object' && item.kriteriaId)
      .map(item => ({
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

    // Include recommendation
    if (formState['rekomendasi_akhir']) {
      fd.append("rekomendasi", formState['rekomendasi_akhir']);
    }

    fd.append("assessments", JSON.stringify(allAssessments));

    // Append files from State
    Object.values(formState).forEach((item) => {
      if (Array.isArray(item.files) && item.files.length > 0) {
        item.files.forEach((file) => {
          fd.append(`foto_${item.kriteriaId}`, file);
        });
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

  // ============================================================
  // 6. HELPER FUNCTIONS (NEW)
  // ============================================================

  function getFormStateKey(id) {
    const step = steps.find(s => s.items.some(i => i.id === id));
    if (step) {
      const item = step.items.find(i => i.id === id);
      return `${item.pKode}-${item.id}`;
    }
    return null;
  }

  function initEmptyState(key, id) {
    const step = steps.find(s => s.items.some(i => i.id === id));
    const item = step.items.find(i => i.id === id);
    formState[key] = {
      kriteriaId: id,
      pKode: item.pKode,
      namaKriteria: item.name,
      nilai: "",
      catatan: "",
      namaAnggota: fpData.userNama,
      files: []
    };
  }

  // Sync state files to the actual <input type="file"> using DataTransfer
  function syncInputFiles(id) {
    const key = getFormStateKey(id);
    if (!key || !formState[key]) return;

    const input = document.getElementById(`file_${id}`);
    if (!input) return;

    const dt = new DataTransfer();
    (formState[key].files || []).forEach(file => {
      // Ensure it's a File object
      if (file instanceof File) {
        dt.items.add(file);
      }
    });

    input.files = dt.files;
  }

  function updateStateWithFiles(id, newFiles) {
    // Pastikan inputan teks tersimpan sebelum render ulang
    saveCurrentStepData();
    const key = getFormStateKey(id);
    if (!key) return;

    if (!formState[key]) initEmptyState(key, id);

    const existing = formState[key].files || [];
    // Filter duplicates if needed, or just append
    formState[key].files = [...existing, ...newFiles];

    if (!formState[key].namaAnggota) formState[key].namaAnggota = fpData.userNama;

    renderStep();
    // After renderStep rebuilds the DOM, sync the files to the newly created input element
    syncInputFiles(id);
  }

  window.handleFileUpload = function (input, id) {
    if (input.files && input.files.length > 0) {
      updateStateWithFiles(id, Array.from(input.files));
      // input.value = ""; // Don't clear immediately if we want to sync.
      // Actually updateStateWithFiles re-renders, which clears input.
    }
  }

  window.removeFile = function (id, index) {
    const key = getFormStateKey(id);
    if (!key || !formState[key]) return;

    formState[key].files.splice(index, 1);
    renderStep();
  }

  window.updateRekomendasi = function (val) {
    formState['rekomendasi_akhir'] = val;
  }

  // CAMERA LOGIC
  let activeCameraKey = null;
  let cameraStream = null;
  let usingFrontCamera = false;

  window.openCamera = async function (id) {
    activeCameraKey = id;
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');

    modal.style.display = 'flex';

    try {
      // Try preferred mode first
      const constraints = {
        video: { facingMode: usingFrontCamera ? "user" : "environment" },
        audio: false
      };

      cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = cameraStream;
    } catch (err) {
      console.warn("Camera constraint failed, retrying with default video...", err);
      try {
        // Fallback: just ask for video (works better on some laptops)
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        video.srcObject = cameraStream;
      } catch (err2) {
        console.error(err2);
        Swal.fire("Error", "Gagal membuka kamera. Pastikan izin diberikan dan perangkat tersedia.", "error");
        closeCameraModal();
      }
    }
  }

  window.closeCameraModal = function () {
    const modal = document.getElementById('camera-modal');
    modal.style.display = 'none';

    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
  }

  window.captureCamera = function () {
    if (!cameraStream) return;

    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      const file = new File([blob], `camera_${Date.now()}.jpg`, { type: "image/jpeg" });
      updateStateWithFiles(activeCameraKey, [file]);
      closeCameraModal();
    }, 'image/jpeg', 0.8);
  }

  window.switchCamera = function () {
    usingFrontCamera = !usingFrontCamera;
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    openCamera(activeCameraKey);
  }

  // EXPOSE GLOBAL
  window.showCriteria = showCriteria;
  window.closeModal = closeModal;
  window.changeStep = changeStep;
  window.jumpToStep = jumpToStep;

  // INIT
  const titleEl = document.getElementById("office-title");
  if (titleEl && !titleEl.textContent.trim()) {
    titleEl.textContent = selectedOfficeName;
  }

  renderStep();
})();