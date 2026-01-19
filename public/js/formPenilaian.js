(() => {
  const dataEl = document.getElementById("fp-data");
  const fpData = dataEl ? JSON.parse(dataEl.textContent || "{}") : {};

  // DATA KANTOR dari server (untuk modal "Ganti Kantor")
  const offices = (fpData.kantorList || []).map((k) => ({
    id: k.id,
    name: String(k.nama || "").toUpperCase(),
  }));
  let selectedOfficeId = fpData.kantorId ?? null;

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

    selectedOfficeId = id;
    const titleEl = document.getElementById("office-title");
    if (titleEl) titleEl.textContent = office.name;

    // ganti kantor = pindah halaman ke kantor baru agar data kriterianya ikut berubah
    window.location.href = `/formPenilaian?kantor=${encodeURIComponent(id)}`;
  }

  // expose ke global karena dipanggil dari onclick di HTML
  window.openOfficeModal = openOfficeModal;
  window.closeOfficeModal = closeOfficeModal;
  window.selectOffice = selectOffice;

  // DATA KRITERIA dari database (kategori5P + kriteria)
  const kategori5P = fpData.kategori5P || [];

  // criteriaData dipakai modal (versi ringkas dari schema)
  const criteriaData = {};
  const steps = (kategori5P || []).map((kat, idx) => {
    const kode = String(kat.kode || `P${idx + 1}`).toUpperCase();
    const namaKat = String(kat.nama || "").toUpperCase();
    const title = `KRITERIA ${kode} - ${namaKat}`;
    const items = (kat.kriteria || []).map((k) => {
      criteriaData[String(k.id)] = {
        name: k.nama,
        desc: k.deskripsi || "",
        min: k.nilaiMin ?? 0,
        max: k.nilaiMaks ?? 100,
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
    if (!data) return;
    const modal = document.getElementById("criteria-modal");
    const body = document.getElementById("modal-body");
    const title = document.getElementById("modal-title");
    if (title) title.innerText = data.name;

    if (body) {
      body.innerHTML = `
        <div class="p-4 border border-gray-100 rounded-lg bg-gray-50/50 shadow-sm">
          <p class="text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">Rentang Nilai</p>
          <p class="text-sm font-semibold text-gray-900">${data.min} - ${data.max}</p>
          ${
            data.desc
              ? `<p class="text-xs text-gray-600 mt-3 leading-relaxed">${data.desc}</p>`
              : `<p class="text-xs text-gray-400 mt-3">Tidak ada deskripsi kriteria.</p>`
          }
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
        const nilai = nilaiEl ? nilaiEl.value : "";
        const catatan = catatanEl ? catatanEl.value : "";
        result.push({
          kriteriaId: item.id,
          nilai: nilai === "" ? 0 : Number(nilai),
          catatan: catatan || "",
        });
      });
    });
    return result;
  }

  async function submitPenilaian() {
    if (!confirm("Submit semua penilaian?")) return;
    if (!fpData.kantorId) {
      alert("kantor_id tidak ditemukan.");
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

    const res = await fetch("/formPenilaian", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      alert(data.message || "Gagal submit penilaian");
      return;
    }
    alert(data.message || "Penilaian berhasil dikirim");
    if (data.redirect) window.location.href = data.redirect;
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

  renderStep();
})();

