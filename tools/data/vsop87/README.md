# VSOP87A primary inputs

These are the original VSOP87A rectangular-coordinate distribution files from
CDS catalogue VI/81 (Bretagnon & Francou, 1988), stored with gzip compression.
They were imported unchanged from orb.js commit
`e4f37123936cf2fbf830bc7c9871d74ab6cb01f8`, where the repository owner
recorded them as supplied original CDS files.

`tools/vsop-compile.mjs` verifies these SHA-256 checksums before parsing:

| File | SHA-256 |
| --- | --- |
| `VSOP87A.ear.gz` | `edd7cc0a3d5360a0caa2f745fb900d4a30890e877ab4af7d0ecb44364c293b99` |
| `VSOP87A.jup.gz` | `2b78c2f6866a69cb985ea671a14624be983794797d7e786212194e9fa3add44e` |
| `VSOP87A.mar.gz` | `c7a486654ea2522a739e96efd7840e75557c32302e11135d0a6b1d12a2004252` |
| `VSOP87A.mer.gz` | `c059fd9b971e3a520f6e3b2c5e0cde12a78051db83f0194df615e6011ffdef68` |
| `VSOP87A.nep.gz` | `aa7e008b262d3670b14503a3dd9678ee03b560e448c0cdd24a10783b79bbcbab` |
| `VSOP87A.sat.gz` | `025add41f14303b503212801a63c304dcdd27b4467cec8022981d5b26e8236f1` |
| `VSOP87A.ura.gz` | `541cc0e38ad7c670b4bbd38964af79b1a07cd36346c8de86a690ed6037cc8e2e` |
| `VSOP87A.ven.gz` | `deb4585c8aa7f2e5febfdad9979bd829b3d37edfd72439cde55202f444b39958` |

The npm package allow-list excludes `tools/`, so these raw generation inputs
are part of the source repository but not part of the published package.
