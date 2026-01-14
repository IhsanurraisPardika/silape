const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.render('admin/DashboardAdmin')
})

//REKAP
router.get('/rekapKantorAdmin', (req, res) => {
  res.render('admin/rekapKantor');
});

router.get('/rekapPenilaianAdmin', (req, res) => {
  res.render('admin/rekapPenilaian');
});

// router.get('/daftarPenilaian', (req, res) => {
//   res.render('daftarPenilaian')
// })

router.get('/kelolaTim', (req, res) => {
  res.render('KelolaTim')
})

router.get('/unduhLaporan', (req, res) => {
  res.render('admin/unduhLaporanAdmin')
})


module.exports = router
