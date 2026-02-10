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
        const username = btnEdit.getAttribute("data-username") || "";
        const nama = btnEdit.getAttribute("data-nama") || "";
        const timId = btnEdit.getAttribute("data-timid") || "";
        const anggotaJson = btnEdit.getAttribute("data-anggota");

        const usernameHidden = $("#editUsernameHidden");
        const usernameShow = $("#editUsernameShow");
        const namaInput = $("#editNama");
        const passInput = $("#editPassword");
        const timSelect = $("#editTimId");

        const anggota1Input = $("#editAnggota1");
        const anggota2Input = $("#editAnggota2");
        const anggota3Input = $("#editAnggota3");
        const anggota4Input = $("#editAnggota4");
        const anggota5Input = $("#editAnggota5");

        if (usernameHidden) usernameHidden.value = username;
        if (usernameShow) usernameShow.value = username;
        if (namaInput) namaInput.value = nama;
        if (passInput) passInput.value = "";
        if (timSelect) timSelect.value = timId;

        // Parse anggota list
        let anggota = [];
        try {
          anggota = JSON.parse(anggotaJson || "[]");
        } catch (e) {
          console.error("Gagal parse anggota JSON", e);
        }

        // Reset & Fill inputs
        const setAnggota = (elm, idx) => {
          if (elm) {
            elm.value = (anggota[idx] && anggota[idx].nama) ? anggota[idx].nama : "";
          }
        };

        setAnggota(anggota1Input, 0);
        setAnggota(anggota2Input, 1);
        setAnggota(anggota3Input, 2);
        setAnggota(anggota4Input, 3);
        setAnggota(anggota5Input, 4);

        openModal("modalEdit");

        // Update hapus form hidden input as well
        const usernameHiddenHapus = $("#editUsernameHiddenHapus");
        if (usernameHiddenHapus) usernameHiddenHapus.value = username;
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

    // ===== Auto-open Tambah kalau username duplicate (openTambah/usernameError) =====
    const openTambah = params.get("openTambah");
    const usernameError = params.get("usernameError");

    if (openTambah === "1" || usernameError) {
      openModal("modalTambah");
      // pastikan wrapper tim sesuai role (kalau role sudah terisi dari server)
      toggleTimTambah();

      // bersihkan param agar tidak kebuka terus saat refresh
      removeQueryParams(["openTambah", "usernameError", "nama", "username", "peran", "timId"]);
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

    // ===== SweetAlert Delete Confirmation (Table rows) =====
    document.querySelectorAll('.formHapusPengguna').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        Swal.fire({
          title: 'Hapus Pengguna?',
          text: 'Apakah Anda yakin ingin menghapus pengguna ini?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#dc2626',
          cancelButtonColor: '#6b7280',
          confirmButtonText: 'Ya, Hapus',
          cancelButtonText: 'Tidak',
        }).then((result) => {
          if (result.isConfirmed) {
            form.submit();
          }
        });
      });
    });

    // ===== SweetAlert Delete Confirmation (Edit Modal) =====
    const btnHapusDariModal = $('#btnHapusDariModal');
    const formHapus = $('#formHapus');
    if (btnHapusDariModal && formHapus) {
      btnHapusDariModal.addEventListener('click', () => {
        Swal.fire({
          title: 'Hapus Pengguna?',
          text: 'Apakah Anda yakin ingin menghapus pengguna ini?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#dc2626',
          cancelButtonColor: '#6b7280',
          confirmButtonText: 'Ya, Hapus',
          cancelButtonText: 'Tidak',
        }).then((result) => {
          if (result.isConfirmed) {
            formHapus.submit();
          }
        });
      });
    }
  });
})();
