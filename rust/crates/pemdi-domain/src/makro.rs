//! Port of `src/lib/makro-hitung.ts` (pure part): laju, capaian, kategori.
//! `seri` and `terkini` wait for the `NilaiMakro` contract (ledger row `makro-seri`).

/// Direction in which an indicator improves.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Polaritas {
    Naik,
    Turun,
}

/// Laju kinerja (%) as in LPPD: (kini - lalu) / lalu x 100. Zero when `lalu` is zero.
#[must_use]
pub fn laju(kini: f64, lalu: f64) -> f64 {
    if lalu == 0.0 {
        0.0
    } else {
        ((kini - lalu) / lalu) * 100.0
    }
}

/// Whether the change moves the good way; `None` when there is no change.
#[must_use]
pub fn laju_baik(l: f64, polaritas: Polaritas) -> Option<bool> {
    if l == 0.0 {
        return None;
    }
    Some(match polaritas {
        Polaritas::Naik => l > 0.0,
        Polaritas::Turun => l < 0.0,
    })
}

/// Capaian against target (%). For a "turun" indicator, Permendagri 86/2017:
/// (2 x target - realisasi) / target x 100. Zero when the target is zero.
#[must_use]
pub fn capaian(realisasi: f64, target: f64, polaritas: Polaritas) -> f64 {
    if target == 0.0 {
        return 0.0;
    }
    match polaritas {
        Polaritas::Naik => (realisasi / target) * 100.0,
        Polaritas::Turun => ((2.0 * target - realisasi) / target) * 100.0,
    }
}

/// Category of a capaian, from the performance-evaluation guideline thresholds.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kategori {
    SangatTinggi,
    Tinggi,
    Sedang,
    Rendah,
    SangatRendah,
}

impl Kategori {
    /// The label the UI and the TypeScript code use.
    #[must_use]
    pub fn label(self) -> &'static str {
        match self {
            Self::SangatTinggi => "Sangat Tinggi",
            Self::Tinggi => "Tinggi",
            Self::Sedang => "Sedang",
            Self::Rendah => "Rendah",
            Self::SangatRendah => "Sangat Rendah",
        }
    }
}

/// Thresholds: >= 91, >= 76, >= 66, >= 51, else lowest. NaN falls to the lowest, as in TS.
#[must_use]
pub fn kategori(capaian_persen: f64) -> Kategori {
    if capaian_persen >= 91.0 {
        Kategori::SangatTinggi
    } else if capaian_persen >= 76.0 {
        Kategori::Tinggi
    } else if capaian_persen >= 66.0 {
        Kategori::Sedang
    } else if capaian_persen >= 51.0 {
        Kategori::Rendah
    } else {
        Kategori::SangatRendah
    }
}
