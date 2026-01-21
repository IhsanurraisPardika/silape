// public/js/kelola-tim-penilai.js
(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function $(sel, root = document) {
    return root.querySelector(sel);
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }

  function isModalOpen(id) {
    const el = document.getElementById(id);
    if (!el) return false;
    return !el.classList.contains("hidden");
  }

  function closeAnyOpenModal() {
    if (isModalOpen("modalEdit")) closeModal("modalEdit");
    if (isModalOpen("modalTambah")) closeModal("modalTambah");
  }

  function removeQueryParams(keys) {
    const url = new URL(window.location.href);
    keys.forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, "", url.toString());
  }

  function toggleTimTambah() {
    const selectRoleTambah = $("#selectRoleTambah");
    const wrapTimTambah = $("#wrapTimTambah");
    const wrapAnggotaTambah = $("#wrapAnggotaTambah");

    if (!selectRoleTambah) return;

    const isTimPenilai = selectRoleTambah.value === "TIM_PENILAI";

    if (wrapTimTambah) {
      const timSelect = wrapTimTambah.querySelector('select[name="timId"]');
      if (isTimPenilai) {
        wrapTimTambah.classList.remove("hidden");
        if (timSelect) timSelect.required = true;
      } else {
        wrapTimTambah.classList.add("hidden");
        if (timSelect) {
          timSelect.required = false;
          timSelect.value = "";
        }
      }
    }

    if (wrapAnggotaTambah) {
      const anggota1Input = wrapAnggotaTambah.querySelector('input[name="anggota1"]');
      if (isTimPenilai) {
        wrapAnggotaTambah.classList.remove("hidden");
        // Ketua wajib jika Tim Penilai
        if (anggota1Input) anggota1Input.required = true;
      } else {
        wrapAnggotaTambah.classList.add("hidden");
        if (anggota1Input) anggota1Input.required = false;
        // Opsional: Clear inputs
        wrapAnggotaTambah.querySelectorAll('input').forEach(i => i.value = '');
      }
    }
  }

  // ===== SIDEBAR LOGIC (Moved from EJS) =====
  function initSidebar() {
    const sidebarWrapper = $("#sidebarWrapper");
    const sidebarOverlay = $("#sidebarOverlay");
    const btnSidebarOpen = $("#btnSidebarOpen");
    const btnSidebarClose = $("#btnSidebarClose");

    function openSidebar() {
      if (sidebarWrapper) sidebarWrapper.classList.remove("-translate-x-full");
      if (sidebarOverlay) sidebarOverlay.classList.remove("hidden");
      document.body.classList.add("overflow-hidden");
    }

    function closeSidebar() {
      if (sidebarWrapper) sidebarWrapper.classList.add("-translate-x-full");
      if (sidebarOverlay) sidebarOverlay.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");
    }

    if (btnSidebarOpen) btnSidebarOpen.addEventListener("click", openSidebar);
    if (btnSidebarClose) btnSidebarClose.addEventListener("click", closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);

    // Sync on resize
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768) {
        closeSidebar();
      }
    });
  }

  ready(() => {
    initSidebar();

    // ===== Close modal via overlay / button (data-close) =====
    document.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      const closeTarget = t.getAttribute("data-close");
      if (closeTarget) closeModal(closeTarget);

      // open edit via delegation
      const btnEdit = t.closest(".btnOpenEdit");
      if (btnEdit) {
        const email = btnEdit.getAttribute("data-email") || "";
        const nama = btnEdit.getAttribute("data-nama") || "";
        const timId = btnEdit.getAttribute("data-timid") || "";

        const emailHidden = $("#editEmailHidden");
        const emailShow = $("#editEmailShow");
        const namaInput = $("#editNama");
        const passInput = $("#editPassword");
        const timSelect = $("#editTimId");

        if (emailHidden) emailHidden.value = email;
        if (emailShow) emailShow.value = email;
        if (namaInput) namaInput.value = nama;
        if (passInput) passInput.value = "";
        if (timSelect) timSelect.value = timId;

        openModal("modalEdit");
      }
    });

    // ===== ESC to close any open modal =====
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAnyOpenModal();
    });

    // ===== Open modal tambah =====
    const btnOpenTambah = $("#btnOpenTambah");
    if (btnOpenTambah) {
      btnOpenTambah.addEventListener("click", () => {
        openModal("modalTambah");
        // fokus ke input nama jika ada
        const firstInput = $('#modalTambah input[name="nama"]');
        if (firstInput) firstInput.focus();
      });
    }

    // ===== Toggle pilih tim saat role tambah =====
    const selectRoleTambah = $("#selectRoleTambah");
    if (selectRoleTambah) {
      selectRoleTambah.addEventListener("change", toggleTimTambah);
      // jalankan sekali saat load (untuk kasus role sudah terpilih dari server)
      toggleTimTambah();
    }

    // ===== SweetAlert success/error dari query params =====
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");

    // ===== Auto-open Tambah kalau email duplicate (openTambah/emailError) =====
    const openTambah = params.get("openTambah");
    const emailError = params.get("emailError");

    if (openTambah === "1" || emailError) {
      openModal("modalTambah");
      // pastikan wrapper tim sesuai role (kalau role sudah terisi dari server)
      toggleTimTambah();

      // bersihkan param agar tidak kebuka terus saat refresh
      removeQueryParams(["openTambah", "emailError", "nama", "email", "peran", "timId"]);
    }

    // tampilkan swal setelah auto-open logic (biar tidak ganggu)
    if (typeof Swal !== "undefined" && success) {
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: success,
        confirmButtonText: "OK",
      }).then(() => removeQueryParams(["success"]));
    } else if (success) {
      // fallback
      alert(success);
      removeQueryParams(["success"]);
    }

    if (typeof Swal !== "undefined" && error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error,
        confirmButtonText: "OK",
      }).then(() => removeQueryParams(["error"]));
    } else if (error) {
      // fallback
      alert(error);
      removeQueryParams(["error"]);
    }
  });
})();
