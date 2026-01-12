const express = require('express');
const router = express.Router();

router.get('/daftar-penilaian', (req, res) => {
  const data = [
    {
      tanggal: '6 Juli 2025',
      kantor: 'KANTOR SALES AREA SUMBAR<br>LT.2 KANTOR PUSAT',
      rata: 78.5,
      status: 'Approval'
    },
    {
      tanggal: '15 Juli 2025',
      kantor: 'KANTOR USM',
      rata: null,
      status: 'Process'
    }
  ];

  res.render('daftar-penilaian', { data });
});

module.exports = router;